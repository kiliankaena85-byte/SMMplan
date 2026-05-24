'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

interface OrderFiltersProps {
  initialSearch: string;
  initialStatus: string;
  initialNetwork: string;
  availableNetworks: { slug: string; name: string }[];
  currentPage: number;
  totalPages: number;
}

export function OrderFilters({
  initialSearch,
  initialStatus,
  initialNetwork,
  availableNetworks,
  currentPage,
  totalPages,
}: OrderFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(initialSearch);

  const handleApplyFilters = (updates: { search?: string; status?: string; network?: string; page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());

    // Merge search
    if (updates.search !== undefined) {
      if (updates.search.trim()) params.set('search', updates.search.trim());
      else params.delete('search');
    }

    // Merge status
    if (updates.status !== undefined) {
      if (updates.status && updates.status !== 'ALL') params.set('status', updates.status);
      else params.delete('status');
    }

    // Merge network
    if (updates.network !== undefined) {
      if (updates.network && updates.network !== 'ALL') params.set('network', updates.network);
      else params.delete('network');
    }

    // Merge page
    if (updates.page !== undefined) {
      params.set('page', updates.page.toString());
    } else {
      params.set('page', '1'); // reset to page 1 on filter updates
    }

    router.push(`/dashboard/orders?${params.toString()}`);
  };

  const handleReset = () => {
    setSearch('');
    router.push('/dashboard/orders');
  };

  return (
    <div className="space-y-4">
      {/* ── FILTER INPUTS PANEL ── */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleApplyFilters({ search });
        }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card border border-border/60 rounded-2xl p-4 shadow-sm select-none"
      >
        <div className="flex flex-wrap items-center gap-3 flex-1">
          
          {/* Smart Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по ID или названию тарифа..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-muted border border-border/60 rounded-xl text-xs font-medium placeholder:text-muted-foreground outline-none focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          {/* Social Network filter */}
          <select
            value={initialNetwork || 'ALL'}
            onChange={(e) => handleApplyFilters({ network: e.target.value })}
            className="h-10 bg-content2 border border-border/60 rounded-xl px-3 py-1 text-xs font-semibold text-foreground outline-none focus:border-primary cursor-pointer select-none"
            aria-label="Фильтр по соцсети"
          >
            <option value="ALL">Все соцсети</option>
            {availableNetworks.map((net) => (
              <option key={net.slug} value={net.slug}>
                {net.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={initialStatus || 'ALL'}
            onChange={(e) => handleApplyFilters({ status: e.target.value })}
            className="h-10 bg-content2 border border-border/60 rounded-xl px-3 py-1 text-xs font-semibold text-foreground outline-none focus:border-primary cursor-pointer select-none"
            aria-label="Фильтр по статусу заказа"
          >
            <option value="ALL">Все статусы</option>
            <option value="PENDING">Ожидание</option>
            <option value="IN_PROGRESS">В работе</option>
            <option value="COMPLETED">Выполнен</option>
            <option value="AWAITING_PAYMENT">Ожидает оплаты</option>
            <option value="CANCELED">Отменен</option>
            <option value="ERROR">Ошибка</option>
            <option value="PARTIAL">Частично</option>
          </select>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2">
          <button
            type="submit"
            className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm active:scale-95"
          >
            Применить
          </button>
          
          {(initialSearch || initialStatus || initialNetwork) && (
            <button
              type="button"
              onClick={handleReset}
              className="h-10 w-10 flex items-center justify-center bg-content2 border border-border/60 hover:bg-content3 text-muted-foreground hover:text-foreground rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
              title="Сбросить все фильтры"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* ── PAGINATION CONTROLS ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 select-none">
          <p className="text-xs text-muted-foreground">
            Страница <span className="font-semibold text-foreground">{currentPage}</span> из <span className="font-semibold text-foreground">{totalPages}</span>
          </p>

          <div className="flex gap-1.5">
            <button
              onClick={() => handleApplyFilters({ page: currentPage - 1 })}
              disabled={currentPage <= 1}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-content1 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              title="Предыдущая страница"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const p = idx + 1;
              // Show window around current page to prevent massive numbers
              if (totalPages > 6 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
                if (p === 2 || p === totalPages - 1) {
                  return <span key={`dots-${p}`} className="h-8 w-8 flex items-center justify-center text-xs text-muted-foreground font-bold select-none">...</span>;
                }
                return null;
              }

              return (
                <button
                  key={`page-${p}`}
                  onClick={() => handleApplyFilters({ page: p })}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                    currentPage === p
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'border border-border bg-content1 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => handleApplyFilters({ page: currentPage + 1 })}
              disabled={currentPage >= totalPages}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-content1 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              title="Следующая страница"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
