'use client';

import React from 'react';
import Link from 'next/link';
import { Pencil, AlertCircle } from 'lucide-react';
import type { CatalogServiceDTO } from '@/types/catalog.dto';
import { UniversalIcon } from '@/components/ui/UniversalIcon';
import { ServiceIdBadge } from '@/components/ui/service-id-badge';
import { ArchiveButton, calcDisplayCost } from './catalog-price-helpers';

export interface CatalogMobileCardProps {
  service: CatalogServiceDTO;
  categoryName: string;
  networkName?: string | null;
  networkSlug?: string | null;
  providerName: string;
  isChecked: boolean;
  isActive: boolean;
  markup: number;
  price: string;
  usdToRub: number;
  currency: 'RUB' | 'USD';
  volume: 'UNIT' | '1K';
  canEdit: boolean;
  canEditFinance: boolean;
  isPending: boolean;
  onToggleCheck: () => void;
  onToggleActive: () => void;
  onPercentChange: (val: string) => void;
  onSaveMarkup: () => void;
  onArchive: () => void;
}

export function CatalogMobileCard({
  service,
  categoryName,
  networkSlug,
  providerName,
  isChecked,
  isActive,
  markup,
  price,
  usdToRub,
  currency,
  volume,
  canEdit,
  canEditFinance,
  isPending,
  onToggleCheck,
  onToggleActive,
  onPercentChange,
  onSaveMarkup,
  onArchive,
}: CatalogMobileCardProps) {
  const isZombie = Boolean(service.cooldownReason && service.cooldownReason.includes('ZOMBIE'));
  const unitLabel = volume === '1K' ? (currency === 'RUB' ? '₽ / 1k' : '$ / 1k') : (currency === 'RUB' ? '₽ / шт' : '$ / шт');
  const cost = calcDisplayCost(service.rate, usdToRub, currency, volume);

  return (
    <article
      className={`bg-card border rounded-2xl p-3.5 shadow-xs transition-all space-y-3 ${
        isChecked ? 'ring-2 ring-primary/40 bg-primary/5 border-primary/40' : 'border-border'
      } ${!isActive ? 'opacity-70 bg-muted/20' : ''}`}
    >
      {/* 1. Header: Selection, ID, Platform and Active Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          {canEdit && (
            <label className="min-w-[44px] min-h-[44px] -ml-2 -mt-2 flex items-center justify-center cursor-pointer">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={onToggleCheck}
                aria-label={`Выбрать услугу ${service.name}`}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </label>
          )}

          <div className="flex flex-col min-w-0 pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <ServiceIdBadge numericId={service.numericId} />
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground truncate max-w-[120px]">
                {categoryName}
              </span>
              {isZombie && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-destructive/10 text-destructive border border-destructive/20">
                  <AlertCircle className="w-2.5 h-2.5" /> Zombie
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <UniversalIcon
                icon={service.icon || service.categoryIcon || (networkSlug ? `brand:${networkSlug}` : null)}
                size={16}
                className="shrink-0 text-primary"
              />
              <h3 className="text-xs font-bold text-foreground leading-snug line-clamp-2">
                {service.name}
              </h3>
            </div>
          </div>
        </div>

        {/* Action Toggle (Touch Target >= 44px) */}
        <button
          type="button"
          onClick={onToggleActive}
          disabled={!canEdit || isPending}
          className={`min-h-[44px] px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer ${
            isActive
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : 'bg-muted text-muted-foreground border border-border'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
          <span>{isActive ? 'ВКЛ' : 'ВЫКЛ'}</span>
        </button>
      </div>

      {/* 2. Financial Metrics: Cost, Markup, Retail Price */}
      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/50 text-xs">
        {/* Cost */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Закуп</span>
          <span className="font-mono font-semibold text-foreground mt-0.5 tabular-nums">
            {cost.toFixed(volume === '1K' ? 2 : 4)} {currency === 'RUB' ? '₽' : '$'}
          </span>
        </div>

        {/* Markup Input (Font size >= 16px to prevent iOS auto-zoom) */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Наценка</span>
          {canEditFinance && service.providerId ? (
            <div className="relative inline-flex items-center mt-0.5">
              <input
                type="number"
                value={markup > 0 ? ((markup - 1) * 100).toFixed(0) : "0"}
                onChange={(e) => onPercentChange(e.target.value)}
                onBlur={onSaveMarkup}
                onKeyDown={(e) => e.key === 'Enter' && onSaveMarkup()}
                disabled={isPending || !canEditFinance}
                className="h-8 w-full text-base sm:text-xs font-mono font-bold text-center bg-background border border-border rounded-lg focus:ring-1 focus:ring-primary tabular-nums px-1"
              />
              <span className="text-[10px] text-muted-foreground font-bold ml-0.5">%</span>
            </div>
          ) : (
            <span className="font-mono font-bold text-foreground mt-0.5">
              {service.providerId ? `+${((markup - 1) * 100).toFixed(0)}%` : 'Manual'}
            </span>
          )}
        </div>

        {/* Retail Price */}
        <div className="flex flex-col text-right">
          <span className="text-[10px] uppercase font-bold text-primary">Розница</span>
          <span className="font-mono font-black text-sm text-foreground mt-0.5 tabular-nums">
            {price} <span className="text-[10px] font-normal text-muted-foreground">{unitLabel}</span>
          </span>
        </div>
      </div>

      {/* 3. Footer: Limits, Provider & Quick Action Buttons */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2 truncate">
          <span className="font-medium truncate max-w-[120px]" title={providerName}>
            Провайдер: <strong className="text-foreground">{providerName}</strong>
          </span>
          <span>•</span>
          <span className="font-mono">
            {service.minQty.toLocaleString()}–{service.maxQty.toLocaleString()} шт
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href={`/admin/catalog/${service.id}`}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-muted/60 text-foreground hover:bg-muted transition-colors active:scale-95"
            title="Редактировать услугу"
          >
            <Pencil className="w-4 h-4 text-primary" />
          </Link>
          {canEdit && (
            <div className="flex items-center justify-center min-h-[44px] min-w-[44px]">
              <ArchiveButton
                service={service}
                onDeleted={onArchive}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
