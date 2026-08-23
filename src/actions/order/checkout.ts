'use server';

import { db } from '@/lib/db';
import { runSerializableTransaction } from '@/lib/transactions';
import { marketingService, PricingResult } from '@/services/marketing.service';
import { RateLimitService } from '@/services/core/rate-limit.service';
import { SettingsManager } from '@/lib/settings';
import { verifySession, createSession } from '@/lib/session';
import { normalizeTenantId } from "@/lib/tenant-resolver-edge";
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getClientIp } from '@/utils/ip';
import { WalletOps, WalletInsufficientFundsError, WalletUserNotFoundError, WalletInvalidAmountError } from '@/services/financial/wallet-ops';
import { handleServerError } from '@/utils/error-handler';
import { sendOrderPaidMail } from "@/lib/smtp";
import { getBaseUrlSync } from "@/utils/get-base-url";
import { featureFlagService } from "@/services/system/feature-flag.service";
import { mutateLink, getLinkValidator } from '@/validators/link-mutators';
import { validateProhibitedContent } from '@/validators/prohibited-content';
import { inferTargetTypeFromCategory, normalizeTargetType, TargetTypeEnum } from '@/utils/target-type';
import { isLinkServiceCompatible, getCompatibilityError, normalizeServiceTargetType } from '@/constants/link-service-compatibility';
import { safeUrlForLog } from '@/lib/log-safe';
import { SmartDripService } from '@/services/dripfeed/smart-drip.service';
import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';
class IdempotencyConflictError extends Error {
  constructor(public existingOrder: unknown) {
    super('Idempotency conflict');
    this.name = 'IdempotencyConflictError';
  }
}



