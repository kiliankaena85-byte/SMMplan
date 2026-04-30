import { Prisma } from '@prisma/client';
import { db } from '../../lib/db';
import { WalletService } from '../financial/wallet.service';
import { ordersQueue, dripfeedQueue } from '../../workers/queues';

export type CreateOrderInput = {
  serviceId: string;
  link: string;
  quantity: number;
  charge: number;       // totalCents
  providerCost: number; // providerCostCents 
  runs?: number;
  interval?: number;
  email?: string;
  isTestMode?: boolean;
  customData?: string;
};

export class OrderService {
  /**
   * Fast secure path for Orders.
   * Atomically deducts balance via WalletService and dispatches to BullMQ.
   */
  async createOrder(userId: string, input: CreateOrderInput, idempotencyKey?: string): Promise<{ success: boolean; error?: string; orderId?: string }> {
    try {
      const isDripFeed = input.runs ? input.runs > 1 : false;

      // 1. Unconditionally attempt charge (Double spreading & Race condition protected)
      const chargeResult = await WalletService.charge(
        userId, 
        input.charge, 
        `Order Creation (Service ID: ${input.serviceId})`,
        idempotencyKey
      );

      if (!chargeResult.success) {
        return { success: false, error: (chargeResult as any).error || 'Insufficient funds' };
      }

      // 2. Create Order in DB
      const newOrder = await db.order.create({
        data: {
          userId,
          serviceId: input.serviceId,
          link: input.link,
          quantity: input.quantity,
          status: 'PENDING',
          charge: input.charge,
          providerCost: input.providerCost,
          remains: input.quantity,
          runs: input.runs,
          interval: input.interval,
          isDripFeed,
          currentRun: 0,
          nextRunAt: isDripFeed ? new Date() : null,
          email: input.email?.toLowerCase(),
          isTest: input.isTestMode || false,
          customData: input.customData,
        }
      });

      // 3. Dispatch to Queues
      if (isDripFeed) {
        // Drop into DripFeed Engine immediately for the first run
        await dripfeedQueue.add('dripfeed-start', { orderId: newOrder.id }, { delay: 3 * 60 * 1000 });
      } else {
        // Standard instant dispatch
        await ordersQueue.add('order-dispatch', { orderId: newOrder.id }, { delay: 3 * 60 * 1000 });
      }

      // 4. Return success instantly to User Interface. No delays!
      return { success: true, orderId: newOrder.id };

    } catch (e: any) {
      console.error('[OrderService] Creation failed:', e.message);
      return { success: false, error: 'Internal system error during order compilation.' };
    }
  }

  /**
   * Stage 2: Cooling-off Period Cancellation
   * Client-facing cancellation for PENDING orders to preserve revenue internally.
   */
  async cancelPendingOrderClient(orderId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await db.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId }
        });

        if (!order || order.userId !== userId) {
          return { success: false, error: 'Заказ не найден' };
        }

        if (order.status !== 'PENDING') {
          return { success: false, error: 'Заказ уже ушел в работу или отменен' };
        }

        const charge = order.charge; // totalCents

        // 1. Cancel the order
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELED' }
        });

        // 2. Refund to User Balance
        await tx.user.update({
          where: { id: userId },
          data: { balance: { increment: charge } }
        });

        // 3. Keep a track record
        await tx.ledgerEntry.create({
          data: {
            userId,
            amount: charge,
            reason: `Отмена заказа #${order.numericId} клиентом (Store Credit)`,
            status: 'APPROVED'
          }
        });

        return { success: true };
      });
    } catch (e: any) {
      console.error('[OrderService] cancelPendingOrderClient failed:', e.message);
      return { success: false, error: 'Внутренняя ошибка при отмене заказа' };
    }
  }
}

export const orderService = new OrderService();
