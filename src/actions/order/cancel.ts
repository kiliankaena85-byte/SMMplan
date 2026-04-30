'use server';

import { verifySession } from '@/lib/session';
import { orderService } from '@/services/core/order.service';
import { revalidatePath } from 'next/cache';

export async function cancelOrderCoolingOffAction(orderId: string) {
  try {
    const session = await verifySession();
    if (!session) {
      return { success: false, error: 'Unauthorized' };
    }

    const result = await orderService.cancelPendingOrderClient(orderId, session.userId);

    if (result.success) {
      revalidatePath('/dashboard/orders');
      revalidatePath('/dashboard/orders/[id]', 'page');
      revalidatePath('/dashboard'); // To update balance
      return { success: true };
    }

    return { success: false, error: result.error || 'Failed to cancel the order' };
  } catch (error: any) {
    console.error('[cancelOrderAction] Action error:', error);
    return { success: false, error: 'Сеть или серверная ошибка при отмене' };
  }
}
