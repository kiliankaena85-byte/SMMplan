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
import { auditAdminAwaitable } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { calculatePartialRefund } from '@/utils/refund';
import { adminOrderService } from '@/services/admin/order.service';
import { WalletOps } from '@/services/financial/wallet-ops';
import { orderIdSchema } from '@/validators/admin.validators';
import { ordersQueue } from '@/lib/queue-manager';
import { SettingsManager } from '@/lib/settings';
import { redis } from '@/lib/redis';

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

    // SD-13 SECURITY FIX: Await audit for financial operations to guarantee non-repudiation
    await auditAdminAwaitable({
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

    await auditAdminAwaitable({
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
    const parsed = setStatusSchema.safeParse({ orderId, status, remains });
    if (!parsed.success) throw new Error(parsed.error.errors[0].message);
    const { orderId: validatedOrderId, status: validatedStatus, remains: validatedRemains } = parsed.data;

    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: validatedOrderId },
        include: { user: { select: { id: true, balance: true } } },
      });

      const oldStatus = order.status;
      const newStatus = validatedStatus;

      const TERMINAL_REFUNDED_STATUSES = ['COMPLETED', 'CANCELED', 'ERROR'];

      let refundCents = 0;
      if (['CANCELED', 'ERROR'].includes(newStatus) && !TERMINAL_REFUNDED_STATUSES.includes(oldStatus)) {
        if (['PENDING', 'AWAITING_PAYMENT', 'PENDING_CHECK'].includes(oldStatus)) {
          refundCents = Number(order.charge);
        } else {
          refundCents = calculatePartialRefund(order);
        }
      } else if (newStatus === 'PARTIAL' && !TERMINAL_REFUNDED_STATUSES.includes(oldStatus)) {
        const orderForRefund = { ...order, remains: validatedRemains ?? order.remains };
        refundCents = calculatePartialRefund(orderForRefund);
      }

      const newRemains = validatedRemains ?? order.remains;

      await tx.order.update({
        where: { id: validatedOrderId },
        data: {
          status: newStatus,
          remains: newRemains,
          ...(newStatus === 'COMPLETED' ? { remains: 0 } : {}),
        },
      });

      if (refundCents > 0) {
        await WalletOps.refund(tx, order.userId, refundCents,
          `Ручная смена статуса заказа #${order.numericId}: ${oldStatus}→${newStatus}`,
          { adminId: admin.id, idempotencyKey: `refund_${order.id}_${newStatus}` }
        );
      }

      return { oldStatus, refundCents, numericId: order.numericId };
    }, { isolationLevel: 'Serializable' });

    // SD-13 SECURITY FIX: Await audit for refund-bearing status override
    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ORDER_STATUS_OVERRIDE',
      target: validatedOrderId,
      targetType: 'ORDER',
      oldValue: { status: result.oldStatus },
      newValue: { status: validatedStatus, remains: validatedRemains, refund: result.refundCents },
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

      if (['COMPLETED', 'CANCELED', 'ERROR', 'PARTIAL'].includes(order.status)) {
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
          { adminId: admin.id, idempotencyKey: `refund_${order.id}_FORCE_COMPLETE` }
        );
      }

      return { numericId: order.numericId, refundCents };
    }, { isolationLevel: 'Serializable' });

    // SD-13 SECURITY FIX: Await audit for force complete with potential refund
    await auditAdminAwaitable({
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

    const orders = await db.order.findMany({
      where: { id: { in: parsed.data.orderIds } },
    });

    let totalRefunded = 0;
    let count = 0;

    // 🌊 WAVE 2.1: Atomized transactions instead of a global blanket
    // We iterate outside of the transaction to prevent holding the lock
    // on `user.balance` for multiple seconds, avoiding Database Contention.
    for (const order of orders) {
      if (!['COMPLETED', 'CANCELED', 'ERROR'].includes(order.status)) {
        try {
          await db.$transaction(async (tx) => {
            // Re-fetch inside transaction to ensure isolation
            const safeOrder = await tx.order.findUnique({
              where: { id: order.id }
            });
            
            if (!safeOrder || ['COMPLETED', 'CANCELED', 'ERROR'].includes(safeOrder.status)) return;

            const refundCents = (['PENDING', 'AWAITING_PAYMENT', 'PENDING_CHECK'].includes(safeOrder.status))
              ? Number(safeOrder.charge)
              : calculatePartialRefund(safeOrder);

            await tx.order.update({
              where: { id: safeOrder.id },
              data: { status: 'CANCELED' },
            });

            if (refundCents > 0) {
              await WalletOps.refund(tx, safeOrder.userId, refundCents,
                `Массовая отмена заказа #${safeOrder.numericId}`,
                { adminId: admin.id, idempotencyKey: `refund_${safeOrder.id}_CANCELED` }
              );
            }
            totalRefunded += refundCents;
            count++;
          }, { isolationLevel: 'Serializable' });
        } catch (e) {
          console.error(`[bulkCancelOrdersAction] Failed to cancel order ${order.id}:`, e);
          // We continue to the next order rather than failing the entire batch
        }
      }
    }

    // SD-13 SECURITY FIX: Await audit for bulk cancel with aggregated refund total
    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ORDER_BULK_CANCEL',
      target: 'batch',
      targetType: 'ORDER',
      newValue: { count, totalRefunded },
    });

    revalidatePath('/admin/orders');
    return { 
      success: true as const, 
      cancelledCount: count, 
      totalRefundCents: totalRefunded 
    };
  });
}

// ── Manual Failover Actions ──

