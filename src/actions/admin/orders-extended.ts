'use server';

/**
 * Extended Order Actions — Sprint 1.5
 *
 * setOrderStatusAction        — manual status override with audit
 * forceCompleteOrderAction    — force COMPLETED + partial refund for undelivered qty
 * bulkCancelOrdersAction      — batch cancel up to 500 orders
 *
 * Security: requireAdmin on all actions.
 * Financial operations: Serializable isolation.
 */

import { requireAdmin } from '@/lib/server/rbac';
import { db } from '@/lib/db';
import { auditAdmin } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ALLOWED_MANUAL_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'CANCELED', 'ERROR'] as const;
type OrderStatus = typeof ALLOWED_MANUAL_STATUSES[number];

const setStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(ALLOWED_MANUAL_STATUSES),
  remains: z.number().int().min(0).optional(),
});

const bulkIdsSchema = z.array(z.string().min(1)).min(1).max(500);

/** Manually set order status. If COMPLETED or CANCELED, handles partial refunds. */
export async function setOrderStatusAction(
  orderId: string,
  status: OrderStatus,
  remains?: number
) {
  return requireAdmin(async (admin) => {
    const parsed = setStatusSchema.safeParse({ orderId, status, remains });
    if (!parsed.success) {
      return { success: false as const, error: 'Неверные параметры' };
    }

    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: parsed.data.orderId },
        include: { user: { select: { id: true, balance: true } } },
      });

      const oldStatus = order.status;
      const newStatus = parsed.data.status;

      // Partial refund logic when manually cancelling or completing with remainder
      let refundCents = 0;
      if (newStatus === 'CANCELED' && !['COMPLETED', 'CANCELED'].includes(oldStatus)) {
        // Refund undelivered portion
        if (order.remains > 0 && order.quantity > 0) {
          refundCents = Math.floor((order.remains / order.quantity) * Number(order.charge));
        } else if (oldStatus === 'PENDING' || oldStatus === 'AWAITING_PAYMENT') {
          refundCents = Number(order.charge);
        }
      }

      const newRemains = parsed.data.remains ?? order.remains;

      await tx.order.update({
        where: { id: parsed.data.orderId },
        data: {
          status: newStatus,
          remains: newRemains,
          ...(newStatus === 'COMPLETED' ? { remains: 0 } : {}),
        },
      });

      if (refundCents > 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: {
            balance: { increment: refundCents },
            totalSpent: { decrement: refundCents },
          },
        });

        await tx.ledgerEntry.create({
          data: {
            userId: order.userId,
            adminId: admin.id,
            amount: refundCents,
            reason: `Ручная смена статуса заказа #${order.numericId}: ${oldStatus}→${newStatus}`,
            status: 'APPROVED',
          },
        });
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
      newValue: { status, remains, refundCents: result.refundCents },
    });

    revalidatePath('/admin/orders');
    return { success: true as const, refundCents: result.refundCents, numericId: result.numericId };
  });
}

/** Force-complete an order. Refunds the proportional undelivered amount. */
export async function forceCompleteOrderAction(orderId: string) {
  return requireAdmin(async (admin) => {
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { id: true, numericId: true, status: true, quantity: true, remains: true, charge: true, userId: true },
      });

      if (order.status === 'COMPLETED' || order.status === 'CANCELED') {
        throw new Error(`Заказ #${order.numericId} уже ${order.status}`);
      }

      // Refund undelivered portion
      let refundCents = 0;
      if (order.remains > 0 && order.quantity > 0) {
        refundCents = Math.floor((order.remains / order.quantity) * Number(order.charge));
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'COMPLETED', remains: 0 },
      });

      if (refundCents > 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: {
            balance: { increment: refundCents },
            totalSpent: { decrement: refundCents },
          },
        });

        await tx.ledgerEntry.create({
          data: {
            userId: order.userId,
            adminId: admin.id,
            amount: refundCents,
            reason: `Принудительное завершение заказа #${order.numericId} — частичный возврат`,
            status: 'APPROVED',
          },
        });
      }

      return { refundCents, numericId: order.numericId, oldStatus: order.status };
    }, { isolationLevel: 'Serializable' });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ORDER_FORCE_COMPLETE',
      target: orderId,
      targetType: 'ORDER',
      oldValue: { status: result.oldStatus },
      newValue: { status: 'COMPLETED', refundCents: result.refundCents },
    });

    revalidatePath('/admin/orders');
    return { success: true as const, refundCents: result.refundCents, numericId: result.numericId };
  });
}

/** Batch cancel orders. Each order gets independent partial refund. */
export async function bulkCancelOrdersAction(orderIds: string[]) {
  return requireAdmin(async (admin) => {
    const ids = bulkIdsSchema.safeParse(orderIds);
    if (!ids.success) {
      return { success: false as const, error: 'Неверный список заказов' };
    }

    let cancelledCount = 0;
    let totalRefundCents = 0;

    // Process in chunks of 50 to avoid transaction overload
    const chunks: string[][] = [];
    for (let i = 0; i < ids.data.length; i += 50) {
      chunks.push(ids.data.slice(i, i + 50));
    }

    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map(async (orderId) => {
          return db.$transaction(async (tx) => {
            const order = await tx.order.findUniqueOrThrow({
              where: { id: orderId },
              select: { id: true, numericId: true, status: true, quantity: true, remains: true, charge: true, userId: true },
            });

            if (['COMPLETED', 'CANCELED'].includes(order.status)) {
              return { skipped: true, refundCents: 0 };
            }

            let refundCents = 0;
            if (order.remains > 0 && order.quantity > 0) {
              refundCents = Math.floor((order.remains / order.quantity) * Number(order.charge));
            } else if (order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT') {
              refundCents = Number(order.charge);
            }

            await tx.order.update({
              where: { id: orderId },
              data: { status: 'CANCELED' },
            });

            if (refundCents > 0) {
              await tx.user.update({
                where: { id: order.userId },
                data: {
                  balance: { increment: refundCents },
                  totalSpent: { decrement: refundCents },
                },
              });
              await tx.ledgerEntry.create({
                data: {
                  userId: order.userId,
                  adminId: admin.id,
                  amount: refundCents,
                  reason: `Пакетная отмена заказа #${order.numericId} администратором`,
                  status: 'APPROVED',
                },
              });
            }

            return { skipped: false, refundCents };
          }, { isolationLevel: 'Serializable' });
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && !r.value.skipped) {
          cancelledCount++;
          totalRefundCents += r.value.refundCents;
        }
      }
    }

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'BULK_ORDER_CANCEL',
      target: ids.data.join(','),
      targetType: 'ORDER',
      newValue: { cancelledCount, totalRefundCents },
    });

    revalidatePath('/admin/orders');
    return { success: true as const, cancelledCount, totalRefundCents };
  });
}
