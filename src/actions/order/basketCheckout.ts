'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { PaymentService } from '@/services/financial/payment.service';
import { MutexManager } from '@/lib/redis-lock';

export type BasketItemInput = {
  serviceId: string;
  link: string;
  quantity: number;
  email?: string;
  runs?: number;
  interval?: number;
  customData?: string;
};

const basketCheckoutSchema = z.object({
  items: z.array(z.object({
    serviceId: z.string(),
    link: z.string().url("Неверный формат ссылки"),
    quantity: z.number().min(1),
    email: z.string().email("Неверный email").optional(),
    runs: z.number().int().positive().optional(),
    interval: z.number().int().positive().optional(),
    customData: z.string().optional()
  })).min(1, "Корзина пуста"),
  gateway: z.string().default('yookassa')
});

export const basketCheckoutAction = async (input: z.infer<typeof basketCheckoutSchema>) => {
  try {
    const parsed = basketCheckoutSchema.parse(input);
    const session = await verifySession();

    if (!session?.userId) {
      return { success: false, error: 'Вы должны быть авторизованы для массового заказа.' };
    }

    const userId = session.userId;
    // B2B Epic: Prevent Race Conditions
    const lockKey = `checkout:${userId}`;
    const result = await MutexManager.withLock(lockKey, 5000, 10000, async () => {
      
      let totalChargeCents = 0;
      const orderCreates: any[] = [];

      // We must query the DB for service prices, NOT trust the client!
      const serviceIds = [...new Set(parsed.items.map(i => i.serviceId))];
      const services = await db.service.findMany({
        where: { id: { in: serviceIds }, isActive: true }
      });
      const serviceMap = new Map(services.map(s => [s.id, s]));

      const user = await db.user.findUnique({ where: { id: userId }});
      if (!user) throw new Error("User not found");

      // Verify each item and calculate real price
      for (const item of parsed.items) {
        const service = serviceMap.get(item.serviceId);
        if (!service) throw new Error(`Услуга ${item.serviceId} недоступна`);

        if (item.quantity < service.minQty) throw new Error(`Меньше минимального для: ${item.link}`);
        if (item.quantity > service.maxQty) throw new Error(`Больше максимального для: ${item.link}`);

        const isDripFeed = !!item.runs && !!item.interval;
        const totalQuantity = isDripFeed ? item.quantity * item.runs! : item.quantity;
        const currentRate = service.rate + ((service.rate * (service.markup || 0)) / 100);
        const chargeVal = Math.round((totalQuantity / 1000) * currentRate * 100);

        totalChargeCents += chargeVal;

        orderCreates.push({
          userId: userId,
          serviceId: service.id,
          link: item.link,
          quantity: item.quantity,
          charge: chargeVal,
          status: 'AWAITING_PAYMENT',
          providerId: service.providerId,
          externalId: service.externalId,
          isDripFeed: isDripFeed,
          runs: item.runs || null,
          interval: item.interval || null,
        });
      }

      // Start Database Transaction for Batch Order + Payment Creation
      const paymentData = await db.$transaction(async (tx) => {
        // Create 1 Payment entity
        const newPayment = await tx.payment.create({
          data: {
            userId: userId,
            amount: totalChargeCents,
            currency: 'RUB',
            status: 'PENDING'
          }
        });

        // Create N Order entities linked to it
        await tx.order.createMany({
          data: orderCreates.map(oc => ({
            ...oc,
            paymentId: newPayment.id
          }))
        });

        return newPayment;
      });

            // Call Gateway (Yookassa/Cryptobot) depending on logic
      const { SettingsManager } = await import('@/lib/settings');
      const secrets = await SettingsManager.getPaymentSecrets();
      
      const shopId = secrets.yookassaShopId;
      const secretKey = secrets.yookassaSecretKey;

      if (!shopId || !secretKey) throw new Error("Шлюз ЮKassa не настроен.");

      const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
      const payload = {
        amount: { value: (totalChargeCents / 100).toFixed(2), currency: "RUB" },
        capture: true,
        confirmation: { type: "redirect", return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?order=basket` },
        description: `Массовый B2B Заказ (${parsed.items.length} ссылок)`,
        metadata: { paymentId: paymentData.id, userId: userId, type: "deposit" }
      };

      const resp = await fetch("https://api.yookassa.ru/v3/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
          "Idempotence-Key": paymentData.id
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) throw new Error('Payment gateway error');
      const data = await resp.json();

      await db.payment.update({
        where: { id: paymentData.id },
        data: { gatewayId: data.id }
      });

      return { 
        success: true, 
        paymentUrl: data.confirmation.confirmation_url,
        totalItems: parsed.items.length,
        totalCharge: totalChargeCents
      };
});

    return result;

  } catch (error: any) {
    console.error('[basketCheckout] error:', error?.message || error);
    return { success: false, error: error?.message || 'Неизвестная ошибка корзины' };
  }
};
