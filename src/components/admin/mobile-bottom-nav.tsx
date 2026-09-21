'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, MessageSquare, ShoppingCart, CreditCard, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  anomalyCount?: number;
  openTicketCount?: number;
}

export function MobileBottomNav({ anomalyCount = 0, openTicketCount = 0 }: MobileBottomNavProps) {
  const pathname = usePathname();

  const handleOpenMenu = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-admin-mobile-drawer'));
    }
  };

  const navItems = [
    {
      href: '/admin/orders',
      label: 'Заказы',
      icon: Package,
      isActive: pathname.startsWith('/admin/orders'),
    },
    {
      href: '/admin/tickets',
      label: 'Тикеты',
      icon: MessageSquare,
      badge: openTicketCount,
      badgeColor: 'bg-rose-500 text-white',
      isActive: pathname.startsWith('/admin/tickets'),
    },
    {
      href: '/admin/catalog',
      label: 'Каталог',
      icon: ShoppingCart,
      badge: anomalyCount,
      badgeColor: 'bg-amber-500 text-black',
      isActive: pathname.startsWith('/admin/catalog'),
    },
    {
      href: '/admin/finance',
      label: 'Финансы',
      icon: CreditCard,
      isActive: pathname.startsWith('/admin/finance'),
    },
  ];

  return (
    <nav
      aria-label="Мобильная панель быстрого доступа"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/70 shadow-lg pb-[env(safe-area-inset-bottom,0px)] transition-transform duration-200"
    >
      <div className="grid grid-cols-5 h-14 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center h-full min-h-[44px] transition-all duration-150 active:scale-95 cursor-pointer rounded-lg",
                item.isActive
                  ? "text-primary font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={cn("w-5 h-5", item.isActive ? "stroke-[2.5]" : "stroke-2")} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-2 px-1.5 py-0.2 min-w-[16px] h-4 rounded-full text-[9px] font-black flex items-center justify-center leading-none shadow-xs animate-pulse",
                      item.badgeColor
                    )}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none font-bold">
                {item.label}
              </span>
              {item.isActive && (
                <span className="absolute top-0 w-8 h-0.5 bg-primary rounded-full z-10" />
              )}
            </Link>
          );
        })}

        {/* Кнопка "Меню" для вызова полного сайдбара */}
        <button
          type="button"
          onClick={handleOpenMenu}
          aria-label="Открыть полное меню"
          className="relative flex flex-col items-center justify-center h-full min-h-[44px] text-muted-foreground hover:text-foreground active:scale-95 cursor-pointer transition-all duration-150 rounded-lg"
        >
          <Menu className="w-5 h-5 stroke-2 shrink-0" />
          <span className="text-[10px] mt-1 tracking-tight leading-none font-bold">
            Меню
          </span>
        </button>
      </div>
    </nav>
  );
}
