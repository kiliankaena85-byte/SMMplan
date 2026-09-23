'use client';

import React from 'react';
import type { ExternalServiceItem, CategoryItem, FilterState } from '../types';
import { ServicesTableHeader } from './services-table-header';
import { ServicesTableRow } from './services-table-row';
export { TargetTypeBadge } from './services-table-badges';

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
  isAutoMarkup?: boolean;
  categories?: CategoryItem[];
  categoriesByNetwork?: { network: string; items: CategoryItem[] }[];
  selectedCategories?: Record<string, string>;
  onCategoryChange?: (serviceId: string, categoryId: string) => void;
  onCategoryCreated?: (newCategory: CategoryItem) => void;
  autoMappedCategories?: Record<string, string>;
  aiConfidence?: Record<string, boolean>;
  showCategoryColumn?: boolean;
  validationErrors?: Set<string>;
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
  markup = 0,
  isAutoMarkup = false,
  categories = [],
  categoriesByNetwork = [],
  selectedCategories = {},
  onCategoryChange,
  onCategoryCreated,
  autoMappedCategories = {},
  aiConfidence = {},
  showCategoryColumn = false,
  validationErrors = new Set<string>(),
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

  const importableServices = services.filter((s) => !s.alreadyImported && (s.pricePerUnitProcurementRub || 0) > 0);
  const importableIds = importableServices.map((s) => String(s.service));
  const isAllPageSelected = importableIds.length > 0 && importableIds.every((id) => selectedIds.has(id));
  const isCheckboxDisabled = importableIds.length === 0;

  // Optimized grid template: Viewport 100% width, NO horizontal scroll
  const gridTemplate = showCategoryColumn
    ? 'grid-cols-[36px_minmax(0,1.8fr)_minmax(0,1.2fr)_130px_220px_54px]'
    : 'grid-cols-[36px_minmax(0,2fr)_minmax(0,1.5fr)_140px_54px]';

  return (
    <div className="flex-1 flex flex-col min-w-0 w-full bg-card border border-border/60 rounded-xl shadow-xs overflow-hidden">
      <div className="flex-1 w-full min-w-0 overflow-hidden">
        <ServicesTableHeader
          gridTemplate={gridTemplate}
          showCategoryColumn={showCategoryColumn}
          filters={filters}
          onSort={handleSort}
          toggleAll={toggleAll}
          isAllPageSelected={isAllPageSelected}
          isCheckboxDisabled={isCheckboxDisabled}
        />

        <div className="bg-card flex flex-col divide-y divide-border/40">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              <div className="flex justify-center items-center gap-2">
                <span className="animate-spin text-lg">⏳</span> Загрузка услуг...
              </div>
            </div>
          ) : services.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Услуги по заданным критериям не найдены.
            </div>
          ) : (
            services.map((s) => (
              <ServicesTableRow
                key={s.service}
                service={s}
                isSelected={selectedIds.has(String(s.service))}
                onToggle={toggleSelection}
                gridTemplate={gridTemplate}
                showCategoryColumn={showCategoryColumn}
                markup={markup}
                isAutoMarkup={isAutoMarkup}
                categories={categories}
                categoriesByNetwork={categoriesByNetwork}
                selectedCategoryId={selectedCategories[String(s.service)]}
                autoMappedCategoryId={autoMappedCategories[String(s.service)]}
                isAiConfident={aiConfidence[String(s.service)]}
                hasValidationError={validationErrors.has(String(s.service))}
                onCategoryChange={onCategoryChange}
                onCategoryCreated={onCategoryCreated}
              />
            ))
          )}
        </div>
      </div>

      {/* Responsive Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="bg-muted/30 border-t border-border/60 px-4 py-2.5 flex items-center justify-between">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground font-medium">
              Показано{' '}
              <span className="font-bold text-foreground">{(pagination.page - 1) * pagination.pageSize + 1}</span>–
              <span className="font-bold text-foreground">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> из{' '}
              <span className="font-bold text-foreground">{pagination.total}</span>
            </p>
            <nav className="inline-flex rounded-lg shadow-2xs -space-x-px border border-border/60 overflow-hidden" aria-label="Пагинация">
              <button
                onClick={() => setFilters({ ...filters, page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 bg-card text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors select-none border-r border-border/60 cursor-pointer"
              >
                ← Пред.
              </button>
              <span className="px-3 py-1.5 bg-card text-xs font-bold text-foreground select-none border-r border-border/60 tabular-nums">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setFilters({ ...filters, page: Math.min(pagination.totalPages, pagination.page + 1) })}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1.5 bg-card text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors select-none cursor-pointer"
              >
                След. →
              </button>
            </nav>
          </div>

          {/* Mobile pagination */}
          <div className="flex sm:hidden items-center justify-between w-full">
            <span className="text-[11px] text-muted-foreground tabular-nums">{pagination.page}/{pagination.totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilters({ ...filters, page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1}
                className="px-2.5 py-1 bg-card text-xs text-muted-foreground hover:bg-muted disabled:opacity-40 border border-border/60 rounded-md"
              >
                ←
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: Math.min(pagination.totalPages, pagination.page + 1) })}
                disabled={pagination.page === pagination.totalPages}
                className="px-2.5 py-1 bg-card text-xs text-muted-foreground hover:bg-muted disabled:opacity-40 border border-border/60 rounded-md"
              >
                →
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">{pagination.total} усл.</span>
          </div>
        </div>
      )}
    </div>
  );
}
