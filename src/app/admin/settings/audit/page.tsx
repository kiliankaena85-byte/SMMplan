import { enforceSectionAccess } from '@/lib/server/rbac';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { normalizeTenantId } from '@/lib/tenant-resolver-edge';
import { SettingsProvider } from '@/lib/settings';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { SYSTEM_TABS } from '@/components/admin/navigation-data';
import { AuditLogsTab } from '@/components/admin/settings/audit-logs-tab';
import { History } from 'lucide-react';

export const metadata = {
  title: 'Журнал аудита | OmniSMM 1.0',
};

export const dynamic = 'force-dynamic';

export default async function SettingsAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const admin = await enforceSectionAccess('settings');

  const params = await searchParams;
  const cookieStore = await cookies();
  const urlTenant = normalizeTenantId(params.tenant);
  const cookieTenant = normalizeTenantId(cookieStore.get('x_admin_tenant')?.value);
  const headerTenant = await SettingsProvider.getTenantId();
  const activeTenantId = urlTenant || cookieTenant || normalizeTenantId(headerTenant) || 'smmplan';

  // Для не-OWNER или при конкретно выбранном бренде фильтровать: where: { tenantId: activeTenantId }
  const isOwner = admin.role === 'OWNER';
  const hasExplicitTenant = Boolean(params.tenant || cookieStore.get('x_admin_tenant')?.value);
  const where = (!isOwner || hasExplicitTenant) ? { tenantId: activeTenantId } : {};

  const recentLogs = await db.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <AdminTabbedHeader
        icon={History}
        title="Журнал аудита"
        description="Неизменяемый аудит-лог действий персонала платформы с изоляцией по брендам."
        tabs={SYSTEM_TABS}
      />
      <AuditLogsTab logs={recentLogs} />
    </div>
  );
}
