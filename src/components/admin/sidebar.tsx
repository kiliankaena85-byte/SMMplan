'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CommandMenu } from '@/components/admin/command-menu';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
  Home, Users, Package, RefreshCw, ShoppingCart, 
  MessageSquare, CreditCard, Link as LinkIcon, Gift, FileText, Settings,
  PanelLeftClose, PanelLeftOpen, ArrowLeft, BarChart, BarChart3, Inbox, Shield, AlertTriangle, ToggleLeft, Activity, Cpu, BookOpen,
  Sun, Moon, ArrowLeftRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  section?: string;
  badge?: number;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

interface SidebarProps {
  userEmail: string;
  roleInfo: { label: string; color: string };
  navigation: NavGroup[];
  siteName?: string;
  tenantId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, any> = {
  Home, Users, Package, RefreshCw, ShoppingCart, AlertTriangle,
  MessageSquare, CreditCard, Link: LinkIcon, Gift, FileText, Settings, BarChart, BarChart3, Inbox, Shield,
  ToggleLeft, Activity, Cpu, BookOpen, ArrowLeftRight
};

export function AdminSidebar({ userEmail, roleInfo, navigation }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(true);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = theme || 'sky-dark';
  const isDark = currentTheme.includes('dark') || currentTheme === 'dark';
  const currentAccent = currentTheme.includes('emerald') ? 'emerald' : currentTheme.includes('violet') ? 'violet' : currentTheme.includes('warm') ? 'warm' : currentTheme.includes('telegram') ? 'telegram' : 'sky';

  const setMode = (mode: "light" | "dark") => {
    setTheme(`${currentAccent}-${mode}`);
  };

  return (
    <aside 
      className={cn(
        "relative z-20 h-screen flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group hidden md:flex flex-col",
        "bg-background/40 backdrop-blur-xl border-r border-border/40 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.1)]",
        collapsed ? "w-16" : "w-[280px]"
      )}
    >
      {/* Collapse Toggle */}
      <div className={cn("absolute z-50 transition-all duration-500", collapsed ? "top-6 left-1/2 -translate-x-1/2" : "top-7 right-4")}>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-card/80 backdrop-blur-md border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-300 active:scale-95 shadow-sm"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4 ml-0.5" /> : <PanelLeftClose className="w-4 h-4 mr-0.5" />}
        </button>
      </div>

      {/* Header Profile Area */}
      <div className={cn("pt-8 pb-6 px-6 transition-all duration-300 relative", collapsed ? "opacity-0 invisible h-0 p-0" : "opacity-100")}>
        {/* Subtle glow behind logo */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        
        <h2 className="text-xl font-extrabold tracking-tight mb-1 text-foreground">
          SMMplan
        </h2>
        <p className="text-[11px] text-muted-foreground font-medium truncate mb-3 tracking-wide">{userEmail}</p>
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center px-2.5 py-1 text-[10px] rounded-[10px] uppercase font-bold tracking-wider shadow-sm border border-border bg-muted/30 text-foreground"
          )}>
            <div className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5 animate-pulse" />
            {roleInfo.label}
          </span>
        </div>
      </div>

      <nav className={cn(
        "flex-1 min-h-0 px-3 py-4 space-y-6 overflow-y-auto scrollbar-hide",
        collapsed && "pt-20 space-y-2"
      )}>
        <div className={cn("mb-4 px-1", collapsed && "hidden")}>
          <CommandMenu />
        </div>
        
        {navigation.map((section, sIdx) => (
          <div key={section.group} className="space-y-1.5">
            {!collapsed && (
              <h3 className="px-3 mb-2 text-[10px] font-extrabold text-muted-foreground/70 uppercase tracking-[0.2em] transition-all duration-500 animate-in fade-in slide-in-from-left-2">
                {section.group}
              </h3>
            )}
            {section.items.map(tab => {
              const isActive = pathname?.startsWith(tab.href);
              const IconComponent = ICON_MAP[tab.icon] || Home;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  title={collapsed ? tab.label : undefined}
                  aria-label={tab.label}
                  className={cn(
                    "relative flex items-center px-3 text-sm font-medium rounded-[10px] transition-all duration-200 whitespace-nowrap overflow-hidden group h-12",
                    isActive 
                      ? "bg-primary/10 text-primary font-bold shadow-sm shadow-primary/5" 
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    collapsed && "justify-center px-0 w-12 h-12 mx-auto"
                  )}
                >
                  <span className={cn(
                    "transition-transform duration-300 group-hover:scale-110", 
                    collapsed ? "" : "mr-3 w-5 text-center flex justify-center",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    <IconComponent className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  {!collapsed && <span className="tracking-wide transition-all">{tab.label}</span>}
                  
                  {!collapsed && tab.badge !== undefined && tab.badge > 0 && (
                    <StatusBadge 
                      status="OPEN" 
                      label="" 
                      count={tab.badge} 
                      className="ml-auto mr-1 bg-destructive/10 text-destructive border-destructive/20 shadow-sm"
                    />
                  )}
                  {collapsed && tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-destructive border border-card shadow-sm" />
                  )}
                  
                  {/* Hover Glow Behind */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-[10px]" />
                  )}
                </Link>
              );
            })}
            {!collapsed && sIdx < navigation.length - 1 && (
              <div className="h-px bg-border/40 mx-3 mt-4 mb-2" />
            )}
          </div>
        ))}

        <div className="pt-4 mt-2 border-t border-border/40 mx-2">
          <Link
            href="/dashboard/new-order"
            title={collapsed ? "В кабинет клиента" : undefined}
            aria-label="В кабинет клиента"
            className={cn(
              "flex items-center px-4 text-sm font-medium rounded-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 whitespace-nowrap border border-transparent hover:border-border group h-12",
              collapsed && "justify-center px-0 w-12 h-12 mx-auto"
            )}
          >
            <ArrowLeft className="w-[18px] h-[18px] flex-shrink-0 transition-transform group-hover:-translate-x-1" />
            {!collapsed && <span className="ml-3 tracking-wide">В кабинет клиента</span>}
          </Link>
        </div>

        {/* Theme Toggle Component */}
        <div className="pt-2 border-t border-border/40 mx-2 mt-2">
          {!mounted ? (
            <div className="h-12 mx-2" />
          ) : collapsed ? (
            <button
              onClick={() => setMode(isDark ? 'light' : 'dark')}
              title={isDark ? "Светлая тема" : "Темная тема"}
              aria-label="Переключить тему"
              className="w-12 h-12 flex items-center justify-center rounded-[10px] text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-200 mx-auto active:scale-95 cursor-pointer mt-1"
            >
              {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
          ) : (
            <div className="flex items-center justify-between px-4 py-2 mt-1 bg-muted/20 border border-border/40 rounded-[10px] mx-1 transition-all duration-200">
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Тема</span>
              <div className="flex gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/40">
                <button
                  onClick={() => setMode('light')}
                  className={cn(
                    "p-1.5 rounded-md transition-all cursor-pointer active:scale-[0.93]",
                    !isDark ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Светлая тема"
                  aria-label="Светлая тема"
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setMode('dark')}
                  className={cn(
                    "p-1.5 rounded-md transition-all cursor-pointer active:scale-[0.93]",
                    isDark ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Темная тема"
                  aria-label="Темная тема"
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
