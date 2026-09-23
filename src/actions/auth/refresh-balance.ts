'use server';

import { headers } from 'next/headers';
import { verifySession } from '@/lib/session';
import { formatBalance } from '@/lib/utils';
import { resolveTenantUser } from '@/lib/tenant-user-resolver';
import { resolveTenantFromRequest, normalizeTenantId } from '@/lib/tenant-resolver-edge';

export async function refreshBalanceAction(explicitTenantId?: string) {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  const reqHeaders = await headers();
  const resolvedTenant = normalizeTenantId(explicitTenantId) || resolveTenantFromRequest(reqHeaders) || 'smmplan';

  const tenantUser = await resolveTenantUser(session.userId, resolvedTenant, true);
  if (!tenantUser) {
    return { success: false, error: 'User not found' };
  }

  return {
    success: true,
    tenantId: resolvedTenant,
    balanceRub: formatBalance(tenantUser.balance),
    balanceCents: Number(tenantUser.balance),
  };
}
