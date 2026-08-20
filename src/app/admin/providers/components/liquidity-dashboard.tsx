import { TrendingDown, Wallet, Clock, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import type { GlobalLiquiditySummary } from '@/services/admin/provider-balance.service';

interface LiquidityDashboardProps {
  data: GlobalLiquiditySummary;
}

export function LiquidityDashboard({ data }: LiquidityDashboardProps) {
  const runwayText =
    data.runwayDays === null
      ? '\u221e'
      : data.runwayDays > 30
      ? `${data.runwayDays} \u0434\u043d.`
      : data.runwayDays > 7
      ? `${data.runwayDays} \u0434\u043d.`
      : `\u26a0\ufe0f ${data.runwayDays} \u0434\u043d.`;

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
      label: '\u041e\u0431\u0449\u0438\u0439 \u0431\u0430\u043b\u0430\u043d\u0441',
      value: `$${data.totalUsd.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}`,
      sub: `${data.totalRub.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} \u20bd`,
      icon: <Wallet className="w-4 h-4" />,
      color: 'text-primary',
      bg: 'bg-primary/5 border-primary/20',
    },
    {
      label: '\u0420\u0430\u0441\u0445\u043e\u0434 \u0437\u0430 24\u0447',
      value: `${data.burnRate24hRub.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} \u20bd`,
      sub: '\u043f\u043e \u0437\u0430\u043a\u0440\u044b\u0442\u044b\u043c \u0437\u0430\u043a\u0430\u0437\u0430\u043c',
      icon: <TrendingDown className="w-4 h-4" />,
      color: 'text-foreground',
      bg: 'bg-muted/50 border-border/50',
    },
    {
      label: '\u0417\u0430\u043f\u0430\u0441 \u0445\u043e\u0434\u0430',
      value: runwayText,
      sub: '\u043f\u0440\u0438 \u0442\u0435\u043a\u0443\u0449\u0435\u043c \u0440\u0430\u0441\u0445\u043e\u0434\u0435',
      icon: <Clock className="w-4 h-4" />,
      color: runwayColor,
      bg: 'bg-muted/50 border-border/50',
    },
  ];

  const statusCounts = [
    { label: '\u041d\u043e\u0440\u043c\u0430', count: data.healthyCount, icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-success bg-success/10 border-success/20' },
    { label: '\u0412\u043d\u0438\u043c\u0430\u043d\u0438\u0435', count: data.warningCount, icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-warning bg-warning/10 border-warning/20' },
    { label: '\u041a\u0440\u0438\u0442\u0438\u0447\u043d\u043e', count: data.criticalCount, icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-destructive bg-destructive/10 border-destructive/20' },
    { label: '\u041d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d', count: data.errorCount, icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-muted-foreground bg-muted border-border' },
  ];

  const ageSeconds = Math.max(0, Math.floor((Date.now() - data.cachedAt) / 1000));

  return (
    <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-[24px] shadow-sm ring-1 ring-border/5 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground tracking-tight">\u0413\u043b\u043e\u0431\u0430\u043b\u044c\u043d\u0430\u044f \u041b\u0438\u043a\u0432\u0438\u0434\u043d\u043e\u0441\u0442\u044c</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {data.activeCount} \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0445 \u043f\u0440\u043e\u0432\u0430\u0439\u0434\u0435\u0440\u043e\u0432 \u00b7 \u043a\u044d\u0448 {ageSeconds}\u0441 \u043d\u0430\u0437\u0430\u0434
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