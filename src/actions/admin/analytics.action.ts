'use server'

import { db } from '@/lib/db'
import { analyticsService } from '@/services/admin/analytics.service'
import { requireStaffPermission } from '@/lib/server/rbac'

export async function getFunnelAnalyticsAction(days: number) {
  return requireStaffPermission('orders', 'view', async () => {
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
    const topServicesRaw = await db.$queryRaw<{name: string, clicks: number}[]>`
      SELECT "metadata"->>'serviceName' as name, COUNT(*)::int as clicks
      FROM "AnalyticsEvent"
      WHERE event = 'SERVICE_SELECTED' AND "createdAt" >= ${cutoff}
      GROUP BY "metadata"->>'serviceName'
      ORDER BY clicks DESC
      LIMIT 5
    `

    const topServices = topServicesRaw.map(row => ({
      name: row.name,
      clicks: Number(row.clicks)
    }))

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
