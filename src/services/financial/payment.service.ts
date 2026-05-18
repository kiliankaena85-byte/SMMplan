import { db } from '@/lib/db';
import { WalletOps } from './wallet-ops';
import { revalidatePath } from 'next/cache';
import { sendOrderPaidMail } from '@/lib/smtp';

export class PaymentService {
  /**
   * Confirms a payment and activates the linked order.
   * Called by webhook handlers (YooKassa, CryptoBot).
   * 
   * Flow: Payment PENDING → SUCCEEDED → Order AWAITING_PAYMENT → PENDING
   */
  async confirmPayment(
    gatewayId: string, 
    amount: number, 
    userId: string, 
    isDevSandbox = false,
    gatewayType: 'yookassa' | 'cryptobot' = 'yookassa',
    internalPaymentId?: string,
    metadataType?: string,
    receiptId?: string
  ): Promise<boolean> {
    const activatedOrders: { id: string; isDripFeed: boolean; userId: string; amount: number; userEmail?: string | null; serviceName?: string | null; numericId?: number }[] = [];

    try {
      // 1. Double-check against real gateway API in production
      if (!isDevSandbox && process.env.NODE_ENV === 'production' && gatewayType === 'yookassa') {
        const { SettingsManager } = await import('@/lib/settings');
        const secrets = await SettingsManager.getPaymentSecrets();
        
        // We attempt to verify with YooKassa if secrets are configured
        if (secrets.yookassaShopId && secrets.yookassaSecretKey) {
            const authHeader = 'Basic ' + Buffer.from(`${secrets.yookassaShopId}:${secrets.yookassaSecretKey}`).toString('base64');
            try {
                const response = await fetch(`https://api.yookassa.ru/v3/payments/${gatewayId}`, {
                    headers: { 'Authorization': authHeader }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.status !== 'succeeded') {
                        throw new Error(`PAYMENT_NOT_SUCCEEDED: Real gateway status is ${data.status}`);
                    }
                    const realAmount = Math.round(parseFloat(data.amount.value) * 100);
                    if (realAmount < amount) {
                        throw new Error(`PAYMENT_AMOUNT_MISMATCH: Webhook amount ${amount} exceeds Real amount ${realAmount}`);
                    }
                    console.info(`[Payment] Safely verified YooKassa payment ${gatewayId}`);
                } else {
                    throw new Error(`GATEWAY_ERROR: Failed to contact YooKassa API or Payment Not Found (${response.status})`);
                }
            } catch (e: any) {
                console.error(`[Payment] Verification Exploit Blocked: ${e.message}`);
                return false; // Reject payment
            }
        } else {
             console.error(`[Payment] YooKassa verification failed for ${gatewayId} due to missing secrets in admin panel! Rejecting for safety.`);
             return false;
        }
      }

      // 2. Atomic transaction: confirm payment + activate order
      await db.$transaction(async (tx) => {
        // Find payment by internal ID (preferred) or gateway ID
        let payment = null;
        if (internalPaymentId) {
          payment = await tx.payment.findUnique({ where: { id: internalPaymentId } });
        }
        if (!payment) {
          payment = await tx.payment.findUnique({ where: { gatewayId } });
        }

        // 1. Process or Create Payment atomically via Upsert to prevent orphaned double-creation
        const currentPayment = payment
          ? await tx.payment.findUnique({ where: { id: payment.id } })
          : await tx.payment.findUnique({ where: { gatewayId } });

        if (currentPayment && currentPayment.status === 'SUCCEEDED') {
          console.info(`[Payment] ${gatewayId} already processed (atomic idempotency hit)`);
          return;
        }

        if (currentPayment && currentPayment.amount > amount) {
          console.error(`[Payment] Amount underpayment exploit attempt for ${gatewayId}: expected ${currentPayment.amount}, got ${amount}`);
          throw new Error('PAYMENT_AMOUNT_MISMATCH: Underpayment detected. Order rejected.');
        }

        let processedPaymentId: string;
        let isOrderPayment: boolean;
        let linkedOrderId: string;

        if (currentPayment) {
          const updated = await tx.payment.updateMany({
            where: { id: currentPayment.id, status: 'PENDING' },
            data: { status: 'SUCCEEDED', gatewayId, amount, receiptId: receiptId || undefined }
          });
          if (updated.count === 0) return; // DB lock idempotency
          processedPaymentId = currentPayment.id;
          isOrderPayment = !!currentPayment.orderId;
          linkedOrderId = currentPayment.orderId || '';
        } else {
          // [SECURITY] Orphan webhook rejected
          console.error(`[SECURITY] Orphan webhook rejected for gatewayId: ${gatewayId}. No PENDING payment found.`);
          throw new Error('ORPHAN_WEBHOOK: Stray webhooks are no longer allowed to credit accounts. All payments must be initiated by the system.');
        }

        // [FIN-009] Removed awardCommission from payment.service.ts. 
        // Referral commissions are now awarded in order.service.ts based on order margin.

        // Assign funds locally
        if (isOrderPayment && linkedOrderId) {
          // Activate linked order
          const order = await tx.order.findUnique({ 
            where: { id: linkedOrderId },
            include: { user: { select: { email: true } }, service: { select: { name: true } } }
          });
          if (order && order.status === 'AWAITING_PAYMENT') {
            await tx.order.update({
              where: { id: linkedOrderId },
              data: { status: 'PENDING' }
            });
            activatedOrders.push({ 
              id: order.id, 
              isDripFeed: order.isDripFeed, 
              userId: userId, 
              amount: amount,
              userEmail: order.user?.email ?? null,
              serviceName: order.service?.name ?? null,
              numericId: order.numericId 
            });
            await WalletOps.credit(tx, userId, amount,
              `Оплата заказа #${order.numericId} через шлюз`,
              { idempotencyKey: `gateway-credit-${processedPaymentId}` }
            );
            await WalletOps.charge(tx, userId, Number(order.charge),
              `Списание за заказ #${order.numericId}`,
              { idempotencyKey: `gateway-charge-${order.id}` }
            );
          }
        }

        // --- NEW BASKET LOGIC (Deposit-Driven 1:N Orders) ---
        const basketOrders = await tx.order.findMany({ 
          where: { paymentId: processedPaymentId, status: 'AWAITING_PAYMENT' },
          include: { user: { select: { email: true } }, service: { select: { name: true } } }
        });
        if (basketOrders.length > 0) {
           await tx.order.updateMany({
              where: { paymentId: processedPaymentId, status: 'AWAITING_PAYMENT' },
              data: { status: 'PENDING' }
           });
           
           for (const order of basketOrders) {
              activatedOrders.push({ 
                id: order.id, 
                isDripFeed: order.isDripFeed, 
                userId: userId, 
                amount: Number(order.charge),
                userEmail: order.user?.email ?? null,
                serviceName: order.service?.name ?? null,
                numericId: order.numericId 
              });
           }

            // Credit full paid amount first
            await WalletOps.credit(tx, userId, amount,
              `Оплата корзины заказов через шлюз`,
              { idempotencyKey: `gateway-credit-${processedPaymentId}` }
            );
            // Charge each order individually
            for (const order of basketOrders) {
               await WalletOps.charge(tx, userId, Number(order.charge),
                 `Списание за заказ #${order.numericId ?? order.id}`,
                 { idempotencyKey: `gateway-charge-${order.id}` }
               );
            }

        }

        if (!isOrderPayment && basketOrders.length === 0) {
          // Direct top-up (Deposit) - Increment User Balance securely!
          await WalletOps.credit(tx, userId, amount,
            `Пополнение баланса через ${gatewayType}`,
            { idempotencyKey: `deposit-${processedPaymentId}` }
          );
        }
      });

      // Invalidate user dashboard cache so they see the new order & spending immediately
      revalidatePath('/dashboard', 'layout');
      
      // Dispatch paid orders to processing queue
      if (activatedOrders.length > 0) {
        const { ordersQueue } = await import('@/workers/queues');
        for (const activated of activatedOrders) {
          await ordersQueue.add('order-dispatch', { orderId: activated.id }, { delay: 3 * 60 * 1000 }); // 3 min cooling-off
          
          if (activated.userEmail && activated.serviceName) {
            void sendOrderPaidMail(
              activated.userEmail,
              activated.numericId!.toString(),
              activated.serviceName
            ).catch(err => console.error('[H1] sendOrderPaidMail failed', err));
          }
        }
      }

      // Check and issue promotional loyalty rewards based on new total spent
      import('@/services/users/promo-automation.service').then(mod => {
        mod.PromoAutomationService.checkAndIssueLoyalty(userId).catch(console.error);
      });

      return true;
    } catch (e: any) {
      console.error('[PaymentService] Error confirming payment:', e.message);
      return false;
    }
  }

