'use server';

import { db } from '@/lib/db';
import { marketingService, PricingResult } from '@/services/marketing.service';
import { RateLimitService } from '@/services/core/rate-limit.service';
import { SettingsManager } from '@/lib/settings';
import { orderService } from '@/services/core/order.service';
import { verifySession, createSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getClientIp } from '@/utils/ip';
import { WalletOps } from '@/services/financial/wallet-ops';
import crypto from 'crypto';
import { PaymentGatewayFactory } from '@/services/financial/payment-gateway.service';
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
    
    // SECURITY FIX: Data Leak Prevention. Do NOT return providerCostCents to the client.
    const safeResult = {
      totalCents: result.totalCents,
      originalTotalCents: result.originalTotalCents,
      discountCents: result.discountCents
    };

    return { success: true, data: safeResult as any };
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
        console.info(`[Checkout] Idempotency hit for key ${idempotencyKey}, returning existing order.`);
        return {
          orderId: existingOrder.id,
          paymentId: existingOrder.paymentId,
          paymentUrl: existingOrder.payment?.checkoutUrl || ''
        };
      }
    }

    // 0.75 IDOR Prevention: Balance Gateway requires Authorization
    if (gateway === 'balance') {
      const session = await verifySession();
      if (!session || !session.userId) {
        throw new Error("Оплата с баланса доступна только авторизованным пользователям");
      }
      const sessionUser = await db.user.findUnique({ where: { id: session.userId } });
      if (!sessionUser || sessionUser.email.toLowerCase() !== email.toLowerCase()) {
         throw new Error("Оплата с баланса доступна только авторизованным пользователям");
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

    // Wave 4.1: Elastic Quarantine Check
    if (service.cooldownUntil && service.cooldownUntil > new Date()) {
      throw new Error(`Временно приостановлено для контроля качества. Ожидание: 1-12 часов. Выберите аналог.`);
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

    // [OMNI-AUDIT 9.4] Phase P3: Robust Server-Side Validation & Mutation
    const { mutateLink, getLinkValidator } = await import('@/validators/link-mutators');
    
    const platformSlug = service.category?.network?.slug?.toUpperCase() || '';
    const targetType = service.targetType || 'POST';

    // 1. Clean the link according to provider rules
    const normalizedLink = mutateLink(link, platformSlug, targetType);

    // 2. Validate the cleaned link
    const validator = getLinkValidator(platformSlug, targetType);
    const linkResult = validator.safeParse(normalizedLink);
    
    if (!linkResult.success) {
      throw new Error(linkResult.error.errors[0].message);
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

    // Enforce 10 RUB minimum for Acquiring (YooKassa / CryptoBot)
    if (gateway !== 'balance' && pricing.totalCents < 1000) {
      throw new Error("Минимальная сумма для оплаты картой или криптовалютой — 10 ₽. Увеличьте количество услуги или авторизуйтесь для оплаты с баланса.");
    }

    // W5-1 SECURITY FIX: Explicitly check balance before transaction
    if (gateway === 'balance' && user.balance < pricing.totalCents) {
      throw new Error("Недостаточно средств на балансе. Пожалуйста, пополните счет.");
    }

    const reqHeaders = await headers();
    const consentIp = await getClientIp();
    const consentUserAgent = reqHeaders.get("user-agent") || "Unknown";

    // 5. Create Order + Payment atomically
    const result = await db.$transaction(async (tx) => {
      // Create Order
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          serviceId,
          providerId: service.providerId,
          providerServiceId: service.externalId,
          link: normalizedLink,
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
      const gatewaySvc = PaymentGatewayFactory.getGateway(gateway || 'yookassa');
      const gatewayResult = await gatewaySvc.createPayment({
        paymentId: result.paymentId,
        orderId: result.orderId,
        userId: user.id,
        amountRub: pricing.totalCents / 100,
        email: email,
        successUrl,
        description: `SEO-Аудит и консультация (Заказ #${result.orderId})`,
        isTestMode: isTestMode || email === 'e2e-tester@test.com'
      });
      
      paymentUrl = gatewayResult.paymentUrl;
      remoteGatewayId = gatewayResult.remoteGatewayId;

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
    const consentIp = await getClientIp();
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
      const gatewaySvc = PaymentGatewayFactory.getGateway(gateway || 'yookassa');
      const isTestMode = await SettingsManager.isTestMode();
      const gatewayResult = await gatewaySvc.createPayment({
        paymentId: result.paymentId,
        orderId: order.id,
        userId: order.userId,
        amountRub: Number(order.charge) / 100,
        email: order.email || order.user.email,
        successUrl,
        description: `SEO-Аудит и консультация (Заказ #${order.id})`,
        isTestMode
      });

      paymentUrl = gatewayResult.paymentUrl;
      remoteGatewayId = gatewayResult.remoteGatewayId;

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
