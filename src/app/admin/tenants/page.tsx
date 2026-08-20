import React from 'react';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { TenantsManager } from './tenants-manager';

const ADMIN_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'];

export const dynamic = 'force-dynamic';

import { Globe } from 'lucide-react';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { SYSTEM_TABS } from '@/components/admin/navigation-data';

export default async function AdminTenantsPage() {
  const session = await verifySession();
  if (!session?.role || !ADMIN_ROLES.includes(session.role)) {
    redirect('/dashboard/new-order');
  }

  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      systemSettings: {
        select: {
          siteName: true,
          siteDescription: true,
          siteLogoUrl: true,
          siteFaviconUrl: true,
          isTestMode: true,
          maintenanceMode: true,
        }
      }
    }
  });

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out min-h-full pb-10">
      <AdminTabbedHeader
        icon={Globe}
        title="Бренды и Мульти-арендаторы"
        description="Управление изолированными витринами (SMMplan, SMMflux), доменами и отдельными настройками."
        tabs={SYSTEM_TABS}
      />

      <TenantsManager initialTenants={tenants} />
    </div>
  );
}