export async function getFailoverPreview(orderId: string) {
  return requireStaffPermission('orders', 'edit', async () => {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        service: {
          include: {
            routes: {
              where: { isActive: true },
              include: { provider: true }
            }
          }
        },
        user: { select: { balance: true } }
      }
    });

    if (!order) throw new Error('Order not found');
    if (!['ERROR', 'CANCELED'].includes(order.status)) {
      throw new Error('Заказ должен быть в статусе ERROR или CANCELED для перезапуска');
    }

    const usdToRub = await SettingsManager.getExchangeRateUSD();
    const availableRoutes = order.service.routes.filter(
      r => r.providerId !== order.providerId
    );

    const routesWithPreview = await Promise.all(availableRoutes.map(async (route) => {
      const exchangeRate = route.provider.balanceCurrency === 'RUB' ? 1.0 : usdToRub;
      
      // Fetch rate from Shadow Catalog in Redis
      const cacheKey = `provider:${route.providerId}:shadow_catalog`;
      const cachedStr = await redis.get(cacheKey);
      let providerRate = 0.0;
      if (cachedStr) {
        try {
          const services = JSON.parse(cachedStr);
          const s = services.find((x: any) => String(x.service) === String(route.providerServiceId));
          if (s) providerRate = parseFloat(s.rate) || 0.0;
        } catch (err) {
          // ignore
        }
      }

      const newCostCents = Math.round(providerRate * exchangeRate * 100);
      const marginCents = Number(order.charge) - newCostCents;
      const marginPercent = Number(order.charge) > 0 
        ? Math.round((marginCents / Number(order.charge)) * 100) 
        : 0;

      return {
        routeId: route.id,
        providerName: route.provider.name,
        newCostCents,
        marginCents,
        marginPercent,
        isMarginPositive: marginCents > 0
      };
    }));

    return {
      success: true,
      clientPaidCents: Number(order.charge),
      currentBalance: Number(order.user.balance),
      routes: routesWithPreview
    };
  });
}

export async function manualRerouteOrder(orderId: string, newRouteId: string) {
  return requireStaffPermission('orders', 'edit', async (admin) => {
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true, numericId: true, status: true, charge: true, userId: true, serviceId: true, providerId: true }
      });

      if (!order) throw new Error('Order not found');
      if (!['ERROR', 'CANCELED'].includes(order.status)) {
        throw new Error('Заказ уже обрабатывается');
      }

      const newRoute = await tx.serviceRoute.findFirst({
        where: { id: newRouteId, serviceId: order.serviceId, isActive: true },
        include: { provider: true }
      });

      if (!newRoute) throw new Error('Маршрут не найден или не активен');
      if (newRoute.providerId === order.providerId) {
        throw new Error('Выбран тот же самый провайдер');
      }

      const user = await tx.user.findUnique({
        where: { id: order.userId },
        select: { balance: true }
      });

      if (!user) throw new Error('User not found');
      if (user.balance < order.charge) {
        throw new Error(`Недостаточно средств: баланс ${(Number(user.balance)/100).toFixed(2)} ₽, требуется ${(Number(order.charge)/100).toFixed(2)} ₽`);
      }

      const usdToRub = await SettingsManager.getExchangeRateUSD();
      const exchangeRate = newRoute.provider.balanceCurrency === 'RUB' ? 1.0 : usdToRub;
      
      // Fetch rate from Shadow Catalog in Redis
      const cacheKey = `provider:${newRoute.providerId}:shadow_catalog`;
      const cachedStr = await redis.get(cacheKey);
      let providerRate = 0.0;
      if (cachedStr) {
        try {
          const services = JSON.parse(cachedStr);
          const s = services.find((x: any) => String(x.service) === String(newRoute.providerServiceId));
          if (s) providerRate = parseFloat(s.rate) || 0.0;
        } catch (err) {
          // ignore
        }
      }

      const newProviderCostCents = Math.round(providerRate * exchangeRate * 100);

      // Списание с баланса (перезапуск за счет пользователя, т.к. при ERROR/CANCELED был refund)
      await tx.user.update({
        where: { id: order.userId },
        data: { balance: { decrement: order.charge } }
      });

      // Обновление заказа
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PENDING',
          providerId: newRoute.providerId,
          providerServiceId: newRoute.providerServiceId,
          providerCost: newProviderCostCents,
          externalId: null,
          error: null,
          retryCount: 0
        }
      });

      // LedgerEntry для биллинга
      await tx.ledgerEntry.create({
        data: {
          userId: order.userId,
          amount: -order.charge,
          reason: `MANUAL_REROUTE: Order #${order.numericId}`,
          idempotencyKey: `reroute_${orderId}_${newRouteId}`,
        }
      });

      // Лог маршрутизации
      await tx.routingAuditLog.create({
        data: {
          serviceId: order.serviceId,
          action: 'MANUAL_OVERRIDE',
          fromProviderId: order.providerId,
          toProviderId: newRoute.providerId,
          reason: `Admin ${admin.email} triggered manual failover`
        }
      });

      return { numericId: order.numericId, newProviderId: newRoute.providerId };
    }, { isolationLevel: 'Serializable' });

    // После транзакции — отправка в BullMQ
    const jobId = `dispatch-${orderId}`;
    await ordersQueue.add('order-dispatch', { orderId }, { jobId });

    // Запись аудита администратора
    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'MANUAL_REROUTE',
      target: orderId,
      targetType: 'ORDER',
      newValue: { newProviderId: result.newProviderId }
    });

    revalidatePath('/admin/orders');
    return { success: true as const, numericId: result.numericId };
  });
}

