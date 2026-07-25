'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminShellProps } from './types';
import { cn } from '@/lib/utils';
import { 
  Home, Users, Package, RefreshCw, ShoppingCart, 
  MessageSquare, CreditCard, Link as LinkIcon, Gift, FileText, Settings,
  AlertTriangle, ToggleLeft, Activity, Cpu, BookOpen, Sun, Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, any> = {
  Home, Users, Package, RefreshCw, ShoppingCart, AlertTriangle,
  MessageSquare, CreditCard, Link: LinkIcon, Gift, FileText, Settings,
  ToggleLeft, Activity, Cpu, BookOpen
};

export function LovableShell({
  user,
  roleInfo,
  navigation,
  siteName,
  tenantId,
  isTestMode,
  children
}: AdminShellProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = theme || 'pink-light';
  const isDark = currentTheme.includes('dark');

  const setMode = (mode: "light" | "dark") => {
    setTheme(`pink-${mode}`);
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col relative selection:bg-primary/20 selection:text-foreground">
      {/* Premium Glassmorphism Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/30 pointer-events-none z-0" />
      <div className="absolute top-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-0" />

      {/* Floating Sidebar Navigation (Desktop) */}
      <aside className="fixed left-6 top-6 bottom-6 w-[260px] bg-background/60 backdrop-blur-xl border border-border/50 rounded-[2rem] shadow-lg flex flex-col z-50 overflow-hidden hidden md:flex">
        <div className="p-8 pb-4">
          <h2 className="text-2xl font-black tracking-tighter text-foreground bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            {siteName}
          </h2>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-6 overflow-y-auto scrollbar-hide">
          {navigation.map((group) => (
            <div key={group.group} className="space-y-1">
              <h3 className="px-4 mb-2 text-[10px] font-extrabold text-muted-foreground/70 uppercase tracking-[0.2em]">
                {group.group}
              </h3>
              {group.items.map((tab) => {
                const isActive = pathname?.startsWith(tab.href);
                const IconComponent = ICON_MAP[tab.icon] || Home;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 relative group",
                      isActive 
                        ? "bg-background text-foreground shadow-sm font-bold" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <IconComponent className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="absolute top-1/2 -translate-y-1/2 right-3 w-2 h-2 rounded-full bg-destructive" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-border/30 bg-gradient-to-b from-transparent to-muted/20">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden pr-2">
              <p className="text-[12px] font-bold text-foreground truncate">{user.email}</p>
              <p className="text-[10px] font-bold tracking-wider uppercase text-primary mt-0.5">{roleInfo.label}</p>
            </div>
            {mounted && (
              <button
                onClick={() => setMode(isDark ? 'light' : 'dark')}
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-background border border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 shadow-sm"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Top Navigation */}
      <header className="md:hidden sticky top-0 z-50 w-full flex justify-center pt-2 px-2 pb-2">
        <div className="w-full bg-background/60 backdrop-blur-xl border border-border/50 rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tighter text-foreground bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            {siteName}
          </h2>
          {mounted && (
            <button
              onClick={() => setMode(isDark ? 'light' : 'dark')}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full md:pl-[300px] px-4 sm:px-6 lg:px-8 py-6 md:py-8 z-10 relative max-w-[1600px] mx-auto">
        {/* Test Mode Warning */}
        {isTestMode && (
          <div className="mb-6 rounded-3xl bg-warning/10 border border-warning/20 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-6 h-6 text-warning" />
              <div>
                <h3 className="font-bold text-warning">Тестовый режим активен</h3>
                <p className="text-sm text-warning/80">Заказы не отправляются провайдерам. Трафик перехватывается.</p>
              </div>
            </div>
            <Link href="/admin/settings?tab=system" className="px-5 py-2.5 bg-background/50 hover:bg-background border border-warning/30 rounded-2xl text-sm font-bold text-warning transition-all whitespace-nowrap shadow-sm">
              В настройки
            </Link>
          </div>
        )}

        <div className="bg-background/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] shadow-sm min-h-[600px] overflow-hidden">
          <div className="p-6 md:p-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
