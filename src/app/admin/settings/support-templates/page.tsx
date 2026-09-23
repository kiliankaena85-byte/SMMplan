import { enforceSectionAccess } from '@/lib/server/rbac';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { normalizeTenantId } from '@/lib/tenant-resolver-edge';
import { SettingsProvider } from '@/lib/settings';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { SYSTEM_TABS } from '@/components/admin/navigation-data';
import { SupportTemplatesSettings } from '../support-templates';
import { MessageSquare } from 'lucide-react';

export const metadata = {
  title: 'Шаблоны ответов поддержки | OmniSMM 1.0',
};

export const dynamic = 'force-dynamic';

export default async function SupportTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  await enforceSectionAccess('settings');

  const params = await searchParams;
  const cookieStore = await cookies();
  const urlTenant = normalizeTenantId(params.tenant);
  const cookieTenant = normalizeTenantId(cookieStore.get('x_admin_tenant')?.value);
  const headerTenant = await SettingsProvider.getTenantId();
  const activeTenantId = urlTenant || cookieTenant || normalizeTenantId(headerTenant) || 'smmplan';

  const templates = await db.supportTemplate.findMany({
    where: { tenantId: activeTenantId },
    orderBy: { sort: 'asc' },
  });

  return (
    <div className="space-y-6">
      <AdminTabbedHeader
        icon={MessageSquare}
        title="Шаблоны ответов поддержки"
        description="Быстрые ответы и шорткаты саппорта для ускоренной обработки обращений."
        tabs={SYSTEM_TABS}
      />
      <SupportTemplatesSettings initialTemplates={templates} tenantId={activeTenantId} />
    </div>
  );
}
