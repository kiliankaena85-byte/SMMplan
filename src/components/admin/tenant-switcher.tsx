'use client';

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { TENANTS, TenantId } from '@/config/tenants';
import { Globe } from 'lucide-react';

interface TenantSwitcherProps {
  currentTenant?: string;
  className?: string;
}

export function TenantSwitcher({ currentTenant = 'smmplan', className = '' }: TenantSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTenant = searchParams.get('tenant') || currentTenant;

  const handleSelect = (tenantId: TenantId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tenant', tenantId);
    // Reset page cursor on tenant switch
    params.delete('cursor');
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className={`inline-flex items-center p-1 bg-muted/60 dark:bg-muted/30 border border-border/60 rounded-xl shadow-inner ${className}`}>
      <div className="flex items-center gap-1.5 px-2.5 text-xs font-bold text-muted-foreground border-r border-border/40 mr-1 select-none">
        <Globe className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Сайт:</span>
      </div>
      <div className="flex items-center gap-1">
        {TENANTS.map((t) => {
          const isActive = activeTenant === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelect(t.id)}
              className={`px-3 py-1.5 min-h-[36px] sm:min-h-[44px] flex items-center justify-center text-xs font-extrabold rounded-lg transition-all duration-200 active:scale-95 ${
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
