export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

interface SettingsPageProps {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function SettingsIndexPage({ searchParams }: SettingsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const tab = params?.tab;

  if (tab === 'api') {
    redirect('/dashboard/settings/api');
  }

  if (tab === 'notifications') {
    redirect('/dashboard/settings/notifications');
  }

  if (tab === 'company' || tab === 'requisites') {
    redirect('/dashboard/settings/requisites');
  }

  redirect('/dashboard/settings/security');
}
