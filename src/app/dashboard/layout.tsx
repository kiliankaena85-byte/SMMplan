import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { getTenantDashboardViews } from '@/tenants/factory';
import { TenantErrorBoundary } from '@/tenants/TenantErrorBoundary';
import { resolveTenantFromRequest, normalizeTenantId } from '@/lib/tenant-resolver-edge';
import { resolveTenantUser } from '@/lib/tenant-user-resolver';
import { runWithTenant } from '@/lib/tenant-context';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session) redirect('/login');

  const reqHeaders = await headers();
  const reqTenantId = normalizeTenantId(resolveTenantFromRequest(reqHeaders)) || 'smmplan';
  const effectiveTenantId = reqTenantId;

  return runWithTenant(effectiveTenantId, async () => {
    const user = await resolveTenantUser(session.userId, effectiveTenantId, true);
    if (!user) redirect('/login');

    const unreadTicketsCount = await db.ticket.count({
      where: {
        userId: user.id,
        tenantId: effectiveTenantId,
        status: 'PENDING',
      },
    });

    const userForClient = {
      email: user.email,
      tenantId: effectiveTenantId,
      balanceCents: Number(user.balance),
      unreadTicketsCount,
    };

    const { ShellLayout } = await getTenantDashboardViews(effectiveTenantId);

    return (
      <TenantErrorBoundary tenantId={effectiveTenantId}>
        <ShellLayout user={userForClient}>{children}</ShellLayout>
      </TenantErrorBoundary>
    );
  });
}
