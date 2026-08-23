'use server';

import { db } from "@/lib/db";
import { verifySession } from "@/lib/session";
import { headers } from "next/headers";
import { getBaseUrlAsync } from "@/utils/get-base-url";
import { getClientIp } from "@/utils/ip";
import { RateLimitService } from "@/services/core/rate-limit.service";

export async function createTopUpPaymentAction(
  amountRub: number,
  gateway: 'yookassa' | 'cryptobot' | 'robokassa' | 'sbp' = 'yookassa',
  idempotencyKey?: string
) {
  const session = await verifySession();
  if (!session) throw new Error("Unauthorized");
  
  const isAllowed = await RateLimitService.check(`topup:${session.userId}`, 5, 300);
  if (!isAllowed) throw new Error("Слишком много попыток пополнения. Попробуйте через 5 минут.");

  if (typeof amountRub !== 'number' || isNaN(amountRub) || !isFinite(amountRub) || amountRub <= 0) {
    throw new Error("Некорректная сумма пополнения");
  }

  const amountCents = Math.round(amountRub * 100);
  if (amountCents < 1000) throw new Error("Минимальная сумма пополнения — 10 ₽");

  // Fetch user
  const dbUser = await db.user.findUnique({ where: { id: session.userId } });
  if (!dbUser) throw new Error("Пользователь не найден.");
  if (dbUser.isDeleted === true || dbUser.isActive === false) throw new Error("Ваш аккаунт заблокирован или удален");

  if ((gateway === 'yookassa' || gateway === 'sbp') && amountCents > 1_500_000) {
    if (!dbUser.telegramId) {
      throw new Error("Для пополнения баланса свыше 15 000 ₽ картой или СБП, пожалуйста, привяжите ваш Telegram-аккаунт в настройках профиля либо воспользуйтесь безналичным расчетом для юрлиц (B2B).");
    }
  }

  // Check for existing pending payment with same key or created within the last 60 seconds (anti-double-click)
  const twoMinutesAgo = new Date(Date.now() - 60 * 1000);
  const existingPayment = await db.payment.findFirst({
    where: {
      userId: session.userId,
      amount: amountCents,
      gateway,
      status: 'PENDING',
      createdAt: { gte: twoMinutesAgo },
      checkoutUrl: { not: null }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (existingPayment && existingPayment.checkoutUrl) {
    console.info(`[TopUp] Idempotency hit: returning existing pending payment ${existingPayment.id}`);
    return { success: true, paymentUrl: existingPayment.checkoutUrl };
  }

  const reqHeaders = await headers();
  const consentIp = await getClientIp();
  const consentUserAgent = reqHeaders.get("user-agent") || "Unknown";

  const termsDoc = await db.contentItem.findUnique({
    where: { slug: 'terms' },
    select: { updatedAt: true }
  });
  const consentVersion = termsDoc ? `terms:${termsDoc.updatedAt.toISOString()}` : `fallback:${new Date().toISOString().split('T')[0]}`;

  const payment = await db.payment.create({
    data: {
      userId: session.userId,
      tenantId: dbUser.tenantId || 'smmplan',
      amount: amountCents,
      currency: "RUB",
      status: "PENDING",
      gateway,
      consentIp,
      consentUserAgent,
      consentVersion
    }
  });

  const { PaymentGatewayFactory } = await import('@/services/financial/payment-gateway.service');
  const gatewaySvc = PaymentGatewayFactory.getGateway(gateway);
  const successUrl = `${await getBaseUrlAsync()}/dashboard/add-funds?success=1`;
  const description = gateway === 'yookassa'
    ? `Оплата услуг IT-агентства (Digital Consulting, Счёт: ${payment.id})`
    : `Пополнение баланса (Счёт: ${payment.id})`;

  const { SettingsProvider } = await import('@/lib/settings');
  const isTestMode = await SettingsProvider.isTestMode();

  try {
    const gatewayResult = await gatewaySvc.createPayment({
      paymentId: payment.id,
      userId: session.userId,
      amountRub,
      email: dbUser.email,
      successUrl,
      description,
      isTestMode: isTestMode,
      metadata: { type: 'deposit' }
    });

    if (gatewayResult.remoteGatewayId || gatewayResult.paymentUrl) {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          gatewayId: gatewayResult.remoteGatewayId || undefined,
          checkoutUrl: gatewayResult.paymentUrl || undefined
        }
      });
    }

    return { success: true, paymentUrl: gatewayResult.paymentUrl || `/payment-redirect?id=${payment.id}` };
  } catch (err: unknown) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'CANCELED' }
    }).catch(() => {});

    const errorMessage = err instanceof Error ? err.message : 'Ошибка создания платежа в платежной системе';
    throw new Error(errorMessage, { cause: err });
  }
}
