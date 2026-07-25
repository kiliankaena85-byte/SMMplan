'use client';

import React from 'react';
import { BalanceDisplay } from '@/components/dashboard/balance/BalanceDisplay';
import { formatBalance } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  ListOrdered, 
  Wallet, 
  MessageSquare, 
  LogOut 
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Главная', icon: LayoutDashboard },
  { href: '/dashboard/new-order', label: 'Новый заказ', icon: ShoppingCart },
  { href: '/dashboard/orders', label: 'Мои заказы', icon: ListOrdered },
  { href: '/dashboard/add-funds', label: 'Пополнение', icon: Wallet },
  { href: '/dashboard/tickets', label: 'Поддержка', icon: MessageSquare },
];

export function LovableDashboardShell({
  user,
  children,
}: {
  user: { email: string; balance: bigint; tenantId: string };
  children: React.ReactNode;
}) {
  const balanceRub = formatBalance(user.balance);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-x-clip">
      {/* ── LOVABLE VIBRANT HERO BACKGROUND (Full Bleed) ── */}
      <div className="absolute top-0 inset-x-0 h-[2500px] z-0 pointer-events-none overflow-hidden select-none bg-white dark:bg-default-50">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] rounded-full bg-blue-500/90 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[0%] right-[-10%] w-[50%] h-[50%] rounded-full bg-sky-300/75 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-rose-500/90 blur-[130px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-orange-500/90 blur-[140px] animate-pulse" style={{ animationDuration: '14s' }} />
        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-fuchsia-500/85 blur-[150px] animate-pulse" style={{ animationDuration: '11s' }} />
        <div className="absolute top-[30%] right-[20%] w-[50%] h-[50%] rounded-full bg-purple-500/85 blur-[120px] animate-pulse" style={{ animationDuration: '9s' }} />
        
        {/* Fade to background color at the bottom */}
        <div className="absolute bottom-0 inset-x-0 h-[400px] bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      {/* ── Top Navigation Bar ── */}
      <header className="relative z-40 w-full px-4 sm:px-8 py-3.5 flex items-center justify-between backdrop-blur-2xl bg-white/60 dark:bg-black/60 border-b border-border/30 shadow-sm sticky top-0">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-black text-xl text-foreground tracking-tight hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-black text-base shadow-lg shadow-blue-500/25">
              F
            </div>
            <span className="truncate tracking-tight font-black">SMMflux</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-foreground text-background shadow-sm font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <BalanceDisplay initialBalance={balanceRub} variant="mobile-header" />
          <Link
            href="/dashboard/add-funds"
            className="px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-1.5"
          >
            <Wallet className="w-4 h-4" />
            <span>+ Пополнить</span>
          </Link>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-border/40">
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">
              {user.email.substring(0, 2)}
            </div>
            <span className="text-xs font-medium text-muted-foreground max-w-[120px] truncate">{user.email}</span>
            <Link
              href="/api/auth/logout"
              prefetch={false}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors ml-1"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Mobile Navigation Bar (Bottom Sticky) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-2xl border-t border-border/40 px-1 py-1 flex items-center justify-around shadow-lg">
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl text-[10px] font-medium transition-all ${
                active ? 'text-primary font-bold bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Main Content Area ── */}
      <main className="relative z-10 w-full flex-1 max-w-7xl mx-auto p-4 md:p-8 pb-24 md:pb-12">
        {children}
      </main>
    </div>
  );
}


