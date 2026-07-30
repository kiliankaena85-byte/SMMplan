'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function requestClientRefillAction(input: string | { orderId: string }) {
  const session = await verifySession();
  if (!session || !session.userId) {
    return { success: false as const, error: 'Пользователь не авторизован' };
  }

  const orderId = typeof input === 'string' ? input : input?.orderId;
  if (!orderId || typeof orderId !== 'string') {
    return { success: false as const, error: 'ID заказа не указан' };
  }

  try {
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        userId: session.userId,
      },
      include: {
        service: {
          select: {
            isRefillEnabled: true,
          },
        },
        refills: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!order) {
      return { success: false as const, error: 'Заказ не найден или недоступен' };
    }

    if (!order.service?.isRefillEnabled) {
      return {
        success: false as const,
        error: 'Для данной услуги бесплатная докрутка не предусмотрена',
      };
    }

    if (order.status !== 'COMPLETED' && order.status !== 'PARTIAL') {
      return {
        success: false as const,
        error: 'Докрутка доступна только для завершенных или частично выполненных заказов',
      };
    }

    const hasActiveRefill = order.refills.some((r) =>
      ['PENDING', 'IN_PROGRESS'].includes(r.status)
    );

    if (hasActiveRefill) {
      const activeRefill = order.refills.find((r) =>
        ['PENDING', 'IN_PROGRESS'].includes(r.status)
      );
      return {
        success: false as const,
        error: 'Заявка на докрутку уже принята и находится в обработке',
        refill: activeRefill
          ? {
              id: activeRefill.id,
              status: activeRefill.status,
              createdAt: activeRefill.createdAt.toISOString(),
            }
          : undefined,
      };
    }

    const refill = await db.refill.create({
      data: {
        orderId: order.id,
        status: 'PENDING',
      },
    });

    try {
      const { refillQueue } = await import('@/lib/queue-manager');
      if (refillQueue) {
        await refillQueue.add('process-refill', { refillId: refill.id });
      }
    } catch {
      // Queue worker fallback
    }

    revalidatePath('/dashboard/orders');
    revalidatePath(`/dashboard/orders/${order.id}`);

    return {
      success: true as const,
      message: 'Заявка на докрутку принята',
      refill: {
        id: refill.id,
        status: refill.status,
        createdAt: refill.createdAt.toISOString(),
      },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false as const,
      error: errorMsg || 'Ошибка при запросе докрутки',
    };
  }
}

