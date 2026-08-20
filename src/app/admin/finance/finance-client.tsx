'use client';
 
 /**
  * FinanceClient v3 — Fast Accountant CSV Export & SMMplan Design System
  *
  * Tabs:
  *   1. Ledger — История транзакций (DataTable + Status/Period Filters + 1-Click CSV)
  *   2. Payments — Реестр платежей (DataTable + Gateway/Status Filters + 1-Click CSV)
  *   3. Reconciliation — Сверка счетов Ledger vs User.balance (Discrepancy audit)
  *   4. Balance Correction — Ручная корректировка баланса
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
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { columns } from './ledger-columns';
import { columns as paymentColumns, CopyButton } from './payment-columns';
import { 
  Wallet, 
  History, 
  AlertTriangle, 
  DollarSign, 
  Scale, 
  Download, 
  RotateCcw,
  CheckCircle2,
  Clock,
  Ban,
} from 'lucide-react';
import Link from 'next/link';
import { ReconciliationTab } from './components/reconciliation-tab';
import type { ReconciliationSummaryDTO } from '@/services/financial/ledger-reconciliation.service';

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
  yookassa: 'ЮKassa',
  cryptobot: 'CryptoBot',
  test:      'Тестовый',
};

function fmt(cents: number, showSign = false): string {
  const sign = showSign && cents > 0 ? '+' : '';
  return `${sign}${(Math.abs(cents) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

/**
 * 1-Click Fast CSV Exporter with UTF-8 BOM & Accountant headers
 */
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

interface FinanceClientProps {
  initialLedger: LedgerPageResult;
  initialPayments: PaymentsPageResult;
  initialPeriod: string;
  tenantId?: string;
  initialReconciliationSummary?: ReconciliationSummaryDTO;
}

// ── Ledger Tab ──────────────────────────────────────────────────────────────
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
                  {(value: string) => {
                    if (!value) return null;
                    return PERIOD_OPTIONS.find(p => p.value === value)?.label ?? value;
                  }}
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
                  {(value: string) => {
                    if (!value) return null;
                    return LEDGER_STATUS_OPTIONS.find(s => s.value === value)?.label ?? value;
                  }}
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
            intent="ghost"
            size="sm"
            onClick={() => load(period, status)}
            disabled={isPending}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            title="Обновить данные"
            aria-label="Обновить журнал проводок"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* 1-Click Fast CSV Export Button */}
        <div className="flex items-center gap-2">
          <Button
            intent="outline"
            size="sm"
            onClick={() => downloadCsvExport({ type: 'ledger', period, status, tenantId })}
            className="h-9 px-4 font-bold text-xs bg-background hover:bg-muted shadow-xs transition-all flex items-center gap-2 border-border/80"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Экспорт в CSV</span>
          </Button>
        </div>
      </div>

      {/* DataTable */}
      <div className="rounded-2xl border border-border/70 shadow-xs bg-background/60 backdrop-blur-xl overflow-hidden">
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

