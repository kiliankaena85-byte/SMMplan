'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { TENANTS, TenantId } from '@/config/tenants';
import { Globe, ChevronDown, Check, ExternalLink, Sparkles } from 'lucide-react';
import { getTenantHost } from '@/lib/seo-helpers';

interface TenantSwitcherProps {
  currentTenant?: string;
  className?: string;
  variant?: 'dropdown' | 'segmented';
}

export function TenantSwitcher({ currentTenant = 'smmplan', className = '', variant = 'dropdown' }: TenantSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTenantId = (searchParams.get('tenant') as TenantId) || currentTenant || 'smmplan';
  const activeTenant = TENANTS.find((t) => t.id === activeTenantId) || TENANTS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (tenantId: TenantId) => {
    setIsOpen(false);
    
    // 1. Set cookie for session-wide admin tenant persistence
    try {
      document.cookie = `x_admin_tenant=${tenantId}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}

    // 2. Update search params
    const params = new URLSearchParams(searchParams.toString());
    params.set('tenant', tenantId);
    params.delete('cursor');

    router.replace(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center p-1 bg-muted/60 dark:bg-muted/30 border border-border/60 rounded-xl shadow-inner ${className}`}>
        <div className="flex items-center gap-1.5 px-2.5 text-xs font-bold text-muted-foreground border-r border-border/40 mr-1 select-none">
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Сайт:</span>
        </div>
        <div className="flex items-center gap-1">
          {TENANTS.map((t) => {
            const isActive = activeTenant.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelect(t.id)}
                className={`px-3 py-1.5 min-h-[36px] sm:min-h-[44px] flex items-center justify-center text-xs font-extrabold rounded-lg transition-all duration-200 active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-background text-primary shadow-sm ring-1 ring-border/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default: Dropdown variant as seen in SmmPanel screenshots
  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 px-3 py-1.5 h-9 sm:h-10 bg-card/90 hover:bg-card border border-border/80 hover:border-primary/50 text-foreground font-semibold rounded-xl transition-all duration-200 shadow-sm active:scale-95 cursor-pointer text-xs sm:text-sm select-none"
      >
        <div className="w-5 h-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Globe className="w-3.5 h-3.5" />
        </div>
        
        <span className="font-black text-foreground tracking-tight">
          {activeTenant.domain}
        </span>

        <span className="text-[11px] font-bold text-muted-foreground hidden lg:inline">
          ({activeTenant.name})
        </span>

        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-card/95 border border-border/80 shadow-2xl z-[100] py-2 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
          <div className="px-3.5 py-2 border-b border-border/50 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Список сайтов
            </span>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {TENANTS.length} сайта
            </span>
          </div>

          <div className="p-1.5 space-y-1">
            {TENANTS.map((t) => {
              const isSelected = t.id === activeTenant.id;
              const host = getTenantHost(t.id);

              return (
                <div
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-150 group ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'hover:bg-muted/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground'
                    }`}>
                      {t.id === 'flux' ? <Sparkles className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-extrabold truncate">
                        {t.domain}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {t.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                    
                    <a
                      href={`https://${host}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title={`Открыть ${t.name} в новой вкладке`}
                      className="p-1 text-muted-foreground/50 hover:text-foreground rounded-md hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const GlobalSiteSwitcher = TenantSwitcher;

