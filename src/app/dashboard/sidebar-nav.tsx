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
} from 'lucide-react';

export const NAV = [
  { href: '/dashboard',              icon: LayoutDashboard, label: 'Главная'     },
  { href: '/dashboard/new-order',    icon: ShoppingCart,    label: 'Новый заказ' },
  { href: '/dashboard/orders',       icon: ListOrdered,     label: 'Мои заказы'  },
  { href: '/dashboard/add-funds',    icon: Wallet,          label: 'Пополнить'   },
  { href: '/dashboard/tickets',      icon: MessageSquare,   label: 'Поддержка'   },
  { href: '/dashboard/referrals',    icon: Users,           label: 'Рефералы'    },
  { href: '/dashboard/settings',     icon: UserCircle,      label: 'Профиль'     },
  { href: '/dashboard/settings/api', icon: Settings,        label: 'API'         },
];

// First 5 for mobile bottom nav — most important: home/new-order/orders/add-funds/tickets
export const MOBILE_NAV = NAV.slice(0, 5);

export function SidebarNav({
  email,
  balanceRub,
}: {
  email: string;
  balanceRub: string;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  return (
    <aside className="hidden md:flex w-[240px] flex-col shrink-0 border-r border-border bg-card">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2 group" aria-label="На главную">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">
            S
          </div>
          <span className="font-bold text-foreground text-base">Smmplan</span>
        </Link>
      </div>

      {/* Balance card */}
      <div className="mx-3 mt-4 p-3 rounded-xl bg-primary/5 border border-primary/15">
        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
          Баланс
        </div>
        <div className="text-lg font-bold text-foreground tabular-nums">{balanceRub} ₽</div>
        <Link
          href="/dashboard/add-funds"
          className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg py-1.5 hover:bg-primary/90 transition-all duration-200"
        >
          + Пополнить
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 mt-2" aria-label="Меню личного кабинета">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                active
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 transition-colors" />
              <span>{label}</span>
              {!active && (
                <ChevronRight className="w-3 h-3 ml-auto opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0 transition-all duration-200" />
              )}
              {active && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary ml-auto shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/40">
          <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold uppercase shrink-0">
            {email.substring(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">{email}</div>
          </div>
          <Link
            href="/api/auth/logout"
            prefetch={false}
            title="Выйти"
            aria-label="Выйти из аккаунта"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex"
      aria-label="Нижняя навигация"
    >
      {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            className={`relative flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors duration-200 ${
              active ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className={`text-[10px] font-semibold tracking-wide ${active ? 'font-bold' : ''}`}>
              {label}
            </span>
            {active && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-primary rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
