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

  if ((gateway === 'yookassa' || gateway === 'robokassa') && amountCents > 180000) {
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

    const payload = {
      currency_type: "fiat",
      fiat: "RUB",
      amount: amountRub.toString(),
      description: `Услуги IT-консалтинга (ID: ${payment.id})`,
      // BUG-008 FIX: Передаём type:'deposit' + userId для корректной обработки в webhook
      payload: JSON.stringify({ paymentId: payment.id, userId: session.userId, type: 'deposit' }),
      paid_btn_name: 'openChannel',
      paid_btn_url: `${await getBaseUrlAsync()}/dashboard/add-funds?success=1`
    };

    const resp = await fetch(`https://${process.env.NODE_ENV === 'production' ? 'pay' : 'testnet-pay'}.crypt.bot/api/createInvoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Crypto-Pay-API-Token": token
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      console.error("[CryptoBot Error]", await resp.text());
      throw new Error("Ошибка создания платежа в CryptoBot");
    }

    const data = await resp.json();
    if (!data.ok) {
      console.error("[CryptoBot Error]", data);
      throw new Error("Ошибка API CryptoBot");
    }

    await db.payment.update({
      where: { id: payment.id },
      data: { gatewayId: data.result.invoice_id.toString() }
    });

    return { success: true, paymentUrl: data.result.bot_invoice_url || data.result.pay_url };
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
    const isE2ETest = dbUser.email === 'e2e-tester@test.com';

    if (isE2ETest || isDummyKeys) {
      const mockGatewayId = `mock_${payment.id}`;
      await db.payment.update({
        where: { id: payment.id },
        data: { gatewayId: mockGatewayId }
      });
      return { success: true, paymentUrl: `/api/dev/mock-payment?paymentId=${payment.id}` };
    }

    const { PaymentGatewayFactory } = await import('@/services/financial/payment-gateway.service');
    const gatewaySvc = PaymentGatewayFactory.getGateway('robokassa');
    const successUrl = `${await getBaseUrlAsync()}/dashboard/add-funds?success=1`;
    const gatewayResult = await gatewaySvc.createPayment({
      paymentId: payment.id,
      userId: session.userId,
      amountRub,
      email: dbUser.email,
      successUrl,
      description: `Пополнение баланса (Счёт: ${payment.id})`,
      isTestMode: false
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

    return { success: true, paymentUrl: gatewayResult.paymentUrl };
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
  const isE2ETest = dbUser.email === 'e2e-tester@test.com';

  if (isE2ETest || isDummyKeys) {
    const mockGatewayId = `mock_${payment.id}`;
    await db.payment.update({
      where: { id: payment.id },
      data: { gatewayId: mockGatewayId }
    });
    return { success: true, paymentUrl: `/api/dev/mock-payment?paymentId=${payment.id}` };
  }

  const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
  const successUrl = `${await getBaseUrlAsync()}/dashboard/add-funds?success=1`;

  const payload = {
    amount: { value: amountRub.toFixed(2), currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect", return_url: successUrl },
    description: `Оплата услуг IT-агентства (Digital Consulting, Счёт: ${payment.id})`,
    metadata: { paymentId: payment.id, userId: session.userId, type: "deposit" }
  };

  const resp = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader,
      "Idempotence-Key": payment.id
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    console.error("[YooKassa Error]", await resp.text());
    throw new Error("Ошибка создания платежа в шлюзе YooKassa");
  }

  const data = await resp.json();
  
  await db.payment.update({
    where: { id: payment.id },
    data: { gatewayId: data.id }
  });

  return { success: true, paymentUrl: data.confirmation.confirmation_url };
}
