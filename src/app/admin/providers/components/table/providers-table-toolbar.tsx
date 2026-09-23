'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Sparkles } from 'lucide-react';

export type ProviderStatusFilter = 'all' | 'active' | 'error' | 'disabled';

export interface ProvidersTableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: ProviderStatusFilter;
  onStatusFilterChange: (filter: ProviderStatusFilter) => void;
  counts: {
    all: number;
    active: number;
    error: number;
    disabled: number;
  };
  onCreateMockPreset: () => void;
  isPresetPending: boolean;
}

export function ProvidersTableToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  counts,
  onCreateMockPreset,
  isPresetPending,
}: ProvidersTableToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/40 p-2.5 rounded-lg border border-border/70 backdrop-blur-xs shadow-xs w-full max-w-full overflow-hidden">
      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full max-w-full flex-nowrap">
        <button
          type="button"
          onClick={() => onStatusFilterChange('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
            statusFilter === 'all'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          Все
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/20 tabular-nums">
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange('active')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
            statusFilter === 'active'
              ? 'bg-success text-success-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Активные
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/20 tabular-nums">
            {counts.active}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange('error')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
            statusFilter === 'error'
              ? 'bg-destructive text-destructive-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          Сбои API
          {counts.error > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-destructive-foreground/20 text-destructive-foreground font-bold tabular-nums">
              {counts.error}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange('disabled')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
            statusFilter === 'disabled'
              ? 'bg-muted text-foreground border border-border/70 shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          Выключены
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/20 tabular-nums">
            {counts.disabled}
          </span>
        </button>
      </div>

      {/* Right side: Mock Sandbox + Search */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onCreateMockPreset}
          disabled={isPresetPending}
          intent="outline"
          size="sm"
          className="text-xs font-bold shrink-0 hidden md:inline-flex"
          title="Развернуть тестовый mock-провайдер со статическими услугами"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary mr-1.5" />
          {isPresetPending ? 'Развёртывание...' : 'Mock Sandbox'}
        </Button>

        <div className="relative flex-1 sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Поиск по названию или URL..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 pr-8 h-8.5 text-xs bg-background/80"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
              aria-label="Очистить поиск"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
