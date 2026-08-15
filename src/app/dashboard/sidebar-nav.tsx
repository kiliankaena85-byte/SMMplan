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

export const NAV = [
  { href: '/dashboard',              icon: LayoutDashboard, label: 'Главная'     },
  { href: '/dashboard/new-order',    icon: ShoppingCart,    label: 'Новый заказ' },
  { href: '/dashboard/orders',       icon: ListOrdered,     label: 'Мои заказы'  },
  { href: '/dashboard/smart-drip',   icon: Cpu,             label: 'Умный Dripfeed' },
  { href: '/dashboard/transactions', icon: Receipt,         label: 'Транзакции'  },
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
    <aside className="hidden md:flex w-[260px] flex-col shrink-0 border-r border-border/80 bg-card/90 backdrop-blur-2xl">
      {/* Logo Header */}
      <div className="p-5 border-b border-border/70 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="На главную">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary via-indigo-600 to-pink-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
            S
          </div>
          <div className="flex flex-col">
            <span className="font-black text-foreground text-base tracking-tight leading-none">SMMplan</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">B2B Platform</span>
          </div>
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
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 group ${
                active
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform ${active ? 'text-primary-foreground' : 'group-hover:scale-110'}`} />
              <span>{label}</span>
              {!active && (
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-200" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-border/70">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-secondary/60 border border-border/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/20 to-indigo-500/20 text-primary flex items-center justify-center text-xs font-black uppercase shrink-0 border border-primary/20">
            {email.substring(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-foreground truncate">{email}</div>
            <span className="text-[10px] text-muted-foreground font-semibold block">Пользователь</span>
          </div>
          <Link
            href="/api/auth/logout"
            prefetch={false}
            title="Выйти"
            aria-label="Выйти из аккаунта"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-2xl border-t border-border/80 flex pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-black/20"
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
            className={`relative flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all duration-200 ${
              active ? 'text-primary scale-105' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
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
