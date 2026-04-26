import { accountingService } from '@/services/financial/accounting.service';
import { escrowService } from '@/services/admin/escrow.service';
import { getLedgerAction } from '@/actions/admin/finance/ledger';
import { updateSystemSettings } from '@/actions/finance/settings';
import { approveQuarantineAction, rejectQuarantineAction } from '@/actions/admin/users';
import { SubmitButton } from '@/components/admin/submit-button';
import { AdminPageHeader } from '@/components/admin/page-header';
import { FinanceClient } from './finance-client';
import { Wallet, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ period?: string }>;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(n / 100);

export default async function FinanceDashboard({ searchParams }: Props) {
  const params = await searchParams;
  const period = (params.period as 'today' | 'week' | 'month' | 'all') ?? 'month';

  // Period date range for accounting
  const now = new Date();
  let periodStart: Date | undefined;
  if (period === 'today') { periodStart = new Date(now.setHours(0,0,0,0)); }
  else if (period === 'week') { periodStart = new Date(Date.now() - 7*86400000); }
  else if (period === 'month') { periodStart = new Date(Date.now() - 30*86400000); }

  const [metrics, settings, quarantineList, initialLedger] = await Promise.all([
    accountingService.getMetrics(periodStart, periodStart ? new Date() : undefined),
    accountingService.getSettings(),
    escrowService.getQuarantineEntries(),
    getLedgerAction({ period, pageSize: 50 }),
  ]);

  const KPI = [
    {
      label: 'Выручка (Gross)',
      value: fmt(metrics.revenueGross),
      sub: 'Все поступления',
      icon: DollarSign,
      accent: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Возвраты',
      value: `-${fmt(metrics.refunds)}`,
      sub: 'Возвращено на балансы',
      icon: TrendingDown,
      accent: 'text-rose-500',
      bg: 'bg-rose-50',
    },
    {
      label: 'Себестоимость (COGS)',
      value: `-${fmt(metrics.cogs)}`,
      sub: 'Расходы провайдерам',
      icon: TrendingDown,
      accent: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Валовая маржа',
      value: fmt(metrics.marginGross),
      sub: `${metrics.marginPercentage.toFixed(1)}% от выручки`,
      icon: TrendingUp,
      accent: metrics.marginGross >= 0 ? 'text-foreground' : 'text-rose-600',
      bg: 'bg-card',
      dark: true,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        icon={Wallet}
        title="Финансовый учёт"
        description="Метрики, история транзакций и управление балансами клиентов."
      />

      {/* ── Escrow Quarantine alert ── */}
      {quarantineList.length > 0 && (
        <div className="border-2 border-amber-300 bg-amber-50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-amber-200 bg-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <span className="font-semibold text-amber-900 text-sm">
                {quarantineList.length} транзакций в карантине Escrow
              </span>
              <p className="text-xs text-amber-700 mt-0.5">
                Превышен дневной лимит сотрудника. Требуется одобрение Owner/Admin.
              </p>
            </div>
          </div>
          <div className="divide-y divide-amber-200">
            {quarantineList.map(entry => (
              <div key={entry.id} className="px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm tabular-nums">
                      {fmt(entry.amount)}
                    </span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">
                      {entry.userEmail}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">{entry.reason}</p>
                  <p className="text-[10px] text-muted-foreground/70">
                    {entry.adminId} · {entry.createdAt.toLocaleString('ru-RU')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={rejectQuarantineAction}>
                    <input type="hidden" name="entryId" value={entry.id} />
                    <SubmitButton
                      size="sm"
                      variant="outline"
                      className="text-rose-600 border-rose-300 hover:bg-rose-50 text-xs"
                      confirmMessage="Отклонить? Средства НЕ будут зачислены."
                    >
                      ✕ Отклонить
                    </SubmitButton>
                  </form>
                  <form action={approveQuarantineAction}>
                    <input type="hidden" name="entryId" value={entry.id} />
                    <SubmitButton
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      confirmMessage="Зачислить средства клиенту?"
                    >
                      ✓ Одобрить
                    </SubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map(k => (
          <div
            key={k.label}
            className={`${k.bg} border border-border rounded-xl p-4 space-y-2 ${k.dark ? 'bg-card' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{k.label}</span>
              <k.icon className={`w-4 h-4 ${k.accent}`} />
            </div>
            <div className={`text-xl font-bold tabular-nums ${k.accent}`}>{k.value}</div>
            <div className="text-xs text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Profit breakdown + Settings ── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Net Profit */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Расчёт чистой прибыли</h3>
          {[
            { label: 'Валовая маржа',                 value: metrics.marginGross,   color: 'text-foreground' },
            { label: `Налоги (${settings.taxRate}%)`, value: -metrics.taxes,        color: 'text-rose-600' },
            { label: 'OPEX (ежемесячный)',             value: -metrics.opex,         color: 'text-rose-600' },
          ].map(r => (
            <div key={r.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{r.label}</span>
              <span className={`font-medium tabular-nums text-sm ${r.color}`}>{fmt(Math.abs(r.value))}</span>
            </div>
          ))}
          <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${metrics.profitNet >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
            <span className={`font-bold text-sm ${metrics.profitNet >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
              Чистая прибыль
            </span>
            <span className={`text-lg font-bold tabular-nums ${metrics.profitNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {fmt(metrics.profitNet)}
            </span>
          </div>
        </div>

        {/* Accounting settings */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Параметры учёта</h3>
          <form action={updateSystemSettings} className="space-y-4">
            <div>
              <label htmlFor="taxRate" className="text-xs text-muted-foreground mb-1 block">
                Ставка налога (%)
              </label>
              <input
                type="number"
                step="0.1"
                id="taxRate"
                name="taxRate"
                defaultValue={settings.taxRate}
                aria-label="Ставка налога в процентах"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary transition-all duration-200"
              />
            </div>
            <div>
              <label htmlFor="opexMonthly" className="text-xs text-muted-foreground mb-1 block">
                Ежемесячный OPEX (₽)
              </label>
              <input
                type="number"
                step="1"
                id="opexMonthly"
                name="opexMonthly"
                defaultValue={Math.floor(settings.opexMonthly / 100)}
                aria-label="Ежемесячные операционные расходы"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary transition-all duration-200"
              />
            </div>
            <SubmitButton className="w-full bg-primary text-primary-foreground hover:opacity-90 text-sm">
              Сохранить параметры
            </SubmitButton>
          </form>
        </div>
      </div>

      {/* ── Ledger + Balance Correction tabs ── */}
      <FinanceClient initialLedger={initialLedger} initialPeriod={period} />
    </div>
  );
}
