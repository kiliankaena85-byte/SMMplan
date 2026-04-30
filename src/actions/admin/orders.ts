'use server';

import { db } from '@/lib/db';
import { adminOrderService } from '@/services/admin/order.service';
import { revalidatePath } from 'next/cache';
import { orderIdSchema } from '@/validators/admin.validators';
import { requireStaffPermission } from '@/lib/server/rbac';

export async function cancelOrderAction(formData: FormData) {
  return requireStaffPermission('orders', 'edit', async (admin) => {
    const parsed = orderIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { success: false as const, error: 'Missing orderId' };
    const { orderId } = parsed.data;

    await adminOrderService.cancelOrder(orderId, {
      id: admin.id,
      email: admin.email,
    });

    revalidatePath('/admin/orders');
    return { success: true as const };
  });
}

export async function restartOrderAction(formData: FormData) {
  return requireStaffPermission('orders', 'edit', async (admin) => {
    const parsed = orderIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { success: false as const, error: 'Missing orderId' };
    const { orderId } = parsed.data;

    await adminOrderService.restartOrder(orderId, {
      id: admin.id,
      email: admin.email,
    });

    revalidatePath('/admin/orders');
    return { success: true as const };
  });
}
