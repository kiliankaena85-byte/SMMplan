import re

with open('src/app/admin/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Suspense import
if 'import { Suspense }' not in content:
    content = content.replace('import { ', 'import { Suspense, ', 1)

# 2. Fix Promise.all destructuring
old_destruct = '''    recentAudit,
    timeseries,
    topSpenders,
    recentOrders,
    topServices,
    gatewayStats,
    refundStats,
    stormReport'''
new_destruct = '''    recentAudit,
    timeseries'''
content = content.replace(old_destruct, new_destruct)

# 3. Fix Promise.all calls
old_calls = '''    db.adminAuditLog.findMany({
      where: filterStart && filterEnd ? { createdAt: { gte: filterStart, lte: filterEnd } } : {},
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    adminOrderService.getOrdersTimeseries(startDate, endDate, step, tenantFilter),
    adminUserService.getTopSpenders(6, tenantFilter),
    adminOrderService.getRecentOrders(6, tenantFilter),
    adminOrderService.getTopServices(6, filterStart, filterEnd, tenantFilter),
    accountingService.getGatewayBreakdown(filterStart, filterEnd, tenantFilter),
    adminOrderService.getRefundAndFailureStats(filterStart, filterEnd, tenantFilter),
    stormDetectorService.auditServiceStorms({ windowHours: 72, tenantId: tenantFilter }),'''

new_calls = '''    db.adminAuditLog.findMany({
      where: filterStart && filterEnd ? { createdAt: { gte: filterStart, lte: filterEnd } } : {},
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    adminOrderService.getOrdersTimeseries(startDate, endDate, step, tenantFilter),'''
content = content.replace(old_calls, new_calls)

# 4. Wrap widgets in Suspense
content = content.replace(
    '<StormRadarWidget report={stormReport} />',
    '<Suspense fallback={<div className="h-[280px] w-full animate-pulse bg-card/50 rounded-xl" />}><StormRadarWidget tenantFilter={tenantFilter} /></Suspense>'
)

content = content.replace(
    '<RecentOrdersFeedWidget orders={recentOrders} />',
    '<Suspense fallback={<div className="h-[400px] w-full animate-pulse bg-card/50 rounded-xl" />}><RecentOrdersFeedWidget tenantFilter={tenantFilter} /></Suspense>'
)

content = content.replace(
    '<TopSpendersWidget clients={topSpenders} />',
    '<Suspense fallback={<div className="h-[400px] w-full animate-pulse bg-card/50 rounded-xl" />}><TopSpendersWidget tenantFilter={tenantFilter} /></Suspense>'
)

content = content.replace(
    '<TopServicesWidget services={topServices} />',
    '<Suspense fallback={<div className="h-[400px] w-full animate-pulse bg-card/50 rounded-xl" />}><TopServicesWidget filterStart={filterStart} filterEnd={filterEnd} tenantFilter={tenantFilter} /></Suspense>'
)

content = content.replace(
    '<PaymentGatewaysWidget gateways={gatewayStats} />',
    '<Suspense fallback={<div className="h-[400px] w-full animate-pulse bg-card/50 rounded-xl" />}><PaymentGatewaysWidget filterStart={filterStart} filterEnd={filterEnd} tenantFilter={tenantFilter} /></Suspense>'
)

content = content.replace(
    '<RefundMonitorWidget stats={refundStats} />',
    '<Suspense fallback={<div className="h-[400px] w-full animate-pulse bg-card/50 rounded-xl" />}><RefundMonitorWidget filterStart={filterStart} filterEnd={filterEnd} tenantFilter={tenantFilter} /></Suspense>'
)

with open('src/app/admin/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
