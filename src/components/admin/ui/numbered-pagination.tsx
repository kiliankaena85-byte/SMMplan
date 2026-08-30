'use client';

import React, { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Layers, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowRight } from 'lucide-react';

export interface NumberedPaginationProps {
  totalCount: number;
  globalTotalCount?: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  itemLabel?: string; // e.g. "заказов", "клиентов", "услуг"
  selectedTenant?: string;
}

export function NumberedPagination({
  totalCount,
  globalTotalCount,
  currentPage,
  totalPages,
  pageSize,
  itemLabel = 'записей',
  selectedTenant,
}: NumberedPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [jumpPage, setJumpPage] = useState('');

  // Helper to build URL with page & pageSize while preserving all other active filters
  const buildPageUrl = (page: number, newPageSize?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('cursor'); // clear old cursor if present

    if (selectedTenant) {
      params.set('tenant', selectedTenant);
    }
    params.set('page', String(page));
    params.set('pageSize', String(newPageSize || pageSize));

    return `${pathname}?${params.toString()}`;
  };

  const navigateToPage = (targetPage: number, newPageSize?: number) => {
    const clamped = Math.max(1, Math.min(targetPage, totalPages || 1));
    router.push(buildPageUrl(clamped, newPageSize), { scroll: false });
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpPage, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      navigateToPage(parsed);
      setJumpPage('');
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    navigateToPage(1, newSize);
  };

  // Generate numbered pages list with smart ellipsis
  const getPageNumbers = () => {
    const delta = 2; // number of pages around current
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  if (totalCount === 0 && totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-4 py-4 px-3 sm:px-4 bg-card/80 border border-border/70 rounded-xl text-xs select-none shadow-xs mt-4">
      {/* ── Left side: Count Summary ── */}
      <div className="flex items-center gap-2 text-muted-foreground order-2 lg:order-1 flex-wrap justify-center sm:justify-start">
        <Layers className="w-4 h-4 text-primary shrink-0" />
        <span>
          Показано <strong className="text-foreground font-mono font-bold">{startRecord}–{endRecord}</strong> из{' '}
          <strong className="text-foreground font-mono font-bold">{totalCount.toLocaleString('ru-RU')}</strong> {itemLabel}
          {globalTotalCount !== undefined && globalTotalCount > totalCount && (
            <span className="text-muted-foreground/80 font-normal">
              {' '}(всего в базе: {globalTotalCount.toLocaleString('ru-RU')})
            </span>
          )}
        </span>
      </div>

      {/* ── Center: Numbered Page Navigation ── */}
      <div className="flex items-center gap-1 order-1 lg:order-2 flex-wrap justify-center">
        {/* First Page */}
        <button
          type="button"
          onClick={() => navigateToPage(1)}
          disabled={currentPage <= 1}
          aria-label="В начало"
          title="В начало (Первая страница)"
          className="p-1.5 rounded-lg border border-border/60 bg-background hover:bg-muted text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer active:scale-95"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => navigateToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Предыдущая страница"
          title="Предыдущая страница"
          className="p-1.5 rounded-lg border border-border/60 bg-background hover:bg-muted text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer active:scale-95"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((pageItem, idx) => {
            if (pageItem === '...') {
              return (
                <span
                  key={`dots-${idx}`}
                  className="px-2 py-1 text-muted-foreground font-mono text-xs select-none"
                >
                  ...
                </span>
              );
            }

            const pageNum = Number(pageItem);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => navigateToPage(pageNum)}
                className={`min-w-[32px] h-8 px-2 rounded-lg font-mono text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/40'
                    : 'border border-border/60 bg-background hover:bg-muted text-foreground'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => navigateToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Следующая страница"
          title="Следующая страница"
          className="p-1.5 rounded-lg border border-border/60 bg-background hover:bg-muted text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer active:scale-95"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => navigateToPage(totalPages)}
          disabled={currentPage >= totalPages}
          aria-label="В конец"
          title="В конец (Последняя страница)"
          className="p-1.5 rounded-lg border border-border/60 bg-background hover:bg-muted text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer active:scale-95"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Right side: PageSize Selector & Jump Input ── */}
      <div className="flex items-center gap-3 order-3 flex-wrap justify-center">
        {/* Jump-to-Page Input */}
        <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Стр.</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            placeholder={String(currentPage)}
            className="w-12 h-8 px-1.5 text-center font-mono text-xs rounded-lg border border-border/80 bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-hidden"
          />
          <button
            type="submit"
            disabled={!jumpPage || parseInt(jumpPage, 10) < 1 || parseInt(jumpPage, 10) > totalPages}
            aria-label="Перейти к странице"
            className="h-8 px-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </form>

        <div className="h-4 w-px bg-border/60 hidden sm:block" />

        {/* Page Size Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">По:</span>
          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/60">
            {[20, 50, 100, 200].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handlePageSizeChange(size)}
                className={`px-2 py-1 rounded-md font-mono text-[11px] font-bold transition-all cursor-pointer ${
                  pageSize === size
                    ? 'bg-background text-primary shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
