import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { OrderFailureStatsService } from './order-failure-stats.service';

export class OrderAnalyticsService {
  private static statsCache = new Map<
    string,
    {
      data: {
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
        error: number;
        partial: number;
        canceled: number;
        awaitingPayment: number;
      };
      expiresAt: number;
    }
  >();

  /**
   * Retrieves order stats using a single high-performance groupBy query with 15s cache.
   */
  static async getOrderStats(startDate?: Date, endDate?: Date, tenantId?: string) {
    const cacheKey = `${startDate?.toISOString() || 'all'}_${endDate?.toISOString() || 'all'}_${tenantId || 'all'}`;
    const cached = OrderAnalyticsService.statsCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const where: Prisma.OrderWhereInput = {};
    if (startDate && endDate) where.createdAt = { gte: startDate, lte: endDate };
    if (tenantId && tenantId !== 'all') where.tenantId = tenantId;

    const statusGroups = await db.order.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    let total = 0;
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let error = 0;
    let partial = 0;
    let canceled = 0;
    let awaitingPayment = 0;

    for (const group of statusGroups) {
      const count = group._count._all;
      total += count;
      if (group.status === 'PENDING') pending += count;
      else if (group.status === 'IN_PROGRESS') inProgress += count;
      else if (group.status === 'COMPLETED') completed += count;
      else if (group.status === 'ERROR') error += count;
      else if (group.status === 'PARTIAL') partial += count;
      else if (group.status === 'CANCELED') canceled += count;
      else if (group.status === 'AWAITING_PAYMENT') awaitingPayment += count;
    }

    const result = { total, pending, inProgress, completed, error, partial, canceled, awaitingPayment };
    OrderAnalyticsService.statsCache.set(cacheKey, { data: result, expiresAt: now + 15000 });
    return result;
  }

  /**
   * Get recent live orders for dashboard feed
   */
  static async getRecentOrders(limit = 6, tenantId?: string) {
    const isSingleTenant = tenantId && tenantId !== 'all';
    return db.order.findMany({
      where: isSingleTenant ? { tenantId } : {},
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, email: true } },
        service: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                name: true,
                network: { select: { name: true, slug: true } },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get top services by volume and revenue for analytics.
   * FIX C-01b: replaced findMany + JS aggregation (OOM risk) with SQL groupBy.
   * Complexity: O(1 groupBy query) + O(limit service metadata) instead of O(all orders).
   */
  static async getTopServices(limit = 6, startDate?: Date, endDate?: Date, tenantId?: string) {
    const isSingleTenant = tenantId && tenantId !== 'all';
    const where: Prisma.OrderWhereInput = {};
    if (startDate && endDate) where.createdAt = { gte: startDate, lte: endDate };
    if (isSingleTenant) where.tenantId = tenantId;

    // Step 1: SQL GROUP BY — aggregate sums in the database
    const grouped = await db.order.groupBy({
      by: ['serviceId'],
      where,
      _sum: { charge: true, providerCost: true },
      _count: { id: true },
      orderBy: { _sum: { charge: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) return [];

    // Step 2: Fetch service metadata in one query
    const serviceIds = grouped.map(g => g.serviceId);
    const services = await db.service.findMany({
      where: { id: { in: serviceIds } },
      select: {
        id: true,
        name: true,
        category: { select: { name: true, network: { select: { name: true } } } },
      },
    });

    const serviceMap = new Map(services.map(s => [s.id, s]));

    // Step 3: Combine and sort by revenue
    return grouped
      .map(g => {
        const svc = serviceMap.get(g.serviceId);
        if (!svc) return null;

        const revenueKopecks = BigInt(g._sum.charge ?? 0);
        const costKopecks = BigInt(g._sum.providerCost ?? 0);
        const profitKopecks = revenueKopecks - costKopecks;
        const rev = Number(revenueKopecks);
        const profit = Number(profitKopecks);
        const marginPct = rev > 0 ? Math.round((profit / rev) * 100) : 0;

        return {
          id: g.serviceId,
          name: svc.name,
          networkName: svc.category?.network?.name ?? '—',
          categoryName: svc.category?.name ?? '—',
          ordersCount: g._count.id,
          revenueKopecks,
          costKopecks,
          profitKopecks,
          marginPct,
        };
      })
      .filter(<T>(x: T | null): x is T => x !== null);
  }

  /**
   * Get refund and failure monitoring stats
   */
  static async getRefundAndFailureStats(startDate?: Date, endDate?: Date, tenantId?: string) {
    return OrderFailureStatsService.getRefundAndFailureStats(startDate, endDate, tenantId);
  }
}
