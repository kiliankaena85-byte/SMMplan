'use client';

/**
 * FinanceClient v2 — RBAC & Polish
 *
 * Tabs:
 *   1. Ledger — История транзакций (DataTable)
 *   2. Balance Correction — Ручная корректировка (HeroUI)
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
import { columns } from './ledger-columns';
import { columns as paymentColumns, CopyButton } from './payment-columns';
import { Wallet, History, AlertTriangle, DollarSign } from 'lucide-react';
import Link from 'next/link';


const PERIOD_OPTIONS = [
  { value: 'today', label: 'Сегодня' },
  { value: 'week',  label: '7 дней' },
  { value: 'month', label: '30 дней' },
  { value: 'all',   label: 'Всё время' },
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

function renderMobilePayments(table: Table<PaymentDTO>) {
  return (
    <div className="space-y-3">
      {table.getRowModel().rows.map((row) => {
        const item = row.original;
        const isSucceeded = item.status === 'SUCCEEDED';
        const displayId = item.gatewayId || item.id;
        return (
          <div key={item.id} className="p-4 rounded-xl border border-border/60 bg-card shadow-md space-y-2 text-foreground">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate break-all">{item.userEmail}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]" title={displayId}>
                    ID: {displayId.slice(0, 8)}...
                  </span>
                  <CopyButton value={displayId} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-bold font-mono">
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
            
            <div className="flex justify-between items-center text-xs pt-1.5 border-t border-border/30">
              <span className="text-muted-foreground tabular-nums">
                {new Date(item.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  {GATEWAY_LABELS[item.gateway] || item.gateway}
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  item.status === 'SUCCEEDED' ? 'bg-success' : item.status === 'PENDING' ? 'bg-warning' : 'bg-destructive'
                }`} title={PAYMENT_STATUS_LABELS[item.status] || item.status} />
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
          <div key={item.id} className="p-4 rounded-xl border border-border/60 bg-card shadow-md space-y-2 text-foreground">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate break-all">{item.userEmail}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]" title={item.id}>
                    ID: {item.id.slice(0, 8)}...
                  </span>
                  <CopyButton value={item.id} />
                </div>
              </div>
              <div className={`text-right font-bold font-mono text-sm shrink-0 ${isPositive ? 'text-success' : 'text-destructive'}`}>
                {fmt(item.amount, true)}
              </div>
            </div>
            
            <div className="text-xs bg-muted/20 px-2.5 py-1.5 rounded-lg border border-border/30 space-y-1">
              <p className="font-medium leading-relaxed">{item.reason}</p>
              <p className="text-[10px] text-muted-foreground font-medium">
                {item.adminId ? `👤 Оператор (${item.adminId.slice(0, 6)})` : '⚙️ Система'}
              </p>
            </div>
            
            <div className="flex justify-between items-center text-xs pt-1.5 border-t border-border/30">
              <span className="text-muted-foreground tabular-nums">
                {new Date(item.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
              {item.status !== 'APPROVED' && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  item.status === 'QUARANTINE' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                }`}>
                  {LEDGER_STATUS_LABELS[item.status] || item.status}
                </span>
              )}
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
}

function fmt(cents: number, showSign = false): string {
  const sign = showSign && cents > 0 ? '+' : '';
  return `${sign}${(Math.abs(cents) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

// ── Ledger Tab ──────────────────────────────────────────────────────────────
function LedgerTab({ initial, period: initPeriod, tenantId }: { initial: LedgerPageResult; period: string; tenantId?: string }) {
  const [period, setPeriod]       = useState(initPeriod);
  const [data,   setData]         = useState<LedgerPageResult>(initial);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isPending, startTransition] = useTransition();

  const load = useCallback((newPeriod: string) => {
    startTransition(async () => {
      const r = await getLedgerAction({
        period:   newPeriod as 'today' | 'week' | 'month' | 'all',
        pageSize: 100, // Load more for DataTable
        tenantId,
      });
      if (!('error' in r)) {
        setData(r);
      } else {
        toast.error(r.error);
      }
    });
  }, []);

  function applyPeriod(v: string | null) {
    if (!v) return;
    setPeriod(v);
    load(v);
  }

  return (
    <div className="space-y-6">
      {/* Totals strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Зачислено', value: data.totals.approved,    color: 'bg-success/10 border-emerald-100 text-emerald-700' },
          { label: 'Возвраты',  value: data.totals.refunds,     color: 'bg-destructive/10 border-destructive/20 text-rose-700' },
          { label: 'Карантин',  value: data.totals.quarantine,  color: 'bg-warning/10 border-amber-100 text-amber-700' },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-6 transition-all`}>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">{s.label}</div>
            <div className="text-xl font-black tabular-nums">{fmt(s.value)}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center gap-4">
        <Select defaultValue={period} onValueChange={applyPeriod}>
          <SelectTrigger className="w-[180px]" size="sm">
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

      <div className="rounded-2xl border border-border/50 shadow-sm bg-background/60 backdrop-blur-xl overflow-hidden">
        <div className="p-0">
          <DataTable 
            columns={columns} 
            data={data.items} 
            searchKey="userEmail"
            searchPlaceholder="Фильтр по email..."
            renderMobileView={renderMobileLedger}
          />
        </div>
      </div>
    </div>
  );
}

// ── Balance Correction Tab ──────────────────────────────────────────────────
function BalanceCorrectionTab() {
  const [email, setEmail]       = useState('');
  const [amount, setAmount]     = useState('');
  const [reason, setReason]     = useState('');
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents === 0) {
      toast.error('Введите корректную сумму');
      return;
    }
    if (!reason.trim()) {
      toast.error('Укажите причину операции');
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
      <div className="rounded-2xl border border-border/50 shadow-xl bg-background/60 backdrop-blur-xl p-8 space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-sky-100 text-sky-600 rounded-2xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Ручная корректировка</h3>
            <p className="text-xs text-muted-foreground font-medium tracking-wide">
              Средства проходят проверку дневного лимита EscrowGuard.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email клиента</label>
            <Input
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Сумма (₽)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className={isNeg ? "border-rose-300 bg-destructive/10 text-rose-900 font-mono font-bold" : isPos ? "border-emerald-300 bg-success/10 text-emerald-900 font-mono font-bold" : "font-mono font-bold"}
            />
            {isNeg && <p className="text-[10px] text-destructive font-bold uppercase tracking-tight">⚠️ Будет списано с баланса</p>}
            {isPos && <p className="text-[10px] text-success font-bold uppercase tracking-tight">✅ Будет зачислено на баланс</p>}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Причина</label>
            <Textarea
              placeholder="Компенсация, ручной возврат..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
            />
          </div>

          <Button
            type="submit"
            intent={isNeg ? "destructive" : "primary"}
            className="w-full h-12 font-bold uppercase tracking-widest text-xs shadow-lg"
            disabled={isPending || !email || !amount || !reason}
          >
            {isPending ? 'Загрузка...' : (isNeg ? 'Произвести списание' : 'Пополнить баланс')}
          </Button>
        </form>

        <div className="bg-warning/10 border border-amber-100 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <div className="text-[11px] text-amber-700 font-medium leading-relaxed">
            <span className="font-bold block mb-1 uppercase tracking-tighter">Внимание!</span>
            Операции Support/Manager свыше 10 000 ₽ в сутки автоматически уходят в карантин на подтверждение владельцем. Все действия логируются в Ledger.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Payments Tab ────────────────────────────────────────────────────────────
function PaymentsTab({ initial, period: initPeriod, tenantId }: { initial: PaymentsPageResult; period: string; tenantId?: string }) {
  const [period, setPeriod]       = useState(initPeriod);
  const [data,   setData]         = useState<PaymentsPageResult>(initial);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isPending, startTransition] = useTransition();

  const load = useCallback((newPeriod: string) => {
    startTransition(async () => {
      const r = await getPaymentsAction({
        period:   newPeriod as 'today' | 'week' | 'month' | 'all',
        pageSize: 100,
        tenantId,
      });
      if (!('error' in r)) {
        setData(r);
      } else {
        toast.error(r.error);
      }
    });
  }, []);

  function applyPeriod(v: string | null) {
    if (!v) return;
    setPeriod(v);
    load(v);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <Select defaultValue={period} onValueChange={applyPeriod}>
          <SelectTrigger className="w-[180px]" size="sm">
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

      <div className="rounded-2xl border border-border/50 shadow-sm bg-background/60 backdrop-blur-xl overflow-hidden">
        <div className="p-0">
          <DataTable 
            columns={paymentColumns} 
            data={data.items} 
            searchKey="userEmail"
            searchPlaceholder="Фильтр по email..."
            renderMobileView={renderMobilePayments}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Export ─────────────────────────────────────────────────────────────
export function FinanceClient({ initialLedger, initialPayments, initialPeriod, tenantId }: FinanceClientProps) {
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
      
      <TabsContent value="topup" className="pt-6">
        <BalanceCorrectionTab />
      </TabsContent>
    </Tabs>
  );
}
