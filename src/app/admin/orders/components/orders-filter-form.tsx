'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, X, RotateCcw, Filter, Sparkles, SlidersHorizontal } from 'lucide-react';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface NetworkOption {
  id: string;
  name: string;
  slug: string;
  categories?: CategoryOption[];
}

interface ProviderOption {
  id: string;
  name: string;
}

const GLOBAL_ACTIVITY_TYPES = [
  { id: 'ALL', label: '👥 Все категории' },
  { id: 'subscribers', label: '👥 Подписчики' },
  { id: 'likes', label: '❤️ Лайки' },
  { id: 'views', label: '👁️ Просмотры' },
  { id: 'comments', label: '💬 Комментарии' },
  { id: 'reposts', label: '🔄 Репосты' },
  { id: 'polls', label: '🗳️ Опросы' },
  { id: 'watchtime', label: '⏳ Удержание' },
];

const DATE_PRESETS = [
  { id: 'ALL', label: '📅 Все время' },
  { id: 'today', label: '📅 Сегодня' },
  { id: 'yesterday', label: '📅 Вчера' },
  { id: '7d', label: '📅 7 дней' },
  { id: '30d', label: '📅 30 дней' },
  { id: 'this_month', label: '📅 Этот месяц' },
  { id: 'last_month', label: '📅 Прошлый месяц' },
];

const STATUS_OPTIONS = [
  { id: 'ALL', label: '⚙️ Все статусы' },
  { id: 'IN_PROGRESS', label: '⚡ В работе' },
  { id: 'PENDING', label: '⏳ В очереди' },
  { id: 'ERROR', label: '🔴 Ошибки' },
  { id: 'COMPLETED', label: '🟢 Выполнен' },
  { id: 'PARTIAL', label: '🟠 Частичный' },
  { id: 'CANCELED', label: '❌ Отменён' },
  { id: 'AWAITING_PAYMENT', label: '⚪ Ожидает' },
];

const ERROR_CATEGORIES = [
  { id: 'ALL', label: '⚠️ Любой сбой' },
  { id: 'BALANCE', label: '💳 Баланс провайдера' },
  { id: 'LINK', label: '🔗 Ошибка ссылки/приватность' },
  { id: 'SERVICE', label: '⚡ Сбой услуги провайдера' },
];