  /**
   * Confirms a payment directly by paymentId (for mock/test flows).
   */
  async confirmPaymentById(paymentId: string): Promise<boolean> {
    try {
      let capturedUserId: string | null = null;
      const activatedOrders: { id: string; isDripFeed: boolean; userEmail?: string | null; serviceName?: string | null; numericId?: number }[] = [];

      await db.$transaction(async (tx) => {
        const payment = await tx.payment.findUniqueOrThrow({
          where: { id: paymentId }
        });

        const updatedPayment = await tx.payment.updateMany({
          where: { 
            id: paymentId,
            status: 'PENDING'
          },
          data: { 
            status: 'SUCCEEDED',
            gatewayId: `test_${Date.now()}`
          }
        });

        // If count is 0, another concurrent call already activated it
        if (updatedPayment.count === 0) return;

        capturedUserId = payment.userId;

        // [FIN-009] Removed awardCommission from payment.service.ts.
        // Referral commissions are now awarded in order.service.ts based on order margin.

        // Activate linked order
        if (payment.orderId) {
          const order = await tx.order.findUnique({
            where: { id: payment.orderId },
            include: { user: { select: { email: true } }, service: { select: { name: true } } }
          });

          if (order && order.status === 'AWAITING_PAYMENT') {
            await tx.order.update({
              where: { id: payment.orderId },
              data: { status: 'PENDING' }
            });
            activatedOrders.push({ 
              id: order.id, 
              isDripFeed: order.isDripFeed,
              userEmail: order.user?.email ?? null,
              serviceName: order.service?.name ?? null,
              numericId: order.numericId
            });
            
            await WalletOps.credit(tx, payment.userId, Number(payment.amount),
              `Оплата заказа #${order.numericId} через шлюз`,
              { idempotencyKey: `gateway-credit-${paymentId}` }
            );
            await WalletOps.charge(tx, payment.userId, Number(order.charge),
              `Списание за заказ #${order.numericId}`,
              { idempotencyKey: `gateway-charge-${order.id}` }
            );
          }
        }

        // --- NEW BASKET LOGIC (TEST MODE) ---
        const basketOrders = await tx.order.findMany({ 
          where: { paymentId: paymentId, status: 'AWAITING_PAYMENT' },
          include: { user: { select: { email: true } }, service: { select: { name: true } } }
        });
        if (basketOrders.length > 0) {
           await tx.order.updateMany({
              where: { paymentId: paymentId, status: 'AWAITING_PAYMENT' },
              data: { status: 'PENDING' }
           });
           
           for (const order of basketOrders) {
              activatedOrders.push({ 
                id: order.id, 
                isDripFeed: order.isDripFeed,
                userEmail: order.user?.email ?? null,
                serviceName: order.service?.name ?? null,
                numericId: order.numericId
              });
           }

            // Credit full paid amount first
            await WalletOps.credit(tx, payment.userId, Number(payment.amount),
              `Оплата корзины заказов через шлюз`,
              { idempotencyKey: `gateway-credit-${paymentId}` }
            );
            // Charge each order individually
            for (const order of basketOrders) {
               await WalletOps.charge(tx, payment.userId, Number(order.charge),
                 `Списание за заказ #${order.numericId ?? order.id}`,
                 { idempotencyKey: `gateway-charge-${order.id}` }
               );
            }

        }
      });

      revalidatePath('/dashboard', 'layout');

      // Dispatch paid orders to processing queue
      if (activatedOrders.length > 0) {
        const { ordersQueue } = await import('@/workers/queues');
        for (const activated of activatedOrders) {
          await ordersQueue.add('order-dispatch', { orderId: activated.id }, { delay: 3 * 60 * 1000 }); // 3 min cooling-off
          
          if (activated.userEmail && activated.serviceName) {
            void sendOrderPaidMail(
              activated.userEmail,
              activated.numericId!.toString(),
              activated.serviceName
            ).catch(err => console.error('[H1] sendOrderPaidMail failed', err));
          }
        }
      }

      if (capturedUserId) {
        import('@/services/users/promo-automation.service').then(mod => {
          mod.PromoAutomationService.checkAndIssueLoyalty(capturedUserId!).catch(console.error);
        });
      }

      return true;
    } catch (e: any) {
      console.error('[PaymentService] Error:', e.message);
      return false;
    }
  }
}

export const paymentService = new PaymentService();

