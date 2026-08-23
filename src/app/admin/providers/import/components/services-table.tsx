'use client';

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Settings2, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatPricePerUnit } from '@/utils/format-price';
import { inferTargetTypeFromName, inferTargetTypeFromCategory, isTargetTypeCompatible } from '@/utils/target-type';
import { TargetTypeSelector } from './target-type-selector';
import { getTargetTypeMeta } from '../lib/target-type-config';
import type { ExternalServiceItem, CategoryItem, FilterState } from '../types';
import type { ServiceOverride } from './service-edit-modal';

interface ServicesTableProps {
  services: ExternalServiceItem[];
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  toggleAll: () => void;
  loading: boolean;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>> | ((f: FilterState) => void);
  pagination: { page: number; totalPages: number; total: number; pageSize: number };
  markup?: number;
  categories?: CategoryItem[];
  selectedCategories?: Record<string, string>;
  onCategoryChange?: (serviceId: string, categoryId: string) => void;
  autoMappedCategories?: Record<string, string>;
  aiConfidence?: Record<string, boolean>;
  showCategoryColumn?: boolean;
  validationErrors?: Set<string>;
  serviceOverrides?: Record<string, ServiceOverride>;
  onTargetTypeChange?: (serviceId: string, targetType: string) => void;
  onOpenEditModal?: (service: ExternalServiceItem) => void;
}

