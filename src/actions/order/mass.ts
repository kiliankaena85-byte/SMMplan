'use server';

import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifySession, createSession } from '@/lib/session';
import { marketingService } from '@/services/marketing.service';
import { headers } from 'next/headers';
import { getClientIp } from '@/utils/ip';
import { PaymentGatewayFactory } from '@/services/financial/payment-gateway.service';
import { RateLimitService } from '@/services/core/rate-limit.service';
import { SettingsManager } from '@/lib/settings';
import { WalletInsufficientFundsError, WalletUserNotFoundError, WalletInvalidAmountError } from '@/services/financial/wallet-ops';

const massOrderSchema = z.object({
  text: z.string().min(1, 'Введите данные для заказа'),
  email: z.string().email('Введите корректный email').nullable().optional(),
  gateway: z.enum(['yookassa', 'cryptobot', 'balance']).default('yookassa'),
  idempotencyKey: z.string().optional(),
  expectedTotalRub: z.number().optional(), // W2-2: for TOCTOU price validation
});

export const parseMassOrderText = async (text: string) => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const orders: { 
    serviceId: string; 
    numericId: number; 
    link: string; 
    quantity: number; 
    providerId?: string | null; 
    providerServiceId?: string | null; 
  }[] = [];
  const errors: { line: number; text: string; error: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split('|').map(p => p.trim());
    
    if (parts.length < 3) {
      errors.push({ line: i + 1, text: line, error: 'Формат должен быть: ID услуги | Ссылка | Количество' });
      continue;
    }

    const serviceIdStr = parts[0];
    const link = parts[1];
    const qtyStr = parts[2];

    const numericId = parseInt(serviceIdStr, 10);
    const quantity = parseInt(qtyStr, 10);

    if (isNaN(numericId) || isNaN(quantity) || quantity <= 0) {
      errors.push({ line: i + 1, text: line, error: 'ID услуги и количество должны быть числами' });
      continue;
    }

    orders.push({ serviceId: '', numericId, link, quantity });
  }

  if (orders.length > 0) {
    const numericIds = orders.map(o => o.numericId);
    const services = await db.service.findMany({
      where: { numericId: { in: numericIds }, isActive: true },
      include: { 
        category: { 
          include: { network: true } 
        } 
      }
    });

    const serviceMap = new Map(services.map(s => [s.numericId, s]));
    const { mutateLink, getLinkValidator } = await import('@/validators/link-mutators');

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const service = serviceMap.get(order.numericId);
      if (!service) {
        errors.push({ line: i + 1, text: `${order.numericId}`, error: `Услуга ID ${order.numericId} не найдена или неактивна` });
        continue;
      }

      // 1. Quarantine & Cooldown check
      if (service.cooldownUntil && service.cooldownUntil > new Date()) {
        errors.push({ line: i + 1, text: `${order.numericId} | ${order.link} | ${order.quantity}`, error: `Услуга "${service.name}" временно приостановлена для контроля качества.` });
        continue;
      }
      
      if (order.quantity < service.minQty || order.quantity > service.maxQty) {
        errors.push({ line: i + 1, text: `${order.numericId} | ${order.link} | ${order.quantity}`, error: `Количество для "${service.name}" должно быть от ${service.minQty} до ${service.maxQty}` });
        continue;
      }

      // 2. Link Normalization and Validation
      try {
        const platformSlug = service.category?.network?.slug?.toUpperCase() || '';
        const targetType = service.targetType || 'POST';
        const normalizedLink = mutateLink(order.link, platformSlug, targetType);
        const validator = getLinkValidator(platformSlug, targetType);
        const linkResult = validator.safeParse(normalizedLink);

        if (!linkResult.success) {
          errors.push({ line: i + 1, text: `${order.numericId} | ${order.link} | ${order.quantity}`, error: linkResult.error.errors[0].message });
        } else {
          order.link = normalizedLink;
          order.serviceId = service.id;
          order.providerId = service.providerId;
          order.providerServiceId = service.externalId;
        }
      } catch (e: any) {
        errors.push({ line: i + 1, text: `${order.numericId} | ${order.link} | ${order.quantity}`, error: e.message || 'Ошибка валидации ссылки' });
      }
    }
  }

  return { orders: orders.filter(o => o.serviceId), errors };
};

