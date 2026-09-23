import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export class OrderFailureStatsService {
  /**
   * Get refund and failure monitoring stats
   */
  static async getRefundAndFailureStats(
    startDate?: Date,
    endDate?: Date,
    tenantId?: string,
    precomputedCounts?: {
      total?: number;
      canceled?: number;
      partial?: number;
      error?: number;
    }
  ) {
    const isSingleTenant = tenantId && tenantId !== 'all';
    const where: Prisma.OrderWhereInput = { AND: [] };
    if (startDate && endDate) where.createdAt = { gte: startDate, lte: endDate };
    if (isSingleTenant) where.tenantId = tenantId;

    let totalOrders = 0;
    let canceledOrders = 0;
    let partialOrders = 0;
    let errorOrders = 0;

    if (precomputedCounts && precomputedCounts.total !== undefined) {
      totalOrders = precomputedCounts.total || 0;
      canceledOrders = precomputedCounts.canceled || 0;
      partialOrders = precomputedCounts.partial || 0;
      errorOrders = precomputedCounts.error || 0;
    } else {
      // High-performance single groupBy query instead of 4 separate count queries
      const statusGroups = await db.order.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      });

      for (const group of statusGroups) {
        const count = group._count._all;
        totalOrders += count;
        if (group.status === 'CANCELED') canceledOrders += count;
        else if (group.status === 'PARTIAL') partialOrders += count;
        else if (group.status === 'ERROR') errorOrders += count;
      }
    }

    const problematicCount = canceledOrders + partialOrders + errorOrders;
    const failureRate = totalOrders > 0 ? ((problematicCount / totalOrders) * 100).toFixed(1) : '0';

    if (problematicCount === 0) {
      return {
        totalOrders,
        canceledOrders,
        partialOrders,
        errorOrders,
        problematicCount: 0,
        failureRate: '0',
        totalRefundsKopecks: BigInt(0),
        topFailingServices: [],
      };
    }

    const problematicOrders = await db.order.findMany({
      where: { ...where, status: { in: ['CANCELED', 'PARTIAL', 'ERROR'] } },
      select: {
        charge: true,
        service: {
          select: {
            name: true,
            category: { select: { network: { select: { name: true } } } },
          },
        },
      },
      take: 20,
    });

    let totalRefundsKopecks = BigInt(0);
    const serviceFailMap = new Map<string, { name: string; network: string; count: number }>();

    for (const po of problematicOrders) {
      totalRefundsKopecks += BigInt(po.charge);
      const sName = po.service?.name || 'Неизвестная услуга';
      const netName = po.service?.category?.network?.name || '—';
      const cur = serviceFailMap.get(sName) || { name: sName, network: netName, count: 0 };
      cur.count += 1;
      serviceFailMap.set(sName, cur);
    }

    const topFailingServices = Array.from(serviceFailMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    return {
      totalOrders,
      canceledOrders,
      partialOrders,
      errorOrders,
      problematicCount,
      failureRate,
      totalRefundsKopecks,
      topFailingServices,
    };
  }
}
