import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { headers, cookies } from 'next/headers';
import { getTenantDashboardViews } from '@/tenants/factory';
import { TenantErrorBoundary } from '@/tenants/TenantErrorBoundary';
import { resolveTenantFromRequest, normalizeTenantId } from '@/lib/tenant-resolver-edge';
import { resolveTenantUser } from '@/lib/tenant-user-resolver';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session) redirect('/login');

  const reqHeaders = await headers();
  const reqCookies = await cookies();
  const reqTenantId = normalizeTenantId(resolveTenantFromRequest(reqHeaders));
  const cookieTenant = normalizeTenantId(reqCookies.get('x_tenant')?.value);

  // Multi-tenant resolution: If request, cookie or user session indicates 'flux', select flux shell
  const isFlux = reqTenantId === 'flux' || cookieTenant === 'flux' || session.tenantId === 'flux';
  const effectiveTenantId = isFlux ? 'flux' : 'smmplan';

  const [user, unreadTicketsCount] = await Promise.all([
    resolveTenantUser(session.userId, effectiveTenantId, true),
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
}
