'use server';

import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/server/rbac';
import { auditAdmin } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const restartRefillSchema = z.object({
  refillId: z.string().min(1),
});

const updateRefillStatusSchema = z.object({
  refillId: z.string().min(1),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'ERROR']),
});

export async function restartRefillAction(formData: FormData) {
  return requireStaffPermission('orders', 'edit', async (admin) => {
    const parsed = restartRefillSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { success: false as const, error: 'Некорректный ID докрутки' };
    }

    const { refillId } = parsed.data;

    try {
      const refill = await db.refill.findUnique({
        where: { id: refillId },
      });

      if (!refill) {
        return { success: false as const, error: 'Докрутка не найдена' };
      }

      if (refill.status === 'COMPLETED') {
        return { success: false as const, error: 'Докрутка уже успешно завершена' };
      }

      await db.refill.update({
        where: { id: refillId },
        data: {
          status: 'PENDING',
          externalId: null,
        },
      });

      const { refillQueue } = await import('@/lib/queue-manager');
      await refillQueue.add('process-refill', { refillId });

      auditAdmin({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'REFILL_RESTART',
        target: refillId,
        targetType: 'REFILL',
        oldValue: { status: refill.status },
        newValue: { status: 'PENDING' },
      });

      revalidatePath('/admin/refills');
      return { success: true as const };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false as const, error: errorMsg || 'Ошибка при перезапуске докрутки' };
    }
  });
}

export async function updateRefillStatusAction(formData: FormData) {
  if (!formData || typeof formData.entries !== 'function') {
    return { success: false, error: "Некорректные данные" };
  }
  return requireStaffPermission('orders', 'edit', async (admin) => {
    const parsed = updateRefillStatusSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { success: false as const, error: 'Некорректные данные' };
    }

    const { refillId, status } = parsed.data;

    try {
      const refill = await db.refill.findUnique({
        where: { id: refillId },
      });

      if (!refill) {
        return { success: false as const, error: 'Докрутка не найдена' };
      }

      await db.refill.update({
        where: { id: refillId },
        data: { status },
      });

      auditAdmin({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'REFILL_STATUS_OVERRIDE',
        target: refillId,
        targetType: 'REFILL',
        oldValue: { status: refill.status },
        newValue: { status },
      });

      revalidatePath('/admin/refills');
      return { success: true as const };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false as const, error: errorMsg || 'Ошибка при изменении статуса докрутки' };
    }
  });
}
