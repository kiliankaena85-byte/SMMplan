'use client';

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { FilterState } from '../types';

export interface ServicesTableHeaderProps {
  gridTemplate: string;
  showCategoryColumn: boolean;
  filters: FilterState;
  onSort: (field: string) => void;
  toggleAll: () => void;
  isAllPageSelected: boolean;
  isCheckboxDisabled: boolean;
}

export function ServicesTableHeader({
  gridTemplate,
  showCategoryColumn,
  filters,
  onSort,
  toggleAll,
  isAllPageSelected,
  isCheckboxDisabled,
}: ServicesTableHeaderProps) {
  const getSortIcon = (field: string) => {
    if (filters.sortBy === `${field}_asc`) {
      return <ArrowUp className="w-3.5 h-3.5 text-primary animate-in fade-in zoom-in-75 duration-200" />;
    }
    if (filters.sortBy === `${field}_desc`) {
      return <ArrowDown className="w-3.5 h-3.5 text-primary animate-in fade-in zoom-in-75 duration-200" />;
    }
    return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/80 transition-colors" />;
  };

  return (
    <>
      {/* Desktop Header */}
      <div className={`hidden lg:grid ${gridTemplate} gap-3 bg-muted/40 border-b border-border/60 sticky top-0 z-10 select-none items-center backdrop-blur-md px-2 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider`}>
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            onChange={toggleAll}
            checked={isAllPageSelected}
            disabled={isCheckboxDisabled}
            className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Выбрать все на странице"
          />
        </div>
        <div
          className="cursor-pointer hover:text-foreground transition-colors flex items-center gap-1 min-w-0"
          onClick={() => onSort('name')}
        >
          <span>Услуга</span>
          {getSortIcon('name')}
        </div>
        <div
          className="cursor-pointer hover:text-foreground transition-colors flex items-center gap-1 min-w-0"
          onClick={() => onSort('platform')}
        >
          <span>Соцсеть / Тип</span>
          {getSortIcon('platform')}
        </div>
        <div
          className="cursor-pointer hover:text-foreground transition-colors flex items-center gap-1 min-w-0"
          onClick={() => onSort('price')}
        >
          <span>Стоимость</span>
          {getSortIcon('price')}
        </div>
        {showCategoryColumn && (
          <div className="min-w-0">
            Категория
          </div>
        )}
        <div className="text-center min-w-0">
          Статус
        </div>
      </div>

      {/* Mobile Select All */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            onChange={toggleAll}
            checked={isAllPageSelected}
            disabled={isCheckboxDisabled}
            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            aria-label="Выбрать все на странице"
          />
          <span className="text-xs font-semibold text-foreground">Выбрать все на странице</span>
        </label>
      </div>
    </>
  );
}
