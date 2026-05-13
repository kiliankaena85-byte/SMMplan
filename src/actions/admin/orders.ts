'use server';

/**
 * Order Management Actions
 * Unified from orders.ts and orders-extended.ts
 *
 * Security: requireStaffPermission('orders', 'edit', ...)
 * Financial operations: Serializable isolation + calculatePartialRefund utility.
 */

import { requireStaffPermission } from '@/lib/server/rbac';
import { db } from '@/lib/db';
import { auditAdmin } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { calculatePartialRefund } from '@/utils/refund';
import { adminOrderService } from '@/services/admin/order.service';
import { WalletOps } from '@/services/financial/wallet-ops';
import { orderIdSchema } from '@/validators/admin.validators';

// ── Types & Schemas ──

const ALLOWED_MANUAL_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'CANCELED', 'ERROR'] as const;
type OrderStatus = typeof ALLOWED_MANUAL_STATUSES[number];

const setStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(ALLOWED_MANUAL_STATUSES),
  remains: z.number().int().min(0).optional(),
});

const bulkCancelSchema = z.object({
  orderIds: z.array(z.string().min(1)).max(500),
});

// ── Single Order Actions ──

export async function cancelOrderAction(formData: FormData) {
  return requireStaffPermission('orders', 'edit', async (admin) => {
    const parsed = orderIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { success: false as const, error: 'Missing orderId' };
    const { orderId } = parsed.data;

    await adminOrderService.cancelOrder(orderId, {
      id: admin.id,
      email: admin.email,
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ORDER_CANCEL',
      target: orderId,
      targetType: 'ORDER',
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

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ORDER_RESTART',
      target: orderId,
      targetType: 'ORDER',
    });

    revalidatePath('/admin/orders');
    return { success: true as const };
  });
}

/**
 * Manual status override with audit and partial refund logic.
 */
export async function setOrderStatusAction(
  orderId: string,
  status: OrderStatus,
  remains?: number
) {
  return requireStaffPermission('orders', 'edit', async (admin) => {
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { user: { select: { id: true, balance: true } } },
      });

      const oldStatus = order.status;
      const newStatus = status;

      let refundCents = 0;
      if (newStatus === 'CANCELED' && !['COMPLETED', 'CANCELED'].includes(oldStatus)) {
        if (oldStatus === 'PENDING' || oldStatus === 'AWAITING_PAYMENT') {
          refundCents = Number(order.charge);
        } else {
          refundCents = calculatePartialRefund(order);
        }
      }

      const newRemains = remains ?? order.remains;

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          remains: newRemains,
          ...(newStatus === 'COMPLETED' ? { remains: 0 } : {}),
        },
      });

      if (refundCents > 0) {
        await WalletOps.refund(tx, order.userId, refundCents,
          `Ручная смена статуса заказа #${order.numericId}: ${oldStatus}→${newStatus}`,
          { adminId: admin.id }
        );
      }

      return { oldStatus, refundCents, numericId: order.numericId };
    }, { isolationLevel: 'Serializable' });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ORDER_STATUS_OVERRIDE',
      target: orderId,
      targetType: 'ORDER',
      oldValue: { status: result.oldStatus },
      newValue: { status: status, remains: remains, refund: result.refundCents },
    });

    revalidatePath('/admin/orders');
    return { success: true as const, refundCents: result.refundCents, numericId: result.numericId };
  });
}


/**
 * Force COMPLETE: moves order to COMPLETED status and refunds for undelivered quantity.
 */
export async function forceCompleteOrderAction(orderId: string) {
  return requireStaffPermission('orders', 'edit', async (admin) => {
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
      });

      if (['COMPLETED', 'CANCELED'].includes(order.status)) {
        throw new Error('Order is already in a terminal state');
      }

      const refundCents = calculatePartialRefund(order);

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          remains: 0,
        },
      });

      if (refundCents > 0) {
        await WalletOps.refund(tx, order.userId, refundCents,
          `Force Complete #${order.numericId} with partial refund`,
          { adminId: admin.id }
        );
      }

      return { numericId: order.numericId, refundCents };
    }, { isolationLevel: 'Serializable' });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ORDER_FORCE_COMPLETE',
      target: orderId,
      targetType: 'ORDER',
      newValue: { refund: result.refundCents },
    });

    revalidatePath('/admin/orders');
    return { success: true as const, refundCents: result.refundCents, numericId: result.numericId };
  });
}

// ── Bulk Actions ──

export async function bulkCancelOrdersAction(orderIds: string[]) {
  return requireStaffPermission('orders', 'edit', async (admin) => {
    const parsed = bulkCancelSchema.safeParse({ orderIds });
    if (!parsed.success) throw new Error('Invalid IDs or too many items');

    const result = await db.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: { id: { in: parsed.data.orderIds } },
      });

      let totalRefunded = 0;
      let count = 0;

      for (const order of orders) {
        if (!['COMPLETED', 'CANCELED'].includes(order.status)) {
          let refundCents = 0;
          if (order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT') {
            refundCents = Number(order.charge);
          } else {
            refundCents = calculatePartialRefund(order);
          }

          await tx.order.update({
            where: { id: order.id },
            data: { status: 'CANCELED' },
          });

          if (refundCents > 0) {
            await WalletOps.refund(tx, order.userId, refundCents,
              `Массовая отмена заказа #${order.numericId}`,
              { adminId: admin.id }
            );
            totalRefunded += refundCents;
          }
          count++;
        }
      }

      return { count, totalRefunded };
    }, { isolationLevel: 'Serializable' });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ORDER_BULK_CANCEL',
      target: 'batch',
      targetType: 'ORDER',
      newValue: { count: result.count, totalRefunded: result.totalRefunded },
    });

    revalidatePath('/admin/orders');
    return { 
      success: true as const, 
      cancelledCount: result.count, 
      totalRefundCents: result.totalRefunded 
    };
  });
}

