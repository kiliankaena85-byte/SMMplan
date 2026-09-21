import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { accountingService } from '@/services/financial/accounting.service';
import { adminOrderService } from '@/services/admin/order.service';
import { adminUserService } from '@/services/admin/user.service';
import { adminTicketService } from '@/services/admin/ticket.service';
import { adminCatalogService } from '@/services/admin/catalog.service';
import { stormDetectorService } from '@/services/admin/storm-detector.service';
import { db } from '@/lib/db';
import { formatKopecks } from '@/utils/format-kopecks';
import { CollapsibleWaveChart } from './CollapsibleWaveChart';
import { StormRadarWidget } from './StormRadarWidget';
import { FinancialEscalationWidget } from './FinancialEscalationWidget';
import { ProviderLiquidityWidget } from './ProviderLiquidityWidget';
import { RecentAuditTable } from './recent-audit-table';

// ── 1. Wave Chart Section ──
interface WaveChartSectionProps {
  startDate: Date;
  endDate: Date;
  step: 'hour' | 'day' | 'week' | 'month';
  tenantFilter?: string;
}

export async function DashboardWaveChartSection({
  startDate,
  endDate,
  step,
  tenantFilter,
}: WaveChartSectionProps) {
  const timeseries = await adminOrderService.getOrdersTimeseries(
    startDate,
    endDate,
    step,
    tenantFilter
  );
  return <CollapsibleWaveChart data={timeseries} step={step} />;
}

// ── 2. Storm Radar Section ──
export async function DashboardStormRadarSection({
  tenantFilter,
}: {
  tenantFilter?: string;
}) {
  const stormReport = await stormDetectorService.auditServiceStorms({
    windowHours: 72,
    tenantId: tenantFilter,
  });
  return <StormRadarWidget report={stormReport} />;
}

// ── 3. KPI Strip Section ──
interface KpiSectionProps {
  filterStart?: Date;
  filterEnd?: Date;
  tenantFilter?: string;
  canSeeFinancials: boolean;
}

