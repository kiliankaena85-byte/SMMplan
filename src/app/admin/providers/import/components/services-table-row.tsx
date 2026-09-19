'use client';

import React from 'react';
import type { ExternalServiceItem, CategoryItem } from '../types';
import { TargetTypeBadge, RetailPrice, getPlatformDisplay } from './services-table-badges';
import { SearchableCategorySelect } from './searchable-category-select';
import { ServicesTableMobileCard } from './services-table-mobile-card';
import { ServiceIdBadge } from '@/components/ui/service-id-badge';
import { formatPricePerUnit } from '@/utils/format-price';
import { inferTargetTypeFromCategory, isTargetTypeCompatible } from '@/utils/target-type';
import { resolveServiceTargetType } from '@/utils/target-type-mapper';

export interface ServicesTableRowProps {
  service: ExternalServiceItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
  gridTemplate: string;
  showCategoryColumn: boolean;
  markup: number;
  isAutoMarkup: boolean;
  categories: CategoryItem[];
  categoriesByNetwork: { network: string; items: CategoryItem[] }[];
  selectedCategoryId?: string;
  autoMappedCategoryId?: string;
  isAiConfident?: boolean;
  hasValidationError?: boolean;
  onCategoryChange?: (svcId: string, catId: string) => void;
  onCategoryCreated?: (cat: CategoryItem) => void;
}

