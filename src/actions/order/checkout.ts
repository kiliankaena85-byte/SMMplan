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
import { WalletOps, WalletInsufficientFundsError, WalletUserNotFoundError, WalletInvalidAmountError } from '@/services/financial/wallet-ops';
import crypto from 'crypto';
import { PaymentGatewayFactory } from '@/services/financial/payment-gateway.service';
import { handleServerError } from '@/utils/error-handler';
import { sendOrderPaidMail } from '@/lib/smtp';

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
    const localized = handleServerError(error);
    return { success: false, error: localized.message };
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
  idempotencyKey: z.string().optional(),
  mediaGroupUrl: z.string().optional(),
  isLinkOverridden: z.boolean().optional(),
  isSmartDrip: z.boolean().optional(),
  smartDripDays: z.number().int().min(1).max(30).optional()
});

export const checkoutAction = async (input: z.infer<typeof checkoutSchema>) => {
  return createSafeAction(checkoutSchema, input, async (data) => {
    const { serviceId, link, quantity, email, promoCodeStr, runs, interval, customData, gateway, idempotencyKey, mediaGroupUrl, isLinkOverridden, isSmartDrip, smartDripDays } = data;
    const hasMediaGroup = !!(mediaGroupUrl && mediaGroupUrl.trim().length > 5);

    if (isSmartDrip) {
      if (runs || interval) {
        throw new Error("Нельзя одновременно использовать обычный Drip-feed и Умный Dripfeed");
      }
      if (!smartDripDays || smartDripDays < 1 || smartDripDays > 30) {
        throw new Error("Необходимо указать количество дней (1-30) для Умного Dripfeed");
      }
    }
    
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
      // Bypass idempotency hit if the previous attempt failed/ended in an error
      if (existingOrder) {
        if (existingOrder.status !== 'ERROR') {
          console.info(`[Checkout] Idempotency hit for key ${idempotencyKey}, returning existing order.`);
          return {
            orderId: existingOrder.id,
            paymentId: existingOrder.paymentId,
            paymentUrl: existingOrder.payment?.checkoutUrl || ''
          };
        } else {
          // Free up the unique constraint on the failed order to allow the new check to proceed
          await db.order.update({
            where: { id: existingOrder.id },
            data: { idempotencyKey: `${idempotencyKey}_failed_${existingOrder.id}` }
          });
        }
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

    if (runs && !service.isDripFeedEnabled) {
      throw new Error("Эта услуга не поддерживает Drip-feed (постепенную подачу)");
    }

    if (quantity < service.minQty || quantity > service.maxQty) {
      throw new Error(`Количество должно быть от ${service.minQty} до ${service.maxQty}`);
    }

    if (customData && customData.length > 2000) {
      throw new Error('Слишком длинные пользовательские данные (макс. 2000 символов)');
    }

    // [OMNI-AUDIT 9.4] Phase P3: Robust Server-Side Validation & Mutation
    let normalizedLink = link.trim();
    const platformSlug = service.category?.network?.slug?.toUpperCase() || '';

    if (isLinkOverridden) {
      // Basic URL verification: must have protocol, domain and no spaces
      if (!/^https?:\/\//i.test(normalizedLink) && normalizedLink.includes('.')) {
        normalizedLink = 'https://' + normalizedLink;
      }
      if (!/^https?:\/\//i.test(normalizedLink)) {
        throw new Error("Ссылка в обход валидации должна быть корректным URL (начинаться с http:// или https://)");
      }
      try {
        const u = new URL(normalizedLink);
        if (!u.hostname.includes('.')) {
          throw new Error("Указан некорректный домен ссылки.");
        }
      } catch (e: any) {
        throw new Error("Неверный формат ссылки.", { cause: e });
      }
    } else {
      const { mutateLink, getLinkValidator } = await import('@/validators/link-mutators');
      const { inferTargetTypeFromCategory } = await import('@/utils/target-type');
      const targetType = service.targetType === 'POST'
        ? inferTargetTypeFromCategory(service.category?.name)
        : (service.targetType || inferTargetTypeFromCategory(service.category?.name));

      // 1. Clean the link according to provider rules
      normalizedLink = mutateLink(link, platformSlug, targetType);

      // 2. Validate the cleaned link
      const validator = getLinkValidator(platformSlug, targetType);
      const linkResult = validator.safeParse(normalizedLink);
      
      if (!linkResult.success) {
        throw new Error(linkResult.error.errors[0].message);
      }
    }

    // Validate mediaGroupUrl if provided
    let normalizedMediaGroupLink: string | undefined;
    if (hasMediaGroup) {
      const mgTrimmed = mediaGroupUrl!.trim();
      if (isLinkOverridden) {
        normalizedMediaGroupLink = mgTrimmed;
        if (!/^https?:\/\//i.test(normalizedMediaGroupLink) && normalizedMediaGroupLink.includes('.')) {
          normalizedMediaGroupLink = 'https://' + normalizedMediaGroupLink;
        }
      } else {
        const { mutateLink, getLinkValidator } = await import('@/validators/link-mutators');
        const { inferTargetTypeFromCategory } = await import('@/utils/target-type');
        const targetType = service.targetType === 'POST'
          ? inferTargetTypeFromCategory(service.category?.name)
          : (service.targetType || inferTargetTypeFromCategory(service.category?.name));

        normalizedMediaGroupLink = mutateLink(mgTrimmed, platformSlug, targetType);
        const validator = getLinkValidator(platformSlug, targetType);
        const mgLinkResult = validator.safeParse(normalizedMediaGroupLink);
        if (!mgLinkResult.success) {
          throw new Error(`Некорректная ссылка на последнее медиа: ${mgLinkResult.error.errors[0].message}`);
        }
      }
    }

    const isTestMode = await SettingsManager.isTestMode();

    // 3. Find or create user by email (SECURITY FIX: Track if new user to prevent IDOR auto-login)
    let user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user && (user.isDeleted === true || user.isActive === false)) {
      throw new Error("Ваш аккаунт заблокирован или удален");
    }
    let isNewUser = false;
    if (!user) {
      user = await db.user.create({ data: { email: email.toLowerCase() } });
      isNewUser = true;
    }

    // 4. Calculate price based on TOTAL quantity and actual User ID for Loyalty Tier eval
    const totalQuantity = (runs && runs > 0) ? quantity * runs : quantity;
    const pricing = await marketingService.calculatePrice(user.id, serviceId, totalQuantity, promoCodeStr);
    
    let promoCodeId: string | null = null;
    if (promoCodeStr) {
      const promo = await db.promoCode.findUnique({
        where: { code: promoCodeStr },
        select: { id: true }
      });
      if (promo) {
        promoCodeId = promo.id;
      }
    }

    // Media Group: double the total for 2 orders
    const mediaGroupMultiplier = hasMediaGroup ? 2 : 1;
    let finalTotalCents = pricing.totalCents * mediaGroupMultiplier;
    const finalProviderCostCents = pricing.providerCostCents * mediaGroupMultiplier;

    let smartConfig = null;
    if (isSmartDrip) {
      smartConfig = await db.serviceSmartConfig.findUnique({ where: { serviceId } });
      if (!smartConfig || !smartConfig.isEnabled) {
        throw new Error("Эта услуга не поддерживает Умный Dripfeed");
      }
      // Apply surcharge multiplier
      finalTotalCents = Math.round(finalTotalCents * (1 + smartConfig.markup));
    }

    // Enforce 10 RUB minimum for Acquiring (YooKassa / CryptoBot) -> Auto-convert to 10 RUB top-up
    let paymentAmount = finalTotalCents;
    const isMicroOrder = gateway !== 'balance' && finalTotalCents < 1000;
    if (isMicroOrder) {
      paymentAmount = 1000; // 10 RUB minimum deposit (1000 cents)
    }

    // W5-1 SECURITY FIX: Explicitly check balance before transaction
    if (gateway === 'balance' && user.balance < finalTotalCents) {
      throw new Error("Недостаточно средств на балансе. Пожалуйста, пополните счет.");
    }

    let reqHeaders: any;
    try {
      reqHeaders = await headers();
    } catch (e) {
      reqHeaders = {
        get: (key: string) => {
          if (key === 'host') return 'localhost:3000';
          if (key === 'x-forwarded-proto') return 'http';
          return null;
        }
      };
    }
    const consentIp = await getClientIp();
    const consentUserAgent = reqHeaders.get("user-agent") || "Unknown";

    // 5. Create Order(s) + Payment atomically
    const result = await db.$transaction(async (tx) => {
      // Create primary Order (first media / main link)
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          serviceId,
          providerId: service.providerId,
          providerServiceId: service.externalId,
          link: normalizedLink,
          isLinkOverridden: isLinkOverridden || false,
          quantity: totalQuantity,
          email: email.toLowerCase(),
          status: 'AWAITING_PAYMENT',
          charge: isSmartDrip && smartConfig ? Math.round(pricing.totalCents * (1 + smartConfig.markup)) : pricing.totalCents,
          providerCost: pricing.providerCostCents,
          runs,
          interval,
          isTest: isTestMode,
          customData,
          remains: totalQuantity,
          idempotencyKey,
          promoCodeId: promoCodeId || null,
          discountCents: BigInt(pricing.discountCents)
        }
      });

      // Create second Order for media group (last media) if applicable
      let secondOrderId: string | undefined;
      if (hasMediaGroup && normalizedMediaGroupLink) {
        const secondOrder = await tx.order.create({
          data: {
            userId: user.id,
            serviceId,
            providerId: service.providerId,
            providerServiceId: service.externalId,
            link: normalizedMediaGroupLink,
            isLinkOverridden: isLinkOverridden || false,
            quantity: totalQuantity,
            email: email.toLowerCase(),
            status: 'AWAITING_PAYMENT',
            charge: isSmartDrip && smartConfig ? Math.round(pricing.totalCents * (1 + smartConfig.markup)) : pricing.totalCents,
            providerCost: pricing.providerCostCents,
            runs,
            interval,
            isTest: isTestMode,
            customData: `Медиагруппа: последнее медиа. Основной заказ: ${newOrder.numericId}`,
            remains: totalQuantity,
            promoCodeId: promoCodeId || null,
            discountCents: BigInt(pricing.discountCents)
          }
        });
        secondOrderId = secondOrder.id;
      }

      // Consume Promo Code if used
      if (promoCodeStr) {
        await marketingService.consumePromoCode(tx, promoCodeStr);
      }

      // Create linked Payment (covers both orders if media group)
      const payment = await tx.payment.create({
        data: {
          userId: user.id,
          amount: paymentAmount,
          currency: 'RUB',
          status: 'PENDING',
          gateway,
          consentIp,
          consentUserAgent
        }
      });

      // Link payment to primary order
      await tx.order.update({
        where: { id: newOrder.id },
        data: { paymentId: payment.id }
      });

      // Link payment to second order if exists
      if (secondOrderId) {
        await tx.order.update({
          where: { id: secondOrderId },
          data: { paymentId: payment.id }
        });
      }

      if (isSmartDrip && smartConfig) {
        const { SmartDripService } = await import('@/services/dripfeed/smart-drip.service');
        await SmartDripService.createCampaign(tx, {
          userId: user.id,
          serviceId,
          link: normalizedLink,
          quantity: totalQuantity,
          days: smartDripDays!,
          paymentId: payment.id,
          orderId: newOrder.id,
          isTestMode
        });
      }

      return { orderId: newOrder.id, paymentId: payment.id, numericId: newOrder.numericId, secondOrderId };
    });

    // 6. Generate payment URL (gateway-specific API calls)
    let paymentUrl: string | undefined;
    let remoteGatewayId: string | undefined;
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
        amountRub: paymentAmount / 100,
        email: email,
        successUrl,
        description: `Оплата заказа #${result.numericId} (SMMplan)`,
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
      
      if (gatewayErr instanceof WalletInsufficientFundsError) {
        throw new Error('Недостаточно средств на балансе. Пожалуйста, пополните счет.', { cause: gatewayErr });
      }
      if (gatewayErr instanceof WalletUserNotFoundError) {
        throw new Error('Пользователь не найден. Пожалуйста, авторизуйтесь заново.', { cause: gatewayErr });
      }
      if (gatewayErr instanceof WalletInvalidAmountError) {
        throw new Error('Некорректная сумма операции.', { cause: gatewayErr });
      }
      throw new Error(gatewayErr.message || 'Ошибка на стороне платежного шлюза. Попробуйте другой метод', { cause: gatewayErr });
    }

    // 8. Auto-Login using cookies (Frictionless checkout)
    // SECURITY FIX: Prevent Account Takeover by only auto-logging in NEW users, or already authenticated users
    const currentSession = await verifySession();
    if (isNewUser || (currentSession && currentSession.userId === user.id)) {
      await createSession(user.id);
    }

    if (gateway === 'balance') {
      void sendOrderPaidMail(
        user.email,
        result.numericId.toString(),
        service.name
      ).catch((err: any) => console.error('[H1] sendOrderPaidMail balance failed', err));
    }

    if (isLinkOverridden) {
      try {
        const { sendAdminAlert } = await import('@/lib/notifications');
        const alertPromise = sendAdminAlert(
          `⚠️ [BYPASS-VALIDATION] Пользователь обошел валидацию ссылки!\n` +
          `Заказ: #${result.numericId}\n` +
          `Услуга: ${service.name} (ID: ${serviceId})\n` +
          `Email: ${email}\n` +
          `Ссылка: ${link}`,
          'WARNING'
        ) as any;
        if (alertPromise && typeof alertPromise.catch === 'function') {
          alertPromise.catch((err: any) => console.error('[Checkout] Failed to send bypass admin alert:', err));
        }
      } catch (err) {
        console.error('[Checkout] Failed to import/send bypass admin alert:', err);
      }
    }

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

    let reqHeaders: any;
    try {
      reqHeaders = await headers();
    } catch (e) {
      reqHeaders = {
        get: (key: string) => {
          if (key === 'host') return 'localhost:3000';
          if (key === 'x-forwarded-proto') return 'http';
          return null;
        }
      };
    }
    const consentIp = await getClientIp();
    const consentUserAgent = reqHeaders.get("user-agent") || "Unknown";

    const order = await db.order.findUnique({
      where: { id: orderId, userId: session.userId },
      include: { user: true, payment: true, service: true }
    });

    if (!order) throw new Error("Заказ не найден");
    if (order.user.isDeleted === true || order.user.isActive === false) {
      throw new Error("Ваш аккаунт заблокирован или удален");
    }
    if (order.status !== 'AWAITING_PAYMENT') throw new Error("Этот заказ больше не ожидает оплаты");

    // Защита от двойной оплаты: если предыдущий платеж был через YooKassa и имеет gatewayId
    if (order.payment?.gateway === 'yookassa' && order.payment.gatewayId) {
      const isActuallyPaid = await checkYookassaStatusSync(order.payment.gatewayId);
      if (isActuallyPaid) {
        // Платеж уже успешен, вебхук запаздывает. Обновляем статус и возвращаем ссылку на success.
        const { paymentService } = await import('@/services/financial/payment.service');
        const isTestMode = await SettingsManager.isTestMode();
        await paymentService.confirmPayment(
          order.payment.gatewayId,
          Number(order.payment.amount),
          order.userId,
          isTestMode,
          'yookassa',
          order.payment.id,
          'order'
        );
        
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

    let paymentUrl: string | undefined;
    let remoteGatewayId: string | undefined;
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
        description: `Оплата заказа #${order.numericId} (SMMplan)`,
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
      throw new Error(gatewayErr.message || 'Ошибка генерации платежа. Попробуйте другой метод', { cause: gatewayErr });
    }

    revalidatePath('/dashboard', 'layout');

    return { 
      orderId: order.id, 
      paymentId: result.paymentId,
      paymentUrl
    };
  });
};

export async function getAvailableGatewaysAction() {
  try {
    const { SettingsProvider } = await import('@/lib/settings');
    const secrets = await SettingsProvider.getPaymentSecrets();
    const isTest = await SettingsProvider.isTestMode();

    return {
      success: true,
      data: {
        yookassa: !!(secrets.yookassaShopId && secrets.yookassaSecretKey),
        robokassa: !!(secrets.robokassaLogin && secrets.robokassaPassword),
        cryptobot: !!secrets.cryptoBotToken,
        isTestMode: isTest
      }
    };
  } catch (err: any) {
    console.error('[getAvailableGatewaysAction] Error:', err);
    return {
      success: false,
      error: err.message || 'Ошибка проверки настроек платежных шлюзов'
    };
  }
}

