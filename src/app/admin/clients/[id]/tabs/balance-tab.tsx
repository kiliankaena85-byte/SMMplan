'use client';

import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateBalanceAction } from '@/actions/admin/users';
import {
  Shield,
  Zap,
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  Lock,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { UserDTO, PaymentDTO, OrderDTO } from './types';

interface BalanceTabProps {
  user: UserDTO;
  orders: OrderDTO[];
  payments: PaymentDTO[];
  canSeeFinances: boolean;
  onNavigateToPayments: () => void;
}

export function BalanceTab({
  user,
  orders,
  payments,
  canSeeFinances,
  onNavigateToPayments,
}: BalanceTabProps) {
  // Anti-Double-Click Balance State
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amountRub, setAmountRub] = useState('');
  const [reasonCode, setReasonCode] = useState('GOODWILL_LOYALTY');
  const [customReason, setCustomReason] = useState('');
  const [isPendingBalance, startBalanceTransition] = useTransition();
  const [balanceIdempotencyKey, setBalanceIdempotencyKey] = useState<string>(
    () => `balance-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );

  // Calculations
  const currentBalanceRub = (user.balance || 0) / 100;
  const totalDepositedRub = payments
    .filter(p => p.status === 'SUCCEEDED')
    .reduce((acc, p) => acc + p.amountRub, 0);
  const totalSpentRub = (user.totalSpent || 0) / 100;
  const parsedAmountRub = parseFloat(amountRub) || 0;
  const validPositiveAmount = parsedAmountRub > 0 ? parsedAmountRub : 0;
  const rawCents = Math.round(validPositiveAmount * 100);
  const signedAmountCents = direction === 'CREDIT' ? rawCents : -rawCents;
  const projectedBalanceRub =
    direction === 'CREDIT'
      ? currentBalanceRub + validPositiveAmount
      : currentBalanceRub - validPositiveAmount;
  const isOverdraft = direction === 'DEBIT' && projectedBalanceRub < 0;

  const problematicOrders = orders.filter(o =>
    ['CANCELED', 'PARTIAL', 'REFUNDED'].includes(o.status)
  );
  const recentSuccessfulPayment = payments.find(p => p.status === 'SUCCEEDED');

  const applyPredictiveChip = (
    amount: number,
    code: string,
    noteText: string,
    dir: 'CREDIT' | 'DEBIT' = 'CREDIT'
  ) => {
    setDirection(dir);
    setAmountRub(amount.toFixed(2));
    setReasonCode(code);
    setCustomReason(noteText);
    toast.success(`Подставлена сумма ${amount.toFixed(2)} ₽ из контекста`);
  };

  // Submit Balance with Anti-Double-Click Guard
  const handleBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPendingBalance) return; // Prevent double clicks
    if (validPositiveAmount <= 0) {
      toast.error('Укажите сумму больше 0 ₽');
      return;
    }
    if (isOverdraft) {
      toast.error('Списание превышает доступный баланс клиента');
      return;
    }
    const finalReason = customReason.trim() || reasonCode;
    if (finalReason.length < 5) {
      toast.error('Обоснование должно содержать минимум 5 символов');
      return;
    }

    startBalanceTransition(async () => {
      const fd = new FormData();
      fd.append('userId', user.id);
      fd.append('amount', signedAmountCents.toString());
      fd.append('reason', finalReason);
      fd.append('idempotencyKey', balanceIdempotencyKey);

      const res = await updateBalanceAction(fd);
      if (res.success) {
        toast.success(res.message || 'Баланс успешно обновлен');
        setAmountRub('');
        setCustomReason('');
        // Regenerate idempotency key for next action
        setBalanceIdempotencyKey(
          `balance-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        );
      } else {
        toast.error(res.error || 'Ошибка при изменении баланса');
      }
    });
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column (7 cols): Interactive Financial Terminal */}
      <div className="lg:col-span-7 space-y-6">
        {canSeeFinances && (
          <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-6 ring-1 ring-border/5 space-y-5">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span className="bg-primary/10 text-primary p-1.5 rounded-lg">
                    <Zap className="w-4 h-4" />
                  </span>
                  Терминал изменения баланса
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ручное начисление или списание средств оператором поддержки
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Текущий баланс
                </span>
                <span className="text-xl font-black text-foreground font-mono">
                  {currentBalanceRub.toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  ₽
                </span>
              </div>
            </div>

            {/* 1. Explicit Direction Segmented Control */}
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-muted/40 rounded-2xl border border-border/50">
              <button
                type="button"
                onClick={() => setDirection('CREDIT')}
                className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer select-none border ${
                  direction === 'CREDIT'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 shadow-xs ring-1 ring-emerald-500/20'
                    : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>➕ Начислить (Credit)</span>
              </button>
              <button
                type="button"
                onClick={() => setDirection('DEBIT')}
                className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer select-none border ${
                  direction === 'DEBIT'
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 shadow-xs ring-1 ring-rose-500/20'
                    : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <MinusCircle className="w-4 h-4" />
                <span>➖ Списать (Debit)</span>
              </button>
            </div>

            {/* 2. Predictive Context Chips */}
            {(problematicOrders.length > 0 || recentSuccessfulPayment) && (
              <div className="space-y-1.5 p-3.5 rounded-xl bg-muted/20 border border-border/40">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Предиктивные подсказки контекста
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {problematicOrders.slice(0, 2).map(po => (
                    <button
                      key={po.id}
                      type="button"
                      onClick={() =>
                        applyPredictiveChip(
                          po.chargeRub,
                          'ORDER_DELAY_COMPENSATION',
                          `Компенсация по заказу #${po.numericId || po.id.slice(-4)} (${po.serviceName})`,
                          'CREDIT'
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <span>
                        Заказ #{po.numericId || po.id.slice(-4)} ({po.chargeRub.toFixed(2)} ₽)
                      </span>
                    </button>
                  ))}
                  {recentSuccessfulPayment && (
                    <button
                      key={recentSuccessfulPayment.id}
                      type="button"
                      onClick={() =>
                        applyPredictiveChip(
                          recentSuccessfulPayment.amountRub,
                          'GOODWILL_LOYALTY',
                          `Бонус лояльности (${recentSuccessfulPayment.gateway.toUpperCase()})`,
                          'CREDIT'
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <span>
                        Пополнение ({recentSuccessfulPayment.amountRub.toFixed(2)} ₽)
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleBalanceSubmit} className="space-y-4">
              {/* Large Amount Input */}
              <div>
                <label className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5 block">
                  Сумма операции (в рублях)
                </label>
                <div className="relative flex items-center">
                  <span
                    className={`absolute left-4 font-mono font-black text-2xl ${
                      direction === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {direction === 'CREDIT' ? '+' : '−'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amountRub}
                    onChange={e => setAmountRub(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full h-14 text-2xl pl-10 pr-12 rounded-2xl border border-border/60 bg-background/50 shadow-sm text-foreground font-mono tracking-tight font-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <span className="absolute right-4 text-base font-mono font-bold text-muted-foreground">
                    ₽
                  </span>
                </div>
              </div>

              {/* Large Live Equation Projection Card */}
              {parsedAmountRub > 0 && (
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    isOverdraft
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                      : 'bg-muted/40 border-border/60 text-foreground'
                  }`}
                >
                  <div className="grid grid-cols-3 gap-2 items-center text-center font-mono">
                    <div className="p-2.5 rounded-xl bg-background/40 border border-border/40">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">
                        Было
                      </span>
                      <span className="font-bold text-base">
                        {currentBalanceRub.toFixed(2)} ₽
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-background/40 border border-border/40">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">
                        Операция
                      </span>
                      <span
                        className={`font-black text-lg ${
                          direction === 'CREDIT'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {direction === 'CREDIT' ? '+' : '−'}
                        {parsedAmountRub.toFixed(2)} ₽
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-background/70 border border-border/60 shadow-xs">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">
                        Станет
                      </span>
                      <span
                        className={`font-black text-xl ${
                          isOverdraft ? 'text-rose-600' : 'text-primary'
                        }`}
                      >
                        {projectedBalanceRub.toFixed(2)} ₽
                      </span>
                    </div>
                  </div>
                  {isOverdraft && (
                    <p className="text-xs font-bold text-rose-600 mt-2.5 flex items-center justify-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Внимание: списание превышает
                      текущий баланс клиента!
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5 block">
                    Причина
                  </label>
                  <select
                    value={reasonCode}
                    onChange={e => setReasonCode(e.target.value)}
                    className="w-full h-11 text-xs px-3 py-2 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground outline-none focus:border-primary transition-all font-medium cursor-pointer"
                  >
                    <option value="GOODWILL_LOYALTY">🎁 Лояльность / Бонус клиенту</option>
                    <option value="ORDER_DELAY_COMPENSATION">⏱️ Компенсация за заказ</option>
                    <option value="MANUAL_CORRECTION">🛠️ Корректировка баланса</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                    <span>
                      Обоснование для аудита <span className="text-destructive">*</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">min 5 симв.</span>
                  </label>
                  <input
                    name="reasonNote"
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    minLength={5}
                    placeholder="Номер тикета или причина..."
                    required
                    className="w-full h-11 text-xs px-3 py-2 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-all font-medium"
                  />
                </div>
              </div>

              {/* Submit Button with Anti-Double-Click Lock */}
              <button
                type="submit"
                disabled={isPendingBalance || isOverdraft || parsedAmountRub <= 0}
                className={`w-full h-12 text-sm font-black rounded-xl shadow-sm active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed ${
                  direction === 'CREDIT'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isPendingBalance ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Обработка операции...
                  </span>
                ) : (
                  <>
                    <Lock className="w-4 h-4 opacity-70" />
                    {direction === 'CREDIT' ? (
                      <span>
                        Начислить +{parsedAmountRub > 0 ? parsedAmountRub.toFixed(2) : '0.00'} ₽ на
                        баланс
                      </span>
                    ) : (
                      <span>
                        Списать −{parsedAmountRub > 0 ? parsedAmountRub.toFixed(2) : '0.00'} ₽ с
                        баланса
                      </span>
                    )}
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Right Column (5 cols): Financial Snapshot & Policies */}
      <div className="lg:col-span-5 space-y-6">
        {/* Financial Overview Card */}
        <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-6 ring-1 ring-border/5 space-y-4">
          <h4 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2 border-b border-border/50 pb-3">
            <CreditCard className="w-4 h-4 text-primary" />
            Финансовая сводка клиента
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                Всего пополнений
              </span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {totalDepositedRub.toLocaleString('ru-RU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                ₽
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                Всего потрачено
              </span>
              <span className="text-lg font-black text-foreground font-mono">
                {totalSpentRub.toLocaleString('ru-RU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                ₽
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                Платежей проведено
              </span>
              <span className="text-lg font-black text-foreground font-mono">
                {payments.filter(p => p.status === 'SUCCEEDED').length}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                Заказов оформлено
              </span>
              <span className="text-lg font-black text-foreground font-mono">
                {orders.length}
              </span>
            </div>
          </div>

          {/* Card Refund Quick Navigation Banner */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-3 mt-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground block">
                Возврат средств на карту?
              </span>
              <p className="text-[11px] text-muted-foreground">
                Инициируйте возврат из таблицы платежей
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToPayments}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-xs hover:bg-primary/90 transition-all cursor-pointer whitespace-nowrap"
            >
              В платежи →
            </button>
          </div>

          {/* Support Policy Notice */}
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40 space-y-1.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Shield className="w-3.5 h-3.5 text-primary" /> Правило финансового аудита:
            </div>
            <p>
              Все операции баланса логируются в журнал аудита с фиксацией IP, User-Agent и
              причины. Списания проверяются на овердрафт.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
