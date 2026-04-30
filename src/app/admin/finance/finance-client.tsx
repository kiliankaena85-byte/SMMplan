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
import { Wallet, History, AlertTriangle } from 'lucide-react';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Сегодня' },
  { value: 'week',  label: '7 дней' },
  { value: 'month', label: '30 дней' },
  { value: 'all',   label: 'Всё время' },
] as const;

interface FinanceClientProps {
  initialLedger: LedgerPageResult;
  initialPeriod: string;
}

function fmt(cents: number, showSign = false): string {
  const sign = showSign && cents > 0 ? '+' : '';
  return `${sign}${(Math.abs(cents) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

// ── Ledger Tab ──────────────────────────────────────────────────────────────
function LedgerTab({ initial, period: initPeriod }: { initial: LedgerPageResult; period: string }) {
  const [period, setPeriod]       = useState(initPeriod);
  const [data,   setData]         = useState<LedgerPageResult>(initial);
  const [isPending, startTransition] = useTransition();

  const load = useCallback((newPeriod: string) => {
    startTransition(async () => {
      const r = await getLedgerAction({
        period:   newPeriod as 'today' | 'week' | 'month' | 'all',
        pageSize: 100, // Load more for DataTable
      });
      setData(r);
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
          { label: 'Зачислено', value: data.totals.approved,    color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
          { label: 'Возвраты',  value: data.totals.refunds,     color: 'bg-rose-50 border-rose-100 text-rose-700' },
          { label: 'Карантин',  value: data.totals.quarantine,  color: 'bg-amber-50 border-amber-100 text-amber-700' },
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
            <SelectValue placeholder="Период" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl overflow-hidden">
        <div className="p-0">
          <DataTable 
            columns={columns} 
            data={data.items} 
            searchKey="userEmail"
            searchPlaceholder="Фильтр по email..."
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
      <div className="rounded-2xl border border-slate-100/50 shadow-xl bg-white/60 backdrop-blur-xl p-8 space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-sky-100 text-sky-600 rounded-2xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Ручная корректировка</h3>
            <p className="text-xs text-slate-500 font-medium tracking-wide">
              Средства проходят проверку дневного лимита EscrowGuard.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email клиента</label>
            <Input
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Сумма (₽)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className={isNeg ? "border-rose-300 bg-rose-50 text-rose-900 font-mono font-bold" : isPos ? "border-emerald-300 bg-emerald-50 text-emerald-900 font-mono font-bold" : "font-mono font-bold"}
            />
            {isNeg && <p className="text-[10px] text-rose-500 font-bold uppercase tracking-tight">⚠️ Будет списано с баланса</p>}
            {isPos && <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">✅ Будет зачислено на баланс</p>}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Причина</label>
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

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="text-[11px] text-amber-700 font-medium leading-relaxed">
            <span className="font-bold block mb-1 uppercase tracking-tighter">Внимание!</span>
            Операции Support/Manager свыше 10 000 ₽ в сутки автоматически уходят в карантин на подтверждение владельцем. Все действия логируются в Ledger.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Export ─────────────────────────────────────────────────────────────
export function FinanceClient({ initialLedger, initialPeriod }: FinanceClientProps) {
  return (
    <Tabs defaultValue="ledger" className="w-full">
      <TabsList variant="line" className="gap-6 border-b border-divider w-full justify-start rounded-none h-auto p-0">
        <TabsTrigger value="ledger" className="h-12 px-0 bg-transparent border-none shadow-none data-active:bg-transparent data-active:shadow-none font-bold uppercase tracking-widest text-[11px]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>История транзакций</span>
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
        <LedgerTab initial={initialLedger} period={initialPeriod} />
      </TabsContent>
      
      <TabsContent value="topup" className="pt-6">
        <BalanceCorrectionTab />
      </TabsContent>
    </Tabs>
  );
}
