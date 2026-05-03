'use server'

import { db } from '@/lib/db'
import { analyticsService } from '@/services/admin/analytics.service'
import { requireStaffPermission } from '@/lib/server/rbac'

export async function getFunnelAnalyticsAction(days: number) {
  return requireStaffPermission('analytics', 'view', async () => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const [
      linkPasted,
      serviceSelected,
      checkoutInitiated,
      paymentClicked,
      serviceProfitability,
      categoryProfitability,
      ltv
    ] = await Promise.all([
      db.analyticsEvent.count({ where: { event: 'LINK_PASTED', createdAt: { gte: cutoff } } }),
      db.analyticsEvent.count({ where: { event: 'SERVICE_SELECTED', createdAt: { gte: cutoff } } }),
      db.analyticsEvent.count({ where: { event: 'CHECKOUT_INITIATED', createdAt: { gte: cutoff } } }),
      db.analyticsEvent.count({ where: { event: 'PAYMENT_CLICKED', createdAt: { gte: cutoff } } }),
      analyticsService.getServiceProfitability(days),
      analyticsService.getCategoryProfitability(days),
      analyticsService.getLTVAnalytics()
    ])

    // Optional: Top 5 Services by Clicks (for funnel)
    const serviceEvents = await db.analyticsEvent.findMany({
      where: { 
        event: 'SERVICE_SELECTED', 
        createdAt: { gte: cutoff } 
      },
      select: { metadata: true }
    })

    const countMap: Record<string, number> = {}
    
    serviceEvents.forEach(e => {
      if (e.metadata && typeof e.metadata === 'object' && !Array.isArray(e.metadata)) {
        const metadata = e.metadata as { serviceName?: string };
        const name = metadata.serviceName;
        if (name && typeof name === 'string') {
          countMap[name] = (countMap[name] || 0) + 1
        }
      }
    })

    const topServices = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, clicks]) => ({ name, clicks }))

    return {
      funnel: {
        linkPasted,
        serviceSelected,
        checkoutInitiated,
        paymentClicked
      },
      topServices,
      profitability: {
        services: serviceProfitability,
        categories: categoryProfitability
      },
      ltv
    }
  })
}
