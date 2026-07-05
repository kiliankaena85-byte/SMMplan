'use server';

import { requireOperatorPermission } from '@/lib/operator/rbac';

/**
 * Example operator action fetching dashboard metadata.
 * Guarded by 'orders' section 'view' permission.
 */
export async function getOperatorDashboardData() {
  const result = await requireOperatorPermission('orders', 'view', async () => {
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

  // Replicate standard admin server action guard pattern:
  // If rbac returns a failure object, throw it as an action level error.
  if (result && typeof result === 'object' && 'success' in result && !result.success) {
    throw new Error('error' in result ? (result as Record<string, unknown>).error as string : 'Unauthorized');
  }

  return result;
}
