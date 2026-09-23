import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { getTenantDashboardViews } from '@/tenants/factory';
import { TenantErrorBoundary } from '@/tenants/TenantErrorBoundary';

import { resolveTenantFromRequest } from '@/lib/tenant-resolver-edge';

import { getDashboardUser } from './user-data';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getDashboardUser();

  const reqHeaders = await headers();
  const tenantId = resolveTenantFromRequest(reqHeaders);

  const unreadTicketsCount = await db.ticket.count({
    where: {
      userId: user.id,
      status: 'PENDING',
    },
  });

  const userForClient = {
    email: user.email,
    tenantId: user.tenantId,
    balanceCents: Number(user.balance),
    unreadTicketsCount,
  };

  const { ShellLayout } = await getTenantDashboardViews(tenantId);

  return (
    <TenantErrorBoundary tenantId={tenantId}>
      <ShellLayout user={userForClient}>{children}</ShellLayout>
    </TenantErrorBoundary>
  );
}
