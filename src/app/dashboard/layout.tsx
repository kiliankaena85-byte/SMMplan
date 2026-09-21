import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { getTenantDashboardViews } from '@/tenants/factory';
import { TenantErrorBoundary } from '@/tenants/TenantErrorBoundary';

import { resolveTenantFromRequest } from '@/lib/tenant-resolver-edge';
import { resolveTenantUser } from '@/lib/tenant-user-resolver';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session) redirect('/login');

  const reqHeaders = await headers();
  let tenantId = resolveTenantFromRequest(reqHeaders);
  if (tenantId === 'smmplan' && session.tenantId && session.tenantId !== 'smmplan') {
    tenantId = session.tenantId;
  }

  const [user, unreadTicketsCount] = await Promise.all([
    resolveTenantUser(session.userId, tenantId, true),
    db.ticket.count({
      where: {
        userId: session.userId,
        status: 'PENDING',
      },
    }),
  ]);

  if (!user) redirect('/login');

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