/**
 * @public Calculates price for display on the order form (no auth required).
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

    const totalQuantity = quantity;
    const result = await marketingService.calculatePrice(
      null, // No user context needed for price preview
      serviceId,
      totalQuantity,
      promoCodeStr
    );
    
    const multiplier = runs && runs > 1 ? runs : 1;

    // SECURITY FIX: Data Leak Prevention. Do NOT return providerCostCents to the client.
    const safeResult = {
      totalCents: Math.round(result.totalCents * multiplier),
      originalTotalCents: Math.round(result.originalTotalCents * multiplier),
      discountCents: Math.round(result.discountCents * multiplier)
    };

    return { success: true, data: safeResult as unknown as PricingResult };
  } catch (error: unknown) {
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MutexManager } from '@/lib/redis-lock';

const checkoutSchema = z.object({
  serviceId: z.string(),
  link: z.string().min(3, "Ссылка слишком короткая").max(2048, "Ссылка слишком длинная").refine(val => !val.includes(' '), "Ссылка не должна содержать пробелов"),
  quantity: z.number().min(1),
  email: z.string().email("Неверный email"),
  promoCodeStr: z.string().optional(),
  runs: z.number().int().positive().optional(),
  interval: z.number().int().positive().optional(),
  customData: z.string().optional(),
  gateway: z.string().optional().default('yookassa'),
  idempotencyKey: z.string().min(10).max(64).optional(),
  mediaGroupUrl: z.string().optional(),
  isLinkOverridden: z.boolean().optional(),
  isSmartDrip: z.boolean().optional(),
  smartDripDays: z.number().int().min(1).max(30).optional(),
  abVariant: z.enum(['A', 'B', 'C']).optional(),
  isRequirementsConfirmed: z.boolean().optional()
});

export const checkoutAction = async (input: z.input<typeof checkoutSchema>) => {
  return createSafeAction(checkoutSchema, input, async (data) => {
    const { serviceId, link, quantity, email, promoCodeStr, runs, interval, customData, gateway, idempotencyKey, mediaGroupUrl, isLinkOverridden, isSmartDrip, smartDripDays, abVariant, isRequirementsConfirmed } = data;
    const effectiveIdempotencyKey = idempotencyKey || randomUUID();
    const hasMediaGroup = !!(mediaGroupUrl && mediaGroupUrl.trim().length > 5);

    // Feature Flags Validation
    if (promoCodeStr) {
      const isPromoEnabled = await featureFlagService.isEnabled('promo_codes');
      if (!isPromoEnabled) {
        throw new Error("Использование промокодов временно отключено");
      }
    }

    if (isSmartDrip || runs || interval) {
      const isDripEnabled = await featureFlagService.isEnabled('drip_feed');
      if (!isDripEnabled) {
        throw new Error("Функция Drip-feed временно отключена");
      }
    }

    if (isSmartDrip) {
      if (runs || interval) {
        throw new Error("Нельзя одновременно использовать обычный Drip-feed и Умный Dripfeed");
      }
      if (!smartDripDays || smartDripDays < 1 || smartDripDays > 30) {
        throw new Error("Необходимо указать количество дней (1-30) для Умного Dripfeed");
      }
    }
    
    // Gateway whitelist validation
    const ALLOWED_GATEWAYS = ['yookassa', 'cryptobot', 'robokassa', 'balance'];
    if (gateway && !ALLOWED_GATEWAYS.includes(gateway.toLowerCase())) {
      throw new Error("Неподдерживаемый способ оплаты");
    }

    // 0. Rate limit
    const isAllowed = await RateLimitService.check("checkoutCore", 15, 60, true);
    if (!isAllowed) {
      throw new Error("Слишком много запросов. Попробуйте через минуту.");
    }

    // 0.5 Content Guard & Legal Compliance (Prohibited Government & Political Resources)
    const contentCheck = validateProhibitedContent(link, customData);
    if (!contentCheck.isAllowed) {
      throw new Error(contentCheck.error || "Продвижение государственных служб и политических ресурсов строго запрещено");
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

    // Cross-Tenant Security Check (SEC-01)
    let rawTenantId: string | null = null;
    let reqHeaders: Awaited<ReturnType<typeof headers>> | null = null;
    try {
      reqHeaders = await headers();
      rawTenantId = reqHeaders.get("x-tenant-id");
    } catch {
      // CLI / fallback
    }
    const currentTenantId = normalizeTenantId(rawTenantId) || "smmplan";
    if (service.tenantId && service.tenantId !== currentTenantId && service.tenantId !== "all") {
      throw new Error("Услуга недоступна для текущей площадки");
    }

    // JIT Validation Check: enforce custom requirements if configured
    if (service.clientRequirement && !isRequirementsConfirmed) {
      throw new Error("Необходимо подтвердить выполнение условий для старта услуги");
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

    // Custom Data Validation Guard when customDataType !== 'NONE'
    if (service.customDataType && service.customDataType !== 'NONE') {
      if (!customData || !customData.trim()) {
        throw new Error("Пожалуйста, заполните дополнительные данные для этой услуги");
      }
      const { getCustomValidator } = await import('@/validators/link-mutators');
      const customValidator = getCustomValidator(service.customDataType);
      const customResult = customValidator.safeParse(customData.trim());
      if (!customResult.success) {
        throw new Error(customResult.error.errors[0].message);
      }
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
      } catch (e: unknown) {
        console.error(`[Checkout] Link mutation failed for ${safeUrlForLog(link)}:`, e);
        throw new Error("Неверный формат ссылки.", { cause: e });
      }
    } else {
      const resolvedTargetType = service.targetType
        ? normalizeTargetType(service.targetType)
        : inferTargetTypeFromCategory(service.category?.name);

      // Deep Domain Compatibility Check (Backend Defense Guard)
      const { IntelligenceLinkAnalyzer } = await import('@/services/analyzer/link-analyzer');
      const analyzer = new IntelligenceLinkAnalyzer();
      const analysis = await analyzer.analyze(link.trim());
      const detectedLinkType = analysis?.type || 'generic_link';
      const serviceTargetType = normalizeServiceTargetType(resolvedTargetType);

      if (!isLinkServiceCompatible(detectedLinkType, serviceTargetType)) {
        const errorMsg = getCompatibilityError(detectedLinkType, serviceTargetType, service.name);
        throw new Error(errorMsg);
      }

      if (resolvedTargetType === TargetTypeEnum.CUSTOM || service.targetType === 'CUSTOM') {
        const { getCustomValidator } = await import('@/validators/link-mutators');
        const customValidator = getCustomValidator(service.customDataType);
        const customValue = customData || link;
        const customResult = customValidator.safeParse(customValue);
        if (!customResult.success) {
          throw new Error(customResult.error.errors[0].message);
        }
      } else {
        // 1. Clean the link according to provider rules
        normalizedLink = mutateLink(link, platformSlug, resolvedTargetType);

        // 2. Validate the cleaned link
        const validator = getLinkValidator(platformSlug, resolvedTargetType);
        const linkResult = validator.safeParse(normalizedLink);
        
        if (!linkResult.success) {
          throw new Error(linkResult.error.errors[0].message);
        }
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

    const tenantId = currentTenantId;

    // 3. Find or create user by email (SECURITY FIX: Track if new user to prevent IDOR auto-login)
    const currentSession = await verifySession();
    let user = await db.user.findFirst({
      where: { 
        email: email.toLowerCase(),
        tenantId: tenantId === 'flux' ? { in: ['lovable', 'flux'] } : tenantId
      }
    });

    if (user && user.tenantId === 'lovable') {
      user = await db.user.update({
        where: { id: user.id },
        data: { tenantId: 'flux' }
      });
    }

    if (user) {
      if (user.isDeleted === true || user.isActive === false) {
        throw new Error("Ваш аккаунт заблокирован или удален");
      }
      // IDOR / Account Hijacking Prevention:
      // Prevent order injection / guest orders binding to existing password-protected accounts without session
      if (user.passwordHash && (!currentSession || currentSession.userId !== user.id)) {
        throw new Error("Этот email уже зарегистрирован в системе. Пожалуйста, войдите в свой аккаунт для оформления заказа.");
      }
    }

    // Role-based validation check for bypass link mode
    if (isLinkOverridden) {
      if (!user || (user.role !== 'OWNER' && user.role !== 'MANAGER')) {
        throw new Error("У вас нет прав для обхода валидации ссылки");
      }
    }

    let isNewUser = false;
    const consentIp = await getClientIp();
    if (!user) {
      user = await db.user.create({
        data: {
          email: email.toLowerCase(),
          tenantId,
          tosAcceptedAt: new Date(),
          tosAcceptedIp: consentIp,
        }
      });
      isNewUser = true;
    }

    // 4. Calculate price based on TOTAL quantity and actual User ID for Loyalty Tier eval
    const totalQuantity = quantity;

    if (runs && runs > 0 && !isSmartDrip) {
      const runQty = Math.floor(totalQuantity / runs);
      if (runQty < service.minQty) {
        throw new Error(`Для Drip-feed количество на один запуск (${runQty}) не может быть меньше минимального (${service.minQty})`);
      }
    } else if (isSmartDrip && smartDripDays && smartDripDays > 0) {
      const runQty = Math.floor(totalQuantity / smartDripDays);
      if (runQty < service.minQty) {
        throw new Error(`Для Умного Drip-feed количество на 1 день (${runQty}) не может быть меньше минимального (${service.minQty})`);
      }
    }

    const userIdForCalc = user ? user.id : null;
    const pricing = await marketingService.calculatePrice(userIdForCalc, serviceId, totalQuantity, promoCodeStr, { service });
    
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

    const { SettingsProvider } = await import('@/lib/settings');
    const currentUsdRate = await SettingsProvider.getExchangeRateUSD();

    // Media Group: double the total for 2 orders
    const mediaGroupMultiplier = hasMediaGroup ? 2 : 1;
    let finalTotalCents = pricing.totalCents * mediaGroupMultiplier;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // 54-ФЗ / 115-ФЗ: Лимит анонимных платежей без подтверждения личности — 15 000 ₽ (1 500 000 копеек)
    if (paymentAmount > 1_500_000 && !user.telegramId) {
      throw new Error("Для совершения единовременных платежей свыше 15 000 ₽, пожалуйста, привяжите ваш Telegram-аккаунт в личном кабинете либо используйте безналичный расчет для юрлиц (B2B).");
    }

    // Balance check is now performed atomically inside db.$transaction using WalletOps.charge

    const consentUserAgent = reqHeaders?.get("user-agent") || "Unknown";

    const termsDoc = await db.contentItem.findUnique({
      where: { slug: 'terms' },
      select: { updatedAt: true }
    });
    const consentVersion = termsDoc ? `terms:${termsDoc.updatedAt.toISOString()}` : `fallback:${new Date().toISOString().split('T')[0]}`;

    let transactionCompleted = false;
    let result;
    try {
      result = await runSerializableTransaction(async (tx) => {
        // 5.1 If gateway is balance, atomically deduct balance first
        if (gateway === 'balance' && user) {
          await WalletOps.charge(tx, user.id, finalTotalCents, `Оплата заказа с баланса`, {
            idempotencyKey: `balance-charge-${effectiveIdempotencyKey}`,
            tenantId
          });
        }

        const orderStatus = gateway === 'balance' ? 'PENDING' : 'AWAITING_PAYMENT';
        const paymentStatus = gateway === 'balance' ? 'SUCCEEDED' : 'PENDING';


        
        // 1. Check idempotency beforehand to avoid aborting the Postgres transaction block on P2002 constraint error
        let existingOrder = null;
        if (effectiveIdempotencyKey) {
          existingOrder = await tx.order.findUnique({
            where: { idempotencyKey: effectiveIdempotencyKey },
            include: { payment: true }
          });
        }

        if (existingOrder) {
          if (existingOrder.status !== 'ERROR') {
            throw new IdempotencyConflictError(existingOrder);
          } else {
            // Free up the unique constraint on the failed order to allow the new check to proceed
            await tx.order.update({
              where: { id: existingOrder.id },
              data: { idempotencyKey: `${effectiveIdempotencyKey}_failed_${existingOrder.id}` }
            });
          }
        }

        const isDripFeedOrder = Boolean(runs && runs > 1);

        // Create primary Order (first media / main link)
        const newOrder = await tx.order.create({
          data: {
            userId: user?.id,
            serviceId,
            providerId: service.providerId,
            providerServiceId: service.externalId,
            link: normalizedLink,
            isLinkOverridden: isLinkOverridden || false,
            quantity: totalQuantity,
            email: email.toLowerCase(),
            status: orderStatus,
            charge: isSmartDrip && smartConfig ? Math.round(pricing.totalCents * (1 + smartConfig.markup)) : pricing.totalCents,
            providerCost: pricing.providerCostCents,
            isDripFeed: isDripFeedOrder,
            runs,
            interval,
            isTest: isTestMode,
            customData,
            remains: totalQuantity,
            idempotencyKey: effectiveIdempotencyKey,
            promoCodeId: promoCodeId || null,
            discountCents: BigInt(pricing.discountCents),
            abVariant,
            usdToRubRate: currentUsdRate,
            tenantId
          }
        });

        // Create second Order for media group (last media) if applicable
        let secondOrderId: string | undefined;
        if (hasMediaGroup && normalizedMediaGroupLink) {
          const secondOrder = await tx.order.create({
            data: {
              userId: user?.id,
              serviceId,
              providerId: service.providerId,
              providerServiceId: service.externalId,
              link: normalizedMediaGroupLink,
              isLinkOverridden: isLinkOverridden || false,
              quantity: totalQuantity,
              email: email.toLowerCase(),
              status: orderStatus,
              charge: isSmartDrip && smartConfig ? Math.round(pricing.totalCents * (1 + smartConfig.markup)) : pricing.totalCents,
              providerCost: pricing.providerCostCents,
              isDripFeed: isDripFeedOrder,
              runs,
              interval,
              isTest: isTestMode,
              customData: `Медиагруппа: последнее медиа. Основной заказ: ${newOrder.numericId}`,
              remains: totalQuantity,
              promoCodeId: promoCodeId || null,
              discountCents: BigInt(pricing.discountCents),
              abVariant,
              usdToRubRate: currentUsdRate,
              tenantId
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
            userId: user?.id,
            amount: paymentAmount,
            currency: 'RUB',
            status: paymentStatus,
            gateway,
            consentIp,
            consentUserAgent,
            consentVersion,
            abVariant,
            tenantId
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

        const { logPromoCodeUsageIfNeeded } = await import('@/services/marketing-utils');
        if (gateway === 'balance' && promoCodeId && user?.id) {
          await logPromoCodeUsageIfNeeded(tx, newOrder.id, user.id);
          if (secondOrderId) {
            await logPromoCodeUsageIfNeeded(tx, secondOrderId, user.id);
          }
        }

        if (isSmartDrip && smartConfig && user?.id) {
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

        transactionCompleted = true;
        return { orderId: newOrder.id, paymentId: payment.id, numericId: newOrder.numericId, secondOrderId };
      });
    } catch (err: unknown) {
      if (err instanceof IdempotencyConflictError) {
        const existingOrder = err.existingOrder as { id: string; paymentId?: string; payment?: { checkoutUrl?: string } };
        console.info(`[Checkout] Idempotency hit for key ${idempotencyKey}, returning existing order.`);
        return {
          orderId: existingOrder.id,
          paymentId: existingOrder.paymentId || '',
          paymentUrl: existingOrder.payment?.checkoutUrl || ''
        };
      }
      const isP2002 = err instanceof Prisma.PrismaClientKnownRequestError ? err.code === 'P2002' : (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002');
      if (isP2002 && idempotencyKey) {
        const existingOrder = await db.order.findUnique({
          where: { idempotencyKey },
          include: { payment: true }
        });
        if (existingOrder) {
          if (existingOrder.status !== 'ERROR') {
            console.info(`[Checkout] Parallel idempotency hit for key ${idempotencyKey}, returning existing order.`);
            return {
              orderId: existingOrder.id,
              paymentId: existingOrder.paymentId,
              paymentUrl: existingOrder.payment?.checkoutUrl || ''
            };
          }
        }
      }
      throw err;
    }

    // 6. Generate payment URL (gateway-specific API calls)
    let paymentUrl: string | undefined;

    const host = reqHeaders?.get("host") || "localhost:3000";
    const protocol = reqHeaders?.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = getBaseUrlSync(host, protocol);
    let successUrl = `${origin}/success?orderId=${result.orderId}`;

    // [Phase 3 Surgeon] Generate capability token for sessionless payment return validation
    let token = '';
    try {
      const { SignJWT } = await import('jose');
      const { getEncodedKey } = await import('@/lib/session-edge');
      token = await new SignJWT({ 
        orderId: result.orderId,
        purpose: 'payment_return' 
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(getEncodedKey());
    } catch (e) {
      console.error('[Checkout] Failed to generate return capability token:', e);
    }

    if (token) {
      successUrl += `&token=${token}`;
    }

    // Direct fulfillment for balance payments
    if (gateway === 'balance') {
      const { ordersQueue } = await import('@/workers/queues');
      await ordersQueue.add('order-dispatch', { orderId: result.orderId }, { jobId: `dispatch-${result.orderId}`, delay: 3 * 60 * 1000 });
      if (result.secondOrderId) {
        await ordersQueue.add('order-dispatch', { orderId: result.secondOrderId }, { jobId: `dispatch-${result.secondOrderId}`, delay: 3 * 60 * 1000 });
      }

      void sendOrderPaidMail(
        user?.email || email,
        result.numericId.toString(),
        service.name
      ).catch((err: unknown) => console.error('[H1] sendOrderPaidMail balance failed', err));

      revalidatePath('/dashboard', 'layout');

      // Auto-Login using cookies (Frictionless checkout)
      if (user && (isNewUser || (currentSession && currentSession.userId === user.id))) {
        await createSession(user.id);
      }

      return { 
        orderId: result.orderId, 
        paymentId: result.paymentId,
        paymentUrl: successUrl
      };
    }

    try {
      const { PaymentGatewayFactory } = await import('@/services/financial/payment-gateway.service');
      const gatewaySvc = PaymentGatewayFactory.getGateway(gateway || 'yookassa');
      const gatewayResult = await gatewaySvc.createPayment({
        paymentId: result.paymentId,
        orderId: result.orderId,
        userId: user?.id || '',
        amountRub: paymentAmount / 100,
        email: email,
        successUrl,
        description: `Оплата заказа #${result.numericId} (сдача зачисляется на баланс)`,
        isTestMode: isTestMode || email === 'e2e-tester@test.com',
        metadata: { type: 'checkout' }
      });

      if (gatewayResult.remoteGatewayId || gatewayResult.paymentUrl) {
        await db.payment.update({
          where: { id: result.paymentId },
          data: {
            gatewayId: gatewayResult.remoteGatewayId || undefined,
            checkoutUrl: gatewayResult.paymentUrl || undefined
          }
        });
      }

      paymentUrl = gatewayResult.paymentUrl || `/payment-redirect?id=${result.paymentId}`;

    } catch (gatewayErr: unknown) {
      // 7.b ROLLBACK: If Queue push failed, restore PromoCode and mark Payment as ERROR safely
      console.error('[Checkout] Queue sequence failed, rolling back sequence', gatewayErr);
      
      const rollbackPromises: Promise<unknown>[] = [
        Promise.resolve(db.payment.update({
          where: { id: result.paymentId },
          data: { status: 'CANCELED' }
        })).catch(e => console.error('[Checkout] Failed to cancel payment:', e)),
        
        Promise.resolve(db.order.update({
          where: { id: result.orderId },
          data: { status: 'ERROR', error: (gatewayErr instanceof Error ? gatewayErr.message : String(gatewayErr)) || 'Ошибка генерации платежа' }
        })).catch(e => console.error('[Checkout] Failed to error order:', e))
      ];

      if (promoCodeStr && transactionCompleted) {
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
      throw new Error((gatewayErr instanceof Error ? gatewayErr.message : String(gatewayErr)) || 'Ошибка на стороне платежного шлюза. Попробуйте другой метод', { cause: gatewayErr });
    }

    // 8. Auto-Login using cookies (Frictionless checkout)
    // SECURITY FIX: Prevent Account Takeover by only auto-logging in NEW users, or already authenticated users
    if (user && (isNewUser || (currentSession && currentSession.userId === user.id))) {
      await createSession(user.id);
    }

    if (gateway === 'balance' && user) {
      void sendOrderPaidMail(
        user.email,
        result.numericId.toString(),
        service.name
      ).catch((err: unknown) => console.error('[H1] sendOrderPaidMail balance failed', err));
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
        ) as unknown as Promise<unknown>;
        if (alertPromise && typeof alertPromise.catch === 'function') {
          alertPromise.catch((err: unknown) => console.error('[Checkout] Failed to send bypass admin alert:', err));
        }
      } catch (err) {
        console.error('[Checkout] Failed to import/send bypass admin alert:', err);
      }
    }

    try {
      revalidatePath('/dashboard', 'layout');
    } catch {
      // Ignore when running outside HTTP request scope (e.g. tests / CLI)
    }

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

    const isAllowed = await RateLimitService.check("retryCheckoutCore", 10, 60, true);
    if (!isAllowed) throw new Error("Слишком много запросов. Попробуйте через минуту.");

    let reqHeaders: { get: (key: string) => string | null };
    try {
      reqHeaders = await headers();
    } catch (e) {
      console.warn('[RetryCheckout] headers() context missing, using fallback', e);
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

    const rawTenantId = reqHeaders.get("x-tenant-id");
    const currentTenantId = normalizeTenantId(rawTenantId) || "smmplan";

    const order = await db.order.findUnique({
      where: { id: orderId, userId: session.userId },
      include: { user: true, payment: true, service: true }
    });

    if (!order) throw new Error("Заказ не найден");
    if (order.tenantId && order.tenantId !== currentTenantId) {
      throw new Error("Заказ недоступен для текущей площадки");
    }
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isTestMode = await SettingsManager.isTestMode();

    // Update existing payment or create new
    const result = await runSerializableTransaction<{ paymentId: string }>(async (tx) => {
      // If gateway is balance, atomically deduct balance first
      if (gateway === 'balance') {
        await WalletOps.charge(tx, order.userId, Number(order.charge), `Оплата заказа с баланса`, {
          idempotencyKey: `balance-charge-retry-${order.id}`
        });
      }

      const orderStatus = gateway === 'balance' ? 'PENDING' : undefined;
      const paymentStatus = gateway === 'balance' ? 'SUCCEEDED' : 'PENDING';

      const existingPayment = order.payment || await tx.payment.findUnique({ where: { orderId: order.id } });

      let processedPaymentId: string;

      if (existingPayment && existingPayment.gateway !== gateway) {
        // Cancel old payment log to prevent accounting mismatch when gateway switches
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: { status: 'CANCELED' }
        });

        const newPayment = await tx.payment.create({
          data: {
            userId: order.userId,
            orderId: order.id,
            amount: order.charge,
            currency: 'RUB',
            status: paymentStatus,
            gateway,
            consentIp,
            consentUserAgent,
            orders: { connect: [{ id: order.id }] }
          }
        });

        await tx.order.update({
          where: { id: order.id },
          data: { paymentId: newPayment.id }
        });

        processedPaymentId = newPayment.id;
      } else if (existingPayment) {
        const updatedPayment = await tx.payment.update({
          where: { id: existingPayment.id },
          data: { 
            status: paymentStatus,
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

        processedPaymentId = updatedPayment.id;
      } else {
        const newPayment = await tx.payment.create({
          data: {
            userId: order.userId,
            orderId: order.id,
            amount: order.charge,
            currency: 'RUB',
            status: paymentStatus,
            gateway,
            consentIp,
            consentUserAgent,
            orders: { connect: [{ id: order.id }] } // Правильное связывание
          }
        });

        processedPaymentId = newPayment.id;
      }

      if (orderStatus) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: orderStatus }
        });
      }

      return { paymentId: processedPaymentId };
    });

    let paymentUrl: string | undefined;

    const host = reqHeaders.get("host") || "localhost:3000";
    const protocol = reqHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = getBaseUrlSync(host, protocol);
    let successUrl = `${origin}/success?orderId=${order.id}`;

    let token = '';
    try {
      const { SignJWT } = await import('jose');
      const { getEncodedKey } = await import('@/lib/session-edge');
      token = await new SignJWT({ 
        orderId: order.id,
        purpose: 'payment_return' 
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(getEncodedKey());
    } catch (e) {
      console.error('[RetryCheckout] Failed to generate return capability token:', e);
    }

    if (token) {
      successUrl += `&token=${token}`;
    }

    // Direct fulfillment for balance retry payments
    if (gateway === 'balance') {
      const { ordersQueue } = await import('@/workers/queues');
      await ordersQueue.add('order-dispatch', { orderId: order.id }, { jobId: `dispatch-${order.id}`, delay: 3 * 60 * 1000 });

      void sendOrderPaidMail(
        order.user.email,
        order.numericId.toString(),
        order.service.name
      ).catch((err: unknown) => console.error('[H1] sendOrderPaidMail balance retry failed', err));

      revalidatePath('/dashboard', 'layout');

      return { 
        orderId: order.id, 
        paymentId: result.paymentId,
        paymentUrl: successUrl
      };
    }

    try {
      const isTestMode = await SettingsManager.isTestMode();
      const { PaymentGatewayFactory } = await import('@/services/financial/payment-gateway.service');
      const gatewaySvc = PaymentGatewayFactory.getGateway(gateway || 'yookassa');
      
      const gatewayResult = await gatewaySvc.createPayment({
        paymentId: result.paymentId,
        orderId: order.id,
        userId: order.userId,
        amountRub: Number(order.charge) / 100,
        email: order.email || order.user.email,
        successUrl,
        description: `Оплата заказа #${order.numericId} (SMMplan)`,
        isTestMode,
        metadata: { type: 'checkout' }
      });

      if (gatewayResult.remoteGatewayId || gatewayResult.paymentUrl) {
        await db.payment.update({
          where: { id: result.paymentId },
          data: {
            gatewayId: gatewayResult.remoteGatewayId || undefined,
            checkoutUrl: gatewayResult.paymentUrl || undefined
          }
        });
      }

      paymentUrl = gatewayResult.paymentUrl || `/payment-redirect?id=${result.paymentId}`;

    } catch (gatewayErr: unknown) {
      console.error('[RetryCheckout] Gateway failed', gatewayErr);
      const errMsg = gatewayErr instanceof Error ? (gatewayErr instanceof Error ? gatewayErr.message : String(gatewayErr)) : 'Ошибка генерации платежа';
      
      const rollbackPromises: Promise<unknown>[] = [
        db.payment.update({
          where: { id: result.paymentId },
          data: { status: 'CANCELED' }
        }).catch(e => console.error('[RetryCheckout] Failed to cancel payment:', e)),
        
        db.order.update({
          where: { id: order.id },
          data: { status: 'ERROR', error: errMsg }
        }).catch(e => console.error('[RetryCheckout] Failed to error order:', e))
      ];
      await Promise.allSettled(rollbackPromises);

      throw new Error(errMsg || 'Ошибка генерации платежа. Попробуйте другой метод', { cause: gatewayErr });
    }

    revalidatePath('/dashboard', 'layout');

    return { 
      orderId: order.id, 
      paymentId: result.paymentId,
      paymentUrl
    };
  });
};

/** @public Public gateway configuration for checkout */
export async function getAvailableGatewaysAction() {
  try {
    const { SettingsProvider } = await import('@/lib/settings');
    const secrets = await SettingsProvider.getPaymentSecrets();
    const isTest = await SettingsProvider.isTestMode();

    return {
      success: true,
      data: {
        yookassa: isTest || !!(secrets.yookassaShopId && secrets.yookassaSecretKey),
        robokassa: !!(secrets.robokassaLogin && secrets.robokassaPassword),
        cryptobot: !!secrets.cryptoBotToken,
        isTestMode: isTest
      }
    };
  } catch (err: unknown) {
    console.error('[getAvailableGatewaysAction] Error:', err);
    return {
      success: false,
      error: (err instanceof Error ? err.message : String(err)) || 'Ошибка проверки настроек платежных шлюзов'
    };
  }
}

