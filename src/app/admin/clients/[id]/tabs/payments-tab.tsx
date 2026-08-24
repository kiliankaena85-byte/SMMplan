'use client';

import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { requestCardRefundAction } from '@/actions/admin/users';
import {
  CreditCard,
  Receipt,
  RotateCcw,
  Shield,
  X,
} from 'lucide-react';
import { UserDTO, PaymentDTO } from './types';

interface PaymentsTabProps {
  user: UserDTO;
  payments: PaymentDTO[];
  canSeeFinances: boolean;
}

export function PaymentsTab({ user, payments, canSeeFinances }: PaymentsTabProps) {
  const currentBalanceRub = (user.balance || 0) / 100;

  // Card Refund Modal State (In Payments Tab)
  const [refundModalPayment, setRefundModalPayment] = useState<PaymentDTO | null>(null);
  const [refundAmountRub, setRefundAmountRub] = useState('');
  const [refundReason, setRefundReason] = useState('Возврат средств по запросу клиента');
  const [isPendingRefund, startRefundTransition] = useTransition();
  const [refundIdempotencyKey, setRefundIdempotencyKey] = useState<string>(
    () => `refund-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );

  // Submit Card Refund with Anti-Double-Click Guard
  const handleCardRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPendingRefund || !refundModalPayment) return; // Prevent double clicks

    const val = parseFloat(refundAmountRub);
    if (isNaN(val) || val <= 0) {
      toast.error('Укажите корректную сумму возврата');
      return;
    }
    if (val > refundModalPayment.amountRub) {
      toast.error(
        `Сумма возврата не может превышать исходный платеж (${refundModalPayment.amountRub.toFixed(2)} ₽)`
      );
      return;
    }
    if (val > currentBalanceRub) {
      toast.error(
        `Недостаточно средств на балансе клиента (${currentBalanceRub.toFixed(2)} ₽) для списания`
      );
      return;
    }

    startRefundTransition(async () => {
      const fd = new FormData();
      fd.append('userId', user.id);
      fd.append('paymentId', refundModalPayment.id);
      fd.append('amountKopecks', Math.round(val * 100).toString());
      fd.append('reason', refundReason.trim());
      fd.append('idempotencyKey', refundIdempotencyKey);

      const res = await requestCardRefundAction(fd);
      if (res.success) {
        toast.success(
          res.message || 'Средства списаны с баланса. Заявка на возврат передана финансисту'
        );
        setRefundModalPayment(null);
        setRefundAmountRub('');
        setRefundIdempotencyKey(
          `refund-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        );
      } else {
        toast.error(res.error || 'Ошибка при создании заявки на возврат');
      }
    });
  };

  return (
    <>
      <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl overflow-hidden ring-1 ring-border/5 space-y-4">
        <div className="px-5 py-3.5 border-b border-border/60 flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="bg-primary/10 text-primary p-1 rounded-md">
              <CreditCard className="w-3.5 h-3.5" />
            </span>
            История платежей и шлюз возврата на карту
          </h3>
          <span className="text-xs font-bold text-muted-foreground font-mono">
            Всего пополнений: {payments.length}
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-sm">У клиента пока нет платежей</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-muted/20">
                  <th className="py-2.5 px-4">Сумма</th>
                  <th className="py-2.5 px-3">Шлюз</th>
                  <th className="py-2.5 px-3">Статус</th>
                  <th className="py-2.5 px-3">ID Транзакции</th>
                  <th className="py-2.5 px-3">Чек 54-ФЗ</th>
                  <th className="py-2.5 px-3">Дата</th>
                  <th className="py-2.5 pr-4 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-foreground">
                      {p.amountRub.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 bg-muted border border-border rounded font-mono uppercase text-[10px] font-bold text-foreground">
                        {p.gateway}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {p.status === 'SUCCEEDED' ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-success/15 px-2 py-0.5 rounded-full border border-success/20">
                          Успешно
                        </span>
                      ) : p.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-warning/15 px-2 py-0.5 rounded-full border border-warning/20">
                          В обработке
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-destructive/15 px-2 py-0.5 rounded-full border border-destructive/20">
                          {p.status}
                        </span>
                      )}
                    </td>
                    <td
                      className="py-2.5 px-3 font-mono text-muted-foreground truncate max-w-[130px]"
                      title={p.gatewayId || p.id}
                    >
                      {p.gatewayId || p.id}
                    </td>
                    <td className="py-2.5 px-3">
                      {p.receiptId ? (
                        <span className="flex items-center gap-1 text-primary font-mono text-[10px] font-bold">
                          <Receipt className="w-3.5 h-3.5" /> Чек #54-ФЗ
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground whitespace-nowrap text-[11px]">
                      {new Date(p.createdAt).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {p.status === 'SUCCEEDED' && canSeeFinances && (
                        <button
                          type="button"
                          onClick={() => {
                            setRefundModalPayment(p);
                            setRefundAmountRub(p.amountRub.toString());
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Возврат на карту</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CARD REFUND MODAL DIALOG */}
      {refundModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border shadow-2xl rounded-2xl max-w-md w-full p-6 space-y-4 relative ring-1 ring-border/20">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <span className="bg-amber-500/10 text-amber-600 p-1 rounded-md">
                  <RotateCcw className="w-4 h-4" />
                </span>
                Оформление возврата на карту
              </h3>
              <button
                type="button"
                onClick={() => setRefundModalPayment(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-muted/40 p-3 rounded-xl border border-border/50 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Шлюз оплаты:</span>
                <span className="font-bold uppercase text-foreground">
                  {refundModalPayment.gateway}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID транзакции:</span>
                <span className="font-bold text-foreground truncate max-w-[180px]">
                  {refundModalPayment.gatewayId || refundModalPayment.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Сумма пополнения:</span>
                <span className="font-bold text-foreground">
                  {refundModalPayment.amountRub.toFixed(2)} ₽
                </span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-1">
                <span className="text-muted-foreground">Текущий баланс клиента:</span>
                <span className="font-bold text-primary">{currentBalanceRub.toFixed(2)} ₽</span>
              </div>
            </div>

            <form onSubmit={handleCardRefundSubmit} className="space-y-3.5">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 flex items-center justify-between">
                  <span>Сумма к возврату (в рублях)</span>
                  <span
                    className="text-[10px] font-bold text-primary cursor-pointer hover:underline"
                    onClick={() => setRefundAmountRub(refundModalPayment.amountRub.toString())}
                  >
                    Вся сумма: {refundModalPayment.amountRub.toFixed(2)} ₽
                  </span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={refundModalPayment.amountRub}
                    value={refundAmountRub}
                    onChange={e => setRefundAmountRub(e.target.value)}
                    required
                    className="w-full h-9 text-sm pl-3 pr-8 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground font-mono font-bold outline-none focus:border-primary transition-all"
                  />
                  <span className="absolute right-3 text-xs font-mono font-bold text-muted-foreground">
                    ₽
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                  Причина возврата (для заявления и чека 54-ФЗ)
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  required
                  className="w-full h-9 text-xs px-3 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Защита от двойного расхода:
                </p>
                <p>
                  Сумма будет <strong>моментально списана с баланса в личном кабинете</strong>, а
                  заявка с номером платежа передана финансисту для проведения возврата в ЮKassa /
                  Робокассе.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundModalPayment(null)}
                  className="flex-1 h-9 rounded-xl text-xs font-bold bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isPendingRefund}
                  className="flex-2 h-9 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-primary-foreground shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isPendingRefund ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Списание...
                    </span>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Списать и передать финансисту</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
