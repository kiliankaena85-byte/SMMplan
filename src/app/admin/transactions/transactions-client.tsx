'use client';

import React, { useState, useTransition, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { getLedgerAction, type LedgerPageResult, type LedgerEntryDTO } from '@/actions/admin/finance/ledger';
import { ClientDate } from '@/components/ui/client-date';
import { 
  ArrowLeftRight, 
  CreditCard, 
  ShoppingCart, 
  RotateCcw, 
  Search, 
  Download, 
  RefreshCw,
  Wallet,
  SlidersHorizontal,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Ban,
  Shield,
  User
} from 'lucide-react';
import { resolveLedgerTypeForDisplay, LEDGER_TYPE_CONFIG } from '@/lib/financial/ledger-types';

interface TransactionsClientProps {
  initial: LedgerPageResult;
  initialPeriod?: string;
  tenantId?: string;
}

const PERIOD_OPTIONS = [
  { id: 'today', label: 'Сегодня' },
  { id: 'week', label: '7 дней' },
  { id: 'month', label: '30 дней' },
  { id: 'all', label: 'Все время' },
];

const STATUS_OPTIONS = [
  { id: 'ALL', label: 'Все статусы' },
  { id: 'APPROVED', label: 'Одобрено' },
  { id: 'QUARANTINE', label: 'Карантин' },
  { id: 'REJECTED', label: 'Отклонено' },
];

const TYPE_OPTIONS = [
  { id: 'ALL', label: 'Все типы' },
  { id: 'TOPUP', label: '💳 Пополнения' },
  { id: 'ORDER_CHARGE', label: '🛒 Оплата заказов' },
  { id: 'ORDER_CANCEL', label: '🚫 Отмены заказов' },
  { id: 'REFUND', label: '↩️ Авто-возвраты' },
  { id: 'COMPENSATION', label: '🎁 Компенсации' },
  { id: 'ADJUSTMENT', label: '⚖️ Корректировки' },
  { id: 'REROUTE', label: '🔄 Перезапуски' },
];

function fmtRub(cents: number, showSign = false): string {
  const sign = showSign && cents > 0 ? '+' : cents < 0 ? '−' : '';
  const absRub = Math.abs(cents) / 100;
  return `${sign}${absRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {}
      }}
      className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
      title="Скопировать ID"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export function TransactionsClient({ initial, initialPeriod = 'month', tenantId }: TransactionsClientProps) {
  const [period, setPeriod] = useState(initialPeriod);
  const [status, setStatus] = useState<string>('ALL');
  const [type, setType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [data, setData] = useState<LedgerPageResult>(initial);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback((pPeriod: string, pStatus: string, pType: string, pSearch: string) => {
    startTransition(async () => {
      const res = await getLedgerAction({
        period: pPeriod as any,
        status: pStatus as any,
        type: pType as any,
        search: pSearch.trim() || undefined,
        pageSize: 100,
        tenantId,
      });

      if ('error' in res) {
        toast.error(res.error);
      } else {
        setData(res);
      }
    });
  }, [tenantId]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    loadData(newPeriod, status, type, search);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    loadData(period, newStatus, type, search);
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    loadData(period, status, newType, search);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(period, status, type, search);
  };

  const handleExportCsv = () => {
    if (!data.items.length) {
      toast.error('Нет данных для экспорта');
      return;
    }
    const headers = ['ID', 'Дата', 'Email', 'Сумма (₽)', 'Тип', 'Причина', 'Инициатор', 'Статус'];
    const rows = data.items.map(item => [
      item.id,
      item.createdAt,
      item.userEmail,
      (item.amount / 100).toFixed(2),
      item.transactionType,
      `"${item.reason.replace(/"/g, '""')}"`,
      item.adminId || 'Система',
      item.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ledger-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV файл успешно выгружен');
  };

  // Quick stat aggregates from current view
  const totalApprovedRub = data.totals?.approved ? data.totals.approved / 100 : 0;
  const totalRefundsRub = data.totals?.refunds ? data.totals.refunds / 100 : 0;

  return (
    <div className="space-y-5 w-full">
      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-card/70 backdrop-blur-sm border border-border/70 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Всего операций</span>
            <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-foreground mt-2">{data.items.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">В текущей выборке</div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm border border-border/70 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Одобрено (Приход)</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            +{totalApprovedRub.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Пополнения и начисления</div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm border border-border/70 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Возвраты & Сдача</span>
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-2">
            {totalRefundsRub.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Авто-возвраты по заказам</div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm border border-border/70 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Карантин / Очередь</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
            {((data.totals?.quarantine || 0) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">На проверке эскроу</div>
        </div>
      </div>

      {/* Filter Toolbar & Quick Type Chips */}
      <div className="bg-card/90 backdrop-blur-sm border border-border/80 rounded-2xl p-3 shadow-xs space-y-2.5">
        
        {/* Row 1: Search, Period, Status, Export */}
        <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по Email, ID клиента, ID заказа, причине..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </form>

          {/* Period selector */}
          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/50 shrink-0">
            {PERIOD_OPTIONS.map(po => (
              <button
                key={po.id}
                type="button"
                onClick={() => handlePeriodChange(po.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  period === po.id
                    ? 'bg-card text-foreground shadow-2xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {po.label}
              </button>
            ))}
          </div>

          {/* Status Select */}
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            aria-label="Фильтр по статусу"
            className="h-8 px-2.5 text-xs font-semibold bg-background border border-border/60 rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer shrink-0"
          >
            {STATUS_OPTIONS.map(so => (
              <option key={so.id} value={so.id}>{so.label}</option>
            ))}
          </select>

          {/* Refresh / Export */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => loadData(period, status, type, search)}
              disabled={isPending}
              className="h-8 px-2.5 rounded-xl border border-border/60 bg-background hover:bg-muted text-foreground flex items-center gap-1 text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              title="Обновить данные"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Обновить</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="h-8 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Row 2: Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pt-1 border-t border-border/40">
          {TYPE_OPTIONS.map(to => {
            const isActive = type === to.id;
            return (
              <button
                key={to.id}
                type="button"
                onClick={() => handleTypeChange(to.id)}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                    : 'bg-background text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'
                }`}
              >
                {to.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                <th className="px-3.5 py-3">Клиент</th>
                <th className="px-3.5 py-3">Дата / Время</th>
                <th className="px-3.5 py-3">Тип операции</th>
                <th className="px-3.5 py-3 text-right">Сумма</th>
                <th className="px-3.5 py-3">Основание / Причина</th>
                <th className="px-3.5 py-3 text-center">Инициатор</th>
                <th className="px-3.5 py-3 text-center">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm font-semibold">Финансовых записей не найдено</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">Попробуйте изменить период или сбросить фильтры</p>
                  </td>
                </tr>
              ) : (
                data.items.map((entry) => {
                  const resolvedType = resolveLedgerTypeForDisplay(entry.transactionType, entry.amount, entry.adminId);
                  const cfg = LEDGER_TYPE_CONFIG[resolvedType] || LEDGER_TYPE_CONFIG.TOPUP;
                  const isPositive = entry.amount > 0;
                  const isNegative = entry.amount < 0;

                  return (
                    <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                      {/* Client Email & ID */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex flex-col min-w-0 max-w-[200px]">
                          <Link
                            href={`/admin/clients/${entry.userId}`}
                            className="text-primary hover:underline font-mono text-xs font-bold truncate flex items-center gap-1"
                          >
                            <span>{entry.userEmail}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                          </Link>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                            <span>ID: {entry.userId.slice(0, 10)}...</span>
                            <CopyBtn text={entry.userId} />
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                        <ClientDate date={entry.createdAt} format="datetime" />
                      </td>

                      {/* Type Badge */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${cfg.badgeClass}`}>
                          <span>{cfg.emoji}</span>
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold whitespace-nowrap">
                        <span className={
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isNegative
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-muted-foreground'
                        }>
                          {fmtRub(entry.amount, true)}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="px-3.5 py-2.5 text-foreground max-w-[260px] truncate" title={entry.reason}>
                        {entry.reason || '—'}
                      </td>

                      {/* Initiator */}
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                        {entry.adminId ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-mono text-[10px] font-bold border border-purple-500/20">
                            <Shield className="w-3 h-3" />
                            <span>Оператор</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px] font-medium">
                            <span>Система</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                        {entry.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Исполнено</span>
                          </span>
                        ) : entry.status === 'QUARANTINE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            <span>Карантин</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                            <Ban className="w-3 h-3" />
                            <span>{entry.status}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/70 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>Показано последних {data.items.length} транзакций</span>
          <span className="font-mono text-[11px]">ExactMath Ledger v4.1</span>
        </div>
      </div>
    </div>
  );
}