export function ServicesTable({
  services,
  selectedIds,
  toggleSelection,
  toggleAll,
  loading,
  filters,
  setFilters,
  pagination,
  markup = 50,
  categories = [],
  selectedCategories = {},
  onCategoryChange,
  autoMappedCategories = {},
  aiConfidence = {},
  showCategoryColumn = true,
  validationErrors = new Set<string>(),
  serviceOverrides = {},
  onTargetTypeChange,
  onOpenEditModal,
}: ServicesTableProps) {
  const handleSort = (field: string) => {
    let newSort = 'none';
    if (filters.sortBy !== `${field}_asc` && filters.sortBy !== `${field}_desc`) {
      newSort = `${field}_asc`;
    } else if (filters.sortBy === `${field}_asc`) {
      newSort = `${field}_desc`;
    }
    setFilters({ ...filters, sortBy: newSort, page: 1 });
  };

  const getSortIcon = (field: string) => {
    if (filters.sortBy === `${field}_asc`)
      return <ArrowUp className="w-3.5 h-3.5 text-primary animate-in fade-in zoom-in-75 duration-200" />;
    if (filters.sortBy === `${field}_desc`)
      return <ArrowDown className="w-3.5 h-3.5 text-primary animate-in fade-in zoom-in-75 duration-200" />;
    return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/80 transition-colors" />;
  };

  const importableServices = services.filter((s) => !s.alreadyImported && (s.pricePerUnitProcurementRub || 0) > 0);
  const importableIds = importableServices.map((s) => String(s.service));
  const isAllPageSelected = importableIds.length > 0 && importableIds.every((id) => selectedIds.has(id));
  const isCheckboxDisabled = importableIds.length === 0;

  // Grid column definition: 6 balanced columns fitting 100% viewport width
  const gridTemplate = 'grid-cols-[44px_minmax(200px,2fr)_minmax(140px,1.2fr)_minmax(160px,1.4fr)_130px_90px]';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-card border border-border/70 rounded-2xl shadow-sm overflow-hidden ring-1 ring-border/5">
      {/* Desktop Header */}
      <div className={`hidden lg:grid ${gridTemplate} gap-3 bg-muted/40 border-b border-border/70 select-none items-center px-3 py-2.5 backdrop-blur-sm`}>
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            onChange={toggleAll}
            checked={isAllPageSelected}
            disabled={isCheckboxDisabled}
            className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          />
        </div>
        <div
          className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
          onClick={() => handleSort('name')}
        >
          <div className="flex items-center gap-1.5">
            <span>Услуга и Название для магазина</span>
            {getSortIcon('name')}
          </div>
        </div>
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <span>Тип ссылки</span>
          <span title="Какой тип ссылки клиент должен вставить в форму заказа" className="cursor-help">
            <HelpCircle className="w-3 h-3 text-muted-foreground/60" />
          </span>
        </div>
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Категория каталога
        </div>
        <div
          className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors text-right pr-2"
          onClick={() => handleSort('price')}
        >
          <div className="flex items-center justify-end gap-1.5">
            <span>Стоимость</span>
            {getSortIcon('price')}
          </div>
        </div>
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">
          Настройка
        </div>
      </div>

      {/* Mobile Select All */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            onChange={toggleAll}
            checked={isAllPageSelected}
            disabled={isCheckboxDisabled}
            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
          />
          <span className="text-sm font-semibold text-foreground">Выбрать все на странице</span>
        </label>
      </div>

      {/* Rows Container */}
      <div className="bg-card flex flex-col divide-y divide-border/50">
        {loading ? (
          <div className="p-16 text-center text-sm text-muted-foreground">
            <div className="flex justify-center items-center gap-2 font-medium">
              <span className="animate-spin text-xl">⏳</span> Загрузка услуг из каталога...
            </div>
          </div>
        ) : services.length === 0 ? (
          <div className="p-16 text-center text-sm text-muted-foreground">
            Услуги по заданным критериям не найдены.
          </div>
        ) : (
          services.map((s) => {
            const svcId = String(s.service);
            const override = serviceOverrides[svcId];
            const hasOverride = !!override;

            const effectiveName = override?.cleanName || s.cleanName || s.name;
            const effectiveTargetType = override?.targetType || (s.metrics?.targetType as string) || inferTargetTypeFromName(s.name);
            const effectiveCategoryId = override?.categoryId || selectedCategories[svcId] || autoMappedCategories[svcId] || '';
            const effectiveMarkup = override?.customMarkup !== undefined ? override.customMarkup : markup;

            const priceProcurement = s.pricePerUnitProcurementRub || 0;
            const priceRetail = priceProcurement * (1 + effectiveMarkup / 100);
            const isFreeProcurement = priceProcurement <= 0;
            const isDisabled = s.alreadyImported || isFreeProcurement;
            const isSelected = selectedIds.has(svcId);

            const targetMeta = getTargetTypeMeta(effectiveTargetType);
            const selectedCat = categories.find((c) => c.id === effectiveCategoryId);

            // Check target type / category conflict
            const catType = selectedCat ? inferTargetTypeFromCategory(selectedCat.name) : null;
            const hasTypeConflict = selectedCat && !isTargetTypeCompatible(effectiveTargetType, catType);

            return (
              <div
                key={svcId}
                className={`transition-colors duration-150 p-3 lg:p-0 ${
                  s.alreadyImported
                    ? 'bg-muted/30 opacity-70'
                    : isFreeProcurement
                    ? 'bg-destructive/5'
                    : isSelected
                    ? 'bg-primary/5 hover:bg-primary/8'
                    : 'hover:bg-muted/30 even:bg-muted/10'
                }`}
              >
                {/* Desktop Row */}
                <div className={`hidden lg:grid ${gridTemplate} gap-3 items-center min-h-[64px] px-3 py-2`}>
                  {/* Checkbox */}
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      disabled={isDisabled}
                      checked={isSelected}
                      onChange={() => toggleSelection(svcId)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Service Title & Info */}
                  <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="text-xs font-bold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                        title={effectiveName}
                        onClick={() => onOpenEditModal?.(s)}
                      >
                        {effectiveName}
                      </span>
                      {hasOverride && (
                        <span className="text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 rounded shrink-0">
                          ✏️ Изменено
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono truncate">
                      <span>ID: #{svcId}</span>
                      <span className="truncate max-w-[200px]" title={s.name}>
                        • {s.name}
                      </span>
                      {s.refill && (
                        <span className="bg-muted px-1 rounded text-[9px] font-sans text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                          ♻️ Рефилл
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Target Link Type (Interactive Selector) */}
                  <div className="min-w-0">
                    <TargetTypeSelector
                      value={effectiveTargetType}
                      onChange={(newType) => onTargetTypeChange?.(svcId, newType)}
                      compact={true}
                    />
                    {hasTypeConflict && (
                      <span
                        className="text-[9px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 block truncate"
                        title={`Несоответствие: услуга (${targetMeta.shortLabel}) не совпадает с категорией (${selectedCat?.name})`}
                      >
                        ⚠️ Несовпадение типа
                      </span>
                    )}
                  </div>

                  {/* Category Selection */}
                  <div className="min-w-0">
                    {s.alreadyImported ? (
                      <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1 bg-muted px-2 py-1 rounded-lg border border-border w-fit">
                        📦 Уже в каталоге
                      </span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <Select
                          value={effectiveCategoryId}
                          onValueChange={(val) => onCategoryChange?.(svcId, val || '')}
                        >
                          <SelectTrigger
                            size="sm"
                            className={`h-8 text-xs bg-background rounded-lg border ${
                              validationErrors.has(svcId)
                                ? 'border-destructive ring-1 ring-destructive'
                                : 'border-border'
                            }`}
                          >
                            <SelectValue placeholder="Выберите категорию">
                              {(val: string) => {
                                const cat = categories.find((c) => c.id === val);
                                return cat
                                  ? `${cat.network?.name ? `${cat.network.name} • ` : ''}${cat.name}`
                                  : 'Выберите...';
                              }}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-60 w-[240px]">
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id} className="text-xs">
                                {c.network?.name ? `${c.network.name} • ` : ''}
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {aiConfidence[svcId] && !validationErrors.has(svcId) && (
                          <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 pl-0.5">
                            🪄 Авто-ИИ
                          </span>
                        )}
                        {validationErrors.has(svcId) && (
                          <span className="text-[9px] font-bold text-destructive pl-0.5">
                            ❌ Выберите категорию
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Price (Retail & Procurement) */}
                  <div className="flex flex-col items-end gap-0.5 pr-2 font-mono min-w-0">
                    <span className="text-foreground font-extrabold text-xs tabular-nums tracking-tight">
                      {formatPricePerUnit(priceRetail)} ₽
                      <span className="text-[10px] font-sans font-normal text-muted-foreground ml-0.5">
                        / шт
                      </span>
                    </span>
                    <span className="text-muted-foreground text-[10px] tabular-nums">
                      зак. {formatPricePerUnit(priceProcurement)} ₽
                    </span>
                  </div>

                  {/* Actions / Configure */}
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => onOpenEditModal?.(s)}
                      className="p-1.5 rounded-lg border border-border/80 bg-background text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-150 cursor-pointer shadow-2xs"
                      title="Настроить название, тип ссылки, наценку и описание"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile Layout */}
                <div className="lg:hidden flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        disabled={isDisabled}
                        checked={isSelected}
                        onChange={() => toggleSelection(svcId)}
                        className="mt-1 rounded border-border text-primary focus:ring-primary h-4 w-4 shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span
                          className="text-xs font-bold text-foreground leading-snug cursor-pointer hover:text-primary"
                          onClick={() => onOpenEditModal?.(s)}
                        >
                          {effectiveName}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono truncate">
                          #{svcId} • {s.name}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenEditModal?.(s)}
                      className="p-1.5 rounded-lg border border-border bg-background text-muted-foreground hover:text-primary shrink-0"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pl-6">
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">
                        Тип ссылки:
                      </label>
                      <TargetTypeSelector
                        value={effectiveTargetType}
                        onChange={(newType) => onTargetTypeChange?.(svcId, newType)}
                        compact={true}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">
                        Категория:
                      </label>
                      <Select
                        value={effectiveCategoryId}
                        onValueChange={(val) => onCategoryChange?.(svcId, val || '')}
                      >
                        <SelectTrigger size="sm" className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Категория" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pl-6 pt-1.5 border-t border-border/40 font-mono text-xs">
                    <span className="text-muted-foreground text-[10px]">
                      Закупка: {formatPricePerUnit(priceProcurement)} ₽
                    </span>
                    <span className="font-extrabold text-foreground">
                      {formatPricePerUnit(priceRetail)} ₽ <span className="text-[9px] font-sans font-normal text-muted-foreground">/ шт</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
