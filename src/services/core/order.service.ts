import { db } from '../../lib/db';
import { SettingsProvider } from '../../lib/settings';
import { WalletService } from '../financial/wallet.service';
import { WalletOps } from '../financial/wallet-ops';
import { calculatePartialRefund } from '@/utils/refund';

import { ordersQueue } from '../../workers/queues';

type CreateOrderInput = {
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

class OrderService {
  /**
   * Fast secure path for Orders.
   * Atomically deducts balance via WalletService and dispatches to BullMQ.
   */
  async createOrder(userId: string, input: CreateOrderInput, idempotencyKey?: string): Promise<{ success: boolean; error?: string; orderId?: string }> {
    try {
      // 1. [FIN-005] Currency Circuit Breaker: Prevent orders if CBR sync is stale
      const settings = await SettingsProvider.getCached();
      if (settings.exchangeRateUpdatedAt) {
         const hoursSinceSync = (Date.now() - settings.exchangeRateUpdatedAt.getTime()) / (1000 * 60 * 60);
         if (hoursSinceSync > 48) {
             throw new Error('SYSTEM_HALT: Currency exchange rate is older than 48 hours. Orders are temporarily suspended to prevent financial loss.');
         }
      }

      const isDripFeed = input.runs ? input.runs > 1 : false;

      // 2. Atomic Charge & Creation (Prevents Ghost Deductions)
      const newOrder = await db.$transaction(async (tx) => {
        // 2a. Unconditionally attempt charge (Double spreading & Race condition protected)
        await WalletOps.charge(
          tx,
          userId, 
          input.charge, 
          `Order Creation (Service ID: ${input.serviceId})`,
          { idempotencyKey }
        );

        // 2b. Create Order in DB
        return await tx.order.create({
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
      }, { isolationLevel: 'Serializable' });

      // 3. Dispatch to Queues (Drip-feed is now passed natively to the provider)
      try {
        await ordersQueue.add('order-dispatch', { orderId: newOrder.id }, { delay: 3 * 60 * 1000 });
      } catch (queueError: any) {
        // [FIN-006] Premortem Bugfix: Ghost Order Prevention.
        // If Redis is down, we MUST NOT fail the request since the balance is already charged 
        // and the DB order is committed. Returning 500 would make the user retry and get double charged.
        // The sweep-orphans cron job will pick up this PENDING order later.
        console.error('[OrderService] Non-fatal queue dispatch error:', queueError.message);
      }

      // 4. Return success instantly to User Interface. No delays!
      return { success: true, orderId: newOrder.id };

    } catch (e: any) {
      console.error('[OrderService] Creation failed:', e.message);
      // We return e.message here so that WalletOps throw "Insufficient funds" bubbles up to UI
      return { success: false, error: e.message || 'Internal system error during order compilation.' };
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

        if (order.status !== 'PENDING' && order.status !== 'AWAITING_PAYMENT') {
          return { success: false, error: 'Заказ уже ушел в работу или отменен' };
        }

        const charge = order.charge; // totalCents
        const wasAwaitingPayment = order.status === 'AWAITING_PAYMENT';

        // 1. Cancel the order atomically
        const updated = await tx.order.updateMany({
          where: { id: order.id, status: { in: ['PENDING', 'AWAITING_PAYMENT'] } },
          data: { status: 'CANCELED' }
        });

        if (updated.count === 0) {
          return { success: false, error: 'Заказ уже ушел в работу или отменен' };
        }

        // 2. Refund to User Balance (ONLY if it was paid)
        if (!wasAwaitingPayment) {
          const refundKey = `refund-client-cancel-${order.id}`;
          const existingLedger = await tx.ledgerEntry.findUnique({
             where: { idempotencyKey: refundKey }
          });

          if (!existingLedger) {
            await WalletOps.refund(tx, userId, Number(charge),
              `Отмена заказа #${order.numericId} клиентом (Store Credit)`,
              { idempotencyKey: refundKey }
            );
          }
        }

        return { success: true };
      }, { isolationLevel: 'Serializable' });
    } catch (e: any) {
      console.error('[OrderService] cancelPendingOrderClient failed:', e.message);
      return { success: false, error: 'Внутренняя ошибка при отмене заказа' };
    }
  }

  /**
   * Universal Status Updater (System Level).
   * Called by Webhooks or Sync Workers to update order state and handle refunds.
   * Ensures high consistency via transactions and ledger entries.
   */
  async processStatusUpdate(externalId: string, providerStatus: string, remains: number): Promise<{ success: boolean; orderId?: string; status?: string }> {
    try {
      // 1. Map Provider Status to Internal Status
      const statusMap: Record<string, string> = {
        'Pending':     'PENDING',
        'In progress': 'IN_PROGRESS',
        'In_progress': 'IN_PROGRESS',
        'Processing':  'IN_PROGRESS',
        'Completed':   'COMPLETED',
        'Partial':     'PARTIAL',
        'Canceled':    'CANCELED',
        'Cancelled':   'CANCELED',
        'Error':       'ERROR'
      };

      const internalStatus = statusMap[providerStatus] || providerStatus.toUpperCase();

      // 2. Run Atomic Transaction
      return await db.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: { externalId },
          include: { user: true }
        });

        if (!order) return { success: false };

        // If status hasn't changed and remains are the same, skip to save DB I/O
        if (order.status === internalStatus && order.remains === remains) {
          return { success: true, orderId: order.id, status: order.status };
        }

        // If order was already terminal, do not revert it and do not re-process refunds (security gate)
        // Once a terminal state (COMPLETED, CANCELED, PARTIAL, ERROR) is reached, we only allow updating remains for record keeping.
        if (['COMPLETED', 'CANCELED', 'PARTIAL', 'ERROR'].includes(order.status)) {
           if (order.remains !== remains) {
              await tx.order.update({
                where: { id: order.id },
                data: { remains: Math.max(0, remains) }
              });
           }
           return { success: true, orderId: order.id, status: order.status };
        }

        let refundCents = 0;
        
        // 3. Calculate Refund if status is terminal and non-complete
        // We only refund if transition is TO a terminal state FROM a non-terminal state
        if (internalStatus === 'PARTIAL' || internalStatus === 'CANCELED') {
           if (internalStatus === 'CANCELED' && (remains <= 0 || order.quantity <= 0)) {
              refundCents = Number(order.charge);
           } else {
              refundCents = calculatePartialRefund({ remains, quantity: order.quantity, charge: order.charge });
           }
        }


        // 4. Update Order
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: internalStatus,
            remains: Math.max(0, remains),
            updatedAt: new Date()
          }
        });

        // 5. Apply Refund if needed
        if (refundCents > 0) {
          // Use a deterministic idempotency key to prevent double-crediting
          const refundKey = `refund-order-${order.id}`;
          
          // Check if ledger entry with this key already exists
          const existingLedger = await tx.ledgerEntry.findUnique({
             where: { idempotencyKey: refundKey }
          });

          if (!existingLedger) {
            await WalletOps.refund(tx, order.userId, Number(refundCents),
              `Системный возврат за заказ #${order.numericId} (Статус: ${internalStatus}, Остаток: ${remains})`,
              { idempotencyKey: refundKey }
            );
          }
        }

        return { success: true, orderId: order.id, status: internalStatus };
      }, { isolationLevel: 'Serializable' });

    } catch (e: any) {
      console.error(`[OrderService] processStatusUpdate failed for extId ${externalId}:`, e.message);
      return { success: false };
    }
  }

  /**
   * Terminal Failure (DLQ).
   * Marks order as ERROR, refunds the full amount automatically.
   */
  async failOrderTerminal(orderId: string, reason: string): Promise<void> {
    try {
      await db.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId }
        });

        if (!order || ['COMPLETED', 'CANCELED', 'PARTIAL', 'ERROR'].includes(order.status)) {
          return; // Already terminal
        }

        // Update status
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'ERROR', updatedAt: new Date() }
        });

        // Full Refund
        const refundKey = `refund-dlq-${order.id}`;
        const existingLedger = await tx.ledgerEntry.findUnique({
           where: { idempotencyKey: refundKey }
        });

        if (!existingLedger && order.charge > 0) {
          await WalletOps.refund(tx, order.userId, Number(order.charge),
            `Авто-возврат: Ошибка запуска (DLQ). Заказ #${order.numericId}. ${reason}`,
            { idempotencyKey: refundKey }
          );
        }
      }, { isolationLevel: 'Serializable' });
    } catch (e: any) {
      console.error(`[OrderService] failOrderTerminal failed for ${orderId}:`, e.message);
    }
  }
}

export const orderService = new OrderService();
