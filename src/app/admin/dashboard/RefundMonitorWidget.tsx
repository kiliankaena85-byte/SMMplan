import React from 'react';
import Link from 'next/link';
import { AlertOctagon, ArrowRight, ShieldAlert, RotateCcw } from 'lucide-react';
import { formatKopecks } from '@/utils/format-kopecks';

interface FailingService {
  name: string;
  network: string;
  count: number;
}

interface RefundStats {
  totalOrders: number;
  canceledOrders: number;
  partialOrders: number;
  errorOrders: number;
  problematicCount: number;
  failureRate: string;
  totalRefundsKopecks: bigint;
  topFailingServices: FailingService[];
}

interface Props {
  stats: RefundStats;
}

export function RefundMonitorWidget({ stats }: Props) {
  const isHealthy = Number(stats.failureRate) < 5;

  return (
    <div className="bg-card text-card-foreground rounded-lg p-5 border border-border/70 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${
            isHealthy
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}>
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
              ⚠️ Монитор возвратов и отказов провайдеров
            </h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Контроль качества поставщиков, отмен заказов и частичных возвратов на баланс
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
              isHealthy
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
            }`}
          >
            {stats.failureRate}% сбоев / отмен
          </span>
          <Link
            href="/admin/orders?status=PROBLEMATIC"
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>Проблемные заказы</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Grid: 3 KPI mini blocks + Top Failing Services */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left 5 cols: 3 summary counters */}
        <div className="md:col-span-5 grid grid-cols-3 gap-2 text-xs">
          <div className="p-3 rounded-md bg-muted/20 border border-border/50 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground font-bold uppercase">Отменено</span>
            <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400 text-lg mt-1 tabular-nums">
              {stats.canceledOrders}
            </span>
            <span className="text-[9px] text-muted-foreground">заказов</span>
          </div>

          <div className="p-3 rounded-md bg-muted/20 border border-border/50 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground font-bold uppercase">Частично</span>
            <span className="font-mono font-extrabold text-orange-600 dark:text-orange-400 text-lg mt-1 tabular-nums">
              {stats.partialOrders}
            </span>
            <span className="text-[9px] text-muted-foreground">с остатком</span>
          </div>

          <div className="p-3 rounded-md bg-muted/20 border border-border/50 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground font-bold uppercase">Возвращено</span>
            <span className="font-mono font-extrabold text-foreground text-sm mt-1 tabular-nums">
              {formatKopecks(stats.totalRefundsKopecks)}
            </span>
            <span className="text-[9px] text-muted-foreground">на балансы</span>
          </div>
        </div>

        {/* Right 7 cols: Top failing service chips */}
        <div className="md:col-span-7">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Сервисы с наибольшим числом сбоев:
          </div>
          {stats.topFailingServices.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2 flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> Сбоев и отмен по услугам не зафиксировано
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {stats.topFailingServices.map((fs, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-md bg-muted/30 border border-border/40 flex items-center justify-between text-xs"
                >
                  <div className="truncate pr-2">
                    <span className="font-medium text-foreground truncate block" title={fs.name}>
                      {fs.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">
                      {fs.network}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded text-[10px] shrink-0 border border-rose-500/20">
                    {fs.count} шт
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
