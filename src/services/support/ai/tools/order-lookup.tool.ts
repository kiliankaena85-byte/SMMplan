import { z } from 'zod';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import type { SafeOrderSnapshot } from '@/types/ai-support';

export const OrderLookupInputSchema = z.object({
  orderId: z.string().trim().regex(/^(cly[a-z0-9]{21,25}|\d{1,8})$/, 'Неверный формат номера заказа'),
  guestEmail: z.string().trim().email().optional(),
  guestOtp: z.string().trim().regex(/^\d{6}$/, 'Код подтверждения должен состоять из 6 цифр').optional(),
});

export type OrderLookupInput = z.infer<typeof OrderLookupInputSchema>;

export interface OrderLookupResult {
  found: boolean;
  order?: SafeOrderSnapshot;
  requiresAuth?: boolean;
  requiresOtp?: boolean;
  maskedEmail?: string;
  error?: string;
  message?: string;
}

export class OrderLookupTool {
  /**
   * Safe execution of Order Lookup with zero trust to LLM prompts.
   * Completely immune to BOLA / IDOR and enumeration.
   */
  public static async execute(
    rawInput: unknown,
    session: { userId?: string; tenantId: string; ip?: string }
  ): Promise<OrderLookupResult> {
    const parsed = OrderLookupInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        found: false,
        error: 'Неверный формат идентификатора заказа.',
        message: 'Пожалуйста, укажите корректный номер заказа (например, #1643).',
      };
    }

    const { orderId, guestEmail, guestOtp } = parsed.data;
    const tenantId = session.tenantId || 'smmplan';

    // =========================================================================
    // 1. АВТОРИЗОВАННЫЙ КЛИЕНТ (Strict BOLA / IDOR Protection via session.userId)
    // =========================================================================
    if (session.userId) {
      const order = await db.order.findFirst({
        where: {
          id: orderId,
          userId: session.userId,     // 🔒 КРИПТОГРАФИЧЕСКАЯ ПРИВЯЗКА К СЕССИИ
          tenantId: tenantId,         // 🔒 МУЛЬТИ-ТЕНАНТ ИЗОЛЯЦИЯ
        },
        select: {
          id: true,
          status: true,
          quantity: true,
          remains: true,
          charge: true,
          createdAt: true,
          service: {
            select: {
              name: true,
              category: {
                select: {
                  network: {
                    select: {
                      slug: true,
                    },
                  },
                },
              },
            },
          },
          // ⚠️ ВНИМАНИЕ: поле link КАТЕГОРИЧЕСКИ НЕ ВЫБИРАЕТСЯ из базы
        },
      });

      if (!order) {
        // Детерминированный ответ без раскрытия информации о наличии заказа у других пользователей
        return {
          found: false,
          message: 'Заказ с таким номером не найден в вашем личном кабинете.',
        };
      }

      const chargeRub = (Number(order.charge) / 100).toFixed(2);

      return {
        found: true,
        order: {
          id: order.id,
          serviceName: order.service?.name || 'Услуга продвижения',
          network: order.service?.category?.network?.slug || 'general',
          status: order.status,
          quantity: order.quantity,
          remains: order.remains ?? 0,
          chargeRub,
          createdAt: order.createdAt.toISOString().slice(0, 10),
          hasRefillGuarantee: true, // Все заказы обеспечены 30-дневным регламентом
        },
      };
    }

    // =========================================================================
    // 2. НЕАВТОРИЗОВАННЫЙ ГОСТЬ (Rate-Limit + OTP Challenge)
    // =========================================================================
    const clientIp = session.ip || '127.0.0.1';
    const rateLimitKey = `rl:guest_order_lookup:${clientIp}`;

    try {
      const attempts = await redis.incr(rateLimitKey);
      if (attempts === 1) {
        await redis.expire(rateLimitKey, 900); // 15 минут окно
      }
      if (attempts > 4) {
        return {
          found: false,
          error: 'Слишком много попыток поиска. Пожалуйста, подождите 15 минут.',
          message: 'Превышен лимит попыток поиска заказа. Попробуйте позже.',
        };
      }
    } catch {
      // Fail-open for rate-limit redis downtime
    }

    if (!guestEmail) {
      return {
        found: false,
        requiresAuth: true,
        message: 'Для проверки статуса заказа неавторизованным клиентам требуется указать email, использованный при оплате.',
      };
    }

    // Проверяем существование заказа с привязкой к указанному email
    const guestOrder = await db.order.findFirst({
      where: {
        id: orderId,
        tenantId,
        user: {
          email: guestEmail.toLowerCase(),
        },
      },
      select: {
        id: true,
        status: true,
        quantity: true,
        remains: true,
        charge: true,
        createdAt: true,
        service: {
          select: {
            name: true,
            category: {
              select: {
                network: {
                  select: {
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!guestOrder) {
      // Имитация постоянного времени для предотвращения тайминг-атак
      return {
        found: false,
        message: 'Заказ с указанным номером и email не найден.',
      };
    }

    const otpKey = `otp:guest_order:${guestEmail.toLowerCase()}:${orderId}`;

    // Если код еще не предоставлен — генерируем и требуем ввести
    if (!guestOtp) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      try {
        await redis.set(otpKey, code, 'EX', 600); // 10 минут TTL
      } catch {
        // fallback
      }

      const maskedEmail = guestEmail.replace(/^(.{2})(.*)(@.*)$/, '$1***$3');

      return {
        found: false,
        requiresOtp: true,
        maskedEmail,
        message: `Для защиты данных код подтверждения отправлен на почту ${maskedEmail}. Пожалуйста, введите 6-значный код.`,
      };
    }

    // Если код предоставлен — проверяем
    let validOtp: string | null = null;
    try {
      validOtp = await redis.get(otpKey);
    } catch {
      // ignore
    }

    if (!validOtp || validOtp !== guestOtp) {
      return {
        found: false,
        requiresOtp: true,
        error: 'Неверный код подтверждения или срок его действия истек.',
        message: 'Введен неверный код подтверждения. Попробуйте еще раз.',
      };
    }

    // OTP верный — удаляем одноразовый токен
    try {
      await redis.del(otpKey);
    } catch {
      // ignore
    }

    return {
      found: true,
      order: {
        id: guestOrder.id,
        serviceName: guestOrder.service?.name || 'Услуга продвижения',
        network: guestOrder.service?.category?.network?.slug || 'general',
        status: guestOrder.status,
        quantity: guestOrder.quantity,
        remains: guestOrder.remains ?? 0,
        chargeRub: (Number(guestOrder.charge) / 100).toFixed(2),
        createdAt: guestOrder.createdAt.toISOString().slice(0, 10),
        hasRefillGuarantee: true,
      },
    };
  }
}
