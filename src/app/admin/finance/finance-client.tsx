'use client';

/**
 * FinanceClient v4 — Clean FinTech Operating Hub for SMMpanel 1.0
 *
 * Tabs:
 *   1. Overview — Обзор P&L, 4 KPI, EBITDA, Порог НДС 2026, Настройки OPEX
 *   2. Payments — Реестр платежей кассы (ЮKassa, CryptoBot, Robokassa) + CSV
 *   3. Ledger — История транзакций и бухгалтерских проводок + CSV
 *   4. Reconciliation — Сверка счетов пользователей vs Ledger + Коррекция баланса
 */

import { useState, useTransition, useCallback } from 'react';
import { toast } from 'sonner';
import { getLedgerAction, type LedgerEntryDTO, type LedgerPageResult } from '@/actions/admin/finance/ledger';
import { getPaymentsAction, type PaymentsPageResult, type PaymentDTO } from '@/actions/admin/finance/payments';
import { type Table } from '@tanstack/react-table';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { columns } from './ledger-columns';
import { columns as paymentColumns, CopyButton } from './payment-columns';
import { 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  PieChart, 
  Download, 
  RotateCcw,
  CheckCircle2,
  Clock,
  Ban,
  Search,
  Receipt,
  FileSpreadsheet,
  Scale
} from 'lucide-react';
import Link from 'next/link';
import { ReconciliationTab } from './components/reconciliation-tab';
import type { ReconciliationSummaryDTO } from '@/services/financial/ledger-reconciliation.service';
import { VatThresholdWidget } from './vat-threshold-widget';
import { FinanceSettingsForm } from './finance-settings-form';
import { QuarantineList } from './quarantine-list';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Сегодня' },
  { value: 'week',  label: '7 дней' },
  { value: 'month', label: '30 дней' },
  { value: 'all',   label: 'Всё время' },
] as const;

const LEDGER_STATUS_OPTIONS = [
  { value: 'ALL',        label: 'Все статусы' },
  { value: 'APPROVED',   label: 'Одобрено' },
  { value: 'QUARANTINE', label: 'Карантин' },
  { value: 'REJECTED',   label: 'Отклонено' },
] as const;

const PAYMENT_STATUS_OPTIONS = [
  { value: 'ALL',       label: 'Все статусы' },
  { value: 'SUCCEEDED', label: 'Успешные' },
  { value: 'PENDING',   label: 'В ожидании' },
  { value: 'CANCELED',  label: 'Отменённые' },
] as const;

const GATEWAY_OPTIONS = [
  { value: 'ALL',       label: 'Все шлюзы' },
  { value: 'yookassa',  label: 'ЮKassa' },
  { value: 'cryptobot', label: 'CryptoBot' },
  { value: 'robokassa', label: 'Robokassa' },
  { value: 'test',      label: 'Тестовые' },
] as const;

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  SUCCEEDED: 'Успешно',
  PENDING:   'Ожидание',
  CANCELED:  'Отменено',
};

const LEDGER_STATUS_LABELS: Record<string, string> = {
  APPROVED:    'Одобрено',
  QUARANTINE:  'Карантин',
  REJECTED:    'Отклонено',
};

const GATEWAY_LABELS: Record<string, string> = {
  yookassa:  'ЮKassa',
  cryptobot: 'CryptoBot',
  robokassa: 'Robokassa',
  test:      'Тестовый',
};

