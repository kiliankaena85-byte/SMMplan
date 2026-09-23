'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { DashboardBreadcrumbs, BreadcrumbItem } from '@/components/dashboard/DashboardBreadcrumbs';

const SUBROUTE_TITLES: Record<string, string> = {
  '/dashboard/settings/security': 'Безопасность',
  '/dashboard/settings/notifications': 'Уведомления',
  '/dashboard/settings/api': 'API и вебхуки',
  '/dashboard/settings/requisites': 'Реквизиты компании',
};

export function SettingsBreadcrumbs() {
  const pathname = usePathname();

  const subTitle = pathname ? SUBROUTE_TITLES[pathname] : undefined;

  const items: BreadcrumbItem[] = subTitle
    ? [
        { label: 'Настройки', href: '/dashboard/settings' },
        { label: subTitle },
      ]
    : [{ label: 'Настройки' }];

  return <DashboardBreadcrumbs items={items} />;
}
