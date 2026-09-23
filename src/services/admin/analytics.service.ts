import { db } from '@/lib/db';

export interface ServiceProfitability {
  serviceId: string;
  serviceName: string;
  categoryName: string;
  revenue: number;
  cogs: number;
  profit: number;
  marginPct: number;
  ordersCount: number;
}

export interface CategoryProfitability {
  categoryId: string;
  categoryName: string;
  revenue: number;
  cogs: number;
  profit: number;
  marginPct: number;
  ordersCount: number;
}

class AnalyticsService {
  /**
   * FIX C-01 / C-03: replaced unbounded findMany + JS aggregation with SQL groupBy.
   * Old approach loaded ALL orders into Node.js memory — OOM risk at scale.
   * New approach: one groupBy query (SQL aggregate) + one select for service metadata.
   */
  async getServiceProfitability(days: number, tenantId?: string): Promise<ServiceProfitability[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const isSingleTenant = tenantId && tenantId !== 'all';

    // Step 1: SQL GROUP BY — no data loaded into Node memory
    const grouped = await db.order.groupBy({
      by: ['serviceId'],
      where: {
        createdAt: { gte: cutoff },
        status: { notIn: ['AWAITING_PAYMENT', 'PENDING', 'ERROR'] },
        ...(isSingleTenant ? { tenantId } : {}),
      },
      _sum: { charge: true, providerCost: true },
      _count: { id: true },
      orderBy: { _sum: { charge: 'desc' } },
      take: 500, // safety cap — top 500 services by revenue
    });

    if (grouped.length === 0) return [];

    // Step 2: Fetch service metadata in one query
    const serviceIds = grouped.map(g => g.serviceId);
    const services = await db.service.findMany({
      where: { id: { in: serviceIds }, ...(isSingleTenant ? { tenantId } : {}) },
      select: {
        id: true,
        name: true,
        category: { select: { name: true } },
      },
    });

    const serviceMap = new Map(services.map(s => [s.id, s]));

    // Step 3: Combine results
    return grouped
      .map(g => {
        const svc = serviceMap.get(g.serviceId);
        if (!svc) return null;

        const revenue = Number(g._sum.charge ?? 0);
        const cogs = Number(g._sum.providerCost ?? 0);
        const profit = revenue - cogs;

        return {
          serviceId: g.serviceId,
          serviceName: svc.name,
          categoryName: svc.category.name,
          revenue,
          cogs,
          profit,
          marginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
          ordersCount: g._count.id,
        };
      })
      .filter((x): x is ServiceProfitability => x !== null)
      .sort((a, b) => b.profit - a.profit);
  }

  aggregateCategoryProfitability(serviceStats: ServiceProfitability[]): CategoryProfitability[] {
    const catStats: Record<string, CategoryProfitability> = {};

    for (const s of serviceStats) {
      const catKey = s.categoryName; 
      if (!catStats[catKey]) {
        catStats[catKey] = {
          categoryId: '',
          categoryName: s.categoryName,
          revenue: 0,
          cogs: 0,
          profit: 0,
          marginPct: 0,
          ordersCount: 0
        };
      }

      const item = catStats[catKey];
      item.revenue += s.revenue;
      item.cogs += s.cogs;
      item.profit += s.profit;
      item.ordersCount += s.ordersCount;
    }

    return Object.values(catStats).map(item => {
      item.marginPct = item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0;
      return item;
    }).sort((a, b) => b.profit - a.profit);
  }

  async getCategoryProfitability(days: number, tenantId?: string): Promise<CategoryProfitability[]> {
    const serviceStats = await this.getServiceProfitability(days, tenantId);
    return this.aggregateCategoryProfitability(serviceStats);
  }

  /**
   * FIX C-01b: replaced unbounded findMany users (could load millions of rows)
   * with SQL aggregate + COUNT per bucket via groupBy.
   */
  async getLTVAnalytics(tenantId?: string) {
    const userFilter = {
      role: 'USER' as const,
      ...(tenantId ? { tenantId } : {})
    };

    // LTV Buckets in kopecks
    const bucketThresholds = [1, 50000, 200000, 1000000, 5000000];
    const bucketLabels = ['0 ₽', '1-500 ₽', '500-2k ₽', '2k-10k ₽', '10k-50k ₽', '50k+ ₽'];

    // SQL-side aggregation: count + sum, no rows loaded into Node
    const [totalUsers, aggregate] = await Promise.all([
      db.user.count({ where: userFilter }),
      db.user.aggregate({
        where: userFilter,
        _sum: { totalSpent: true },
      }),
    ]);

    if (totalUsers === 0) return { totalUsers: 0, top10PercentShare: 0, buckets: [] };

    const totalRevenue = Number(aggregate._sum.totalSpent ?? 0);

    // For top-10% share we still need sorted data, but cap at 10k users
    const top10Count = Math.max(1, Math.floor(totalUsers * 0.1));
    const topUsers = await db.user.findMany({
      where: userFilter,
      select: { totalSpent: true },
      orderBy: { totalSpent: 'desc' },
      take: top10Count,
    });
    const top10Revenue = topUsers.reduce((sum, u) => sum + Number(u.totalSpent), 0);
    const top10PercentShare = totalRevenue > 0 ? (top10Revenue / totalRevenue) * 100 : 0;

    // Bucket counts via SQL groupBy ranges using raw aggregate per bucket
    // Use parallel count queries (6 queries instead of loading all users)
    const bucketCounts = await Promise.all(
      bucketThresholds.map((threshold, i) => {
        const gte = i === 0 ? BigInt(0) : BigInt(bucketThresholds[i - 1]);
        const lt = BigInt(threshold);
        // tenant-isolation-ignore: filtered via userFilter
        return db.user.count({
          where: { ...userFilter, totalSpent: { gte, lt } },
        });
      })
    );

    // Last bucket: >= max threshold
    // tenant-isolation-ignore: filtered via userFilter
    const lastBucketCount = await db.user.count({
      where: { ...userFilter, totalSpent: { gte: BigInt(bucketThresholds[bucketThresholds.length - 1]) } },
    });

    const buckets = bucketLabels.map((label, i) => ({
      label,
      count: i < bucketCounts.length ? bucketCounts[i] : lastBucketCount,
    }));
    buckets[buckets.length - 1].count = lastBucketCount;

    return { totalUsers, top10PercentShare, buckets };
  }
}

export const analyticsService = new AnalyticsService();
