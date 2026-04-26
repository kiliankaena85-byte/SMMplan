import { db } from '../../lib/db';
import { WalletService } from './wallet.service';

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
      // 100% Full Refund
      refundCents = order.charge;
      reason = `Полный возврат (${order.status}) Заказ #${order.id} ${reasonDetail}`.trim();
    } else if (order.status === 'PARTIAL') {
      // Proportional mathematical partial refund
      // Ensure we don't divide by zero
      if (order.quantity > 0) {
        const calculatedRefund = Math.floor((order.remains / order.quantity) * order.charge);
        refundCents = Math.min(calculatedRefund, order.charge); // Safety bound
      }
      reason = `Частичный возврат (Partial, ${order.remains} не выполнено) Заказ #${order.id}`.trim();
    }

    if (refundCents > 0) {
      // Generates a unique deduplication key for this refund operation
      const idempotencyKey = `refund_${order.id}_${order.status}`;
      return await WalletService.credit(order.userId, refundCents, reason, idempotencyKey);
    }

    return null;
  }
}