export const massOrderCalculateAction = async (input: { text: string }) => {
  return createSafeAction(z.object({ text: z.string() }), input, async (data: { text: string }) => {
    const session = await verifySession();
    const userId = session?.userId;
    
    const { orders, errors } = await parseMassOrderText(data.text);
    if (orders.length === 0) {
      throw new Error(errors[0]?.error || 'Нет валидных строк для заказа');
    }

    let totalCents = 0;
    const validOrders = [];
    
    // W4-4 FIX: Preload user and services to avoid N+1 queries in loop
    let user = null;
    if (userId) {
      user = await db.user.findUnique({ where: { id: userId } });
    }
    const serviceIds = orders.map(o => o.serviceId);
    const services = await db.service.findMany({ where: { id: { in: serviceIds } } });
    const serviceMap = new Map(services.map(s => [s.id, s]));

    for (const order of orders) {
       try {
         const pricing = await marketingService.calculatePrice(
           userId, 
           order.serviceId, 
           order.quantity, 
           null, 
           { user, service: serviceMap.get(order.serviceId) }
         );
         totalCents += pricing.totalCents;
         validOrders.push({ ...order, priceRub: pricing.totalCents / 100 });
       } catch (e: any) {
         errors.push({ line: -1, text: order.link, error: e.message });
       }
     }

    return { 
      totalRub: totalCents / 100, 
      totalCents, 
      validCount: validOrders.length, 
      errors,
      validOrders 
    };
  });
};

