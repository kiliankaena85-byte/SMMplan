import { TrendingDown, Wallet, Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { GlobalLiquiditySummary } from '@/services/admin/provider-balance.service';

interface LiquidityDashboardProps {
  data: GlobalLiquiditySummary;
}

export function LiquidityDashboard({ data }: LiquidityDashboardProps) {
  const runwayText =
    data.runwayDays === null
      ? '∞'
      : data.runwayDays > 30
      ? `${data.runwayDays} дн.`
      : data.runwayDays > 7
      ? `${data.runwayDays} дн.`
      : `⚠️ ${data.runwayDays} дн.`;

  const runwayColor =
    data.runwayDays === null
      ? 'text-foreground'
      : data.runwayDays > 14
      ? 'text-success'
      : data.runwayDays > 3
      ? 'text-warning'
      : 'text-destructive animate-pulse';

  const stats = [
    {
      label: 'Общий баланс',
      value: `$${data.totalUsd.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}`,
      sub: `${data.totalRub.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`,
      icon: <Wallet className="w-4 h-4" />,
      color: 'text-primary',
      bg: 'bg-primary/5 border-primary/20',
    },
    {
      label: 'Расход за 24ч',
      value: `${data.burnRate24hRub.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`,
      sub: 'по закрытым заказам',
      icon: <TrendingDown className="w-4 h-4" />,
      color: 'text-foreground',
      bg: 'bg-muted/50 border-border/50',
    },
    {
      label: 'Запас хода',
      value: runwayText,
      sub: 'при текущем расходе',
      icon: <Clock className="w-4 h-4" />,
      color: runwayColor,
      bg: 'bg-muted/50 border-border/50',
    },
  ];

  const statusCounts = [
    { label: 'Норма', count: data.healthyCount, icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-success bg-success/10 border-success/20' },
    { label: 'Внимание', count: data.warningCount, icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-warning bg-warning/10 border-warning/20' },
    { label: 'Критично', count: data.criticalCount, icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-destructive bg-destructive/10 border-destructive/20' },
    { label: 'Недоступен', count: data.errorCount, icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-muted-foreground bg-muted border-border' },
  ];

  const ageSeconds = Math.max(0, Math.floor((Date.now() - data.cachedAt) / 1000));

  return (
    <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-[24px] shadow-sm ring-1 ring-border/5 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground tracking-tight">Глобальная Ликвидность</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {data.activeCount} активных провайдеров · кэш {ageSeconds}с назад
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-[12px] px-4 py-3 border ${stat.bg} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm`}>
            <div className={`flex items-center gap-1.5 mb-1 ${stat.color}`}>
              {stat.icon}
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{stat.label}</span>
            </div>
            <div className={`text-xl font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
        {statusCounts.map((s) => (
          <div key={s.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${s.color}`}>
            {s.icon}
            {s.count} {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}