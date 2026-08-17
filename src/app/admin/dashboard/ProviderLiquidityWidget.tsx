'use client';

import { useState, useEffect, useCallback } from 'react';
import { getGlobalProviderLiquidityAction } from '@/actions/admin/providers/balance';
import { GlobalLiquiditySummary } from '@/services/admin/provider-balance.service';
import { Loader2, TrendingDown, TrendingUp, AlertTriangle, Activity, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function ProviderLiquidityWidget() {
  const [data, setData] = useState<GlobalLiquiditySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLiquidity = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else if (!data) {
      setIsLoading(true);
    }

    try {
      const res = await getGlobalProviderLiquidityAction(forceRefresh);
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setError(res.error || 'Не удалось загрузить данные');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Сетевая ошибка';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    fetchLiquidity(false);
  }, [fetchLiquidity]);

  if (isLoading) {
    return (
      <div className="bg-card text-card-foreground rounded-2xl p-6 lg:p-7 shadow-sm border border-border/60 transition-all hover:shadow-md animate-pulse flex flex-col justify-between h-[280px]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted-foreground text-sm font-semibold tracking-wide">Внешняя ликвидность</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-card text-card-foreground rounded-2xl p-6 lg:p-7 shadow-sm border border-destructive/30 transition-all hover:shadow-md h-[280px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted-foreground text-sm font-semibold tracking-wide">Внешняя ликвидность</span>
          <AlertTriangle className="w-4 h-4 text-destructive" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-destructive mb-3">{error || 'Ошибка загрузки данных'}</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchLiquidity(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-all duration-200 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Повторить
            </button>
            <Link href="/admin/providers" className="text-xs font-semibold text-primary hover:underline">
              Проверить провайдеров →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalStr = data.totalRub.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  const totalUsdStr = data.totalUsd.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const burnStr = data.burnRate24hRub.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  const isDanger = data.totalRub < 5000 || data.criticalCount > 0;
  const runwayDays = data.runwayDays;

  return (
    <div className="bg-card text-card-foreground rounded-2xl p-6 lg:p-7 shadow-sm border border-border/60 transition-all hover:shadow-md flex flex-col justify-between h-full min-h-[280px]">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm font-semibold tracking-wide">Внешняя ликвидность</span>
            <button
              type="button"
              onClick={() => fetchLiquidity(true)}
              disabled={isRefreshing}
              aria-label="Обновить показатели ликвидности"
              title="Обновить данные"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-200 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full border border-border/50 text-[11px] font-bold text-foreground">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Провайдеры ({data.activeCount})</span>
          </div>
        </div>

        <div className="flex items-baseline gap-2.5">
          <div className="text-3xl lg:text-4xl font-extrabold text-foreground tabular-nums tracking-tight font-mono">
            {totalStr} ₽
          </div>
          <span className="text-xs font-semibold text-muted-foreground tabular-nums font-mono">
            (~${totalUsdStr})
          </span>
          <div className="ml-auto">
            {isDanger ? (
              <div className="flex items-center gap-1 text-xs font-bold text-destructive bg-destructive/10 border border-destructive/30 px-2 py-0.5 rounded-md">
                <TrendingDown className="w-3 h-3" /> Внимание
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs font-bold text-success bg-success/10 border border-success/30 px-2 py-0.5 rounded-md">
                <TrendingUp className="w-3 h-3" /> В норме
              </div>
            )}
          </div>
        </div>

        {/* 3-Tier Status Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span
            title="Провайдеры с достаточным балансом (> $50)"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/10 text-success border border-success/30 select-none"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span className="tabular-nums font-mono font-bold">{data.healthyCount}</span> в норме
          </span>

          {data.warningCount > 0 && (
            <span
              title="Провайдеры с низким балансом ($10 — $50)"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/10 text-warning border border-warning/30 select-none"
            >
              <AlertTriangle className="w-3 h-3" />
              <span className="tabular-nums font-mono font-bold">{data.warningCount}</span> внимание
            </span>
          )}

          {data.criticalCount > 0 && (
            <span
              title="Критический остаток (< $10). Срочно требуется пополнение!"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-destructive/10 text-destructive border border-destructive/30 animate-pulse select-none"
            >
              <AlertCircle className="w-3 h-3" />
              <span className="tabular-nums font-mono font-bold">{data.criticalCount}</span> критично
            </span>
          )}

          {data.errorCount > 0 && (
            <span
              title="Сбои связи или неверные ключи API"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-destructive/10 text-destructive border border-destructive/30 select-none"
            >
              <AlertCircle className="w-3 h-3" />
              <span className="tabular-nums font-mono font-bold">{data.errorCount}</span> сбоев
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-medium bg-muted/30 p-2.5 rounded-lg border border-border/40 mb-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Activity className="w-3.5 h-3.5 text-warning" />
            <span>Расход за 24ч (Burn Rate):</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground tabular-nums font-mono">{burnStr} ₽</span>
            {runwayDays !== null && (
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                  runwayDays < 3
                    ? 'bg-destructive/10 text-destructive border border-destructive/30'
                    : runwayDays < 7
                    ? 'bg-warning/10 text-warning border border-warning/30'
                    : 'bg-success/10 text-success border border-success/30'
                }`}
              >
                ~{runwayDays} дн.
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto w-full">
        <Link href="/admin/providers" className="w-full block">
          <button
            type="button"
            className="w-full bg-primary text-primary-foreground font-semibold rounded-xl text-sm min-h-[44px] h-11 shadow-sm hover:bg-primary/90 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>Управление провайдерами ({data.activeCount})</span>
            {data.criticalCount + data.errorCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-xs font-extrabold bg-destructive text-destructive-foreground">
                {data.criticalCount + data.errorCount}
              </span>
            )}
          </button>
        </Link>
      </div>
    </div>
  );
}
