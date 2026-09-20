'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal, Sparkles } from 'lucide-react';

export interface ProvidersTableEmptyProps {
  totalProviders: number;
  isPresetPending: boolean;
  onCreateMockPreset: () => void;
  onResetFilters: () => void;
}

export function ProvidersTableEmpty({
  totalProviders,
  isPresetPending,
  onCreateMockPreset,
  onResetFilters,
}: ProvidersTableEmptyProps) {
  return (
    <div className="py-16 px-6 text-center space-y-4 max-w-md mx-auto">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
        <SlidersHorizontal className="w-6 h-6 shrink-0" />
      </div>
      <div>
        <h3 className="font-bold text-foreground text-sm">
          {totalProviders === 0 ? 'Нет подключённых провайдеров' : 'Провайдеры не найдены по фильтру'}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {totalProviders === 0
            ? 'Подключите свой первый SMM-шлюз или используйте пресет.'
            : 'Попробуйте сбросить фильтры или строку поиска.'}
        </p>
      </div>
      {totalProviders === 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Button onClick={onCreateMockPreset} disabled={isPresetPending} intent="outline" size="sm" className="text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-primary mr-1.5" />
            {isPresetPending ? 'Развёртывание...' : 'Развернуть Mock Sandbox'}
          </Button>
          <Link href="/admin/providers/new" className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-xs active:scale-95">
            + Добавить шлюз
          </Link>
        </div>
      ) : (
        <Button onClick={onResetFilters} intent="outline" size="sm" className="text-xs font-bold">
          Сбросить фильтры
        </Button>
      )}
    </div>
  );
}
