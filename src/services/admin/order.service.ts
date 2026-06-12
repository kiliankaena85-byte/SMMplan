import { db } from '@/lib/db';
import { WalletOps } from '../financial/wallet-ops';
import { paginatedQuery, type PaginatedResult } from '@/lib/pagination';
import { auditAdmin } from '@/lib/admin-audit';
import type { Order, User, Service, Category, Network } from '@prisma/client';
import { CompensationService } from '@/services/financial/compensation.service';

/**
 * MANDATORY INTEGRITY WARNING:
 * DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
 */

// ── Types ──

type AdminOrderRow = Order & {
  user: Pick<User, 'id' | 'email'>;
  service: Pick<Service, 'id' | 'name' | 'numericId' | 'etaP50Seconds' | 'etaP90Seconds' | 'etaSampleCount' | 'etaSpeedClass' | 'etaUpdatedAt'> & {
    category: Pick<Category, 'name'> & {
      network: Pick<Network, 'name'> | null;
    };
  };
  provider: { name: string } | null;
};

type OrderSearchParams = {
  query?: string;
  status?: string;
  cursor?: string;
  pageSize?: number;
  userId?: string;
  clientEmail?: string;
  orderId?: number;
  externalId?: string;
  serviceName?: string;
  networkSlug?: string;
  link?: string;
  minPrice?: number;
  maxPrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
};

// ── Service ──

class AdminOrderService {

  /**
   * Omni-Search: searches by email, link/URL, order numericId, or externalId.
   * Always returns paginated results via cursor.
   */
  async searchOrders(params: OrderSearchParams): Promise<PaginatedResult<AdminOrderRow>> {
    const { 
      query, 
      status, 
      cursor, 
      pageSize = 50, 
      userId,
      clientEmail,
      orderId,
      externalId,
      serviceName,
      networkSlug,
      link,
      minPrice,
      maxPrice,
      minQuantity,
      maxQuantity
    } = params;

    // Build dynamic WHERE clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (userId && userId.trim()) {
      where.userId = userId.trim();
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (clientEmail && clientEmail.trim()) {
      where.user = { email: { contains: clientEmail.trim(), mode: 'insensitive' } };
    }

    if (orderId !== undefined && !isNaN(orderId)) {
      where.numericId = orderId;
    }

    if (externalId && externalId.trim()) {
      where.externalId = { contains: externalId.trim(), mode: 'insensitive' };
    }

    if (serviceName && serviceName.trim()) {
      const tokens = serviceName.trim().split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        where.AND = where.AND || [];
        tokens.forEach(token => {
          if (token.startsWith('-') && token.length > 1) {
            where.AND.push({
              service: {
                name: { not: { contains: token.substring(1), mode: 'insensitive' } }
              }
            });
          } else {
            where.AND.push({
              service: {
                name: { contains: token, mode: 'insensitive' }
              }
            });
          }
        });
      }
    }

    if (networkSlug && networkSlug !== 'ALL') {
      where.AND = where.AND || [];
      where.AND.push({
        service: {
          category: {
            network: {
              slug: networkSlug
            }
          }
        }
      });
    }

    if (link && link.trim()) {
      where.link = { contains: link.trim(), mode: 'insensitive' };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const chargeFilters: Record<string, number> = {};
      if (minPrice !== undefined && !isNaN(minPrice)) {
        chargeFilters.gte = Math.round(minPrice * 100);
      }
      if (maxPrice !== undefined && !isNaN(maxPrice)) {
        chargeFilters.lte = Math.round(maxPrice * 100);
      }
      where.charge = chargeFilters;
    }

    if (minQuantity !== undefined || maxQuantity !== undefined) {
      const qtyFilters: Record<string, number> = {};
      if (minQuantity !== undefined && !isNaN(minQuantity)) {
        qtyFilters.gte = minQuantity;
      }
      if (maxQuantity !== undefined && !isNaN(maxQuantity)) {
        qtyFilters.lte = maxQuantity;
      }
      where.quantity = qtyFilters;
    }

