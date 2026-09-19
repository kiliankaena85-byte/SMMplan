'use client';

import React from 'react';
import type { ExternalServiceItem, CategoryItem } from '../types';
import { TargetTypeBadge, RetailPrice } from './services-table-badges';
import { SearchableCategorySelect } from './searchable-category-select';
import { ServiceIdBadge } from '@/components/ui/service-id-badge';
import { formatPricePerUnit } from '@/utils/format-price';

export interface ServicesTableMobileCardProps {
  service: ExternalServiceItem;
  isSelected: boolean;
  isDisabled: boolean;
  isFreeProcurement: boolean;
  effectiveCatId?: string;
  priceProcurement: number;
  isConflict: boolean;
  numericIdVal?: number;
  svcId: string;
  markup: number;
  isAutoMarkup: boolean;
  showCategoryColumn: boolean;
  categories: CategoryItem[];
  categoriesByNetwork: { network: string; items: CategoryItem[] }[];
  selectedCategoryId?: string;
  hasValidationError?: boolean;
  onToggle: (id: string) => void;
  onCategoryChange?: (svcId: string, catId: string) => void;
  onCategoryCreated?: (cat: CategoryItem) => void;
}

export function ServicesTableMobileCard({
  service: s,
  isSelected,
  isDisabled,
  isFreeProcurement,
  effectiveCatId,
  priceProcurement,
  isConflict,
  numericIdVal,
  svcId,
  markup,
  isAutoMarkup,
  showCategoryColumn,
  categories,
  categoriesByNetwork,
  selectedCategoryId,
  hasValidationError,
  onToggle,
  onCategoryChange,
  onCategoryCreated,
}: ServicesTableMobileCardProps) {
  const metrics = s.metrics || {};

  return (
    <div className="lg:hidden p-3 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <input
            type="checkbox"
            disabled={isDisabled}
            checked={isSelected}
            onChange={() => onToggle(svcId)}
            className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4 shrink-0"
            aria-label={`Выбрать ${s.cleanName || s.name}`}
          />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs font-semibold text-foreground line-clamp-2">{s.cleanName || s.name}</span>
            <div className="flex items-center gap-1">
              <ServiceIdBadge numericId={numericIdVal} providerId={svcId} size="xs" />
              <span className="text-[10px] text-muted-foreground truncate">{s.name}</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-xs">
          {s.alreadyImported ? '📦' : isFreeProcurement ? '❌' : effectiveCatId ? '✅' : '⚠️'}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap ml-6">
        <TargetTypeBadge name={s.name} targetType={metrics.targetType} />
        {metrics.platform && (
          <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-semibold border border-border">
            {metrics.platform}
          </span>
        )}
        {isConflict && <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1 py-0.5 rounded border border-amber-500/20 font-bold">⚠️ Конфликт</span>}
      </div>

      <div className="flex items-center justify-between ml-6 pt-1 border-t border-border/40">
        <div className="flex items-center gap-2 font-mono">
          <RetailPrice procurement={priceProcurement} markup={markup} isAuto={isAutoMarkup} />
          <span className="text-[10px] text-muted-foreground tabular-nums">
            ({formatPricePerUnit(priceProcurement)} ₽ зак.)
          </span>
        </div>
      </div>

      {showCategoryColumn && !s.alreadyImported && (
        <div className="ml-6">
          <SearchableCategorySelect
            value={selectedCategoryId || ''}
            onChange={(val) => onCategoryChange?.(svcId, val)}
            categories={categories}
            categoriesByNetwork={categoriesByNetwork}
            onCategoryCreated={onCategoryCreated}
            suggestedPlatform={metrics.platform}
            isMobile={true}
            hasError={hasValidationError}
          />
        </div>
      )}
    </div>
  );
}