// ── Payments Tab ────────────────────────────────────────────────────────────
function PaymentsTab({ initial, period: initPeriod, tenantId }: { initial: PaymentsPageResult; period: string; tenantId?: string }) {
  const [period, setPeriod]       = useState(initPeriod);
  const [status, setStatus]       = useState<string>('ALL');
  const [data,   setData]         = useState<PaymentsPageResult>(initial);
  const [isPending, startTransition] = useTransition();

  const load = useCallback((newPeriod: string, newStatus: string) => {
    startTransition(async () => {
      const r = await getPaymentsAction({
        period:   newPeriod as 'today' | 'week' | 'month' | 'all',
        status:   newStatus as 'ALL' | 'PENDING' | 'SUCCEEDED' | 'CANCELED',
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
      {/* Action Bar: Filters & 1-Click CSV Export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Период:</span>
            <Select defaultValue={period} onValueChange={applyPeriod}>
              <SelectTrigger className="w-[140px] h-9 text-xs" size="sm">
                <SelectValue placeholder="Период">
                  {(value: string) => {
                    if (!value) return null;
                    return PERIOD_OPTIONS.find(p => p.value === value)?.label ?? value;
                  }}
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
                  {(value: string) => {
                    if (!value) return null;
                    return PAYMENT_STATUS_OPTIONS.find(s => s.value === value)?.label ?? value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value} label={s.label}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            intent="ghost"
            size="sm"
            onClick={() => load(period, status)}
            disabled={isPending}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            title="Обновить данные"
            aria-label="Обновить реестр платежей"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* 1-Click Fast CSV Export Button */}
        <div className="flex items-center gap-2">
          <Button
            intent="outline"
            size="sm"
            onClick={() => downloadCsvExport({ type: 'payments', period, status, tenantId })}
            className="h-9 px-4 font-bold text-xs bg-background hover:bg-muted shadow-xs transition-all flex items-center gap-2 border-border/80"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Экспорт в CSV</span>
          </Button>
        </div>
      </div>

      {/* DataTable */}
      <div className="rounded-2xl border border-border/70 shadow-xs bg-background/60 backdrop-blur-xl overflow-hidden">
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

// ── Balance Correction Tab ──────────────────────────────────────────────────
function BalanceCorrectionTab() {
  const [email, setEmail]       = useState('');
  const [amount, setAmount]     = useState('');
  const [reason, setReason]     = useState('');
  const [shakeKey, setShakeKey] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents === 0) {
      toast.error('Введите корректную сумму');
      setShakeKey(Date.now());
      return;
    }
    if (!reason.trim()) {
      toast.error('Укажите причину операции');
      setShakeKey(Date.now());
      return;
    }

    startTransition(async () => {
      const { updateBalanceAction } = await import('@/actions/admin/users');
      const fd = new FormData();
      fd.append('email', email.trim());
      fd.append('amount', String(cents));
      fd.append('reason', reason.trim());
      
      try {
        const res = await updateBalanceAction(fd);
        if (res && 'success' in res && !res.success) {
          toast.error(res.error);
        } else if (res && 'success' in res && res.success) {
          if (res.status === 'QUARANTINE') {
            toast.warning(`⏳ Отправлено на одобрение владельцу: ${fmt(cents, true)} → ${email}`);
          } else {
            toast.success(`💰 Баланс скорректирован: ${fmt(cents, true)} → ${email}`);
          }
          setEmail(''); setAmount(''); setReason('');
        }
      } catch (err) {
        toast.error((err as Error).message ?? 'Ошибка корректировки');
      }
    });
  }

  const centsValue = parseFloat(amount) * 100;
  const isNeg = !isNaN(centsValue) && centsValue < 0;
  const isPos = !isNaN(centsValue) && centsValue > 0;

  return (
    <div className="max-w-xl mx-auto py-4">
      <div 
        key={shakeKey} 
        className={`rounded-2xl border border-border/70 shadow-lg bg-card/70 backdrop-blur-xl p-8 space-y-6 transition-all ${
          shakeKey > 0 ? 'animate-shake' : ''
        }`}
      >
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-primary/10 text-primary border border-primary/20 rounded-2xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Ручная корректировка баланса</h3>
            <p className="text-xs text-muted-foreground font-medium tracking-wide">
              Двухконтурная проводка с проверкой дневного лимита EscrowGuard.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email клиента</label>
            <Input
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background text-xs h-10 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Сумма (₽)</label>
              {isNeg && <span className="text-[10px] text-destructive font-bold uppercase tracking-tight">⚠️ Списание с баланса</span>}
              {isPos && <span className="text-[10px] text-success font-bold uppercase tracking-tight">✅ Зачисление на баланс</span>}
            </div>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00 (или отрицательное для списания)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className={`font-mono font-bold text-sm h-10 bg-background ${
                isNeg ? "border-destructive/40 bg-destructive/5 text-destructive" : 
                isPos ? "border-success/40 bg-success/5 text-success" : ""
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Причина операции</label>
            <Textarea
              placeholder="Компенсация задержки, ручной возврат средств, исправление сбоя..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              className="bg-background text-xs leading-relaxed"
            />
          </div>

          <Button
            type="submit"
            intent={isNeg ? "destructive" : "primary"}
            className="w-full h-11 font-bold uppercase tracking-widest text-xs shadow-md transition-all active:scale-[0.99]"
            disabled={isPending || !email || !amount || !reason}
          >
            {isPending ? 'Проведение операции...' : (isNeg ? 'Произвести списание' : 'Пополнить баланс')}
          </Button>
        </form>

        <div className="bg-warning/10 border border-warning/25 rounded-2xl p-4 flex gap-3 text-warning">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="text-[11px] font-medium leading-relaxed">
            <span className="font-bold block mb-0.5 uppercase tracking-tight">Лимиты безопасности EscrowGuard:</span>
            Операции операторов свыше 10 000 ₽ в сутки автоматически отправляются в карантин на подтверждение Владельцем.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Export ─────────────────────────────────────────────────────────────
export function FinanceClient({
  initialLedger,
  initialPayments,
  initialPeriod,
  tenantId,
  initialReconciliationSummary,
}: FinanceClientProps) {
  const discrepancyCount = initialReconciliationSummary?.discrepancyUsersCount ?? 0;

  return (
    <Tabs defaultValue="ledger" className="w-full">
      <TabsList variant="line" className="gap-6 border-b border-divider w-full justify-start rounded-none h-auto p-0">
        <TabsTrigger value="ledger" className="h-12 px-0 bg-transparent border-none shadow-none data-active:bg-transparent data-active:shadow-none font-bold uppercase tracking-widest text-[11px]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>История транзакций</span>
          </div>
        </TabsTrigger>
        <TabsTrigger value="payments" className="h-12 px-0 bg-transparent border-none shadow-none data-active:bg-transparent data-active:shadow-none font-bold uppercase tracking-widest text-[11px]">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span>Реестр платежей</span>
          </div>
        </TabsTrigger>
        <TabsTrigger value="reconciliation" className="h-12 px-0 bg-transparent border-none shadow-none data-active:bg-transparent data-active:shadow-none font-bold uppercase tracking-widest text-[11px]">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4" />
            <span>Сверка Ledger</span>
            {discrepancyCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-destructive/15 text-destructive border border-destructive/20 animate-pulse">
                {discrepancyCount}
              </span>
            )}
          </div>
        </TabsTrigger>
        <TabsTrigger value="topup" className="h-12 px-0 bg-transparent border-none shadow-none data-active:bg-transparent data-active:shadow-none font-bold uppercase tracking-widest text-[11px]">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            <span>Корректировка</span>
          </div>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="ledger" className="pt-6">
        <LedgerTab initial={initialLedger} period={initialPeriod} tenantId={tenantId} />
      </TabsContent>
      
      <TabsContent value="payments" className="pt-6">
        <PaymentsTab initial={initialPayments} period={initialPeriod} tenantId={tenantId} />
      </TabsContent>
      
      <TabsContent value="reconciliation" className="pt-6">
        <ReconciliationTab tenantId={tenantId} initialSummary={initialReconciliationSummary} />
      </TabsContent>

      <TabsContent value="topup" className="pt-6">
        <BalanceCorrectionTab />
      </TabsContent>
    </Tabs>
  );
}

