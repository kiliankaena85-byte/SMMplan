import * as React from 'react';
import { CatalogServiceDTO } from '@/types/catalog.dto';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { AlertCircle, Plus, Copy } from 'lucide-react';
import Link from 'next/link';

import { EditServiceModal } from '@/components/admin/catalog-table-v2';

interface LovableCatalogGridProps {
  services: CatalogServiceDTO[];
  selectedIds: Set<string>;
  onSelect: (id: string, isSelected: boolean) => void;
  canEdit: boolean;
  canSeeRates: boolean;
  categories: any[];
  providers: any[];
  usdToRub: number;
  calcDisplayPrice: (r: number, m: number) => number;
  calcDisplayCost: (r: number) => number;
  displayCurrency: 'RUB' | 'USD';
  displayVolume: 'UNIT' | '1K';
}

function getNetworkBadgeClass(slug: string | null) {
  if (!slug) return 'bg-default-100 text-default-600 border-default-200/20';
  const s = slug.toLowerCase();
  if (s.includes('tg') || s.includes('telegr')) {
    return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
  }
  if (s.includes('vk') || s.includes('vkont')) {
    return 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-600/20';
  }
  if (s.includes('inst') || s.includes('ig')) {
    return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20';
  }
  if (s.includes('yt') || s.includes('youtub')) {
    return 'bg-rose-600/10 text-rose-600 dark:text-rose-400 border-rose-600/20';
  }
  if (s.includes('tt') || s.includes('tiktok')) {
    return 'bg-zinc-900/10 text-zinc-900 dark:bg-zinc-100/10 dark:text-zinc-100 border-zinc-900/20';
  }
  return 'bg-primary/10 text-primary border-primary/20';
}

export function LovableCatalogGrid({
  services,
  selectedIds,
  onSelect,
  canEdit,
  canSeeRates,
  categories,
  providers,
  usdToRub,
  calcDisplayPrice,
  calcDisplayCost,
  displayCurrency,
  displayVolume
}: LovableCatalogGridProps) {
  const symbol = displayCurrency === 'RUB' ? '₽' : '$';
  const volSuffix = displayVolume === '1K' ? '/ 1000 шт' : '/ шт';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-700 ease-out">
      {services.map(s => {
        const cost = calcDisplayCost(s.rate);
        const price = calcDisplayPrice(s.rate, s.markup);
        const profit = price - cost;
        const profitMargin = price > 0 ? (profit / price) * 100 : 0;
        const isLoss = profit < 0;

        return (
          <div 
            key={s.id} 
            className={`group relative bg-background/50 backdrop-blur-md border rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col gap-4 ${
              !s.isActive ? 'opacity-60 grayscale-[0.5]' : ''
            } ${
              selectedIds.has(s.id) ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/50 hover:border-primary/30'
            }`}
          >
            {/* Glass Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-transparent rounded-3xl pointer-events-none" />

            <div className="relative z-10 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-border/50 text-primary focus:ring-primary cursor-pointer transition-colors"
                  checked={selectedIds.has(s.id)}
                  onChange={(e) => onSelect(s.id, e.target.checked)}
                />
                <div>
                  <h3 className="font-extrabold text-lg text-foreground tracking-tight">#{s.numericId}</h3>
                  {s.externalId && (
                    <p className="text-[10px] text-muted-foreground font-mono font-bold">EX-ID: {s.externalId}</p>
                  )}
                </div>
              </div>
              <Badge className={`font-bold text-[10px] uppercase px-2 py-1 rounded-xl shadow-sm ${s.isActive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border/80'}`}>
                {s.isActive ? 'Активна' : 'Отключена'}
              </Badge>
            </div>

            <div className="relative z-10 flex-1 space-y-4">
              {/* Category & Network */}
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider ${getNetworkBadgeClass(s.networkSlug)}`}>
                  <SocialIcon slug={s.networkSlug || ''} className="w-3 h-3" />
                  {s.networkName || 'Unknown'}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground truncate">
                  {s.categoryName}
                </span>
              </div>

              {/* Title */}
              <p className="text-sm font-semibold text-foreground leading-tight line-clamp-3 min-h-[2.5rem]">
                {s.name}
              </p>

              {/* Warning / Quarantined */}
              {s.isQuarantined && (
                <div className="flex items-start gap-1.5 bg-warning/10 border border-warning/20 text-warning px-2.5 py-1.5 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="text-[10px] font-medium leading-tight">
                    Карантин: {s.quarantineReason}
                  </span>
                </div>
              )}
              {isLoss && canSeeRates && (
                <div className="flex items-start gap-1.5 bg-destructive/10 border border-destructive/20 text-destructive px-2.5 py-1.5 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Убыток
                  </span>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 mt-4 bg-muted/30 p-3 rounded-2xl border border-border/40">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Цена продажи</span>
                  <span className="font-extrabold text-primary text-sm tabular-nums">
                    {price.toFixed(2)} {symbol} <span className="text-[9px] font-medium text-muted-foreground lowercase">{volSuffix}</span>
                  </span>
                </div>
                {canSeeRates && (
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Себестоимость</span>
                    <span className="font-bold text-muted-foreground text-xs tabular-nums">
                      {cost.toFixed(2)} {symbol} <span className="text-[9px] lowercase">{volSuffix}</span>
                    </span>
                  </div>
                )}
                
                <div className="flex flex-col gap-1 col-span-2 pt-2 border-t border-border/50 mt-1">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Наценка</span>
                    <span className="font-extrabold text-foreground text-xs tabular-nums">
                      x{s.markup.toFixed(2)}
                    </span>
                  </div>
                  {canSeeRates && (
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Чистая маржа</span>
                      <span className={`font-bold text-xs tabular-nums ${isLoss ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {profitMargin.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-border/40 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                  Min: {s.minQty.toLocaleString('ru-RU')}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                  Max: {s.maxQty.toLocaleString('ru-RU')}
                </span>
              </div>
              
              {canEdit && (
                <div className="scale-75 origin-right">
                  <EditServiceModal 
                    service={s} 
                    categories={categories} 
                    providers={providers} 
                    onSuccess={() => { window.location.reload() }} 
                    usdToRub={usdToRub} 
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
