import { accountingService } from '@/services/financial/accounting.service';
import { escrowService } from '@/services/admin/escrow.service';
import { getLedgerAction } from '@/actions/admin/finance/ledger';
import { AdminPageHeader } from '@/components/admin/page-header';
import { FinanceClient } from './finance-client';
import { QuarantineList } from './quarantine-list';
import { FinanceSettingsForm } from './finance-settings-form';
import { Wallet, TrendingUp, TrendingDown, DollarSign, PieChart, Calculator, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ period?: string }>;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(n / 100);

export default async function FinanceDashboard({ searchParams }: Props) {
  const params = await searchParams;
  const period = (params.period as 'today' | 'week' | 'month' | 'all') ?? 'month';

  const now = new Date();
  let periodStart: Date | undefined;
  if (period === 'today') { periodStart = new Date(now.setHours(0,0,0,0)); }
  else if (period === 'week') { periodStart = new Date(Date.now() - 7*86400000); }
  else if (period === 'month') { periodStart = new Date(Date.now() - 30*86400000); }

  const [metrics, settings, quarantineList, ledgerResult] = await Promise.all([
    accountingService.getMetrics(periodStart, periodStart ? new Date() : undefined),
    accountingService.getSettings(),
    escrowService.getQuarantineEntries(),
    getLedgerAction({ period, pageSize: 50 }),
  ]);

  if ('error' in ledgerResult) {
    return (
      <div className="p-10 text-center bg-background rounded-3xl border border-border">
        <div className="inline-flex p-4 bg-destructive/20 text-destructive rounded-2xl mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-foreground">Ошибка загрузки данных</h1>
        <p className="text-muted-foreground mt-2 font-medium">{ledgerResult.error}</p>
      </div>
    );
  }

  const initialLedger = ledgerResult;

  const KPI = [
    {
      label: 'Выручка (Gross)',
      value: fmt(metrics.revenueGross),
      sub: 'Все поступления',
      icon: DollarSign,
      color: 'bg-emerald-500',
      textColor: 'text-success',
    },
    {
      label: 'Возвраты',
      value: `-${fmt(metrics.refunds)}`,
      sub: 'Отмены и частичные',
      icon: TrendingDown,
      color: 'bg-rose-500',
      textColor: 'text-destructive',
    },
    {
      label: 'Закупка (COGS)',
      value: `-${fmt(metrics.cogs)}`,
      sub: 'Расход провайдерам',
      icon: TrendingDown,
      color: 'bg-amber-500',
      textColor: 'text-warning',
    },
    {
      label: 'Валовая маржа',
      value: fmt(metrics.marginGross),
      sub: `${metrics.marginPercentage.toFixed(1)}% эффективность`,
      icon: TrendingUp,
      color: 'bg-primary',
      textColor: 'text-primary',
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      <AdminPageHeader
        icon={Wallet}
        title="Финансовый учёт"
        description="Метрики эффективности, балансы и история транзакций"
      />

      <QuarantineList entries={quarantineList as any} />

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPI.map(k => (
          <div key={k.label} className="rounded-2xl border border-border/50/50 shadow-sm bg-background/60 backdrop-blur-xl overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl ${k.color} text-white shadow-lg`}>
                  <k.icon className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{k.label}</p>
                  <p className={`text-xl font-black tabular-nums mt-1 ${k.textColor}`}>{k.value}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-tighter">{k.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Breakdown & Settings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border/50/50 shadow-sm bg-background/60 backdrop-blur-xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-primary/20 text-primary rounded-lg">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Расчёт чистой прибыли</h3>
            </div>

            <div className="space-y-6">
              {[
                { label: 'Комиссии шлюзов',               value: -metrics.gatewayFees,  color: 'text-destructive',  desc: 'ЮKassa (3.5%) и CryptoBot (1%)' },
                { label: 'Валовая маржа',                 value: metrics.marginGross,   color: 'text-foreground', desc: 'После вычета COGS, возвратов и комиссий' },
                { label: `Налоги (${settings.taxRate}%)`, value: -metrics.taxes,        color: 'text-destructive',  desc: 'Оценочный налог на прибыль' },
                { label: 'OPEX (Постоянные расходы)',     value: -metrics.opex,         color: 'text-destructive',  desc: 'Хостинг, софт, персонал' },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-start group">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-foreground block">{r.label}</span>
                    <span className="text-[11px] text-muted-foreground font-medium">{r.desc}</span>
                  </div>
                  <span className={`font-black tabular-nums text-sm ${r.color}`}>{fmt(Math.abs(r.value))}</span>
                </div>
              ))}

              <div className={`mt-8 p-6 rounded-3xl flex justify-between items-center transition-all ${metrics.profitNet >= 0 ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-rose-500 text-white shadow-rose-200'} shadow-2xl`}>
                <div className="space-y-0.5">
                  <span className="text-xs font-black uppercase tracking-widest opacity-80">Чистая прибыль (EBITDA)</span>
                  <p className="text-[10px] font-bold opacity-60">За выбранный период: {period}</p>
                </div>
                <div className="text-3xl font-black tabular-nums">
                  {fmt(metrics.profitNet)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <FinanceSettingsForm 
            initialTaxRate={settings.taxRate} 
            initialOpex={settings.opexMonthly} 
          />
        </div>
      </div>

      {/* ── Tabs: Ledger & Topup ── */}
      <FinanceClient initialLedger={initialLedger} initialPeriod={period} />
    </div>
  );
}
