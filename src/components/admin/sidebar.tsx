'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CommandMenu } from '@/components/admin/command-menu';
import { 
  Home, Users, Package, RefreshCw, ShoppingCart, 
  MessageSquare, CreditCard, Link as LinkIcon, Gift, FileText, Settings,
  PanelLeftClose, PanelLeftOpen, ArrowLeft, BarChart, AlertTriangle, ToggleLeft, Activity, Cpu, BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, any> = {
  Home, Users, Package, RefreshCw, ShoppingCart, AlertTriangle,
  MessageSquare, CreditCard, Link: LinkIcon, Gift, FileText, Settings, BarChart,
  ToggleLeft, Activity, Cpu, BookOpen
};

export function AdminSidebar({ userEmail, roleInfo, navigation }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(true);
  const pathname = usePathname();

  return (
    <aside 
      className={cn(
        "relative z-20 h-screen flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group hidden md:flex flex-col",
        "bg-[#24303F] border-r border-[#2F3C4C]/80 shadow-[0_4px_30px_rgba(0,0,0,0.05)]",
        collapsed ? "w-16" : "w-[280px]"
      )}
    >
      {/* Collapse Toggle */}
      <div className={cn("absolute z-50 transition-all duration-500", collapsed ? "top-6 left-1/2 -translate-x-1/2" : "top-7 right-4")}>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-[#24303F] border border-[#2F3C4C] text-[#707579] hover:text-[#FFFFFF] hover:bg-[#2F3C4C] transition-all duration-300 transform hover:scale-105"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4 ml-0.5" /> : <PanelLeftClose className="w-4 h-4 mr-0.5" />}
        </button>
      </div>

      {/* Header Profile Area */}
      <div className={cn("pt-8 pb-6 px-6 transition-all duration-300 relative", collapsed ? "opacity-0 invisible h-0 p-0" : "opacity-100")}>
        {/* Subtle glow behind logo */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#3390EC]/5 to-transparent pointer-events-none" />
        
        <h2 className="text-xl font-extrabold tracking-tight mb-1 text-[#FFFFFF]">
          SMMplan
        </h2>
        <p className="text-[11px] text-[#707579] font-medium truncate mb-3 tracking-wide">{userEmail}</p>
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center px-2.5 py-1 text-[10px] rounded-[10px] uppercase font-bold tracking-wider shadow-sm border border-[#2F3C4C]/60 bg-[#2F3C4C]/30 text-[#FFFFFF]"
          )}>
            <div className="w-1.5 h-1.5 rounded-full bg-[#3390EC] mr-1.5 animate-pulse" />
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
              <h3 className="px-3 mb-2 text-[10px] font-extrabold text-[#707579]/70 uppercase tracking-[0.2em] transition-all duration-500 animate-in fade-in slide-in-from-left-2">
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
                      ? "bg-[#3390EC] text-[#FFFFFF] font-semibold shadow-sm shadow-[#3390EC]/10" 
                      : "text-[#707579] hover:bg-[#2F3C4C] hover:text-[#FFFFFF]",
                    collapsed && "justify-center px-0 w-12 h-12 mx-auto"
                  )}
                >
                  <span className={cn(
                    "transition-transform duration-300 group-hover:scale-110", 
                    collapsed ? "" : "mr-3 w-5 text-center flex justify-center",
                    isActive ? "text-[#FFFFFF]" : "text-[#707579] group-hover:text-[#FFFFFF]"
                  )}>
                    <IconComponent className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  {!collapsed && <span className="tracking-wide transition-all">{tab.label}</span>}
                  
                  {!collapsed && tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-auto mr-1 px-1.5 py-0.5 rounded-md bg-destructive text-[10px] font-bold text-destructive-foreground shadow-sm shadow-destructive/50">
                      {tab.badge}
                    </span>
                  )}
                  {collapsed && tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-destructive border border-[#24303F]" />
                  )}
                  
                  {/* Hover Glow Behind */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-[#3390EC]/0 via-[#3390EC]/0 to-[#3390EC]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-[10px]" />
                  )}
                </Link>
              );
            })}
            {!collapsed && sIdx < navigation.length - 1 && (
              <div className="h-px bg-[#2F3C4C]/60 mx-3 mt-4 mb-2" />
            )}
          </div>
        ))}

        <div className="pt-4 mt-2 border-t border-[#2F3C4C]/80 mx-2">
          <Link
            href="/dashboard/new-order"
            title={collapsed ? "В кабинет клиента" : undefined}
            aria-label="В кабинет клиента"
            className={cn(
              "flex items-center px-4 text-sm font-medium rounded-[10px] text-[#707579] hover:bg-[#2F3C4C] hover:text-[#FFFFFF] transition-all duration-200 whitespace-nowrap border border-transparent hover:border-[#2F3C4C]/60 group h-12",
              collapsed && "justify-center px-0 w-12 h-12 mx-auto"
            )}
          >
            <ArrowLeft className="w-[18px] h-[18px] flex-shrink-0 transition-transform group-hover:-translate-x-1" />
            {!collapsed && <span className="ml-3 tracking-wide">В кабинет клиента</span>}
          </Link>
        </div>
      </nav>
    </aside>
  );
}
