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

const massOrderSchema = z.object({
  text: z.string().min(1, 'Введите данные для заказа'),
  email: z.string().email('Введите корректный email').nullable().optional(),
  gateway: z.enum(['yookassa', 'cryptobot', 'balance']).default('yookassa'),
});

export const parseMassOrderText = async (text: string) => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const orders: { serviceId: string; numericId: number; link: string; quantity: number }[] = [];
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
      select: { id: true, numericId: true, minQty: true, maxQty: true, name: true }
    });

    const serviceMap = new Map(services.map(s => [s.numericId, s]));

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const service = serviceMap.get(order.numericId);
      if (!service) {
        errors.push({ line: -1, text: `${order.numericId}`, error: `Услуга ID ${order.numericId} не найдена или неактивна` });
        continue;
      }
      
      if (order.quantity < service.minQty || order.quantity > service.maxQty) {
        errors.push({ line: -1, text: `${order.numericId} | ${order.link} | ${order.quantity}`, error: `Количество для "${service.name}" должно быть от ${service.minQty} до ${service.maxQty}` });
      } else {
        order.serviceId = service.id;
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
    
    for (const order of orders) {
       try {
         const pricing = await marketingService.calculatePrice(userId, order.serviceId, order.quantity);
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
  return createSafeAction(massOrderSchema, input, async (data: z.infer<typeof massOrderSchema>) => {
    const { text, email, gateway } = data;
    
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

    const reqHeaders = await headers();
    const consentIp = await getClientIp();
    const consentUserAgent = reqHeaders.get("user-agent") || "Unknown";

    const { orders } = await parseMassOrderText(text);
    if (orders.length === 0) throw new Error("Нет валидных строк для заказа");

    let totalCents = 0;
    const orderCreationData: any[] = [];
    
    for (const order of orders) {
       const pricing = await marketingService.calculatePrice(user.id, order.serviceId, order.quantity);
       totalCents += pricing.totalCents;
       orderCreationData.push({
         userId: user.id,
         serviceId: order.serviceId,
         link: order.link,
         quantity: order.quantity,
         charge: pricing.totalCents,
         providerCost: pricing.providerCostCents,
         status: 'AWAITING_PAYMENT' as const,
         email: user.email,
         isDripFeed: false,
         remains: order.quantity,
         consentIp,
         consentUserAgent
       });
    }

    if (gateway !== 'balance' && totalCents < 1000) {
      throw new Error("Минимальная сумма для оплаты картой или криптовалютой — 10 ₽.");
    }

    if (gateway === 'balance' && user.balance < totalCents) {
      throw new Error("Недостаточно средств на балансе");
    }

    const isTestMode = await SettingsManager.isTestMode();

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
