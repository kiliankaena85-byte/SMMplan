import { db } from '../../lib/db';
import { WalletService } from './wallet.service';
import { calculatePartialRefund } from '@/utils/refund';

export class RefundPolicyService {
  /**
   * Processes an automated refund based on strict mathematical rules (Cents).
   * Supports PARTIAL, CANCELED, and ERROR statuses.
   */
  static async processRefund(
    order: { id: string, userId: string, charge: number, quantity: number, remains: number, status: string },
    reasonDetail: string = ''
  ) {
    if (['COMPLETED', 'PENDING', 'IN_PROGRESS', 'AWAITING_PAYMENT'].includes(order.status)) {
      return null;
    }

    let refundCents = 0;
    let reason = `Возврат Заказ #${order.id}`;

    if (order.status === 'CANCELED' || order.status === 'ERROR') {
      // 100% Full Refund MINUS any previous partial refunds
      let previousRefunds = 0;
      const partialRefundLedger = await db.ledgerEntry.findFirst({
        where: { idempotencyKey: `refund_${order.id}_PARTIAL` }
      });
      if (partialRefundLedger) {
        previousRefunds += Number(partialRefundLedger.amount);
      }
      
      refundCents = Math.max(0, order.charge - previousRefunds);
      reason = `Полный возврат (${order.status}) Заказ #${order.id} ${reasonDetail}`.trim();
    } else if (order.status === 'PARTIAL') {
      // Proportional mathematical partial refund via ARCHITECTURE CONTRACT
      refundCents = calculatePartialRefund(order);
      reason = `Частичный возврат (Partial, ${order.remains} не выполнено) Заказ #${order.id}`.trim();
    }

    if (refundCents > 0) {
      // Generates a unique deduplication key for this refund operation
      const idempotencyKey = `refund_${order.id}_${order.status}`;
      return await WalletService.refund(order.userId, refundCents, reason, idempotencyKey);
    }

    return null;
  }
}

