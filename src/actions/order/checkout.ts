'use server';

import { db } from '@/lib/db';
import { marketingService, PricingResult } from '@/services/marketing.service';
import { RateLimitService } from '@/services/core/rate-limit.service';
import { SettingsManager } from '@/lib/settings';
import { orderService } from '@/services/core/order.service';
import { verifySession, createSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import crypto from 'crypto';

/**
 * Calculates price for display on the order form (no auth required).
 */
export async function calculatePriceAction(
  serviceId: string,
  quantity: number,
  promoCodeStr?: string,
  runs?: number
): Promise<{ success: boolean; data?: PricingResult; error?: string }> {
  try {
    const service = await db.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive) {
      return { success: false, error: "Услуга не найдена или неактивна" };
    }

    const totalQuantity = (runs && runs > 0) ? quantity * runs : quantity;
    const result = await marketingService.calculatePrice(
      null, // No user context needed for price preview
      serviceId,
      totalQuantity,
      promoCodeStr
    );
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Pay-Per-Order Checkout Flow:
 * 1. Calculate price
 * 2. Create Order as AWAITING_PAYMENT
 * 3. Create Payment as PENDING linked to Order
 * 4. Return payment data for frontend redirect to YooKassa/CryptoBot
 */
import { z } from 'zod';
import { createSafeAction } from '@/lib/safe-action';
import { MutexManager } from '@/lib/redis-lock';

const checkoutSchema = z.object({
  serviceId: z.string(),
  link: z.string().min(3, "Ссылка слишком короткая").refine(val => !val.includes(' '), "Ссылка не должна содержать пробелов"),
  quantity: z.number().min(1),
  email: z.string().email("Неверный email"),
  promoCodeStr: z.string().optional(),
  runs: z.number().int().positive().optional(),
  interval: z.number().int().positive().optional(),
  customData: z.string().optional(),
  gateway: z.string().default('yookassa'),
  idempotencyKey: z.string().optional()
});

export const checkoutAction = async (input: z.infer<typeof checkoutSchema>) => {
  return createSafeAction(checkoutSchema, input, async (data) => {
    const { serviceId, link, quantity, email, promoCodeStr, runs, interval, customData, gateway, idempotencyKey } = data;
    
    // 0. Rate limit
    const isAllowed = await RateLimitService.check("checkoutCore", 15, 60);
    if (!isAllowed) {
      throw new Error("Слишком много запросов. Попробуйте через минуту.");
    }

    // 0.5 Idempotency Check (Wave 1)
    if (idempotencyKey) {
      const existingOrder = await db.order.findUnique({
        where: { idempotencyKey },
        include: { payment: true }
      });
      if (existingOrder) {
        console.log(`[Checkout] Idempotency hit for key ${idempotencyKey}, returning existing order.`);
        return {
          orderId: existingOrder.id,
          paymentId: existingOrder.paymentId,
          paymentUrl: existingOrder.payment?.checkoutUrl || ''
        };
      }
    }

    // 1. Validate email
    if (!email || !email.includes('@')) {
      throw new Error("Введите корректный email");
    }

    // 2. Validate service exists
    const service = await db.service.findUnique({ 
      where: { id: serviceId },
      include: { category: { include: { network: true } } }
    });
    if (!service || !service.isActive) {
      throw new Error("Услуга не найдена или неактивна");
    }

    if (!service.externalId) {
      throw new Error("Услуга не привязана к провайдеру");
    }

    if (quantity < service.minQty || quantity > service.maxQty) {
      throw new Error(`Количество должно быть от ${service.minQty} до ${service.maxQty}`);
    }

    if (customData && customData.length > 5000) {
      throw new Error('Слишком длинные пользовательские данные (макс. 5000 символов)');
    }

    // Platform specific URL validation
    const platform = service.category?.network?.name?.toLowerCase() || '';
    const normalizedLink = link.toLowerCase();
    
    if (platform === 'telegram' && !normalizedLink.includes('t.me/') && !normalizedLink.includes('@')) {
      throw new Error('Для Telegram ссылка должна содержать "t.me/" или "@username"');
    }
    if (platform.includes('vk') && !normalizedLink.includes('vk.com/') && !normalizedLink.includes('vk.ru/')) {
      throw new Error('Для ВКонтакте ссылка должна содержать "vk.com/"');
    }
    if (platform === 'instagram' && !normalizedLink.includes('instagram.com/')) {
      throw new Error('Для Instagram ссылка должна содержать "instagram.com/"');
    }
    if (platform === 'youtube' && !normalizedLink.includes('youtube.com/') && !normalizedLink.includes('youtu.be/')) {
      throw new Error('Для YouTube ссылка должна содержать "youtube.com/" или "youtu.be/"');
    }

    const isTestMode = await SettingsManager.isTestMode();

    // 3. Find or create user by email using atomic upsert (prevents race conditions)
    const user = await db.user.upsert({
      where: { email: email.toLowerCase() },
      update: {},
      create: { email: email.toLowerCase() }
    });

    // 4. Calculate price based on TOTAL quantity and actual User ID for Loyalty Tier eval
    const totalQuantity = (runs && runs > 0) ? quantity * runs : quantity;
    const pricing = await marketingService.calculatePrice(user.id, serviceId, totalQuantity, promoCodeStr);

    const reqHeaders = await headers();
    const consentIp = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || "127.0.0.1";
    const consentUserAgent = reqHeaders.get("user-agent") || "Unknown";

    // 5. Create Order + Payment atomically
    const result = await db.$transaction(async (tx) => {
      // Create Order
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          serviceId,
          link,
          quantity: totalQuantity,
          email: email.toLowerCase(),
          status: 'AWAITING_PAYMENT',
          charge: pricing.totalCents,
          providerCost: pricing.providerCostCents,
          runs,
          interval,
          isTest: isTestMode,
          customData,
          remains: totalQuantity,
          idempotencyKey
        }
      });

      // Consume Promo Code if used
      if (promoCodeStr) {
        await marketingService.consumePromoCode(tx, promoCodeStr);
      }

      // Create linked Payment
      const payment = await tx.payment.create({
        data: {
          userId: user.id,
          amount: pricing.totalCents,
          currency: 'RUB',
          status: 'PENDING',
          gateway,
          consentIp,
          consentUserAgent
        }
      });

      // BUG-001 FIX: Правильная связь через Order.paymentId (не legacy Payment.orderId)
      await tx.order.update({
        where: { id: newOrder.id },
        data: { paymentId: payment.id }
      });

      return { orderId: newOrder.id, paymentId: payment.id };
    });

    // 6. Generate payment URL (gateway-specific API calls)
    const amountRub = (pricing.totalCents / 100).toFixed(2);
    let paymentUrl = '';
    let remoteGatewayId = '';
    let host = reqHeaders.get("host") || "localhost:3000";
    if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
    const protocol = reqHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    let origin = `${protocol}://${host}`;
    if (process.env.NEXT_PUBLIC_APP_URL) {
      origin = process.env.NEXT_PUBLIC_APP_URL;
    }
    if (origin.includes("0.0.0.0")) origin = origin.replace("0.0.0.0", "localhost");
    const successUrl = `${origin}/success?orderId=${result.orderId}`;

    try {
      if (gateway === 'balance') {
        // We will perform atomic deduction inside the transaction to prevent race condition double-spending
        // AND use a Redis Mutex to completely serialize processing per-user for the balance gateway.
        await MutexManager.withLock(`balance_lock_${user.id}`, 30000, 5000, async () => {
          await db.$transaction(async (tx) => {
            // BUG-003 FIX: Check balance BEFORE decrement
            const userBefore = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
            if (userBefore.balance < pricing.totalCents) {
              throw new Error('Недостаточно средств на внутреннем балансе. Транзакция отклонена.');
            }

            await tx.user.update({
              where: { id: user.id },
              data: { 
                balance: { decrement: pricing.totalCents },
                totalSpent: { increment: pricing.totalCents } 
              }
            });

            await tx.ledgerEntry.create({
              data: {
                userId: user.id,
                amount: -pricing.totalCents,
                reason: `Оплата заказа ${result.orderId} (Списание)`,
                status: 'APPROVED'
              }
            });

            await tx.payment.update({
              where: { id: result.paymentId },
              data: { status: 'SUCCEEDED', gatewayId: `internal_${Date.now()}` }
            });
            await tx.order.update({
              where: { id: result.orderId },
              data: { status: 'PENDING' }
            });
          });
        });

        // Add to queue with cooling-off delay (Consistency Fix)
        const order = await db.order.findUnique({ where: { id: result.orderId } });
        if (order) {
          const { ordersQueue, dripfeedQueue } = require('@/workers/queues');
          if (order.isDripFeed) {
            await dripfeedQueue.add('dripfeed-start', { orderId: order.id }, { delay: 3 * 60 * 1000 });
          } else {
            await ordersQueue.add('order-dispatch', { orderId: order.id }, { delay: 3 * 60 * 1000 });
          }
        }

        paymentUrl = successUrl;
        remoteGatewayId = `internal_${Date.now()}`;
      } else if (gateway === 'yookassa') {
        if (process.env.NODE_ENV === 'test') {
          paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/mock-payment?paymentId=${result.paymentId}&orderId=${result.orderId}`;
          remoteGatewayId = `mock_${Date.now()}`;
        } else {
          const secrets = await SettingsManager.getPaymentSecrets();
          const shopId = secrets.yookassaShopId;
          const secretKey = secrets.yookassaSecretKey;
          if (!shopId || !secretKey) throw new Error('YooKassa is not configured in Admin Panel');

        const isTestMode = await SettingsManager.isTestMode();
        const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
        const payload: any = {
          amount: { value: amountRub, currency: 'RUB' },
          capture: true,
          confirmation: { type: 'redirect', return_url: successUrl },
          description: `SEO-Аудит и консультация (Заказ #${result.orderId})`, // [SECURITY] PB-001: Stealth Merchant Description
          metadata: { paymentId: result.paymentId, orderId: result.orderId, userId: user.id }
        };

        // В тестовом режиме ЮKassa чек часто вызывает 400 Bad Request, если не подключена тестовая касса
        if (!isTestMode) {
          payload.receipt = {
            customer: {
              email: email || user.email || 'no-reply@smmplan.ru'
            },
            items: [
              {
                description: "Услуги SEO-аудита и цифрового маркетинга",
                quantity: "1.00",
                amount: {
                  value: amountRub,
                  currency: 'RUB'
                },
                vat_code: 1, // Без НДС
                payment_mode: "full_prepayment",
                payment_subject: "service"
              }
            ]
          };
        }

        const idempKey = crypto.createHash('sha256')
          .update(`yookassa_${user.id}_${serviceId}_${quantity}_${link}_${Math.floor(Date.now() / 60000)}`)
          .digest('hex').substring(0, 36);

        const resp = await fetch('https://api.yookassa.ru/v3/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
            'Idempotence-Key': idempKey
          },
          body: JSON.stringify(payload)
        });

        if (!resp.ok) {
          console.error('[Checkout] YooKassa API Error:', await resp.text());
          throw new Error('Ошибка шлюза YooKassa');
        }

        const data = await resp.json();
        paymentUrl = data.confirmation.confirmation_url;
        remoteGatewayId = data.id;
        }
      } else if (gateway === 'cryptobot') {
        if (process.env.NODE_ENV === 'test') {
          paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/mock-payment?paymentId=${result.paymentId}&orderId=${result.orderId}`;
          remoteGatewayId = `mock_${Date.now()}`;
        } else {

          const secrets = await SettingsManager.getPaymentSecrets();
          const cryptoToken = secrets.cryptoBotToken;
          if (!cryptoToken) throw new Error('CryptoBot is not configured in Admin Panel');

          const resp = await fetch('https://pay.crypt.bot/api/createInvoice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Crypto-Pay-API-Token': cryptoToken
            },
            body: JSON.stringify({
              currency_type: 'fiat', // Allow paying in TON but amount specified in RUB
              fiat: 'RUB',
              amount: amountRub,
              description: `Заказ Smmplan #${result.orderId}`,
              hidden_message: `Ваш заказ: ${result.orderId}`,
              payload: result.paymentId
            })
          });

          if (!resp.ok) {
            console.error('[Checkout] CryptoBot API Error:', await resp.text());
            throw new Error('Ошибка шлюза CryptoBot');
          }

          const data = await resp.json();
          if (!data.ok) throw new Error('CryptoBot returned error: ' + JSON.stringify(data.error));
          
          paymentUrl = data.result.pay_url;
          remoteGatewayId = data.result.invoice_id.toString();
        }
      }

      // 7. Store the remoteGatewayId and checkoutUrl on the Payment record so Webhooks can match it and Users can resume payment
      if (remoteGatewayId || paymentUrl) {
        await db.payment.update({
          where: { id: result.paymentId },
          data: { 
            gatewayId: remoteGatewayId || undefined,
            checkoutUrl: paymentUrl || undefined
          }
        });
      }
    } catch (gatewayErr: any) {
      // 7.b ROLLBACK: If Gateway failed, restore PromoCode and mark Payment as ERROR safely
      console.error('[Checkout] Gateway sequence failed, rolling back sequence', gatewayErr);
      
      const rollbackPromises: Promise<any>[] = [
        db.payment.update({
          where: { id: result.paymentId },
          data: { status: 'CANCELED' }
        }).catch(e => console.error('[Checkout] Failed to cancel payment:', e)),
        
        db.order.update({
          where: { id: result.orderId },
          data: { status: 'ERROR', error: gatewayErr.message || 'Ошибка генерации платежа' }
        }).catch(e => console.error('[Checkout] Failed to error order:', e))
      ];

      if (promoCodeStr) {
        // Atomic rollback: only decrement if uses > 0 to prevent negative counters
        rollbackPromises.push(
          db.promoCode.updateMany({
             where: { code: promoCodeStr, uses: { gt: 0 } },
             data: { uses: { decrement: 1 } }
          }).catch(e => console.error('[Checkout] Failed to rollback promo:', e))
        );
      }
      
      await Promise.allSettled(rollbackPromises);
      
      throw new Error(gatewayErr.message || 'Ошибка на стороне платежного шлюза. Попробуйте другой метод');
    }

    // 8. Auto-Login using cookies (Frictionless checkout)
    await createSession(user.id);

    revalidatePath('/dashboard', 'layout');

    return { 
      orderId: result.orderId, 
      paymentId: result.paymentId,
      paymentUrl
    };
  });
};