export const massOrderCheckoutAction = async (input: z.infer<typeof massOrderSchema>) => {
  return createSafeAction(massOrderSchema as any, input, async (data: any) => {
    const { text, email, gateway, idempotencyKey } = data;
    
    // 0. IDOR Prevention & Anti-Fraud
    const isAllowed = await RateLimitService.check("massCheckoutCore", 5, 60);
    if (!isAllowed) throw new Error("Слишком много запросов. Попробуйте через минуту.");

    const session = await verifySession();
    let userId = session?.userId;

    if (!userId && gateway === 'balance') {
      throw new Error("Оплата с баланса доступна только авторизованным пользователям");
    }

    if (!userId) {
       if (!email) throw new Error("Email обязателен для гостей");
       let user = await db.user.findUnique({ where: { email } });
       if (!user) {
         user = await db.user.create({
           data: { email, role: 'USER' }
         });
       }
       userId = user.id;
    }
    
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

    // 0.5 Idempotency check
    if (idempotencyKey) {
      const existingOrder = await db.order.findFirst({
        where: { idempotencyKey, userId: user.id },
        include: { payment: true }
      });
      if (existingOrder && existingOrder.payment) {
        console.info(`[MassCheckout] Idempotency hit for key ${idempotencyKey}`);
        return {
          paymentId: existingOrder.paymentId,
          paymentUrl: existingOrder.payment.checkoutUrl || ''
        };
      }
    }

    const reqHeaders = await headers();
    const consentIp = await getClientIp();
    const consentUserAgent = reqHeaders.get("user-agent") || "Unknown";

    const { orders } = await parseMassOrderText(text);
    if (orders.length === 0) throw new Error("Нет валидных строк для заказа");

    let totalCents = 0;
    const orderCreationData: any[] = [];
    
    // W2-3: Generate unique keys for each order in the batch, rather than re-using the checkout request's idempotency key
    const crypto = (await import('crypto')).default;
    const isTestMode = await SettingsManager.isTestMode(); // W4-5 FIX

    // W4-4 FIX: Preload services to avoid N+1 queries in loop
    const serviceIds = orders.map(o => o.serviceId);
    const services = await db.service.findMany({ where: { id: { in: serviceIds } } });
    const serviceMap = new Map(services.map(s => [s.id, s]));

    for (const order of orders) {
       const pricing = await marketingService.calculatePrice(
         user.id, 
         order.serviceId, 
         order.quantity, 
         null, 
         { user, service: serviceMap.get(order.serviceId) }
       );
       totalCents += pricing.totalCents;
       orderCreationData.push({
         userId: user.id,
         serviceId: order.serviceId,
         providerId: order.providerId,
         providerServiceId: order.providerServiceId,
         link: order.link,
         quantity: order.quantity,
         charge: pricing.totalCents,
         providerCost: pricing.providerCostCents,
         status: 'AWAITING_PAYMENT' as const,
         email: user.email,
         isDripFeed: false,
         remains: order.quantity,
         consentIp,
         consentUserAgent,
         idempotencyKey: crypto.randomUUID(), // W2-3 FIX
         isTest: isTestMode // W4-5 FIX
       });
    }
    
    // W2-2 FIX: TOCTOU Price Validation
    if (data.expectedTotalRub !== undefined) {
      const expectedCents = Math.round(data.expectedTotalRub * 100);
      const diff = Math.abs(totalCents - expectedCents);
      // Allow max 1% deviation (e.g. currency rate fluctuated slightly during checkout)
      if (diff > expectedCents * 0.01 && diff > 100) {
        throw new Error(`Цена изменилась с момента расчета. Ожидалось: ${data.expectedTotalRub} ₽, сейчас: ${totalCents / 100} ₽. Пожалуйста, обновите заказ.`);
      }
    }

    if (gateway !== 'balance' && totalCents < 1000) {
      throw new Error("Минимальная сумма для оплаты картой или криптовалютой — 10 ₽.");
    }

    if (gateway === 'balance' && user.balance < totalCents) {
      throw new Error("Недостаточно средств на балансе");
    }

    // Create Payment and Orders in Transaction
    const result = await db.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId: user.id,
          amount: totalCents,
          currency: 'RUB',
          status: 'PENDING',
          gateway,
          consentIp,
          consentUserAgent
        }
      });

      // We assign paymentId directly in the bulk create
      await tx.order.createMany({
        data: orderCreationData.map(o => ({ ...o, paymentId: payment.id }))
      });

      return { paymentId: payment.id };
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
    const successUrl = `${origin}/success`;

    try {
      const gatewaySvc = PaymentGatewayFactory.getGateway(gateway || 'yookassa');
      const gatewayResult = await gatewaySvc.createPayment({
        paymentId: result.paymentId,
        userId: user.id,
        amountRub: totalCents / 100,
        email: user.email,
        successUrl,
        description: `Массовый заказ (Payment #${result.paymentId})`,
        isTestMode: isTestMode || user.email === 'e2e-tester@test.com'
      });
      
      paymentUrl = gatewayResult.paymentUrl || '';
      remoteGatewayId = gatewayResult.remoteGatewayId || '';

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
      console.error('[MassCheckout] Gateway failed', gatewayErr);
      await db.payment.update({
        where: { id: result.paymentId },
        data: { status: 'CANCELED' }
      });
      await db.order.updateMany({
        where: { paymentId: result.paymentId },
        data: { status: 'ERROR', error: gatewayErr.message || 'Ошибка генерации платежа' }
      });
      
      if (gatewayErr instanceof WalletInsufficientFundsError) {
        throw new Error('Недостаточно средств на балансе. Пожалуйста, пополните счет.');
      }
      if (gatewayErr instanceof WalletUserNotFoundError) {
        throw new Error('Пользователь не найден. Пожалуйста, авторизуйтесь заново.');
      }
      if (gatewayErr instanceof WalletInvalidAmountError) {
        throw new Error('Некорректная сумма операции.');
      }
      throw new Error(gatewayErr.message || 'Ошибка на стороне платежного шлюза. Попробуйте другой метод', { cause: gatewayErr });
    }

    if (!session) {
      await createSession(user.id);
    }

    return { 
      paymentId: result.paymentId,
      paymentUrl
    };
  });
};
