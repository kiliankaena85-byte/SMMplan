'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Globe, Building2, Sparkles, ChevronDown, Check } from 'lucide-react';

const SITES = [
  { 
    id: 'all', 
    name: 'Все сайты платформы', 
    domain: 'smmplan.pro + smmflux.ru', 
    short: 'Все сайты',
    icon: Globe,
  },
  { 
    id: 'smmplan', 
    name: 'smmplan.pro', 
    domain: 'SMMplan · B2B панель', 
    short: 'smmplan.pro',
    icon: Building2,
  },
  { 
    id: 'flux', 
    name: 'smmflux.ru', 
    domain: 'SMMflux · Retail Aurora', 
    short: 'smmflux.ru',
    icon: Sparkles,
  },
];

interface AdminTenantSelectorProps {
  currentTenant?: string;
}

export function AdminTenantSelector({ currentTenant }: AdminTenantSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const activeTenant = searchParams.get('tenant') || currentTenant || 'all';

  // Close when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  const handleSelectTenant = (tenantId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tenantId !== 'all') {
      params.set('tenant', tenantId);
      document.cookie = `x_tenant=${tenantId}; path=/; max-age=2592000; SameSite=Lax`;
    } else {
      params.delete('tenant');
      document.cookie = `x_tenant=; path=/; max-age=0; SameSite=Lax`;
    }
    setIsOpen(false);
    router.push(`${pathname}?${params.toString()}`);
  };

  const selectedSite = SITES.find(s => s.id === activeTenant) || SITES[0];
  const SelectedIcon = selectedSite.icon;

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        type="button"
        data-testid="admin-tenant-selector"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border/70 bg-card hover:border-primary/50 text-foreground transition-all cursor-pointer select-none text-xs font-semibold shadow-sm active:scale-95"
      >
        <SelectedIcon className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="font-mono">{selectedSite.short}</span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground ml-0.5 opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-md bg-card border border-border/80 shadow-xl z-50 p-1.5 text-foreground animate-in fade-in zoom-in-95 duration-150">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground px-2 py-1">
            Список сайтов
          </div>
          <div className="h-px bg-border/40 my-1" />
          <div className="space-y-0.5">
            {SITES.map(site => {
              const isSelected = site.id === activeTenant;
              const SiteIcon = site.icon;
              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => handleSelectTenant(site.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-md transition-colors flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'hover:bg-muted/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <SiteIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs truncate">{site.name}</span>
                      <span className={`text-[10px] truncate ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {site.domain}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
