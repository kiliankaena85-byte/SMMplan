import { BalanceRequestsClient } from './balance-requests-client';
import { enforceSectionAccess } from '@/lib/server/rbac';
import { verifySession } from '@/lib/session';
import { getBalanceAdjustmentsAction } from '@/actions/admin/balance-adjustments';
import type { BalanceAdjustmentItem } from '@/components/admin/balance/BalanceAdjustmentDrawer';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Заявки на корректировку баланса | OmniSMM 1.0',
};

/**
 * ADM-03 follow-up: the balance requests UI requires its own section —
 * the Cashier role (balance_requests:edit) reaches this page through the
 * loosened finance layout without holding 'finance'.
 */
export default async function BalanceRequestsPage() {
  await enforceSectionAccess('balance_requests');
  const session = await verifySession();

  const formData = new FormData();
  formData.append('page', '1');
  formData.append('pageSize', '20');

  let initialItems: BalanceAdjustmentItem[] = [];
  let initialTotal = 0;

  try {
    const res = await getBalanceAdjustmentsAction(formData);
    if (res.success && res.items) {
      initialItems = res.items as BalanceAdjustmentItem[];
      initialTotal = res.total || 0;
    }
  } catch {
    // Safe fallback
  }

  return (
    <BalanceRequestsClient 
      currentUserId={session?.userId} 
      currentUserRole={session?.role}
      initialItems={initialItems}
      initialTotal={initialTotal}
    />
  );
}
