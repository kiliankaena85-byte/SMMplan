export const dynamic = 'force-dynamic';

import React from 'react';
import { headers } from 'next/headers';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { SettingsBreadcrumbs } from '@/components/dashboard/settings/SettingsBreadcrumbs';
import { ProfileSummaryCard } from '@/components/dashboard/settings/ProfileSummaryCard';
import { SettingsSubNav } from '@/components/dashboard/settings/SettingsSubNav';
import { resolveTenantFromRequest, normalizeTenantId } from '@/lib/tenant-resolver-edge';
import { resolveTenantUser } from '@/lib/tenant-user-resolver';

export async function generateMetadata() {
  const reqHeaders = await headers();
  const currentTenant = normalizeTenantId(resolveTenantFromRequest(reqHeaders)) || 'smmplan';
  const brandName = currentTenant === 'flux' ? 'SMMflux' : 'SMMplan';
  return {
    title: `Профиль и Настройки | ${brandName}`,
  };
}

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session) redirect('/login');

  const reqHeaders = await headers();
  const currentTenant = normalizeTenantId(resolveTenantFromRequest(reqHeaders)) || 'smmplan';

  const tenantUser = await resolveTenantUser(session.userId, currentTenant, true);
  if (!tenantUser) redirect('/login');

  const [orderCount, referralCount] = await Promise.all([
    db.order.count({
      where: {
        userId: tenantUser.id,
        tenantId: currentTenant,
      },
    }),
    db.user.count({
      where: {
        referredById: tenantUser.id,
        tenantId: currentTenant,
      },
    }),
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SettingsBreadcrumbs />

      <ProfileSummaryCard
        email={tenantUser.email}
        balance={tenantUser.balance}
        totalSpent={tenantUser.totalSpent}
        createdAt={tenantUser.createdAt}
        orderCount={orderCount}
        referralCount={referralCount}
      />

      <SettingsSubNav />

      <main className="min-w-0 w-full">
        {children}
      </main>
    </div>
  );
}