function fmt(cents: number, showSign = false): string {
  const sign = showSign && cents > 0 ? '+' : '';
  return `${sign}${(Math.abs(cents) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

function downloadCsvExport(params: {
  type: 'ledger' | 'payments' | 'reconciliation' | 'balance_adjustments';
  period?: string;
  status?: string;
  tenantId?: string;
  search?: string;
  onlyAnomalies?: boolean;
}) {
  const query = new URLSearchParams();
  query.set('type', params.type);
  if (params.period) query.set('period', params.period);
  if (params.status && params.status !== 'ALL') query.set('status', params.status);
  if (params.tenantId && params.tenantId !== 'all') query.set('tenant', params.tenantId);
  if (params.search) query.set('search', params.search);
  if (params.onlyAnomalies) query.set('onlyAnomalies', 'true');

  const exportUrl = `/api/admin/export?${query.toString()}`;
  toast.info('Формирование отчёта для бухгалтера в CSV...', { duration: 2500 });
  
  const link = document.createElement('a');
  link.href = exportUrl;
  link.setAttribute('download', '');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function renderMobilePayments(table: Table<PaymentDTO>) {
  return (
    <div className="space-y-3">
      {table.getRowModel().rows.map((row) => {
        const item = row.original;
        const isSucceeded = item.status === 'SUCCEEDED';
        const displayId = item.gatewayId || item.id;
        return (
          <div key={item.id} className="p-4 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm shadow-xs space-y-2.5 text-foreground transition-all hover:border-border">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold font-mono truncate">{item.userEmail}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[130px]" title={displayId}>
                    ID: {displayId.slice(0, 8)}...
                  </span>
                  <CopyButton value={displayId} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold font-mono tabular-nums text-foreground block">
                  {fmt(item.amount)}
                </span>
                {isSucceeded && (
                  <Link 
                    href={`/admin/finance/payments/${item.id}/dispute-pack`}
                    className="inline-block text-[10px] text-primary font-bold uppercase tracking-wider mt-1 hover:underline"
                  >
                    📄 Споры
                  </Link>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center text-xs pt-2 border-t border-border/40">
              <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                {new Date(item.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="flex items-center gap-2">
                <Badge intent="outline" className="text-[9px] font-bold uppercase py-0 px-1.5 h-4">
                  {GATEWAY_LABELS[item.gateway] || item.gateway}
                </Badge>
                <Badge 
                  intent="outline"
                  className={`text-[9px] font-bold uppercase py-0 px-1.5 h-4 rounded ${
                    item.status === 'SUCCEEDED' 
                      ? 'bg-success/15 text-success border-success/20' 
                      : item.status === 'PENDING' 
                      ? 'bg-warning/15 text-warning border-warning/20' 
                      : 'bg-destructive/15 text-destructive border-destructive/20'
                  }`}
                >
                  {PAYMENT_STATUS_LABELS[item.status] || item.status}
                </Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderMobileLedger(table: Table<LedgerEntryDTO>) {
  return (
    <div className="space-y-3">
      {table.getRowModel().rows.map((row) => {
        const item = row.original;
        const isPositive = item.amount >= 0;
        return (
          <div key={item.id} className="p-4 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm shadow-xs space-y-2.5 text-foreground transition-all hover:border-border">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold font-mono truncate">{item.userEmail}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[130px]" title={item.id}>
                    ID: {item.id.slice(0, 8)}...
                  </span>
                  <CopyButton value={item.id} />
                </div>
              </div>
              <div className={`text-right font-bold font-mono text-xs shrink-0 tabular-nums ${isPositive ? 'text-success' : 'text-destructive'}`}>
                {fmt(item.amount, true)}
              </div>
            </div>
            
            <div className="text-xs bg-muted/30 px-3 py-2 rounded-xl border border-border/40 space-y-1">
              <p className="font-medium text-foreground text-xs leading-relaxed">{item.reason}</p>
              <p className="text-[10px] text-muted-foreground font-medium">
                {item.adminId ? `👤 Оператор (${item.adminId.slice(0, 6)})` : '⚙️ Система'}
              </p>
            </div>
            
            <div className="flex justify-between items-center text-xs pt-2 border-t border-border/40">
              <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                {new Date(item.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
              <Badge 
                intent="outline" 
                className={`text-[9px] font-bold uppercase py-0 px-1.5 h-4 rounded ${
                  item.status === 'APPROVED' 
                    ? 'bg-success/15 text-success border-success/20' 
                    : item.status === 'QUARANTINE' 
                    ? 'bg-warning/15 text-warning border-warning/20' 
                    : 'bg-destructive/15 text-destructive border-destructive/20'
                }`}
              >
                {LEDGER_STATUS_LABELS[item.status] || item.status}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface FinanceMetricsDTO {
  revenueGross: number;
  refunds: number;
  cogs: number;
  marginGross: number;
  marginPercentage: number;
  gatewayFees: number;
  taxes: number;
  opex: number;
  profitNet: number;
  effectiveTaxRate: number;
  annualRevenue: number;
  isVatThresholdExceeded: boolean;
}

export interface FinanceClientProps {
  initialLedger: LedgerPageResult;
  initialPayments: PaymentsPageResult;
  initialPeriod: string;
  tenantId?: string;
  initialReconciliationSummary?: ReconciliationSummaryDTO;
  metrics: FinanceMetricsDTO;
  settings: {
    taxRate: number;
    opexMonthly: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quarantineList: any[];
}

export function FinanceClient({
  initialLedger,
  initialPayments,
  initialPeriod,
  tenantId,
  initialReconciliationSummary,
  metrics,
  settings,
  quarantineList
}: FinanceClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'ledger' | 'reconciliation'>('overview');

  return (
    <div className="space-y-6 w-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        {/* Navigation Tabs Header */}
        <div className="border-b border-border/80 pb-3">
          <TabsList className="bg-muted/40 p-1.5 rounded-2xl border border-border/60 gap-1.5 flex flex-wrap sm:inline-flex shadow-xs">
            <TabsTrigger 
              value="overview" 
              className="gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all duration-200 cursor-pointer"
            >
              <PieChart className="w-4 h-4" />
              <span>1. Обзор & P&L</span>
            </TabsTrigger>

            <TabsTrigger 
              value="payments" 
              className="gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all duration-200 cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>2. Реестр Платежей</span>
            </TabsTrigger>

            <TabsTrigger 
              value="ledger" 
              className="gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all duration-200 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>3. Проводки Ledger</span>
            </TabsTrigger>

            <TabsTrigger 
              value="reconciliation" 
              className="gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all duration-200 cursor-pointer"
            >
              <Scale className="w-4 h-4" />
              <span>4. Сверка & Балансы</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── TAB 1: OVERVIEW & P&L ── */}
        <TabsContent value="overview" className="mt-6 space-y-6 animate-in fade-in duration-300">
          {/* Escrow Quarantine Notification if any */}
          {quarantineList.length > 0 && (
            <QuarantineList entries={quarantineList} />
          )}

          {/* 4 Main KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-success/30 bg-success/10 p-5 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-success">
                <span>Выручка (Gross)</span>
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black font-mono tabular-nums text-foreground">
                {fmt(metrics.revenueGross)}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium">
                Все входящие поступления
              </div>
            </div>

            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-destructive">
                <span>Возвраты (Refunds)</span>
                <TrendingDown className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black font-mono tabular-nums text-destructive">
                {metrics.refunds > 0 ? `-${fmt(metrics.refunds)}` : fmt(0)}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium">
                Отмены заказов и частичные возвраты
              </div>
            </div>

            <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-warning">
                <span>Закупка (COGS)</span>
                <TrendingDown className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black font-mono tabular-nums text-warning">
                {metrics.cogs > 0 ? `-${fmt(metrics.cogs)}` : fmt(0)}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium">
                Себестоимость провайдеров
              </div>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-primary">
                <span>Валовая Маржа</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black font-mono tabular-nums text-primary">
                {fmt(metrics.marginGross)}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium">
                {metrics.marginPercentage.toFixed(1)}% маржинальность
              </div>
            </div>
          </div>

          {/* Breakdown & Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: EBITDA / Net Profit Breakdown */}
            <div className="lg:col-span-2 rounded-3xl border border-border/60 shadow-lg bg-card/70 backdrop-blur-xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                <div className="p-2 bg-primary/10 text-primary rounded-xl border border-primary/20">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Расчёт чистой прибыли (P&L)</h3>
                  <p className="text-xs text-muted-foreground">
                    Калькуляция EBITDA с учетом комиссий платежных шлюзов, налогов и постоянных расходов.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Комиссии шлюзов', value: -metrics.gatewayFees, color: 'text-destructive', desc: 'ЮKassa (3.5%), Robokassa и CryptoBot (1%)' },
                  { label: 'Валовая маржа', value: metrics.marginGross, color: 'text-foreground', desc: 'После вычета себестоимости провайдеров и возвратов' },
                  { label: `Налоги (${metrics.effectiveTaxRate.toFixed(1)}%)`, value: -metrics.taxes, color: 'text-destructive', desc: 'Оценочный налог УСН на прибыль' },
                  { label: 'OPEX (Постоянные расходы)', value: -metrics.opex, color: 'text-destructive', desc: 'Серверы, софт, поддержка, инфраструктура' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center p-3 rounded-xl bg-muted/20 border border-border/40">
                    <div className="space-y-0.5">
                      <span className="text-sm font-bold text-foreground block">{row.label}</span>
                      <span className="text-[11px] text-muted-foreground">{row.desc}</span>
                    </div>
                    <span className={`font-black font-mono tabular-nums text-sm ${row.color}`}>
                      {fmt(Math.abs(row.value))}
                    </span>
                  </div>
                ))}

                {/* Net Profit Summary */}
                <div className={`p-5 rounded-2xl flex justify-between items-center shadow-lg transition-all ${
                  metrics.profitNet >= 0 ? 'bg-success text-primary-foreground' : 'bg-destructive text-primary-foreground'
                }`}>
                  <div className="space-y-0.5">
                    <span className="text-xs font-black uppercase tracking-widest opacity-80">Чистая прибыль (EBITDA)</span>
                    <p className="text-[10px] font-bold opacity-70">За выбранный период</p>
                  </div>
                  <div className="text-3xl font-black font-mono tabular-nums">
                    {fmt(metrics.profitNet)}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Tax & OPEX Widgets */}
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
        </TabsContent>

        {/* ── TAB 2: PAYMENTS (РЕЕСТР ПЛАТЕЖЕЙ) ── */}
        <TabsContent value="payments" className="mt-6 space-y-6 animate-in fade-in duration-300">
          <PaymentsTab initial={initialPayments} period={initialPeriod} tenantId={tenantId} />
        </TabsContent>

        {/* ── TAB 3: LEDGER (ПРОВОДКИ) ── */}
        <TabsContent value="ledger" className="mt-6 space-y-6 animate-in fade-in duration-300">
          <LedgerTab initial={initialLedger} period={initialPeriod} tenantId={tenantId} />
        </TabsContent>

        {/* ── TAB 4: RECONCILIATION (СВЕРКА & БАЛАНСЫ) ── */}
        <TabsContent value="reconciliation" className="mt-6 space-y-6 animate-in fade-in duration-300">
          <ReconciliationTab tenantId={tenantId} initialSummary={initialReconciliationSummary} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Payments Sub-Tab ────────────────────────────────────────────────────────
function PaymentsTab({ initial, period: initPeriod, tenantId }: { initial: PaymentsPageResult; period: string; tenantId?: string }) {
  const [period, setPeriod]       = useState(initPeriod);
  const [status, setStatus]       = useState<string>('ALL');
  const [gateway, setGateway]     = useState<string>('ALL');
  const [search, setSearch]       = useState<string>('');
  const [data,   setData]         = useState<PaymentsPageResult>(initial);
  const [isPending, startTransition] = useTransition();

  const load = useCallback((newPeriod: string, newStatus: string, newGateway: string, newSearch: string) => {
    startTransition(async () => {
      const r = await getPaymentsAction({
        period:   newPeriod as 'today' | 'week' | 'month' | 'all',
        status:   newStatus as 'ALL' | 'SUCCEEDED' | 'PENDING' | 'CANCELED',
        gateway:  newGateway === 'ALL' ? undefined : newGateway,
        search:   newSearch.trim() || undefined,
        pageSize: 100,
        tenantId,
      });
      if (!('error' in r)) {
        setData(r);
      } else {
        toast.error(r.error);
      }
    });
  }, [tenantId]);

  function applyPeriod(v: string | null) {
    if (!v) return;
    setPeriod(v);
    load(v, status, gateway, search);
  }

  function applyStatus(v: string | null) {
    if (!v) return;
    setStatus(v);
    load(period, v, gateway, search);
  }

  function applyGateway(v: string | null) {
    if (!v) return;
    setGateway(v);
    load(period, status, v, search);
  }

  function applySearch(val: string) {
    setSearch(val);
    load(period, status, gateway, val);
  }

  return (
    <div className="space-y-6">
      {/* Action Bar: Filters, Search & 1-Click CSV Export */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Период:</span>
            <Select defaultValue={period} onValueChange={applyPeriod}>
              <SelectTrigger className="w-[130px] h-9 text-xs" size="sm">
                <SelectValue placeholder="Период">
                  {(value: string) => PERIOD_OPTIONS.find(p => p.value === value)?.label ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(p => (
                  <SelectItem key={p.value} value={p.value} label={p.label}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Статус:</span>
            <Select defaultValue={status} onValueChange={applyStatus}>
              <SelectTrigger className="w-[140px] h-9 text-xs" size="sm">
                <SelectValue placeholder="Статус">
                  {(value: string) => PAYMENT_STATUS_OPTIONS.find(s => s.value === value)?.label ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value} label={s.label}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Шлюз:</span>
            <Select defaultValue={gateway} onValueChange={applyGateway}>
              <SelectTrigger className="w-[130px] h-9 text-xs" size="sm">
                <SelectValue placeholder="Шлюз">
                  {(value: string) => GATEWAY_OPTIONS.find(g => g.value === value)?.label ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {GATEWAY_OPTIONS.map(g => (
                  <SelectItem key={g.value} value={g.value} label={g.label}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            onClick={() => load(period, status, gateway, search)}
            disabled={isPending}
            className="h-9 px-3 border border-border bg-card hover:bg-muted text-foreground"
            title="Обновить"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Search & Export Buttons */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => applySearch(e.target.value)}
              placeholder="Поиск по email или ID..."
              className="pl-8 h-9 text-xs bg-background/80"
            />
          </div>

          <Button
            size="sm"
            onClick={() => downloadCsvExport({ type: 'payments', period, status, tenantId, search })}
            className="h-9 gap-1.5 font-bold uppercase tracking-wider text-[11px] shadow-xs shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Экспорт в CSV</span>
          </Button>
        </div>
      </div>

      {/* Main DataTable / Mobile Cards */}
      <div className="w-full">
        <DataTable
          columns={paymentColumns}
          data={data.items}
          searchKey="userEmail"
          searchPlaceholder="Фильтр по email или ID платежа..."
          renderMobileView={renderMobilePayments}
        />
      </div>
    </div>
  );
}

// ── Ledger Sub-Tab ──────────────────────────────────────────────────────────
function LedgerTab({ initial, period: initPeriod, tenantId }: { initial: LedgerPageResult; period: string; tenantId?: string }) {
  const [period, setPeriod]       = useState(initPeriod);
  const [status, setStatus]       = useState<string>('ALL');
  const [data,   setData]         = useState<LedgerPageResult>(initial);
  const [isPending, startTransition] = useTransition();

  const load = useCallback((newPeriod: string, newStatus: string) => {
    startTransition(async () => {
      const r = await getLedgerAction({
        period:   newPeriod as 'today' | 'week' | 'month' | 'all',
        status:   newStatus as 'ALL' | 'APPROVED' | 'QUARANTINE' | 'REJECTED',
        pageSize: 100,
        tenantId,
      });
      if (!('error' in r)) {
        setData(r);
      } else {
        toast.error(r.error);
      }
    });
  }, [tenantId]);

  function applyPeriod(v: string | null) {
    if (!v) return;
    setPeriod(v);
    load(v, status);
  }

  function applyStatus(v: string | null) {
    if (!v) return;
    setStatus(v);
    load(period, v);
  }

  return (
    <div className="space-y-6">
      {/* Totals Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { 
            label: 'Зачислено (Gross)', 
            value: data.totals.approved, 
            color: 'bg-success/10 border-success/20 text-success',
            icon: CheckCircle2,
            sub: 'Подтверждённые проводки'
          },
          { 
            label: 'Возвраты (Refunds)', 
            value: data.totals.refunds, 
            color: 'bg-destructive/10 border-destructive/20 text-destructive',
            icon: Ban,
            sub: 'Списания и возвраты'
          },
          { 
            label: 'В карантине (Escrow)', 
            value: data.totals.quarantine, 
            color: 'bg-warning/10 border-warning/20 text-warning',
            icon: Clock,
            sub: 'Ожидают подтверждения'
          },
        ].map(s => (
          <div 
            key={s.label} 
            className={`${s.color} border rounded-2xl p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:scale-[1.01]`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{s.label}</span>
              <s.icon className="w-4 h-4 opacity-70" />
            </div>
            <div className="text-2xl font-black font-mono tabular-nums tracking-tight">{fmt(s.value)}</div>
            <div className="text-[11px] font-medium opacity-70 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Action Bar: Filters & 1-Click CSV Export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Период:</span>
            <Select defaultValue={period} onValueChange={applyPeriod}>
              <SelectTrigger className="w-[140px] h-9 text-xs" size="sm">
                <SelectValue placeholder="Период">
                  {(value: string) => PERIOD_OPTIONS.find(p => p.value === value)?.label ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(p => (
                  <SelectItem key={p.value} value={p.value} label={p.label}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Статус:</span>
            <Select defaultValue={status} onValueChange={applyStatus}>
              <SelectTrigger className="w-[150px] h-9 text-xs" size="sm">
                <SelectValue placeholder="Статус">
                  {(value: string) => LEDGER_STATUS_OPTIONS.find(s => s.value === value)?.label ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LEDGER_STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value} label={s.label}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            onClick={() => load(period, status)}
            disabled={isPending}
            className="h-9 px-3 border border-border bg-card hover:bg-muted text-foreground"
            title="Обновить"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <Button
          size="sm"
          onClick={() => downloadCsvExport({ type: 'ledger', period, status, tenantId })}
          className="h-9 gap-1.5 font-bold uppercase tracking-wider text-[11px] shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Экспорт в CSV</span>
        </Button>
      </div>

      {/* Main DataTable / Mobile Cards */}
      <div className="w-full">
        <DataTable
          columns={columns}
          data={data.items}
          searchKey="userEmail"
          searchPlaceholder="Фильтр по email или ID проводки..."
          renderMobileView={renderMobileLedger}
        />
      </div>
    </div>
  );
}
