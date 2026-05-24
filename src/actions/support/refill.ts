'use server';

import { db } from '@/lib/db';
import { refillQueue } from '@/lib/queue-manager';
import { requireStaffPermission } from '@/lib/server/rbac';
import { revalidatePath } from 'next/cache';

export async function createRefillAction(orderId: string) {
  return requireStaffPermission('orders', 'edit', async (user) => {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { service: true }
    });

    if (!order) {
      return { success: false, error: 'Заказ не найден' };
    }

    // Security validation: check status is not canceled, error, or partial (refunded)
    if (order.status === 'CANCELED' || order.status === 'ERROR') {
      return { success: false, error: 'Невозможно докрутить отмененный или ошибочный заказ' };
    }

    if (order.status === 'PARTIAL') {
      return { success: false, error: 'Невозможно докрутить заказ с частичным возвратом' };
    }

    if (!order.service.isRefillEnabled) {
      return { success: false, error: 'Докрутка не поддерживается для этой услуги' };
    }

    // Create Refill record in database
    const refill = await db.refill.create({
      data: {
        orderId: order.id,
        status: 'PENDING'
      }
    });

    // Dispatch to BullMQ refillQueue
    await refillQueue.add('process-refill', {
      refillId: refill.id
    });

    revalidatePath('/admin/refills');
    revalidatePath('/admin/orders');

    return { success: true, refillId: refill.id };
  });
}
