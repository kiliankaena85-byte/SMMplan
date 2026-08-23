import { db } from '../../lib/db';
import { WalletOps } from './wallet-ops';
import { WalletService } from './wallet.service';
import { calculatePartialRefund } from '@/utils/refund';
import { Prisma } from '@prisma/client';

export class RefundPolicyService {
  /**
   * Processes an automated refund based on strict mathematical rules (Cents in BigInt).
   * Supports PARTIAL, CANCELED, and ERROR statuses.
   */
  static async processRefund(
    order: { id: string, userId: string, charge: bigint | number, quantity: number, remains: number, status: string },
    reasonDetail: string = '',
    txClient: Prisma.TransactionClient = db
  ) {
    if (['COMPLETED', 'PENDING', 'IN_PROGRESS', 'AWAITING_PAYMENT'].includes(order.status)) {
      return null;
    }

    const orderCharge = typeof order.charge === 'bigint' ? order.charge : BigInt(order.charge || 0);

    // Process referral commission adjustments
    try {
      const { LoyaltyService } = await import('../users/loyalty.service');
      if (order.status === 'CANCELED' || order.status === 'ERROR') {
        await LoyaltyService.reverseCommission(txClient, order.id);
      } else if (order.status === 'PARTIAL') {
        await LoyaltyService.handlePartialCommission(txClient, order.id, order.remains, order.quantity);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[RefundPolicyService] Failed to process referral commission for order ${order.id}:`, errMsg);
    }

    let refundCents = BigInt(0);
    let reason = `Возврат Заказ #${order.id}`;

    if (order.status === 'CANCELED' || order.status === 'ERROR') {
      // 100% Full Refund MINUS any previous partial refunds
      let previousRefunds = BigInt(0);
      const partialRefundLedger = await txClient.ledgerEntry.findFirst({
        where: { idempotencyKey: `refund_${order.id}_PARTIAL` }
      });
      if (partialRefundLedger) {
        previousRefunds += typeof partialRefundLedger.amount === 'bigint'
          ? partialRefundLedger.amount
          : BigInt(partialRefundLedger.amount);
      }
      
      const diff = orderCharge - previousRefunds;
      refundCents = diff > BigInt(0) ? diff : BigInt(0);
      reason = `Полный возврат (${order.status}) Заказ #${order.id} ${reasonDetail}`.trim();
    } else if (order.status === 'PARTIAL') {
      // Proportional mathematical partial refund via ARCHITECTURE CONTRACT
      refundCents = calculatePartialRefund({
        remains: order.remains,
        quantity: order.quantity,
        charge: orderCharge,
      });
      reason = `Частичный возврат (Partial, ${order.remains} не выполнено) Заказ #${order.id}`.trim();
    }

    if (refundCents > BigInt(0)) {
      // Generates a unique deduplication key for this refund operation
      const idempotencyKey = `refund_${order.id}_${order.status}`;
      if (txClient === db) {
        return await WalletService.refund(order.userId, refundCents, reason, idempotencyKey);
      } else {
        return await WalletOps.refund(txClient, order.userId, refundCents, reason, { idempotencyKey });
      }
    }

    return null;
  }
}
