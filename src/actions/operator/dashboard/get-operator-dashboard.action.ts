'use server';

import { requireOperatorPermission } from '@/lib/operator/rbac';
import { db } from '@/lib/db';

/**
 * Example operator action fetching dashboard metadata.
 * Guarded by 'orders' section 'view' permission.
 */
export async function getOperatorDashboardData() {
  return requireOperatorPermission('orders', 'view', async () => {
    const last30days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [activeOrders, openTickets, newClients, transactions] = await Promise.all([
      db.order.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS', 'PROVISIONING'] } } }),
      db.ticket.count({ where: { status: 'OPEN' } }),
      db.user.count({ where: { createdAt: { gte: last30days } } }),
      db.payment.count({ where: { status: 'SUCCEEDED' } }),
    ]);

    return {
      success: true,
      stats: {
        activeOrders,
        openTickets,
        newClients,
        transactions,
      }
    };
  });
}