const retryCheckoutSchema = z.object({
  orderId: z.string(),
  gateway: z.string().default('yookassa')
});

// Утилита для синхронной проверки статуса YooKassa (предотвращение двойной оплаты)
async function checkYookassaStatusSync(gatewayId: string): Promise<boolean> {
  try {
    const secrets = await SettingsManager.getPaymentSecrets();
    const shopId = secrets.yookassaShopId;
    const secretKey = secrets.yookassaSecretKey;
    if (!shopId || !secretKey) return false;

    const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    const resp = await fetch(`https://api.yookassa.ru/v3/payments/${gatewayId}`, {
      method: 'GET',
      headers: { 'Authorization': authHeader }
    });

    if (!resp.ok) return false;
    const data = await resp.json();
    return data.status === 'succeeded' || data.status === 'waiting_for_capture';
  } catch (e) {
    console.error('[YookassaSync] Error checking status', e);
    return false;
  }
}

export const retryCheckoutAction = async (input: z.infer<typeof retryCheckoutSchema>) => {
  return createSafeAction(retryCheckoutSchema, input, async (data) => {
    const { orderId, gateway } = data;

    // BUG-002 FIX: Auth guard — prevent IDOR
    const session = await verifySession();
    if (!session) throw new Error("Необходима авторизация");

    const isAllowed = await RateLimitService.check("retryCheckoutCore", 10, 60);
    if (!isAllowed) throw new Error("Слишком много запросов. Попробуйте через минуту.");

    const reqHeaders = await headers();
    const consentIp = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || "127.0.0.1";
    const consentUserAgent = reqHeaders.get("user-agent") || "Unknown";

    const order = await db.order.findUnique({
      where: { id: orderId, userId: session.userId },
      include: { user: true, payment: true, service: true }
    });

    if (!order) throw new Error("Заказ не найден");
    if (order.status !== 'AWAITING_PAYMENT') throw new Error("Этот заказ больше не ожидает оплаты");

    // Защита от двойной оплаты: если предыдущий платеж был через YooKassa и имеет gatewayId
    if (order.payment?.gateway === 'yookassa' && order.payment.gatewayId) {
      const isActuallyPaid = await checkYookassaStatusSync(order.payment.gatewayId);
      if (isActuallyPaid) {
        // Платеж уже успешен, вебхук запаздывает. Обновляем статус и возвращаем ссылку на success.
        await db.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: order.payment!.id },
            data: { status: 'SUCCEEDED' }
          });
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'PENDING' }
          });
        });
        
        let host = reqHeaders.get("host") || "localhost:3000";
        if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
        const protocol = reqHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
        return { orderId: order.id, paymentId: order.payment.id, paymentUrl: `${protocol}://${host}/success` };
      }
    }

    const isTestMode = await SettingsManager.isTestMode();

    // Update existing payment or create new
    const result = await db.$transaction(async (tx) => {
      const existingPayment = order.payment || await tx.payment.findUnique({ where: { orderId: order.id } });

      if (existingPayment) {
        const updatedPayment = await tx.payment.update({
          where: { id: existingPayment.id },
          data: { 
            status: 'PENDING',
            gateway,
            consentIp,
            consentUserAgent
          }
        });

        // Самовосстановление связи, если она была утеряна из-за старой архитектуры
        if (!order.paymentId) {
          await tx.order.update({
            where: { id: order.id },
            data: { paymentId: updatedPayment.id }
          });
        }

        return { paymentId: updatedPayment.id };
      }

      const newPayment = await tx.payment.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          amount: order.charge,
          currency: 'RUB',
          status: 'PENDING',
          gateway,
          consentIp,
          consentUserAgent,
          orders: { connect: [{ id: order.id }] } // Правильное связывание
        }
      });

      return { paymentId: newPayment.id };
    });

    const amountRub = (Number(order.charge) / 100).toFixed(2);
    let paymentUrl = '';
    let remoteGatewayId = '';
    let host = reqHeaders.get("host") || "localhost:3000";
    if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
    const protocol = reqHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    let origin = `${protocol}://${host}`;
    if (process.env.NEXT_PUBLIC_APP_URL) {
      origin = process.env.NEXT_PUBLIC_APP_URL;
    }
    if (origin.includes("0.0.0.0")) origin = origin.replace("0.0.0.0", "localhost");
    const successUrl = `${origin}/success?orderId=${order.id}`;

    try {
      if (gateway === 'balance') {
        await MutexManager.withLock(`balance_lock_${order.userId}`, 30000, 5000, async () => {
          await db.$transaction(async (tx) => {
            // BUG-003 FIX: Check balance BEFORE decrement
            const userBefore = await tx.user.findUniqueOrThrow({ where: { id: order.userId } });
            if (userBefore.balance < order.charge) {
              throw new Error('Недостаточно средств на внутреннем балансе.');
            }

            await tx.user.update({
              where: { id: order.userId },
              data: { 
                balance: { decrement: order.charge },
                totalSpent: { increment: order.charge } 
              }
            });

            await tx.ledgerEntry.create({
              data: {
                userId: order.userId,
                amount: -order.charge,
                reason: `Оплата заказа ${order.id} (Списание)`,
                status: 'APPROVED'
              }
            });

            await tx.payment.update({
              where: { id: result.paymentId },
              data: { status: 'SUCCEEDED', gatewayId: `internal_${Date.now()}` }
            });
            await tx.order.update({
              where: { id: order.id },
              data: { status: 'PENDING' }
            });
          });
        });

        // Add to queue
        const { ordersQueue, dripfeedQueue } = require('@/workers/queues');
        if (order.isDripFeed) {
          await dripfeedQueue.add('dripfeed-start', { orderId: order.id }, { delay: 3 * 60 * 1000 });
        } else {
          await ordersQueue.add('order-dispatch', { orderId: order.id }, { delay: 3 * 60 * 1000 });
        }

        paymentUrl = successUrl;
        remoteGatewayId = `internal_${Date.now()}`;
      } else if (gateway === 'yookassa') {
        if (process.env.NODE_ENV === 'test') {
          paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/mock-payment?paymentId=${result.paymentId}&orderId=${order.id}`;
          remoteGatewayId = `mock_${Date.now()}`;
        } else {
          const secrets = await SettingsManager.getPaymentSecrets();
          const shopId = secrets.yookassaShopId;
          const secretKey = secrets.yookassaSecretKey;
          if (!shopId || !secretKey) throw new Error('YooKassa is not configured');

        const isTestMode = await SettingsManager.isTestMode();
        const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
        const payload: any = {
          amount: { value: amountRub, currency: 'RUB' },
          capture: true,
          confirmation: { type: 'redirect', return_url: successUrl },
          description: `SEO-Аудит и консультация (Заказ #${order.id})`,
          metadata: { paymentId: result.paymentId, orderId: order.id, userId: order.userId }
        };

        if (!isTestMode) {
          payload.receipt = {
            customer: { email: order.email || order.user.email || 'no-reply@smmplan.ru' },
            items: [{
              description: "Услуги SEO-аудита и цифрового маркетинга",
              quantity: "1.00",
              amount: { value: amountRub, currency: 'RUB' },
              vat_code: 1, payment_mode: "full_prepayment", payment_subject: "service"
            }]
          };
        }

        const idempKey = crypto.createHash('sha256')
          .update(`yookassa_retry_${order.userId}_${order.id}_${Math.floor(Date.now() / 60000)}`)
          .digest('hex').substring(0, 36);

        const resp = await fetch('https://api.yookassa.ru/v3/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader, 'Idempotence-Key': idempKey },
          body: JSON.stringify(payload)
        });

        if (!resp.ok) throw new Error('Ошибка шлюза YooKassa');
        const data = await resp.json();
        paymentUrl = data.confirmation.confirmation_url;
        remoteGatewayId = data.id;
        }
      } else if (gateway === 'cryptobot') {
        if (process.env.NODE_ENV === 'test') {
          paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/mock-payment?paymentId=${result.paymentId}&orderId=${order.id}`;
          remoteGatewayId = `mock_${Date.now()}`;
        } else {
          const secrets = await SettingsManager.getPaymentSecrets();
          if (!secrets.cryptoBotToken) throw new Error('CryptoBot is not configured');

          const resp = await fetch('https://pay.crypt.bot/api/createInvoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Crypto-Pay-API-Token': secrets.cryptoBotToken },
            body: JSON.stringify({
              currency_type: 'fiat', fiat: 'RUB', amount: amountRub,
              description: `Заказ Smmplan #${order.id}`,
              hidden_message: `Ваш заказ: ${order.id}`, payload: result.paymentId
            })
          });

          if (!resp.ok) throw new Error('Ошибка шлюза CryptoBot');
          const data = await resp.json();
          if (!data.ok) throw new Error('CryptoBot returned error');
          
          paymentUrl = data.result.pay_url;
          remoteGatewayId = data.result.invoice_id.toString();
        }
      }

      if (remoteGatewayId || paymentUrl) {
        await db.payment.update({
          where: { id: result.paymentId },
          data: { gatewayId: remoteGatewayId || undefined, checkoutUrl: paymentUrl || undefined }
        });
      }
    } catch (gatewayErr: any) {
      console.error('[RetryCheckout] Gateway failed', gatewayErr);
      await db.payment.update({ where: { id: result.paymentId }, data: { status: 'CANCELED' } });
      throw new Error(gatewayErr.message || 'Ошибка генерации платежа. Попробуйте другой метод');
    }

    revalidatePath('/dashboard', 'layout');

    return { 
      orderId: order.id, 
      paymentId: result.paymentId,
      paymentUrl
    };
  });
};
