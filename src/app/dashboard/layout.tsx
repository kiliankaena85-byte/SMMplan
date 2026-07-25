import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { getTenantDashboardViews } from '@/tenants/factory';
import { TenantErrorBoundary } from '@/tenants/TenantErrorBoundary';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session) redirect('/login');

  const reqHeaders = await headers();
  const tenantFromHeader = reqHeaders.get("x-tenant-id");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { email: true, balance: true, tenantId: true, preferredDashboard: true },
  });

  if (!user) redirect('/login');

  const tenantId = tenantFromHeader || user.tenantId || (user.preferredDashboard === 'LOVABLE' ? 'lovable' : 'smmplan');
  const { ShellLayout } = await getTenantDashboardViews(tenantId);

  return (
    <TenantErrorBoundary tenantId={tenantId}>
      <ShellLayout user={user}>{children}</ShellLayout>
    </TenantErrorBoundary>
  );
}
