export const dynamic = 'force-dynamic';

import React from 'react';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { SettingsBreadcrumbs } from '@/components/dashboard/settings/SettingsBreadcrumbs';
import { ProfileSummaryCard } from '@/components/dashboard/settings/ProfileSummaryCard';
import { SettingsSubNav } from '@/components/dashboard/settings/SettingsSubNav';

export const metadata = {
  title: 'Профиль и Настройки | SMMplan',
};

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session) redirect('/login');

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      email: true,
      balance: true,
      totalSpent: true,
      createdAt: true,
      _count: {
        select: {
          orders: true,
          referrals: true,
        },
      },
    },
  });

  if (!user) redirect('/login');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SettingsBreadcrumbs />

      <ProfileSummaryCard
        email={user.email}
        balance={user.balance}
        totalSpent={user.totalSpent}
        createdAt={user.createdAt}
        orderCount={user._count.orders}
        referralCount={user._count.referrals}
      />

      <SettingsSubNav />

      <main className="min-w-0 w-full">
        {children}
      </main>
    </div>
  );
}
