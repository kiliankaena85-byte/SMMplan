'use client';

/**
 * FinanceClient — Sprint 1.6
 *
 * Tabs:
 *   1. Ledger — история транзакций с фильтрами
 *   2. Balance Correction — ручное пополнение/коррекция
 */

import { useState, useTransition, useCallback } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { getLedgerAction, type LedgerEntryDTO, type LedgerPageResult } from '@/actions/admin/finance/ledger';

// ── Types / constants ───────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  APPROVED:    '✅ Одобрено',
  QUARANTINE:  '🔒 Карантин',
  REJECT:      '❌ Отклонено',
};

const STATUS_COLORS: Record<string, string> = {
  APPROVED:   'bg-emerald-100 text-emerald-700',
  QUARANTINE: 'bg-amber-100   text-amber-700',
  REJECT:     'bg-rose-100    text-rose-700',
};

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Сегодня' },
  { value: 'week',  label: '7 дней' },
  { value: 'month', label: '30 дней' },
  { value: 'all',   label: 'Всё время' },
] as const;

const FILTER_STATUS = ['ALL', 'APPROVED', 'QUARANTINE', 'REJECT'] as const;

interface FinanceClientProps {
  /** Initial ledger data loaded server-side */
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
  const [status, setStatus]       = useState<string>('ALL');
  const [search, setSearch]       = useState('');
  const [data,   setData]         = useState<LedgerPageResult>(initial);
  const [cursor, setCursor]       = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback((opts: { period?: string; status?: string; search?: string; cursor?: string }) => {
    startTransition(async () => {
      const r = await getLedgerAction({
        period:   (opts.period  ?? period) as 'today' | 'week' | 'month' | 'all',
        status:   (opts.status  ?? status) as 'ALL' | 'APPROVED' | 'QUARANTINE' | 'REJECT',
        search:   opts.search   ?? search,
        cursor:   opts.cursor,
        pageSize: 50,
      });
      if (opts.cursor) {
        setData(prev => ({ ...r, items: [...prev.items, ...r.items] }));
      } else {
        setData(r);
        setCursor(null);
      }
    });
  }, [period, status, search]);

  function applyPeriod(v: string) {
    setPeriod(v);
    load({ period: v, cursor: undefined });
  }

