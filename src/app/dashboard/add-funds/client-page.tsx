'use client';

import { useState, useTransition } from 'react';
import { createTopUpPaymentAction } from '@/actions/user/top-up.action';
import { activatePromoCodeAction } from '@/actions/user/promo';
import { CreditCard, Banknote, Wallet, Gift, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const PRESETS = [300, 500, 1000, 2000, 5000, 10000];

const METHODS = [
  { id: 'yookassa', label: 'Банковская карта', icon: CreditCard, note: 'Visa / MC / МИР / СБП' },
  { id: 'cryptobot',  label: 'Криптовалюта (CryptoBot)', icon: Wallet, note: 'USDT, TON, BTC, ETH' },
] as const;

export default function AddFundsPage() {
  const router = useRouter();
  const [amount, setAmount]     = useState<number>(1000);
  const [method, setMethod]     = useState<'yookassa' | 'cryptobot'>('yookassa');
  const [error,  setError]      = useState<string | null>(null);
  const [consent, setConsent]   = useState(false);
  const [isPending, startTransition] = useTransition();

  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [isPromoPending, startPromoTransition] = useTransition();

  function handlePreset(val: number) {
    setAmount(val);
    setError(null);
  }

  function handleSubmit() {
    if (amount < 100) {
      setError('Минимальная сумма — 100 ₽');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await createTopUpPaymentAction(amount, method);
        if (res.success && res.paymentUrl) {
          window.location.href = res.paymentUrl;
        } else {
          setError((res as { error?: string }).error || 'Ошибка при создании платежа');
        }
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
        if (res?.success) {
          setPromoSuccess(`Промокод активирован! Начислено ${(res.amount / 100).toFixed(2)} ₽`);
          setPromoCode('');
          router.refresh(); // Refresh balance in header
        } else {
          setPromoError((res as {error?: string})?.error || 'Неизвестная ошибка при активации');
        }
      } catch (e: any) {
        setPromoError(e.message || 'Ошибка активации');
      }
    });
  }

  return (
    <div className="max-w-lg space-y-6 animate-in fade-in duration-500">
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
                className={`relative py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200
                  focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none ${
                  amount === val
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted'
                }`}
                aria-label={`Пополнить на ${val} рублей`}
                aria-pressed={amount === val}
              >
                {val === 1000 && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">
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
              type="number"
              id="top-up-amount"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              min={100}
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
                onClick={() => setMethod(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
                  method === id
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted'
                }`}
                aria-pressed={method === id}
                aria-label={`Оплатить через ${label}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${method === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs text-muted-foreground">{note}</div>
                </div>
                <div className={`ml-auto w-4 h-4 rounded-full border-2 shrink-0 ${method === id ? 'border-primary bg-primary' : 'border-border'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5" role="alert">
            {error}
          </p>
        )}

        {/* Consent Checkbox */}
        <div className="flex bg-muted/30 border border-border/50 rounded-xl p-3.5 gap-3">
          <input
            type="checkbox"
            id="legal-consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary/50"
          />
          <label htmlFor="legal-consent" className="text-xs text-muted-foreground leading-relaxed">
            Я подтверждаю заказ и соглашаюсь с{' '}
            <Link href="/legal/terms" target="_blank" className="text-primary hover:underline font-medium">Договором оферты</Link>{' '}
            и{' '}
            <Link href="/legal/refund" target="_blank" className="text-primary hover:underline font-medium">Политикой возврата (Refund Policy)</Link>.
          </label>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || amount < 100 || !consent}
          aria-label={`Перейти к оплате ${amount} рублей`}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50
            font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-sm text-base
            focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
        >
          {isPending
            ? '⟳ Создаём платёж...'
            : `Оплатить ${amount.toLocaleString('ru-RU')} ₽`}
        </button>

        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
          <Wallet className="w-3 h-3" />
          Минимум 100 ₽ · Безопасная оплата через ЮKassa · Мгновенное зачисление
        </p>
      </div>

      {/* Promo Code Section */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Gift className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Подарочный код</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Активируйте купон для получения бонуса на баланс</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={e => setPromoCode(e.target.value.toUpperCase())}
            placeholder="PROMOCODE"
            className="flex-1 border border-border rounded-xl px-4 py-3 text-sm font-mono uppercase text-foreground bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
          <button
            onClick={handlePromoSubmit}
            disabled={isPromoPending || !promoCode.trim()}
            className="px-6 bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 font-semibold rounded-xl transition-all duration-200"
          >
            {isPromoPending ? '...' : 'Применить'}
          </button>
        </div>

        {promoError && (
          <p className="text-xs text-rose-600 font-semibold">{promoError}</p>
        )}
        {promoSuccess && (
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            {promoSuccess}
          </p>
        )}
      </div>
    </div>
  );
}