export function ServicesTableRow({
  service: s,
  isSelected,
  onToggle,
  gridTemplate,
  showCategoryColumn,
  markup,
  isAutoMarkup,
  categories,
  categoriesByNetwork,
  selectedCategoryId,
  autoMappedCategoryId,
  isAiConfident,
  hasValidationError,
  onCategoryChange,
  onCategoryCreated,
}: ServicesTableRowProps) {
  const svcId = String(s.service);
  const metrics = s.metrics || {};
  const hasAnomaly = Number(metrics.anomalyScore || 0) > 0;
  const priceProcurement = s.pricePerUnitProcurementRub || 0;
  const isFreeProcurement = priceProcurement <= 0;
  const isDisabled = s.alreadyImported || isFreeProcurement;

  const effectiveCatId = selectedCategoryId || autoMappedCategoryId;
  const matchedCategory = effectiveCatId ? categories.find((c) => c.id === effectiveCatId) : null;
  const serviceType = resolveServiceTargetType({ name: s.name, targetType: metrics.targetType });
  const isConflict = matchedCategory ? !isTargetTypeCompatible(serviceType, inferTargetTypeFromCategory(matchedCategory.name)) : false;

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('select') || target.closest('a') || target.closest('[role="combobox"]') || target.closest('input')) return;
    if (!isDisabled) onToggle(svcId);
  };

  const numericIdVal = Number.isFinite(Number(s.service)) ? Number(s.service) : undefined;

  return (
    <div
      onClick={handleRowClick}
      className={`transition-colors duration-150 cursor-pointer border-b border-border/40 last:border-0 ${
        s.alreadyImported
          ? 'bg-muted/30 opacity-70 cursor-not-allowed'
          : isFreeProcurement
          ? 'bg-destructive/5 hover:bg-destructive/10'
          : isSelected
          ? 'bg-primary/8 hover:bg-primary/12'
          : 'hover:bg-muted/30'
      }`}
    >
      {/* Desktop Grid Layout */}
      <div className={`hidden lg:grid ${gridTemplate} gap-3 items-center min-h-[50px] px-2 py-1.5`}>
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            disabled={isDisabled}
            checked={isSelected}
            onChange={() => onToggle(svcId)}
            className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label={`Выбрать ${s.cleanName || s.name}`}
          />
        </div>

        <div className="flex flex-col gap-0.5 min-w-0 pr-1">
          <span className="text-xs font-semibold text-foreground truncate" title={s.cleanName || s.name}>
            {s.cleanName || s.name}
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <ServiceIdBadge numericId={numericIdVal} providerId={svcId} size="xs" />
            <span className="text-[10px] text-muted-foreground truncate" title={s.name}>
              {s.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap min-w-0">
          <TargetTypeBadge name={s.name} targetType={metrics.targetType} />
          {metrics.platform && (() => {
            const p = getPlatformDisplay(metrics.platform);
            return (
              <span className={`${p.color} px-1.5 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-0.5 select-none whitespace-nowrap`}>
                <span>{p.icon}</span>
                <span className="truncate max-w-[70px]">{p.name}</span>
              </span>
            );
          })()}
          {isConflict && (
            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1 py-0.2 rounded text-[9px] font-bold select-none whitespace-nowrap" title="Несовместимый тип ссылки">
              ⚠️ Конфликт
            </span>
          )}
          {metrics.geo && <span className="bg-muted text-muted-foreground border border-border px-1.5 py-0.2 rounded text-[9px] font-semibold select-none">{metrics.geo}</span>}
          {hasAnomaly && <span className="bg-warning/10 text-warning border border-warning/20 px-1.5 py-0.2 rounded text-[9px] font-semibold select-none">⚠️ {metrics.anomalyScore}</span>}
        </div>

        <div className="flex flex-col gap-0.5 font-mono min-w-0">
          <RetailPrice procurement={priceProcurement} markup={markup} isAuto={isAutoMarkup} />
          <span className="text-muted-foreground font-medium text-[10px] truncate block tabular-nums">
            {formatPricePerUnit(priceProcurement)} ₽
            <span className="font-sans ml-0.5 select-none">зак.</span>
          </span>
        </div>

        {showCategoryColumn && (
          <div className="min-w-0">
            {s.alreadyImported ? (
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 select-none bg-muted px-2 py-1 rounded-md border border-border w-fit truncate">
                📦 Импортировано
              </span>
            ) : (
              <div className="flex flex-col gap-0.5 w-full min-w-0">
                <SearchableCategorySelect
                  value={selectedCategoryId || ''}
                  onChange={(val) => onCategoryChange?.(svcId, val)}
                  categories={categories}
                  categoriesByNetwork={categoriesByNetwork}
                  onCategoryCreated={onCategoryCreated}
                  suggestedPlatform={metrics.platform}
                  hasError={hasValidationError}
                />
                {isAiConfident ? (
                  <span className="text-[9px] font-semibold text-success block select-none">✨ Авто ИИ</span>
                ) : hasValidationError ? (
                  <span className="text-[9px] font-bold text-destructive block select-none">❌ Требуется категория</span>
                ) : null}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-center">
          {s.alreadyImported ? (
            <span className="text-[11px] select-none text-muted-foreground" title="Уже в каталоге">📦</span>
          ) : isFreeProcurement ? (
            <span className="text-[11px] select-none text-destructive" title="Ошибка цены: 0 ₽">❌</span>
          ) : effectiveCatId ? (
            <span className="text-[11px] select-none text-success" title="Готово к импорту">✅</span>
          ) : (
            <span className="text-[11px] select-none text-warning" title="Требуется категория">⚠️</span>
          )}
        </div>
      </div>

      {/* Mobile Card Layout */}
      <ServicesTableMobileCard
        service={s}
        isSelected={isSelected}
        isDisabled={isDisabled}
        isFreeProcurement={isFreeProcurement}
        effectiveCatId={effectiveCatId}
        priceProcurement={priceProcurement}
        isConflict={isConflict}
        numericIdVal={numericIdVal}
        svcId={svcId}
        markup={markup}
        isAutoMarkup={isAutoMarkup}
        showCategoryColumn={showCategoryColumn}
        categories={categories}
        categoriesByNetwork={categoriesByNetwork}
        selectedCategoryId={selectedCategoryId}
        hasValidationError={hasValidationError}
        onToggle={onToggle}
        onCategoryChange={onCategoryChange}
        onCategoryCreated={onCategoryCreated}
      />
    </div>
  );
}