  function applyStatus(v: string) {
    setStatus(v);
    load({ status: v, cursor: undefined });
  }

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    load({ cursor: undefined });
  }

  function loadMore() {
    if (!data.nextCursor) return;
    setCursor(data.nextCursor);
    load({ cursor: data.nextCursor });
  }

  return (
    <div className="space-y-4">
      {/* Totals strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Зачислено', value: data.totals.approved,    accent: 'text-emerald-600' },
          { label: 'Возвраты',  value: data.totals.refunds,     accent: 'text-rose-500' },
          { label: 'Карантин',  value: data.totals.quarantine,  accent: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
            <div className={`text-lg font-bold tabular-nums ${s.accent}`}>{fmt(s.value)}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        {/* Period toggle */}
        <div className="flex gap-2 flex-wrap">
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p.value}
              onClick={() => applyPeriod(p.value)}
              aria-pressed={period === p.value}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                period === p.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}

          <div className="ml-auto flex gap-2">
            {FILTER_STATUS.map(s => (
              <button
                key={s}
                onClick={() => applyStatus(s)}
                aria-pressed={status === s}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  status === s
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === 'ALL' ? 'Все' : STATUS_LABELS[s] ?? s}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <form onSubmit={applySearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Email клиента..."
            aria-label="Поиск по email"
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
          <button
            type="submit"
            disabled={isPending}
            aria-label="Применить поиск"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 disabled:opacity-50"
          >
            {isPending ? '...' : 'Найти'}
          </button>
        </form>
      </div>

      {/* Ledger Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full" aria-label="История транзакций">
          <thead>
            <tr className="text-left bg-muted/30 border-b border-border">
              <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Клиент</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Причина</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground text-right">Сумма</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Статус</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Дата</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.items.map(e => <LedgerRow key={e.id} entry={e} />)}
          </tbody>
        </table>

        {data.items.length === 0 && !isPending && (
          <div className="py-12 text-center text-sm text-muted-foreground">Нет транзакций за этот период</div>
        )}

        {isPending && (
          <div className="py-6 text-center text-sm text-muted-foreground animate-pulse">Загрузка...</div>
        )}

        {data.hasMore && (
          <div className="px-4 py-3 border-t border-border">
            <button
              onClick={loadMore}
              disabled={isPending}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              Показать ещё →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LedgerRow({ entry }: { entry: LedgerEntryDTO }) {
  const isPositive = entry.amount >= 0;
  return (
    <tr className="hover:bg-muted/20 transition-all duration-200">
      <td className="px-4 py-2.5">
        <Link
          href={`/admin/clients/${entry.userId}`}
          className="text-xs text-primary hover:underline font-mono transition-colors"
        >
          {entry.userEmail}
        </Link>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-xs text-muted-foreground truncate max-w-[280px] block" title={entry.reason}>
          {entry.reason}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className={`text-xs font-semibold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {fmt(entry.amount, true)}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[entry.status] ?? 'bg-muted text-muted-foreground'}`}>
          {STATUS_LABELS[entry.status] ?? entry.status}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(entry.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </td>
    </tr>
  );
}

// ── Balance Correction Tab ──────────────────────────────────────────────────
function BalanceCorrectionTab() {
  const [email, setEmail]       = useState('');
  const [amount, setAmount]     = useState('');
  const [reason, setReason]     = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
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
      // Dynamic import to avoid circular dependency
      const { updateBalanceAction } = await import('@/actions/admin/users');
      const fd = new FormData();
      fd.append('email', email.trim());
      fd.append('amount', String(cents));
      fd.append('reason', reason.trim());
      try {
        await updateBalanceAction(fd);
        toast.success(`💰 Баланс скорректирован: ${fmt(cents, true)} → ${email}`);
        setEmail(''); setAmount(''); setReason('');
      } catch (err) {
        toast.error((err as Error).message ?? 'Ошибка корректировки');
      }
    });
  }

  const cents = parseFloat(amount) * 100;
  const isNeg = !isNaN(cents) && cents < 0;
  const isPos = !isNaN(cents) && cents > 0;

  return (
    <div className="max-w-lg">
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">💰 Ручная корректировка баланса</h3>
          <p className="text-xs text-muted-foreground">
            Проходит через EscrowGuard. SUPPORT/MANAGER — суточный лимит.
            OWNER/ADMIN — без лимита.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="topup-email" className="text-xs text-muted-foreground mb-1 block">
              Email клиента
            </label>
            <input
              id="topup-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="client@example.com"
              aria-label="Email клиента для корректировки"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            />
          </div>

          <div>
            <label htmlFor="topup-amount" className="text-xs text-muted-foreground mb-1 block">
              Сумма ₽ (отрицательная = списание)
            </label>
            <input
              id="topup-amount"
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="100.00"
              aria-label="Сумма корректировки в рублях"
              className={`w-full px-3 py-2 text-sm font-mono rounded-lg border bg-background text-foreground outline-none focus:ring-2 transition-all duration-200 ${
                isNeg ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-200'
                : isPos ? 'border-emerald-400 focus:border-emerald-400 focus:ring-emerald-200'
                : 'border-border focus:border-primary focus:ring-primary/20'
              }`}
            />
            {!isNaN(cents) && amount && (
              <p className={`text-xs mt-1 ${isNeg ? 'text-rose-600' : 'text-emerald-600'}`}>
                {isNeg ? '⚠️ Списание' : '✅ Пополнение'}: {fmt(cents, true)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="topup-reason" className="text-xs text-muted-foreground mb-1 block">
              Причина (обязательно)
            </label>
            <textarea
              id="topup-reason"
              required
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Компенсация за сбой, ручной рефанд..."
              aria-label="Причина корректировки баланса"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !email || !amount || !reason}
            aria-label="Применить корректировку баланса"
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 disabled:opacity-50"
          >
            {isPending ? 'Обрабатывается...' : 'Применить корректировку'}
          </button>
        </form>
      </div>

      {/* Safety info */}
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 space-y-1">
        <div className="font-semibold">⚠️ EscrowGuard активен</div>
        <div>SUPPORT: суточный лимит ~10 000 ₽. Свыше — уходит в карантин на одобрение Owner.</div>
        <div>Все операции пишутся в ledger и audit-лог.</div>
      </div>
    </div>
  );
}

// ── Main Export ─────────────────────────────────────────────────────────────
export function FinanceClient({ initialLedger, initialPeriod }: FinanceClientProps) {
  const [tab, setTab] = useState<'ledger' | 'topup'>('ledger');

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-border">
        {(['ledger', 'topup'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-selected={tab === t}
            className={`px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'ledger' ? '📋 История транзакций' : '💰 Корректировка'}
          </button>
        ))}
      </div>

      {tab === 'ledger' && <LedgerTab initial={initialLedger} period={initialPeriod} />}
      {tab === 'topup'  && <BalanceCorrectionTab />}
    </div>
  );
}