export function OrdersFilterForm({ 
  networks = [],
  providers = []
}: { 
  networks?: NetworkOption[];
  providers?: ProviderOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get('q') || '';
  const currentNetworkSlug = searchParams.get('networkSlug') || 'ALL';
  const currentActivityType = searchParams.get('activityType') || 'ALL';
  const currentDatePreset = searchParams.get('datePreset') || 'ALL';
  const currentStatus = searchParams.get('status') || 'ALL';
  const currentProviderId = searchParams.get('providerId') || 'ALL';
  const currentErrorCategory = searchParams.get('errorCategory') || 'ALL';

  const [searchVal, setSearchVal] = useState(currentQ);

  const selectedNetwork = networks.find(n => n.slug === currentNetworkSlug);
  const networkCategories = selectedNetwork?.categories || [];

  const hasActiveFilters = Boolean(
    currentQ ||
    (currentNetworkSlug && currentNetworkSlug !== 'ALL') ||
    (currentActivityType && currentActivityType !== 'ALL') ||
    (currentDatePreset && currentDatePreset !== 'ALL') ||
    (currentStatus && currentStatus !== 'ALL') ||
    (currentProviderId && currentProviderId !== 'ALL') ||
    (currentErrorCategory && currentErrorCategory !== 'ALL')
  );

  const applyFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'ALL') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // If network changes, reset activityType
    if (key === 'networkSlug') {
      params.delete('activityType');
    }
    params.delete('cursor');
    params.delete('page');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilter('q', searchVal.trim());
  };

  const handleResetAll = () => {
    setSearchVal('');
    startTransition(() => {
      router.push(pathname);
    });
  };

  const removeFilter = (key: string) => {
    if (key === 'q') setSearchVal('');
    applyFilter(key, 'ALL');
  };

  return (
    <div className="space-y-2">
      {/* ── ULTRA-COMPACT SINGLE-ROW TOOLBAR (Height ~38px, High-Density) ── */}
      <div className="flex items-center gap-1.5 flex-wrap lg:flex-nowrap bg-card/90 backdrop-blur-sm border border-border/80 rounded-xl p-1.5 shadow-xs">
        {/* 1. Omni-Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] max-w-[320px] relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Поиск: №, ссылка, email..."
            className="w-full h-8 pl-8 pr-7 text-xs font-medium bg-background border border-border/60 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {searchVal && (
            <button
              type="button"
              onClick={() => {
                setSearchVal('');
                removeFilter('q');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-sm"
              title="Очистить поиск"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </form>

        {/* 2. Social Network Selector */}
        <select
          value={currentNetworkSlug}
          onChange={(e) => applyFilter('networkSlug', e.target.value)}
          aria-label="Фильтр по соцсети"
          className="h-8 px-2 text-xs font-semibold bg-background border border-border/60 rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer shrink-0"
        >
          <option value="ALL">🌐 Все сети</option>
          {networks.map(n => (
            <option key={n.id} value={n.slug}>
              {n.name}
            </option>
          ))}
        </select>

        {/* 3. Category / Activity Type Selector */}
        <select
          value={currentActivityType}
          onChange={(e) => applyFilter('activityType', e.target.value)}
          aria-label="Тип услуги / Категория"
          className="h-8 px-2 text-xs font-semibold bg-background border border-border/60 rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer shrink-0 max-w-[140px] truncate"
        >
          {networkCategories.length > 0 ? (
            <>
              <option value="ALL">📂 Все категории</option>
              {networkCategories.map(c => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </>
          ) : (
            GLOBAL_ACTIVITY_TYPES.map(t => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))
          )}
        </select>

        {/* 4. Status Selector */}
        <select
          value={currentStatus}
          onChange={(e) => applyFilter('status', e.target.value)}
          aria-label="Статус заказа"
          className="h-8 px-2 text-xs font-semibold bg-background border border-border/60 rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer shrink-0"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        {/* 5. Provider Selector (Compact) */}
        {providers.length > 0 && (
          <select
            value={currentProviderId}
            onChange={(e) => applyFilter('providerId', e.target.value)}
            aria-label="Провайдер"
            className="h-8 px-2 text-xs font-semibold bg-background border border-border/60 rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer shrink-0 max-w-[130px] truncate"
          >
            <option value="ALL">🔌 Все поставщики</option>
            {providers.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {/* 6. Error Category Selector (Conditional or dropdown) */}
        <select
          value={currentErrorCategory}
          onChange={(e) => applyFilter('errorCategory', e.target.value)}
          aria-label="Причина сбоя"
          className="h-8 px-2 text-xs font-semibold bg-background border border-border/60 rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer shrink-0 max-w-[130px] truncate"
        >
          {ERROR_CATEGORIES.map(e => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>

        {/* 7. Date Preset Range Selector */}
        <select
          value={currentDatePreset}
          onChange={(e) => applyFilter('datePreset', e.target.value)}
          aria-label="Период дат"
          className="h-8 px-2 text-xs font-semibold bg-background border border-border/60 rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer shrink-0"
        >
          {DATE_PRESETS.map(d => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>

        {/* 8. Reset Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetAll}
            className="h-8 px-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
            title="Сбросить все фильтры"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Сброс</span>
          </button>
        )}
      </div>

      {/* ── ACTIVE FILTER CHIPS ── */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1">Активные фильтры:</span>

          {currentQ && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-mono text-[11px]">
              🔍 {currentQ}
              <button onClick={() => removeFilter('q')} className="hover:opacity-75 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {currentNetworkSlug && currentNetworkSlug !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium">
              🌐 {networks.find(n => n.slug === currentNetworkSlug)?.name || currentNetworkSlug}
              <button onClick={() => removeFilter('networkSlug')} className="hover:opacity-75 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {currentProviderId && currentProviderId !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 text-[11px] font-medium">
              🔌 {providers.find(p => p.id === currentProviderId)?.name || 'Поставщик'}
              <button onClick={() => removeFilter('providerId')} className="hover:opacity-75 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {currentErrorCategory && currentErrorCategory !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 text-[11px] font-medium">
              ⚠️ {ERROR_CATEGORIES.find(e => e.id === currentErrorCategory)?.label || 'Сбой'}
              <button onClick={() => removeFilter('errorCategory')} className="hover:opacity-75 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {currentActivityType && currentActivityType !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 text-[11px] font-medium">
              📁 {networkCategories.find(c => c.slug === currentActivityType)?.name || GLOBAL_ACTIVITY_TYPES.find(a => a.id === currentActivityType)?.label || currentActivityType}
              <button onClick={() => removeFilter('activityType')} className="hover:opacity-75 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {currentDatePreset && currentDatePreset !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
              {DATE_PRESETS.find(d => d.id === currentDatePreset)?.label || currentDatePreset}
              <button onClick={() => removeFilter('datePreset')} className="hover:opacity-75 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {currentStatus && currentStatus !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-medium">
              {STATUS_OPTIONS.find(s => s.id === currentStatus)?.label || currentStatus}
              <button onClick={() => removeFilter('status')} className="hover:opacity-75 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
