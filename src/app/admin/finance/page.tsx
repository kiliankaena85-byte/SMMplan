import { accountingService } from '@/services/financial/accounting.service';
import { escrowService } from '@/services/admin/escrow.service';
import { getLedgerAction } from '@/actions/admin/finance/ledger';
import { getPaymentsAction } from '@/actions/admin/finance/payments';
import { getReconciliationSummaryAction } from '@/actions/admin/finance/reconciliation';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { FINANCE_TABS, ONBOARDING_CONFIGS } from '@/components/admin/navigation-data';
import { FinanceClient } from './finance-client';
import { QuarantineList } from './quarantine-list';
import { FinanceSettingsForm } from './finance-settings-form';
import { VatThresholdWidget } from './vat-threshold-widget';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Wallet, TrendingUp, TrendingDown, DollarSign, PieChart, Calculator, AlertTriangle } from 'lucide-react';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { resolveAdminTenantContext } from '@/utils/admin-tenant';
import { TenantSelector } from '@/components/admin/tenant-selector';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ period?: string; tenant?: string }>;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(n / 100);

export default async function FinanceDashboard({ searchParams }: Props) {
  const session = await verifySession();
  const user = session ? await db.user.findUnique({ 
    where: { id: session.userId },
    include: { staffRole: { include: { permissions: true } } }
  }) : null;

  const isOwner = user?.role === 'OWNER';
  const isSupport = user?.role === 'SUPPORT';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const canSeeFinances = isOwner || !isSupport;

  const params = await searchParams;
  const period = (params.period as 'today' | 'week' | 'month' | 'all') ?? 'month';
  const selectedTenant = params.tenant;
  const activeTenantId = resolveAdminTenantContext(user, selectedTenant);

  const now = new Date();
  let periodStart: Date | undefined;
  if (period === 'today') { periodStart = new Date(now.setHours(0,0,0,0)); }
  else if (period === 'week') { periodStart = new Date(Date.now() - 7*86400000); }
  else if (period === 'month') { periodStart = new Date(Date.now() - 30*86400000); }

  const [metrics, settings, quarantineList, ledgerResult, paymentsResult, reconciliationSummaryResult, tenants] = await Promise.all([
    accountingService.getMetrics(periodStart, periodStart ? new Date() : undefined, activeTenantId),
    accountingService.getSettings(activeTenantId),
    escrowService.getQuarantineEntries(),
    getLedgerAction({ period, pageSize: 50, tenantId: activeTenantId }),
    getPaymentsAction({ period, pageSize: 50, tenantId: activeTenantId }),
    getReconciliationSummaryAction(activeTenantId),
    db.tenant.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true } }),
  ]);

  const showTenantSelector = isOwner || user?.role === 'ADMIN' || user?.tenantId === 'all';

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

  if ('error' in paymentsResult) {
    return (
      <div className="p-10 text-center bg-background rounded-3xl border border-border">
        <div className="inline-flex p-4 bg-destructive/20 text-destructive rounded-2xl mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-foreground">Ошибка загрузки данных</h1>
        <p className="text-muted-foreground mt-2 font-medium">{paymentsResult.error}</p>
      </div>
    );
  }

  const initialLedger = ledgerResult;
  const initialPayments = paymentsResult;

  const KPI = [
    {
      label: 'Выручка (Gross)',
      value: fmt(metrics.revenueGross),
      sub: 'Все поступления',
      icon: DollarSign,
      color: 'bg-success',
      textColor: 'text-success',
    },
    {
      label: 'Возвраты',
      value: metrics.refunds > 0 ? `-${fmt(metrics.refunds)}` : fmt(0),
      sub: 'Отмены и частичные',
      icon: TrendingDown,
      color: 'bg-destructive',
      textColor: 'text-destructive',
    },
    {
      label: 'Закупка (COGS)',
      value: metrics.cogs > 0 ? `-${fmt(metrics.cogs)}` : fmt(0),
      sub: 'Расход провайдерам',
      icon: TrendingDown,
      color: 'bg-warning',
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
      <AdminTabbedHeader
        icon={Wallet}
        title="Финансовый учёт"
        description="Метрики эффективности, балансы и история транзакций"
        action={showTenantSelector ? (
          <TenantSelector tenants={tenants} activeFilter={selectedTenant || 'all'} />
        ) : undefined}
        tabs={FINANCE_TABS}
        onboardingKey="finance"
        onboarding={ONBOARDING_CONFIGS.finance}
      />

      <QuarantineList entries={quarantineList} />

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPI.map(k => (
          <div key={k.label} className="rounded-[24px] border border-border/50 shadow-sm bg-card/60 backdrop-blur-md overflow-hidden ring-1 ring-border/5">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl ${k.color} text-primary-foreground shadow-lg`}>
                  <k.icon className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{k.label}</p>
                  <p className={`text-xl font-black tabular-nums mt-1 ${k.textColor}`}>{k.value}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-tighter">{k.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Breakdown & Settings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-[24px] border border-border/50 shadow-sm bg-card/60 backdrop-blur-md overflow-hidden ring-1 ring-border/5">
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
                { label: `Налоги (${metrics.effectiveTaxRate.toFixed(1)}%)`, value: -metrics.taxes,        color: 'text-destructive',  desc: 'Оценочный налог на прибыль' },
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

              <div className={`mt-8 p-6 rounded-3xl flex justify-between items-center transition-all ${metrics.profitNet >= 0 ? 'bg-success text-primary-foreground shadow-success/20' : 'bg-destructive text-primary-foreground shadow-destructive/20'} shadow-2xl`}>
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

        <div className="lg:col-span-1 space-y-6">
          <FinanceSettingsForm 
            initialTaxRate={settings.taxRate} 
            initialOpex={settings.opexMonthly} 
          />
          <VatThresholdWidget
            annualRevenue={metrics.annualRevenue}
            effectiveTaxRate={metrics.effectiveTaxRate}
            isVatThresholdExceeded={metrics.isVatThresholdExceeded}
          />
        </div>
      </div>

      {/* ── Tabs: Ledger, Payments, Reconciliation & Topup ── */}
      <FinanceClient 
        initialLedger={initialLedger} 
        initialPayments={initialPayments} 
        initialPeriod={period} 
        tenantId={activeTenantId} 
        initialReconciliationSummary={'error' in reconciliationSummaryResult ? undefined : reconciliationSummaryResult}
      />
    </div>
  );
}
