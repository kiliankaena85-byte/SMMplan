export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

interface SettingsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SettingsIndexPage({ searchParams }: SettingsPageProps) {
  const params = searchParams ? await searchParams : {};
  const tab = params?.tab;
  
  const queryParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (k !== 'tab' && typeof v === 'string') {
      queryParams.set(k, v);
    }
  }
  const qStr = queryParams.toString() ? `?${queryParams.toString()}` : '';

  if (tab === 'api') {
    redirect(`/dashboard/settings/api${qStr}`);
  }

  if (tab === 'notifications') {
    redirect(`/dashboard/settings/notifications${qStr}`);
  }

  if (tab === 'company' || tab === 'requisites') {
    redirect(`/dashboard/settings/requisites${qStr}`);
  }

  redirect(`/dashboard/settings/security${qStr}`);
}
