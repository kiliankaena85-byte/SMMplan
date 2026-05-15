'use client';

import { useState, useEffect } from 'react';
import { getGlobalProviderLiquidity } from '@/actions/admin/providers/crud';
import { Loader2, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export function ProviderLiquidityWidget() {
  const [data, setData] = useState<{ totalRub: number; activeCount: number; errorCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getGlobalProviderLiquidity()
      .then((res) => {
        if (!mounted) return;
        if (res.success) {
          setData({
            totalRub: res.totalRub!,
            activeCount: res.activeCount!,
            errorCount: res.errorCount!
          });
        } else {
          setError(res.error || 'Failed to load');
        }
      })
      .catch((e) => {
        if (mounted) setError(e.message || 'Network error');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
      
    return () => { mounted = false; };
  }, []);

  if (isLoading) {
    return (
      <div className="bg-card text-card-foreground rounded-2xl p-6 lg:p-7 shadow-sm border border-border/60 transition-all hover:shadow-md animate-pulse flex flex-col justify-between h-[230px]">
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
      <div className="bg-card text-card-foreground rounded-2xl p-6 lg:p-7 shadow-sm border border-rose-500/30 transition-all hover:shadow-md h-[230px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted-foreground text-sm font-semibold tracking-wide">Внешняя ликвидность</span>
          <AlertTriangle className="w-4 h-4 text-rose-500" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-destructive mb-2">{error || 'Ошибка загрузки'}</p>
          <Link href="/admin/providers" className="text-xs font-semibold text-sky-600 hover:underline">Проверить провайдеров →</Link>
        </div>
      </div>
    );
  }

  // Display formatting
  const totalStr = data.totalRub.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  const isDanger = data.totalRub < 5000; // Less than 5000 RUB is dangerous

  return (
    <div className="bg-card text-card-foreground rounded-2xl p-6 lg:p-7 shadow-sm border border-border/60 transition-all hover:shadow-md flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted-foreground text-sm font-semibold tracking-wide">Внешняя ликвидность</span>
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border/50 text-xs font-bold text-foreground">
            <span className="w-3 h-3 rounded-full overflow-hidden bg-sky-500 border border-sky-600"></span> 
            <span>Балансы провайдеров</span>
          </div>
        </div>
        
        <div className="flex items-end gap-3">
            <div className="text-4xl font-extrabold text-foreground tabular-nums tracking-tight">
            {totalStr} ₽
            </div>
            {isDanger ? (
                <div className="mb-1.5 flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md">
                    <TrendingDown className="w-3 h-3" /> Критично
                </div>
            ) : (
                <div className="mb-1.5 flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">
                    <TrendingUp className="w-3 h-3" /> Ок
                </div>
            )}
        </div>
        
        <div className="mt-2 text-xs font-medium text-muted-foreground mb-8">
          Доступные средства на аккаунтах {data.activeCount} поставщиков
          {data.errorCount > 0 && (
            <span className="text-destructive ml-1">({data.errorCount} с ошибкой)</span>
          )}
        </div>
        
        <div className="flex gap-3 mb-2 w-full mt-auto">
          <Link href="/admin/providers" className="flex-1">
            <button className="w-full bg-slate-900 text-white font-semibold rounded-xl text-sm h-11 shadow-sm hover:bg-slate-800 transition-colors">
              Провайдеры
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
