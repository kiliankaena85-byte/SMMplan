'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { createTopUpPaymentAction } from '@/actions/user/top-up.action';
import { activatePromoCodeAction } from '@/actions/user/promo';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CreditCard, Banknote, Wallet, Gift, CheckCircle2, CheckSquare, Square } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const PRESETS = [10, 50, 100, 300, 500, 1000];

const METHODS = [
  { id: 'yookassa', label: 'Банковская карта', icon: CreditCard, note: 'Visa / MC / МИР / СБП (ЮKassa)' },
  { id: 'robokassa', label: 'Робокасса', icon: CreditCard, note: 'Карты РФ/СНГ, СБП, Электронные деньги' },
  { id: 'cryptobot',  label: 'Криптовалюта (CryptoBot)', icon: Wallet, note: 'USDT, TON, BTC, ETH' },
] as const;

export default function AddFundsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get('success') === '1';
  const [amount, setAmount]     = useState<number>(50);
  const [method, setMethod]     = useState<'yookassa' | 'cryptobot' | 'robokassa'>('yookassa');
  const [error,  setError]      = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Автофокус при загрузке страницы работает только на десктопных экранах (>= 1024px)
    // чтобы избежать автоматического вызова экранной клавиатуры на телефонах,
    // которая перекрывает методы оплаты, и нежелательного масштабирования (зума) в iOS Safari
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      inputRef.current?.focus();
    }
  }, []);

  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [isPromoPending, startPromoTransition] = useTransition();

  function handlePreset(val: number) {
    setAmount(val);
    setError(null);
  }

  function handleSubmit() {
    if (amount < 10) {
      setError('Минимальная сумма — 10 ₽');
      return;
    }
    if (isPending) return; // F5: double-submit guard
    setError(null);
    startTransition(async () => {
      try {
        const res = await createTopUpPaymentAction(amount, method);
        window.location.href = res.paymentUrl;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Неизвестная ошибка');
      }
    });
  }

  function handlePromoSubmit() {
    if (!promoCode.trim()) {
      setPromoError('Введите промокод');
      return;
    }
    setPromoError(null);
    setPromoSuccess(null);
    startPromoTransition(async () => {
      try {
        const res = await activatePromoCodeAction(promoCode);
        if (!res) throw new Error('Неизвестная ошибка при активации');
        setPromoSuccess(`Промокод активирован! Начислено ${(res.amount / 100).toFixed(2)} ₽`);
        setPromoCode('');
        router.refresh(); // Refresh balance in header
      } catch (e: unknown) {
        setPromoError(e instanceof Error ? e.message : 'Ошибка активации');
      }
    });
  }

  return (
    <div className="max-w-lg space-y-6 animate-in fade-in duration-500">
      {isSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">Баланс успешно пополнен!</h3>
            <p className="text-xs opacity-90 mt-0.5">Средства мгновенно зачислены на ваш счёт. Спасибо за доверие!</p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Пополнение баланса</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Средства поступают мгновенно после подтверждения платежа
        </p>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5 shadow-sm">

        {/* Amount presets */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">
            Сумма пополнения (₽)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {PRESETS.map(val => (
              <button
                key={val}
                type="button"
                onClick={() => handlePreset(val)}
                className={`relative min-h-[44px] md:min-h-[36px] rounded-xl text-sm font-semibold border transition-all duration-200
                  flex items-center justify-center
                  focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none ${
                  amount === val
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted'
                }`}
                aria-label={`Пополнить на ${val} рублей`}
                aria-pressed={amount === val}
              >
                {val === 1000 && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">
                    Популярный
                  </span>
                )}
                {val.toLocaleString('ru-RU')} ₽
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="relative">
            <input
              ref={inputRef}
              type="number"
              id="top-up-amount"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              min={10}
              max={500000}
              placeholder="Другая сумма"
              aria-label="Введите сумму пополнения"
              className="w-full border border-border rounded-xl px-4 py-3 text-lg font-mono text-foreground bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
              ₽
            </span>
          </div>
        </div>

        {/* Payment method */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">
            Способ оплаты
          </label>
          <div className="space-y-2">
            {METHODS.map(({ id, label, icon: Icon, note }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(20);
                  setMethod(id);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 min-h-[72px] rounded-xl border text-left transition-all duration-200 ${
                  method === id
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted'
                } focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none`}
                aria-pressed={method === id}
                aria-label={`Оплатить через ${label}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${method === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 min-h-[38px] flex flex-col justify-center py-0.5">
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs text-muted-foreground leading-snug">{note}</div>
                </div>
                <div className={`ml-auto w-4 h-4 rounded-full border-2 shrink-0 ${method === id ? 'border-primary bg-primary' : 'border-border'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm font-semibold text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2.5 animate-shake" role="alert">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          aria-label={`Перейти к оплате ${amount} рублей`}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50
            font-bold min-h-[48px] py-3.5 rounded-xl transition-all duration-200 shadow-md shadow-primary/20 text-base
            focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none cursor-pointer"
        >
          {isPending
            ? '⟳ Создаём платёж...'
            : `Оплатить ${amount.toLocaleString('ru-RU')} ₽`}
        </button>

        {/* Legal notice */}
        <p className="text-[10px] leading-relaxed text-muted-foreground text-center px-2">
          Нажимая «Оплатить», вы принимаете{' '}
          <Link
            href="/legal/terms"
            target="_blank"
            className="text-primary hover:underline font-semibold"
          >
            Договор оферты
          </Link>{' '}
          и{' '}
          <Link
            href="/legal/refund"
            target="_blank"
            className="text-primary hover:underline font-semibold"
          >
            Политику возврата (Refund Policy)
          </Link>.
        </p>

        {/* Trust Badges */}
        <div className="pt-3 border-t border-border/50 flex flex-wrap items-center justify-center gap-4 text-[11px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> МИР / СБП / Карты РФ
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> 54-ФЗ Онлайн-чеки
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> SSL 256-bit Защита
          </span>
        </div>
      </div>

      {/* Promo Code Section */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Gift className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Подарочный код</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Активируйте купон для получения бонуса на баланс</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={e => setPromoCode(e.target.value.toUpperCase())}
            placeholder="PROMOCODE"
            className="w-full sm:flex-1 border border-border rounded-xl px-4 py-3 text-sm font-mono uppercase text-foreground bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
          <button
            onClick={handlePromoSubmit}
            disabled={isPromoPending || !promoCode.trim()}
            className="w-full sm:w-auto px-6 py-3 min-h-[44px] md:min-h-[36px] bg-foreground text-background hover:opacity-90 disabled:opacity-50 font-bold rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none shrink-0 cursor-pointer"
          >
            {isPromoPending ? '...' : 'Применить'}
          </button>
        </div>

        {promoError && (
          <p className="text-xs font-semibold text-destructive">{promoError}</p>
        )}
        {promoSuccess && (
          <p className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {promoSuccess}
          </p>
        )}
      </div>
    </div>
  );
}
