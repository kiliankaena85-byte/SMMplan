'use client';

import React, { useState } from 'react';
import { ActionForm } from '@/components/admin/action-form';
import { SubmitButton } from '@/components/admin/submit-button';
import { massOrderCalculateAction, massOrderCheckoutAction } from '@/actions/order/mass';
import { Zap, AlertCircle, CheckCircle2, Loader2, Wallet, CreditCard, Bitcoin } from 'lucide-react';

export function MassOrderForm() {
  const [text, setText] = useState('');
  const [email, setEmail] = useState('');
  const [gateway, setGateway] = useState<'yookassa' | 'balance' | 'cryptobot'>('yookassa');
  
  const [calculation, setCalculation] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async () => {
    setIsCalculating(true);
    setCalculation(null);
    try {
      const res = await massOrderCalculateAction({ text });
      if (res.success) {
        setCalculation(res.data);
      } else {
        setCalculation({ globalError: res.error });
      }
    } catch (e: any) {
      setCalculation({ globalError: e.message });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCheckout = async () => {
    const res = await massOrderCheckoutAction({ text, email, gateway });
    if (res.success && res.data?.paymentUrl) {
      window.location.href = res.data.paymentUrl;
    }
    return res;
  };

  return (
    <div className="space-y-6">
      <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <Zap className="w-24 h-24" />
        </div>
        
        <h2 className="text-xl font-bold mb-2">Формат массового заказа</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Введите заказы в формате: <code className="bg-muted px-1.5 py-0.5 rounded text-primary">ID_услуги | Ссылка | Количество</code> (каждый заказ с новой строки).
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="101 | https://t.me/channel | 1000&#10;102 | https://t.me/post/1 | 500"
          className="w-full min-h-[200px] p-4 rounded-xl border border-border bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-y shadow-sm font-mono mb-4"
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCalculate}
            disabled={isCalculating || !text.trim()}
            className="bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 px-6 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2"
          >
            {isCalculating && <Loader2 className="w-4 h-4 animate-spin" />}
            Подсчитать стоимость
          </button>
        </div>
      </div>

      {calculation && (
        <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-sm p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {calculation.globalError ? (
            <div className="flex items-start gap-3 text-danger-600 bg-danger-50 p-4 rounded-xl">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{calculation.globalError}</div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-4">
                  <span className="text-muted-foreground font-medium">Валидных заказов:</span>
                  <span className="font-bold text-lg">{calculation.validCount}</span>
                </div>
                
                {calculation.errors?.length > 0 && (
                  <div className="bg-warning-50 text-warning-700 border border-warning-200 p-4 rounded-xl text-sm">
                    <p className="font-bold mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Найдены ошибки:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {calculation.errors.map((err: any, i: number) => (
                        <li key={i}>Строка {err.line > 0 ? err.line : '?'}: {err.error} <span className="opacity-50">({err.text})</span></li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-border/50 pb-4 pt-2">
                  <span className="text-foreground font-bold text-lg">К оплате:</span>
                  <span className="font-extrabold text-2xl tabular-nums tracking-tight">{calculation.totalRub.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>

              {calculation.validCount > 0 && (
                <ActionForm action={handleCheckout} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Ваш Email</label>
                    <input
                      type="email"
                      required
                      placeholder="address@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Способ оплаты</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className={`cursor-pointer flex items-center gap-3 p-4 rounded-xl border transition-all ${gateway === 'balance' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-background hover:bg-muted/50'}`}>
                        <input type="radio" name="gateway" value="balance" checked={gateway === 'balance'} onChange={() => setGateway('balance')} className="sr-only" />
                        <Wallet className={`w-5 h-5 ${gateway === 'balance' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-semibold ${gateway === 'balance' ? 'text-primary' : 'text-foreground'}`}>Баланс</span>
                      </label>

                      <label className={`cursor-pointer flex items-center gap-3 p-4 rounded-xl border transition-all ${gateway === 'yookassa' ? 'border-zinc-900 bg-zinc-900 text-white ring-1 ring-zinc-900' : 'border-border bg-background hover:bg-muted/50'}`}>
                        <input type="radio" name="gateway" value="yookassa" checked={gateway === 'yookassa'} onChange={() => setGateway('yookassa')} className="sr-only" />
                        <CreditCard className={`w-5 h-5 ${gateway === 'yookassa' ? 'text-white' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-semibold ${gateway === 'yookassa' ? 'text-white' : 'text-foreground'}`}>Картой / СБП</span>
                      </label>

                      <label className={`cursor-pointer flex items-center gap-3 p-4 rounded-xl border transition-all ${gateway === 'cryptobot' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600' : 'border-border bg-background hover:bg-muted/50'}`}>
                        <input type="radio" name="gateway" value="cryptobot" checked={gateway === 'cryptobot'} onChange={() => setGateway('cryptobot')} className="sr-only" />
                        <Bitcoin className={`w-5 h-5 ${gateway === 'cryptobot' ? 'text-indigo-600' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-semibold ${gateway === 'cryptobot' ? 'text-indigo-700' : 'text-foreground'}`}>CryptoBot</span>
                      </label>
                    </div>
                  </div>

                  <SubmitButton className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-14 rounded-xl text-lg shadow-[0_8px_20px_rgb(0,0,0,0.1)] transition-all">
                    Оплатить {calculation.totalRub.toLocaleString('ru-RU')} ₽
                  </SubmitButton>
                </ActionForm>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