    if (query && query.trim()) {
      const q = query.trim();
      const numericId = parseInt(q, 10);
      const cleanSubstring = q.replace(/^https?:\/\//i, '').replace(/^www\./i, '');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textConditions: any[] = [
        { externalId: { contains: q, mode: 'insensitive' } },
        { link: { contains: cleanSubstring, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { paymentId: { contains: q, mode: 'insensitive' } },
        { payment: { gatewayId: { contains: q, mode: 'insensitive' } } },
        { payment: { receiptId: { contains: q, mode: 'insensitive' } } },
        { service: { name: { contains: q, mode: 'insensitive' } } },
        { service: { description: { contains: q, mode: 'insensitive' } } },
        { service: { category: { name: { contains: q, mode: 'insensitive' } } } },
        { service: { category: { network: { name: { contains: q, mode: 'insensitive' } } } } },
      ];

      const parsedPrice = parseFloat(q.replace(',', '.'));
      if (!isNaN(parsedPrice)) {
        const priceCents = Math.round(parsedPrice * 100);
        textConditions.push({ charge: priceCents });
      }

      if (!isNaN(numericId) && q === String(numericId)) {
        // Pure number → search by numericId OR receipt/payment/price IDs
        where.OR = [
          { numericId: numericId },
          ...textConditions
        ];
      } else {
        where.OR = textConditions;
      }
    }

    return paginatedQuery<AdminOrderRow>(db.order, {
      cursor,
      pageSize,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } },
        provider: { select: { name: true } },
        service: { 
          select: { 
            id: true, 
            name: true, 
            numericId: true,
            etaP50Seconds: true,
            etaP90Seconds: true,
            etaSampleCount: true,
            etaSpeedClass: true,
            etaUpdatedAt: true,
            category: { select: { name: true, network: { select: { name: true } } } }
          } 
        },
      },
    });
  }

  /**
   * Cancel an order and refund the user's balance.
   * Partial refund: if order is IN_PROGRESS/PARTIAL with remains > 0,
   * refund only the undelivered portion.
   */
  async cancelOrder(orderId: string, admin: { id: string; email: string }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const orderBefore = await db.order.findUniqueOrThrow({ where: { id: orderId } });

    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { user: true },
      });

      if (['COMPLETED', 'CANCELED', 'IN_PROGRESS', 'PARTIAL', 'ERROR'].includes(order.status)) {
        throw new Error(`Order ${order.numericId} is already in state ${order.status}. Reseller platforms cannot cancel orders that have been sent to the upstream provider.`);
      }

      let refundCents = 0;
      if (['AWAITING_PAYMENT', 'PENDING', 'PENDING_CHECK'].includes(order.status)) {
         refundCents = Number(order.charge); // For PENDING / AWAITING / PENDING_CHECK
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELED' },
      });

      if (refundCents > 0) {
        await WalletOps.refund(tx, order.userId, refundCents,
          `Отмена заказа ${order.numericId} администратором - Возврат средств`,
          { adminId: admin.id, idempotencyKey: `refund_${order.id}_CANCELED` }
        );
      }

      return { refundCents, orderNumericId: order.numericId, statusBefore: order.status, remainsBefore: order.remains };
    }, { isolationLevel: 'Serializable' });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ORDER_CANCEL',
      target: orderId,
      targetType: 'ORDER',
      oldValue: { status: result.statusBefore, remains: result.remainsBefore },
      newValue: { status: 'CANCELED', refundCents: result.refundCents },
    });

    CompensationService.trackCompensation(orderId).catch(err => console.error('[AdminOrderService] Failed to track compensation', err));

    return { refundCents: result.refundCents, orderNumericId: result.orderNumericId };
  }

  /**
   * Restart a failed/error order by resetting it to PENDING.
   * The provision worker will pick it up on next cycle.
   */
  async restartOrder(orderId: string, admin: { id: string; email: string }) {
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { user: true }
      });

      if (order.status !== 'ERROR') {
        throw new Error(`Order ${order.numericId} cannot be restarted (status: ${order.status}). Используйте "Дублировать заказ".`);
      }

      await WalletOps.charge(tx, order.userId, Number(order.charge),
        `Перезапуск заказа ${order.numericId} администратором - Повторное списание`,
        { adminId: admin.id }
      );

      // Reset order state
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PENDING',
          error: null,
          retryCount: 0,
          externalId: null,
          actualProviderCost: null,
          realMarginDelta: null
        },
      });

      return { orderNumericId: order.numericId, oldStatus: order.status, oldError: order.error, charge: order.charge };
    }, { isolationLevel: 'Serializable' });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ORDER_RESTART',
      target: orderId,
      targetType: 'ORDER',
      oldValue: { status: result.oldStatus, error: result.oldError },
      newValue: { status: 'PENDING', reChargeCents: result.charge },
    });

    return { orderNumericId: result.orderNumericId };
  }

  /**
   * Get order statistics for dashboard widgets.
   */
  async getOrderStats() {
    const [total, pending, inProgress, completed, error] = await Promise.all([
      db.order.count(),
      db.order.count({ where: { status: 'PENDING' } }),
      db.order.count({ where: { status: 'IN_PROGRESS' } }),
      db.order.count({ where: { status: 'COMPLETED' } }),
      db.order.count({ where: { status: 'ERROR' } }),
    ]);

    return { total, pending, inProgress, completed, error };
  }

  /**
   * Retrieves daily order counts for the past N days to build the Orders Dynamics Chart.
   */
  async getOrdersTimeseries(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Grouping by precise Day Truncation in PostgreSQL
    const rawData = await db.$queryRaw<{ date: Date; status: string; count: number }[]>`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date, 
        status, 
        COUNT(*)::int as count 
      FROM "Order"
      WHERE "createdAt" >= ${startDate}
        AND status IN ('COMPLETED', 'CANCELED', 'AWAITING_PAYMENT')
      GROUP BY DATE_TRUNC('day', "createdAt"), status
      ORDER BY date ASC
    `;

    // Scaffold empty days array to prevent chart visual gaps
    type ChartRow = { dateStr: string; completed: number; canceled: number; unpaid: number };
    const result: ChartRow[] = [];
    
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
      result.push({ dateStr, completed: 0, canceled: 0, unpaid: 0 });
    }

    // Map DB results directly into the right scaffolded date string
    for (const row of rawData) {
      const dStr = new Date(row.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
      const match = result.find(r => r.dateStr === dStr);
      if (match) {
        if (row.status === 'COMPLETED') match.completed = Number(row.count);
        if (row.status === 'CANCELED') match.canceled = Number(row.count);
        if (row.status === 'AWAITING_PAYMENT') match.unpaid = Number(row.count);
      }
    }

    return result;
  }
}

export const adminOrderService = new AdminOrderService();