export async function DashboardKpiSection({
  filterStart,
  filterEnd,
  tenantFilter,
  canSeeFinancials,
}: KpiSectionProps) {
  const [metrics, orderStats, userStats, catalogStats, ticketStats] =
    await Promise.all([
      accountingService.getMetrics(filterStart, filterEnd, tenantFilter),
      adminOrderService.getOrderStats(filterStart, filterEnd, tenantFilter),
      adminUserService.getUserStats(filterStart, filterEnd, tenantFilter),
      adminCatalogService.getCatalogStats(tenantFilter, filterStart, filterEnd),
      adminTicketService.getTicketStats(filterStart, filterEnd, tenantFilter),
    ]);

  const revenueGross = metrics.revenueGross;
  const profitNet = metrics.profitNet;
  const profitMargin =
    metrics.revenueNet > 0 ? (metrics.profitNet / metrics.revenueNet) * 100 : 0;
  const oStats = { ...orderStats };
  const uStats = { ...userStats };
  const cStats = { ...catalogStats };
  const tStats = { ...ticketStats };

  const fulfilledOrders = (oStats.completed || 0) + (oStats.partial || 0);
  const terminalOrders =
    fulfilledOrders + (oStats.error || 0) + (oStats.canceled || 0);
  const successOrderRate =
    terminalOrders > 0
      ? ((fulfilledOrders / terminalOrders) * 100).toFixed(1)
      : '100';

  if (canSeeFinancials) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Валовый оборот */}
        <Link
          href="/admin/finance"
          className="bg-card text-card-foreground border border-border/70 hover:border-primary/50 hover:shadow-md rounded-lg p-4 shadow-sm flex flex-col justify-between space-y-2 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
              Валовый оборот (GMV)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              Поступления
            </span>
          </div>
          <div className="text-2xl font-extrabold text-foreground tabular-nums tracking-tight font-mono">
            {formatKopecks(revenueGross)}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
            <span>
              Эквайринг: {formatKopecks(metrics.gatewayFees)}
              {metrics.refunds > 0
                ? ` · Возвраты: ${formatKopecks(metrics.refunds)}`
                : ''}
            </span>
            <span>Чистая: {formatKopecks(metrics.revenueNet)}</span>
          </div>
        </Link>

        {/* Card 2: Чистая прибыль */}
        <Link
          href="/admin/finance"
          className="bg-card text-card-foreground border border-border/70 hover:border-primary/50 hover:shadow-md rounded-lg p-4 shadow-sm flex flex-col justify-between space-y-2 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
              Чистая прибыль (Net Profit)
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                profitMargin >= 30
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
              }`}
            >
              {profitMargin.toFixed(1)}% маржа
            </span>
          </div>
          <div className="text-2xl font-extrabold text-foreground tabular-nums tracking-tight font-mono">
            {formatKopecks(profitNet)}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
            <span>Себестоимость: {formatKopecks(metrics.cogs)}</span>
            <span>
              Налог (УСН {metrics.effectiveTaxRate}%): {formatKopecks(metrics.taxes)}
            </span>
          </div>
        </Link>

        {/* Card 3: Поток заказов */}
        <Link
          href="/admin/orders"
          className="bg-card text-card-foreground border border-border/70 hover:border-primary/50 hover:shadow-md rounded-lg p-4 shadow-sm flex flex-col justify-between space-y-2 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
              Всего заказов
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
              Успех {successOrderRate}%
            </span>
          </div>
          <div className="text-2xl font-extrabold text-foreground tabular-nums tracking-tight font-mono">
            {oStats.total.toLocaleString('ru-RU')} шт
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
            <span>В работе: {oStats.inProgress} шт</span>
            <span>В очереди: {oStats.pending} шт</span>
          </div>
        </Link>

        {/* Card 4: Клиентская база */}
        <Link
          href="/admin/clients"
          className="bg-card text-card-foreground border border-border/70 hover:border-primary/50 hover:shadow-md rounded-lg p-4 shadow-sm flex flex-col justify-between space-y-2 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
              Клиенты & Каталог
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
              {cStats.activeServices} услуг
            </span>
          </div>
          <div className="text-2xl font-extrabold text-foreground tabular-nums tracking-tight font-mono">
            {uStats.total.toLocaleString('ru-RU')} клиентов
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
            <span>Активных: {uStats.active}</span>
            <span className="text-primary font-semibold">База растет</span>
          </div>
        </Link>
      </div>
    );
  }

  /* Support-Only 4-Card Strip */
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Link
        href="/admin/orders?status=IN_PROGRESS"
        className="bg-card border border-border/70 hover:border-primary/50 hover:shadow-md rounded-lg p-4 shadow-sm transition-all cursor-pointer group block"
      >
        <div className="text-xs text-muted-foreground font-bold uppercase group-hover:text-primary transition-colors flex items-center justify-between">
          <span>Заказов в работе</span>
          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-2xl font-bold font-mono text-foreground mt-1">
          {oStats.inProgress} шт
        </div>
      </Link>
      <Link
        href="/admin/orders?status=PENDING"
        className="bg-card border border-border/70 hover:border-primary/50 hover:shadow-md rounded-lg p-4 shadow-sm transition-all cursor-pointer group block"
      >
        <div className="text-xs text-muted-foreground font-bold uppercase group-hover:text-primary transition-colors flex items-center justify-between">
          <span>Заказов в очереди</span>
          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-2xl font-bold font-mono text-foreground mt-1">
          {oStats.pending} шт
        </div>
      </Link>
      <Link
        href="/admin/orders?status=ERROR"
        className="bg-card border border-border/70 hover:border-rose-500/50 hover:shadow-md rounded-lg p-4 shadow-sm transition-all cursor-pointer group block"
      >
        <div className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase flex items-center justify-between">
          <span>Сбои / Ошибки</span>
          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
          {oStats.error} сбоев
        </div>
      </Link>
      <Link
        href="/admin/tickets?status=OPEN"
        className="bg-card border border-border/70 hover:border-amber-500/50 hover:shadow-md rounded-lg p-4 shadow-sm transition-all cursor-pointer group block"
      >
        <div className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase flex items-center justify-between">
          <span>Тикетов в очереди</span>
          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
          {tStats.open} тикетов
        </div>
      </Link>
    </div>
  );
}

// ── 4. Financial Escalation Section ──
interface EscalationSectionProps {
  filterStart?: Date;
  filterEnd?: Date;
  tenantFilter?: string;
  canSeeProviders: boolean;
}

export async function DashboardEscalationSection({
  filterStart,
  filterEnd,
  tenantFilter,
  canSeeProviders,
}: EscalationSectionProps) {
  const [orderStats, ticketStats] = await Promise.all([
    adminOrderService.getOrderStats(filterStart, filterEnd, tenantFilter),
    adminTicketService.getTicketStats(filterStart, filterEnd, tenantFilter),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className={canSeeProviders ? 'lg:col-span-6' : 'lg:col-span-12'}>
        <FinancialEscalationWidget
          errorOrdersCount={orderStats.error}
          openTicketsCount={ticketStats.open}
          pendingBalanceRequestsCount={0}
        />
      </div>

      {canSeeProviders && (
        <div className="lg:col-span-6">
          <ProviderLiquidityWidget />
        </div>
      )}
    </div>
  );
}

// ── 5. Financial Balance Section ──
export async function DashboardFinancialBalanceSection({
  filterStart,
  filterEnd,
  tenantFilter,
}: {
  filterStart?: Date;
  filterEnd?: Date;
  tenantFilter?: string;
}) {
  const [metrics, userStats] = await Promise.all([
    accountingService.getMetrics(filterStart, filterEnd, tenantFilter),
    adminUserService.getUserStats(filterStart, filterEnd, tenantFilter),
  ]);

  const revenueGross = metrics.revenueGross;
  const profitNet = metrics.profitNet;
  const totalLiability = userStats.totalLiability;
  const netPositionBigInt = BigInt(revenueGross) - BigInt(totalLiability);
  const netPositionStr = formatKopecks(netPositionBigInt);

  return (
    <div className="bg-card text-card-foreground rounded-lg p-5 border border-border/70 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Финансовый баланс платформы
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
              RUB (₽)
            </span>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-foreground tabular-nums tracking-tight font-mono">
            {netPositionStr}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Чистый капитал за вычетом обязательств перед клиентами
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/admin/finance">
            <button
              type="button"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-md text-xs px-4 h-9 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Детальный биллинг</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
          <Link href="/admin/analytics">
            <button
              type="button"
              className="bg-muted/60 hover:bg-muted text-foreground border border-border/60 font-semibold rounded-md text-xs px-4 h-9 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>P&L Аналитика</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-border/40 text-xs">
        <div className="p-3 rounded-md bg-muted/20 border border-border/50">
          <div className="text-[10px] text-muted-foreground font-bold uppercase">
            Пополнения (Оборот)
          </div>
          <div className="font-mono font-bold text-foreground tabular-nums text-sm mt-0.5">
            {formatKopecks(revenueGross)}
          </div>
        </div>
        <div className="p-3 rounded-md bg-muted/20 border border-border/50">
          <div className="text-[10px] text-muted-foreground font-bold uppercase">
            Обязательства (Остатки на балансах)
          </div>
          <div className="font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums text-sm mt-0.5">
            {formatKopecks(totalLiability)}
          </div>
        </div>
        <div className="p-3 rounded-md bg-muted/20 border border-border/50">
          <div className="text-[10px] text-muted-foreground font-bold uppercase">
            Чистая прибыль (Net Profit)
          </div>
          <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-sm mt-0.5">
            {formatKopecks(profitNet)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 6. Audit Trail Section ──
export async function DashboardAuditSection({
  filterStart,
  filterEnd,
}: {
  filterStart?: Date;
  filterEnd?: Date;
}) {
  const recentAudit = await db.adminAuditLog.findMany({
    where:
      filterStart && filterEnd
        ? { createdAt: { gte: filterStart, lte: filterEnd } }
        : {},
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return (
    <div className="bg-card text-card-foreground rounded-lg p-5 border border-border/70 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-border/50 pb-3">
        <div>
          <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
            Журнал безопасности и действий (Audit Trail)
          </h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Фиксация ключевых изменений с привязкой к аккаунту и времени
          </p>
        </div>
        <Link
          href="/admin/settings?tab=audit"
          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>Полный журнал</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <RecentAuditTable logs={recentAudit} />
    </div>
  );
}
