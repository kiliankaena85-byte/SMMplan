'use server';

import { requireOperatorPermission } from '@/lib/operator/rbac';

/**
 * Example operator action fetching dashboard metadata.
 * Guarded by 'orders' section 'view' permission.
 */
export async function getOperatorDashboardData() {
  return requireOperatorPermission('orders', 'view', async () => {
    return {
      success: true,
      stats: {
        activeOrders: 0,
        openTickets: 0,
        newClients: 0,
        transactions: 0,
      }
    };
  });
}
