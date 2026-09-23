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
    order: { id: string, userId: string, charge: number | bigint, quantity: number, remains: number, status: string, tenantId?: string },
    reasonDetail: string = '',
    txClient: Prisma.TransactionClient = db
  ) {
    if (['COMPLETED', 'PENDING', 'IN_PROGRESS', 'AWAITING_PAYMENT'].includes(order.status)) {
      return null;
    }

    const rawCharge = typeof order.charge === 'bigint'
      ? order.charge
      : BigInt(Math.max(0, Math.floor(Number(order.charge) || 0)));

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
    let previousRefunds = BigInt(0);
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
        const amt = typeof entry.amount === 'bigint' ? entry.amount : BigInt(Math.max(0, Math.floor(Number(entry.amount) || 0)));
        if (amt > BigInt(0)) {
          previousRefunds += amt;
        }
      }
    } catch (queryErr) {
      console.warn(`[RefundPolicyService] Could not query prior refund entries for order ${order.id}:`, queryErr);
    }

    const maxAvailableRefund = rawCharge > previousRefunds ? rawCharge - previousRefunds : BigInt(0);
    if (maxAvailableRefund <= BigInt(0)) {
      // Order is already fully refunded across previous lifecycle events. Guard against duplicate / over-refund.
      return null;
    }

    let refundCents = BigInt(0);
    let reason = `Возврат Заказ #${order.id}`;

    if (order.status === 'CANCELED' || order.status === 'ERROR') {
      refundCents = maxAvailableRefund;
      reason = previousRefunds > BigInt(0)
        ? `Довозврат остатка (${order.status}) Заказ #${order.id} ${reasonDetail}`.trim()
        : `Полный возврат (${order.status}) Заказ #${order.id} ${reasonDetail}`.trim();
    } else if (order.status === 'PARTIAL') {
      const calculated = BigInt(calculatePartialRefund({
        charge: rawCharge,
        quantity: order.quantity,
        remains: order.remains,
      }));
      const incremental = calculated > previousRefunds ? calculated - previousRefunds : BigInt(0);
      refundCents = incremental < maxAvailableRefund ? incremental : maxAvailableRefund;
      reason = `Частичный возврат (Partial, ${order.remains} не выполнено) Заказ #${order.id}`.trim();
    }

    if (refundCents > BigInt(0)) {
      // Deterministic idempotency key:
      // If previous refunds exist for this order, include status and delta amount so sequential partial/canceled remainders never collide
      const idempotencyKey = previousRefunds > BigInt(0)
        ? `refund_${order.id}_${order.status}_remainder_${refundCents.toString()}`
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

