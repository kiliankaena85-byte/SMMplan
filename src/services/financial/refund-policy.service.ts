import { db } from '../../lib/db';
import { WalletOps } from './wallet-ops';
import { WalletService } from './wallet.service';
import { calculatePartialRefund } from '@/utils/refund';
import { Prisma } from '@prisma/client';
import { LoyaltyService } from '../users/loyalty.service';

export class RefundPolicyService {
  /**
   * Processes an automated refund based on strict mathematical rules (Cents).
   * Supports PARTIAL, CANCELED, and ERROR statuses.
   */
  static async processRefund(
    order: { id: string, userId: string, charge: number, quantity: number, remains: number, status: string, tenantId?: string },
    reasonDetail: string = '',
    txClient: Prisma.TransactionClient = db
  ) {
    if (['COMPLETED', 'PENDING', 'IN_PROGRESS', 'AWAITING_PAYMENT'].includes(order.status)) {
      return null;
    }

    // Process referral commission adjustments
    try {
      if (order.status === 'CANCELED' || order.status === 'ERROR') {
        await LoyaltyService.reverseCommission(txClient, order.id);
      } else if (order.status === 'PARTIAL') {
        await LoyaltyService.handlePartialCommission(txClient, order.id, order.remains, order.quantity);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[RefundPolicyService] Failed to process referral commission for order ${order.id}:`, errMsg);
    }

    // 1. Calculate cumulative previously refunded amount across all prior refund events for this order
    let previousRefunds = 0;
    try {
      let priorEntries: Array<{ amount: bigint | number; idempotencyKey?: string | null }> = [];
      if (typeof txClient.ledgerEntry?.findMany === 'function') {
        priorEntries = await txClient.ledgerEntry.findMany({
          where: {
            userId: order.userId,
            transactionType: { in: ['REFUND', 'ORDER_CANCEL'] },
            OR: [
              { idempotencyKey: { startsWith: `refund_${order.id}` } },
              { idempotencyKey: { startsWith: `refund-client-cancel-${order.id}` } },
              { reason: { contains: `#${order.id}` } },
            ],
          },
          select: { amount: true, idempotencyKey: true },
        });
      } else if (typeof txClient.ledgerEntry?.findFirst === 'function') {
        const single = await txClient.ledgerEntry.findFirst({
          where: {
            userId: order.userId,
            transactionType: { in: ['REFUND', 'ORDER_CANCEL'] },
            OR: [
              { idempotencyKey: { startsWith: `refund_${order.id}` } },
              { idempotencyKey: { startsWith: `refund-client-cancel-${order.id}` } },
              { reason: { contains: `#${order.id}` } },
            ],
          },
          select: { amount: true, idempotencyKey: true },
        });
        if (single) priorEntries = [single];
      }

      for (const entry of priorEntries) {
        previousRefunds += Math.max(0, Number(entry.amount));
      }
    } catch (queryErr) {
      console.warn(`[RefundPolicyService] Could not query prior refund entries for order ${order.id}:`, queryErr);
    }

    const maxAvailableRefund = Math.max(0, order.charge - previousRefunds);
    if (maxAvailableRefund <= 0) {
      // Order is already fully refunded across previous lifecycle events. Guard against duplicate / over-refund.
      return null;
    }

    let refundCents = 0;
    let reason = `Возврат Заказ #${order.id}`;

    if (order.status === 'CANCELED' || order.status === 'ERROR') {
      refundCents = maxAvailableRefund;
      reason = previousRefunds > 0
        ? `Довозврат остатка (${order.status}) Заказ #${order.id} ${reasonDetail}`.trim()
        : `Полный возврат (${order.status}) Заказ #${order.id} ${reasonDetail}`.trim();
    } else if (order.status === 'PARTIAL') {
      const calculated = calculatePartialRefund(order);
      const incremental = Math.max(0, calculated - previousRefunds);
      refundCents = Math.min(incremental, maxAvailableRefund);
      reason = `Частичный возврат (Partial, ${order.remains} не выполнено) Заказ #${order.id}`.trim();
    }

    if (refundCents > 0) {
      // Deterministic idempotency key:
      // If previous refunds exist for this order, mark as remainder so it never collides with initial partial
      const idempotencyKey = previousRefunds > 0
        ? `refund_${order.id}_remainder`
        : `refund_${order.id}_${order.status}`;

      if (txClient === db) {
        return await WalletService.refund(order.userId, refundCents, reason, idempotencyKey, undefined, order.tenantId);
      } else {
        return await WalletOps.refund(txClient, order.userId, refundCents, reason, { idempotencyKey, tenantId: order.tenantId });
      }
    }

    return null;
  }
}

