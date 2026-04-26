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
        await dripfeedQueue.add('dripfeed-start', { orderId: newOrder.id }, { delay: 0 });
      } else {
        // Standard instant dispatch
        await ordersQueue.add('order-dispatch', { orderId: newOrder.id }, { delay: 0 });
      }

      // 4. Return success instantly to User Interface. No delays!
      return { success: true, orderId: newOrder.id };

    } catch (e: any) {
      console.error('[OrderService] Creation failed:', e.message);
      return { success: false, error: 'Internal system error during order compilation.' };
    }
  }
}

export const orderService = new OrderService();
