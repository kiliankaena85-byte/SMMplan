'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Bell, Code, Building } from 'lucide-react';

export interface SettingsSubNavItem {
  id: string;
  href: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SETTINGS_NAV_ITEMS: SettingsSubNavItem[] = [
  {
    id: 'security',
    href: '/dashboard/settings/security',
    label: 'Безопасность',
    desc: 'Пароль, сессии и аккаунт',
    icon: Shield,
  },
  {
    id: 'notifications',
    href: '/dashboard/settings/notifications',
    label: 'Уведомления',
    desc: 'Боты, оповещения, 152-ФЗ',
    icon: Bell,
  },
  {
    id: 'api',
    href: '/dashboard/settings/api',
    label: 'API и вебхуки',
    desc: 'Ключи, вебхуки и документация',
    icon: Code,
  },
  {
    id: 'requisites',
    href: '/dashboard/settings/requisites',
    label: 'Реквизиты компании',
    desc: 'Данные юрлица / ИП',
    icon: Building,
  },
];

export function SettingsSubNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Вкладки настроек"
      role="tablist"
      className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-1.5 bg-muted/40 border border-border/60 rounded-2xl w-full"
    >
      {SETTINGS_NAV_ITEMS.map(({ id, href, label, desc, icon: Icon }) => {
        const isDefaultSecurity =
          id === 'security' && (pathname === '/dashboard/settings' || pathname === '/dashboard/settings/');
        const isActive =
          pathname === href || (pathname ? pathname.startsWith(href + '/') : false) || isDefaultSecurity;

        return (
          <Link
            key={id}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={`min-w-0 min-h-[44px] px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              isActive
                ? 'bg-card text-foreground shadow-xs border border-border/80 scale-[1.01]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Icon
              className={`w-4 h-4 shrink-0 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
            <div className="text-left min-w-0 truncate">
              <span className="block leading-tight truncate">{label}</span>
              <span className="hidden sm:block text-[10px] font-normal text-muted-foreground leading-tight mt-0.5 truncate">
                {desc}
              </span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
