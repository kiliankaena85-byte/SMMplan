import React from 'react';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { TenantsManager } from './tenants-manager';

const ADMIN_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'];

export const dynamic = 'force-dynamic';

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
    <div className="w-full max-w-7xl mx-auto py-4">
      <TenantsManager initialTenants={tenants} />
    </div>
  );
}
