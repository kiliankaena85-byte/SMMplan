// Mock server-only for standalone tsx execution
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, arguments);
};

async function main() {
  const { accountingService } = await import('../src/services/financial/accounting.service');
  const { adminOrderService } = await import('../src/services/admin/order.service');
  const { adminUserService } = await import('../src/services/admin/user.service');
  const { adminTicketService } = await import('../src/services/admin/ticket.service');
  const { adminCatalogService } = await import('../src/services/admin/catalog.service');
  const { stormDetectorService } = await import('../src/services/admin/storm-detector.service');
  const { db } = await import('../src/lib/db');

  console.log('='.repeat(80));
  console.log('  PROFILING INDIVIDUAL DASHBOARD DATA LOADERS (SERVICE LEVEL)');
  console.log('='.repeat(80));

  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = new Date();
  const step = 'day';
  const tenantFilter = 'smmplan';

  async function timeItem(name: string, fn: () => Promise<any>) {
    try {
      // 1 warm
      await fn();
      const t0 = performance.now();
      await fn();
      const t1 = performance.now();
      const dur = t1 - t0;
      console.log(`${name.padEnd(45)}: ${dur.toFixed(2)} ms`);
      return dur;
    } catch (e: any) {
      console.log(`${name.padEnd(45)}: ERROR - ${e.message}`);
      return -1;
    }
  }

  await timeItem('1. accountingService.getMetrics', () => accountingService.getMetrics(undefined, undefined, tenantFilter));
  await timeItem('2. adminOrderService.getOrderStats', () => adminOrderService.getOrderStats(undefined, undefined, tenantFilter));
  await timeItem('3. adminUserService.getUserStats', () => adminUserService.getUserStats(undefined, undefined, tenantFilter));
  await timeItem('4. adminTicketService.getTicketStats', () => adminTicketService.getTicketStats(undefined, undefined, tenantFilter));
  await timeItem('5. adminCatalogService.getCatalogStats', () => adminCatalogService.getCatalogStats(tenantFilter, undefined, undefined));
  await timeItem('6. db.adminAuditLog.findMany (take 5)', () => db.adminAuditLog.findMany({ where: { tenantId: tenantFilter }, orderBy: { createdAt: 'desc' }, take: 5 }));
  await timeItem('7. adminOrderService.getOrdersTimeseries', () => adminOrderService.getOrdersTimeseries(startDate, endDate, step, tenantFilter));
  await timeItem('8. adminUserService.getTopSpenders (6)', () => adminUserService.getTopSpenders(6, tenantFilter));
  await timeItem('9. adminOrderService.getRecentOrders (6)', () => adminOrderService.getRecentOrders(6, tenantFilter));
  await timeItem('10. adminOrderService.getTopServices (6)', () => adminOrderService.getTopServices(6, undefined, undefined, tenantFilter));
  await timeItem('11. accountingService.getGatewayBreakdown', () => accountingService.getGatewayBreakdown(undefined, undefined, tenantFilter));
  await timeItem('12. adminOrderService.getRefundAndFailureStats', () => adminOrderService.getRefundAndFailureStats(undefined, undefined, tenantFilter));
  await timeItem('13. stormDetectorService.auditServiceStorms', () => stormDetectorService.auditServiceStorms({ windowHours: 72, tenantId: tenantFilter }));
}

main().catch(console.error).finally(() => process.exit(0));
