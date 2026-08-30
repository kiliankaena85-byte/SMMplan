'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  ListOrdered,
  Wallet,
  Users,
  MessageSquare,
  Settings,
  UserCircle,
  LogOut,
  ChevronRight,
  Receipt,
  Cpu,
} from 'lucide-react';

import { BalanceDisplay } from '@/components/dashboard/balance/BalanceDisplay';
import { UserCommandMenu } from '@/components/dashboard/UserCommandMenu';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

export const NAV = [
  { href: '/dashboard',              icon: LayoutDashboard, label: 'Главная'     },
  { href: '/dashboard/new-order',    icon: ShoppingCart,    label: 'Создать заказ' },
  { href: '/dashboard/orders',       icon: ListOrdered,     label: 'Мои заказы'  },
  { href: '/dashboard/finance',      icon: Wallet,          label: 'Финансы'     },
  { href: '/dashboard/tickets',      icon: MessageSquare,   label: 'Поддержка'   },
  { href: '/dashboard/referrals',    icon: Users,           label: 'Партнёрам'   },
  { href: '/dashboard/settings',     icon: Settings,        label: 'Настройки'   },
];

// First 5 for mobile bottom nav — home / new-order / orders / finance / tickets
export const MOBILE_NAV = [
  { href: '/dashboard',              icon: LayoutDashboard, label: 'Главная'  },
  { href: '/dashboard/new-order',    icon: ShoppingCart,    label: 'Заказ'    },
  { href: '/dashboard/orders',       icon: ListOrdered,     label: 'Заказы'   },
  { href: '/dashboard/finance',      icon: Wallet,          label: 'Финансы'  },
  { href: '/dashboard/tickets',      icon: MessageSquare,   label: 'Помощь'   },
];

import { useUnreadSupport } from '@/hooks/useUnreadSupport';

import { TenantLogo } from '@/components/ui/TenantLogo';

export function SidebarNav({
  email,
  balanceRub,
  initialUnreadCount = 0,
}: {
  email: string;
  balanceRub: string;
  initialUnreadCount?: number;
}) {
  const pathname = usePathname();
  const unreadCount = useUnreadSupport(initialUnreadCount);

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  return (
    <aside className="hidden md:flex w-[260px] flex-col shrink-0 border-r border-border/80 bg-card/90 backdrop-blur-2xl">
      {/* Logo Header */}
      <div className="p-5 border-b border-border/70 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="На главную">
          <TenantLogo tenantId="smmplan" className="w-8 h-8 group-hover:scale-105 transition-transform" iconClassName="text-sm" />
          <span className="font-black text-foreground text-lg tracking-tight leading-none">SMMplan</span>
        </Link>
      </div>

      {/* Balance display client component */}
      <div className="px-3 pt-3 pb-1 space-y-2.5">
        <BalanceDisplay initialBalance={balanceRub} variant="sidebar" />
        <UserCommandMenu />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Меню личного кабинета">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          const isSupport = href === '/dashboard/tickets';
          const hasUnread = isSupport && unreadCount > 0;

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 group relative ${
                active
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              <div className="relative shrink-0">
                <Icon className={`w-4 h-4 transition-transform ${active ? 'text-primary-foreground' : 'group-hover:scale-110'}`} />
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-notification ring-2 ring-card animate-ping" />
                )}
              </div>
              <span>{label}</span>

              {hasUnread ? (
                <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-notification text-notification-foreground font-black text-[10px] shadow-sm shadow-notification/40 animate-pulse">
                  {unreadCount}
                </span>
              ) : !active ? (
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-200" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-border/70">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-secondary/60 border border-border/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/20 to-secondary text-primary flex items-center justify-center text-xs font-black uppercase shrink-0 border border-primary/20">
            {email.substring(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-foreground truncate">{email}</div>
            <span className="text-[10px] text-muted-foreground font-semibold block">Пользователь</span>
          </div>
          <ThemeSwitcher variant="toggle" className="shrink-0" />
          <Link
            href="/api/auth/logout"
            prefetch={false}
            title="Выйти"
            aria-label="Выйти из аккаунта"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

export function MobileBottomNav({
  initialUnreadCount = 0,
}: {
  initialUnreadCount?: number;
}) {
  const pathname = usePathname();
  const unreadCount = useUnreadSupport(initialUnreadCount);

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-2xl border-t border-border/80 flex pb-[env(safe-area-inset-bottom)] shadow-2xl"
      aria-label="Нижняя навигация"
    >
      {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
        const active = isActive(href);
        const isSupport = href === '/dashboard/tickets';
        const hasUnread = isSupport && unreadCount > 0;

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            className={`relative flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all duration-200 ${
              active ? 'text-primary scale-105' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5 shrink-0" />
              {hasUnread && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-notification text-notification-foreground font-black text-[9px] flex items-center justify-center animate-pulse shadow-sm shadow-notification/50">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] tracking-tight ${active ? 'font-black' : 'font-semibold'}`}>
              {label}
            </span>
            {active && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-primary rounded-full shadow-sm shadow-primary/50" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
