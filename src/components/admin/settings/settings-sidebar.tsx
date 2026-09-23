'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  ShieldCheck, 
  Sliders, 
  Store, 
  Database, 
  CreditCard, 
  Bot, 
  Server, 
  KeyRound, 
  Users, 
  MessageSquare, 
  History 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SettingsSidebarItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

export interface SettingsSidebarGroup {
  group: string;
  items: SettingsSidebarItem[];
}

export const SETTINGS_SIDEBAR_GROUPS: SettingsSidebarGroup[] = [
  {
    group: 'Проект',
    items: [
      {
        id: 'roles-matrix',
        label: 'Матрица ролей',
        href: '/admin/settings/roles',
        icon: ShieldCheck,
        description: 'Управление ролями и гранулярными правами доступа',
      },
      {
        id: 'system-branding',
        label: 'Витрина и Брендинг',
        href: '/admin/settings?tab=system',
        icon: Store,
        description: 'Название бренда, логотипы, SEO и 152-ФЗ',
      },
      {
        id: 'storefront-keys',
        label: 'Ключи витрин (API)',
        href: '/admin/settings?tab=storefront',
        icon: KeyRound,
        description: 'Storefront API v1 для партнеров и витрин',
      },
    ],
  },
  {
    group: 'Бизнес-логика',
    items: [
      {
        id: 'balance-policies',
        label: 'Политики баланса',
        href: '/admin/settings/balance-policies',
        icon: Sliders,
        description: 'Правила согласования и дневные лимиты балансов',
      },
      {
        id: 'catalog-pricing',
        label: 'Каталог и Цены',
        href: '/admin/settings?tab=catalog',
        icon: Database,
        description: 'Наценки, курс ЦБ РФ и карантин скачков цен',
      },
    ],
  },
  {
    group: 'Интеграции & Каналы',
    items: [
      {
        id: 'gateways',
        label: 'Кассы и Шлюзы',
        href: '/admin/settings?tab=integrations',
        icon: CreditCard,
        description: 'ЮKassa, Robokassa, CryptoBot, Gemini AI, Email',
      },
      {
        id: 'telegram-bot',
        label: 'Telegram Бот',
        href: '/admin/settings?tab=telegram',
        icon: Bot,
        description: 'Автоответчик, вебхуки и рассылки',
      },
      {
        id: 'provider-proxies',
        label: 'Прокси провайдеров',
        href: '/admin/settings?tab=proxy',
        icon: Server,
        description: 'SOCKS5/HTTP ротация для внешних API',
      },
    ],
  },
  {
    group: 'Команда & Аудит',
    items: [
      {
        id: 'team-management',
        label: 'Сотрудники & Доступ',
        href: '/admin/settings?tab=team',
        icon: Users,
        description: 'Управление доступом персонала и лимитами',
      },
      {
        id: 'support-templates',
        label: 'Шаблоны ответов',
        href: '/admin/settings?tab=templates',
        icon: MessageSquare,
        description: 'Быстрые заготовки ответов поддержки',
      },
      {
        id: 'audit-log',
        label: 'Журнал аудита',
        href: '/admin/settings?tab=audit',
        icon: History,
        description: 'Неизменяемый реестр изменений системы',
      },
    ],
  },
];

interface SettingsSidebarProps {
  className?: string;
}

export function SettingsSidebar({ className }: SettingsSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'system';

  const isItemActive = (item: SettingsSidebarItem) => {
    if (item.href.startsWith('/admin/settings?tab=')) {
      const targetTab = item.href.split('tab=')[1];
      return pathname === '/admin/settings' && currentTab === targetTab;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <nav aria-label="Разделы настроек" className={cn('space-y-6', className)}>
      {SETTINGS_SIDEBAR_GROUPS.map((group) => (
        <div key={group.group} className="space-y-2">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-3">
            {group.group}
          </h4>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors min-h-[36px]',
                    active
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent'
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate min-w-0">{item.label}</div>
                    {item.description && (
                      <div className="text-[10px] text-muted-foreground font-normal truncate min-w-0">
                        {item.description}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
