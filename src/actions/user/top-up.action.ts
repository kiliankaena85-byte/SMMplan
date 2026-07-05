"use server";

import { db } from "@/lib/db";
import { verifySession } from "@/lib/session";
import { headers } from "next/headers";
import { getBaseUrlAsync } from "@/utils/get-base-url";
import { SettingsManager } from "@/lib/settings";
import { getClientIp } from "@/utils/ip";
import { RateLimitService } from "@/services/core/rate-limit.service";

export async function createTopUpPaymentAction(amountRub: number, gateway: 'yookassa' | 'cryptobot' | 'robokassa' = 'yookassa') {
  const session = await verifySession();
  if (!session) throw new Error("Unauthorized");
  
  const isAllowed = await RateLimitService.check(`topup:${session.userId}`, 5, 300);
  if (!isAllowed) throw new Error("Слишком много попыток пополнения. Попробуйте через 5 минут.");

  const amountCents = Math.round(amountRub * 100);
  if (amountCents < 1000) throw new Error("Минимальная сумма пополнения — 10 ₽");

  // Fetch user
  const dbUser = await db.user.findUnique({ where: { id: session.userId } });
  if (!dbUser) throw new Error("Пользователь не найден.");
  if (dbUser.isDeleted === true || dbUser.isActive === false) throw new Error("Ваш аккаунт заблокирован или удален");

  if (gateway === 'yookassa' && amountCents > 180000) {
    if (!dbUser.telegramId) {
      throw new Error("Для совершения платежей свыше $20 картой, пожалуйста, привяжите ваш Telegram-аккаунт в личном кабинете. Либо воспользуйтесь криптовалютой (без ограничений)");
    }
  }



  const reqHeaders = await headers();
  const consentIp = await getClientIp();
  const consentUserAgent = reqHeaders.get("user-agent") || "Unknown";

  const termsDoc = await db.contentItem.findUnique({
    where: { slug: 'terms' },
    select: { updatedAt: true }
  });
  const consentVersion = termsDoc ? `terms:${termsDoc.updatedAt.toISOString()}` : `fallback:${new Date().toISOString().split('T')[0]}`;

  const secrets = await SettingsManager.getPaymentSecrets();

  if (gateway === 'cryptobot') {
    const token = secrets.cryptoBotToken;
    if (!token) throw new Error("Крипто-шлюз не настроен администратором.");

    const payment = await db.payment.create({
      data: {
        userId: session.userId,
        amount: amountCents,
        currency: "RUB",
        status: "PENDING",
        gateway: "cryptobot",
        consentIp,
        consentUserAgent,
        consentVersion
      }
    });

    const { paymentGatewayQueue } = await import('@/lib/queue-manager');
    await paymentGatewayQueue.add('generate-cryptobot', {
      paymentId: payment.id,
      userId: session.userId,
      amountRub,
      email: null,
      successUrl: `${await getBaseUrlAsync()}/dashboard/add-funds?success=1`,
      description: `Услуги IT-консалтинга (ID: ${payment.id})`,
      isTestMode: false,
      gateway: 'cryptobot',
      metadata: { type: 'deposit' }
    });

    return { success: true, paymentUrl: `/payment-redirect?id=${payment.id}` };
  }

  if (gateway === 'robokassa') {
    const login = secrets.robokassaLogin;
    const password = secrets.robokassaPassword;
    if (!login || !password) throw new Error("Шлюз Робокасса не настроен администратором.");

    const payment = await db.payment.create({
      data: {
        userId: session.userId,
        amount: amountCents,
        currency: "RUB",
        status: "PENDING",
        gateway: "robokassa",
        consentIp,
        consentUserAgent,
        consentVersion
      }
    });

    const isDummyKeys = !login || !password || login === 'test_login';
    const isE2ETest = process.env.NODE_ENV !== 'production' && !!process.env.E2E_TEST_EMAIL && dbUser.email === process.env.E2E_TEST_EMAIL;

    if (isE2ETest || isDummyKeys) {
      const mockGatewayId = `mock_${payment.id}`;
      await db.payment.update({
        where: { id: payment.id },
        data: { gatewayId: mockGatewayId }
      });
      return { success: true, paymentUrl: `/api/dev/mock-payment?paymentId=${payment.id}` };
    }

    const { paymentGatewayQueue } = await import('@/lib/queue-manager');
    const successUrl = `${await getBaseUrlAsync()}/dashboard/add-funds?success=1`;
    
    await paymentGatewayQueue.add('generate-robokassa', {
      paymentId: payment.id,
      userId: session.userId,
      amountRub,
      email: dbUser.email,
      successUrl,
      description: `Пополнение баланса (Счёт: ${payment.id})`,
      isTestMode: false,
      gateway: 'robokassa',
      metadata: { type: 'deposit' }
    });

    return { success: true, paymentUrl: `/payment-redirect?id=${payment.id}` };
  }

  // --- YooKassa logic ---
  const shopId = secrets.yookassaShopId;
  const secretKey = secrets.yookassaSecretKey;
  if (!shopId || !secretKey) throw new Error("Шлюз ЮKassa не настроен администратором.");

  const payment = await db.payment.create({
    data: {
      userId: session.userId,
      amount: amountCents,
      currency: "RUB",
      status: "PENDING",
      gateway: "yookassa",
      consentIp,
      consentUserAgent,
      consentVersion
    }
  });

  const isDummyKeys = !shopId || !secretKey || shopId === 'test_shop_id' || shopId === 'test_shop_id_test';
  const isE2ETest = process.env.NODE_ENV !== 'production' && !!process.env.E2E_TEST_EMAIL && dbUser.email === process.env.E2E_TEST_EMAIL;

  if (isE2ETest || isDummyKeys) {
    const mockGatewayId = `mock_${payment.id}`;
    await db.payment.update({
      where: { id: payment.id },
      data: { gatewayId: mockGatewayId }
    });
    return { success: true, paymentUrl: `/api/dev/mock-payment?paymentId=${payment.id}` };
  }

  const { paymentGatewayQueue } = await import('@/lib/queue-manager');
  const successUrl = `${await getBaseUrlAsync()}/dashboard/add-funds?success=1`;
  
  await paymentGatewayQueue.add('generate-yookassa', {
    paymentId: payment.id,
    userId: session.userId,
    amountRub,
    email: dbUser.email,
    successUrl,
    description: `Оплата услуг IT-агентства (Digital Consulting, Счёт: ${payment.id})`,
    isTestMode: false,
    gateway: 'yookassa',
    metadata: { type: "deposit" }
  });

  return { success: true, paymentUrl: `/payment-redirect?id=${payment.id}` };
}
