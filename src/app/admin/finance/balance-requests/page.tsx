import { BalanceRequestsClient } from './balance-requests-client';
import { enforceSectionAccess } from '@/lib/server/rbac';

export const metadata = {
  title: 'Заявки на корректировку баланса | SMMpanel 1.0',
};

/**
 * ADM-03 follow-up: the balance requests UI requires its own section —
 * the Cashier role (balance_requests:edit) reaches this page through the
 * loosened finance layout without holding 'finance'.
 */
export default async function BalanceRequestsPage() {
  await enforceSectionAccess('balance_requests');
  return <BalanceRequestsClient />;
}
