'use client';

import { useOrderEngine } from '@/hooks/useOrderEngine';
import { ActionForm } from '@/components/admin/action-form';
import { checkoutAction } from '@/actions/order/checkout';
import { DripFeedSettings } from '@/components/orders/DripFeedSettings';
import { PlatformSelectorFallback } from '@/components/orders/PlatformSelectorFallback';
import { IntelligencePlatform } from '@/services/analyzer/link-rules';
import {
  Plus, Minus, Search, Mail, ArrowRight,
  Loader2, Clock, CheckCircle2,
} from 'lucide-react';
import React, { useState } from 'react';
  import Link from 'next/link';

const inputCls =
  'w-full rounded-xl border border-border bg-background text-foreground ' +
  'text-sm outline-none placeholder:text-muted-foreground ' +
  'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200';



export function SmartOrderForm() {
  const engine = useOrderEngine();
  const {
    url, setUrl,
    categoryId, setCategoryId,
    selectedService, setSelectedService,
    quantity, setQuantity,
    email, setEmail,
    dripFeedEnabled, setDripFeedEnabled,
    runs, setRuns,
    dripInterval, setDripInterval,
    services,
    isLoading,
    isCalculating,
    totalPriceFormatted,
    validate,
    validationErrors,
  } = engine;
  const { agreedToTerms, setAgreedToTerms } = engine;

  const handleAction = async () => {
    // 1. Adaptive validation block
    const sName = selectedService?.name.toLowerCase() || "";
    const isCustomComments = sName.includes('свои') || sName.includes('свой текст');
    const isKeywords = sName.includes('ключево');
    const isPoll = sName.includes('опрос') || sName.includes('голосование');
    const isLiveStream = sName.includes('зрител') || sName.includes('эфир');
    const isPrivateChannel = sName.includes('закрыт');

    const needsPayload = isCustomComments || isKeywords || isPoll;
    if (needsPayload && !engine.customData.trim()) {
      return { error: 'Пожалуйста, заполните необходимые данные для этой услуги' };
    }

    if (!validate()) return { error: 'Проверьте правильность введённых данных' };
    if (!selectedService) return { error: 'Выберите услугу' };

    const res = await checkoutAction({
      serviceId: selectedService.id,
      link: url,
      quantity,
      email,
      runs:     dripFeedEnabled ? runs     : undefined,
      interval: dripFeedEnabled ? dripInterval : undefined,
      customData: engine.customData || undefined,
      gateway: 'yookassa', // TODO: Make gateway dynamic for Balance usage
    });

    if (res.success && res.data?.paymentUrl) {
      window.location.href = res.data.paymentUrl;
    }
    return res;
  };

  const availablePlatforms = engine.catalog
    .map(net => {
      const slug = net.slug.toUpperCase();
      const name = Object.values(IntelligencePlatform).find(v => v === slug) as IntelligencePlatform;
      return name ? { id: net.id, name } : null;
    })
    .filter((p): p is { id: string; name: IntelligencePlatform } => p !== null);

  const showFallback = !engine.platform && url.length > 5 && !isLoading && services.length === 0;

  return (
    <div className="space-y-6">
      {/* ── Manual Selection Fallback ── */}
      {showFallback && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-500">
           <PlatformSelectorFallback 
             onSelect={(p) => engine.setManualPlatform(p)} 
             availablePlatforms={availablePlatforms}
           />
        </div>
      )}

      {/* ── Category pills ── */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        role="tablist"
        aria-label="Категории услуг"
      >
        {engine.availableCategories.map(cat => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={categoryId === cat.id}
            onClick={() => setCategoryId(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              categoryId === cat.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Left: URL + services */}
        <div className="space-y-4">
          {/* URL input */}
          <div className="relative">
            {isLoading
              ? <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
              : <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            }
            <input
              id="order-url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Ссылка на пост, канал или профиль"
              aria-label="Ссылка на страницу для продвижения"
              className={`${inputCls} h-14 pl-12 pr-4 text-base`}
            />
          </div>

          {/* Service list */}
          <div className="space-y-2" role="listbox" aria-label="Список тарифов">
            {services.length === 0 && !isLoading && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Введите ссылку выше, чтобы увидеть подходящие тарифы
              </div>
            )}
            {services.map(srv => (
              <button
                key={srv.id}
                type="button"
                role="option"
                aria-selected={selectedService?.id === srv.id}
                onClick={() => setSelectedService(srv)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                  selectedService?.id === srv.id
                    ? 'ring-2 ring-sky-500 bg-sky-50 shadow-sm'
                    : 'ring-1 ring-slate-200/60 bg-white hover:ring-sky-300 hover:bg-slate-50 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      {selectedService?.id === srv.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                      <span className="font-semibold text-foreground text-sm line-clamp-2">
                        {srv.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {srv.badge && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">
                          {srv.badge}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {srv.speed}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-slate-900 tracking-tight tabular-nums font-mono text-base">{srv.pricePer1kRub} ₽</div>
                    <div className="text-[10px] font-bold text-slate-400 tracking-wider">/ 1000</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Checkout */}
        <div className="bg-white shadow-sm ring-1 ring-slate-100 rounded-2xl p-6 space-y-6 lg:sticky lg:top-6">
          {!selectedService ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-3">👈</div>
              <p className="text-sm text-muted-foreground">Выберите тариф слева</p>
            </div>
          ) : (
            <ActionForm action={handleAction} className="space-y-5">
              {/* Selected service badge */}
              <div className="bg-slate-50 ring-1 ring-slate-100 rounded-xl p-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Выбрано</div>
                <div className="text-sm font-semibold text-slate-800 line-clamp-2">{selectedService.name}</div>
              </div>

              {/* SECTION: DYNAMIC PAYLOAD & WARNINGS */}
              {(() => {
                const sName = selectedService.name.toLowerCase();
                const isCustomComments = sName.includes('свои') || sName.includes('свой текст');
                const isKeywords = sName.includes('ключево');
                const isPoll = sName.includes('опрос') || sName.includes('голосование');
                const isLiveStream = sName.includes('зрител') || sName.includes('эфир');
                const isPrivateChannel = sName.includes('закрыт');

                return (
                  <div className="space-y-4">
                    {/* Warnings */}
                    {isLiveStream && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold p-3 rounded-lg flex items-start gap-2">
                        <span className="text-base leading-none">⚡</span>
                        Внимание! Услуга только для запущенного стрима. Если стрим прервется — гарантия сгорает.
                      </div>
                    )}
                    {isPrivateChannel && (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold p-3 rounded-lg flex items-start gap-2">
                        <span className="text-base leading-none">⚠️</span>
                        Услуга для закрытых каналов. В поле "Ссылка" указывайте только пригласительную ссылку (t.me/+...).
                      </div>
                    )}

                    {/* Inputs */}
                    {isCustomComments && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Ваши комментарии (по одному в строке)
                        </label>
                        <textarea
                          value={engine.customData}
                          onChange={e => engine.setCustomData(e.target.value)}
                          placeholder="Супер!\nОтличное видео!\nСогласен."
                          className={`${inputCls} min-h-[100px] py-3 px-4 resize-y`}
                          required
                        />
                      </div>
                    )}
                    {(isKeywords || isPoll) && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          {isPoll ? "Номер варианта ответа" : "Ключевые слова (через запятую)"}
                        </label>
                        <input
                          type="text"
                          value={engine.customData}
                          onChange={e => engine.setCustomData(e.target.value)}
                          placeholder={isPoll ? "Например: 2" : "блог, новости, инвестиции"}
                          className={`${inputCls} h-12 px-4`}
                          required
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Quantity stepper */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Количество
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(selectedService.minQty, quantity - 100))}
                    aria-label={`Уменьшить количество до ${Math.max(selectedService.minQty, quantity - 100)}`}
                    className="p-3 bg-background border border-border rounded-xl hover:bg-muted transition-all duration-200 shrink-0 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                    min={selectedService.minQty}
                    aria-label="Количество"
                    className={`${inputCls} h-12 text-center font-black text-slate-900 tabular-nums font-mono text-lg focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:outline-none placeholder:font-normal`}
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 100)}
                    aria-label={`Увеличить количество до ${quantity + 100}`}
                    className="p-3 bg-background border border-border rounded-xl hover:bg-muted transition-all duration-200 shrink-0 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                  Мин: {selectedService.minQty.toLocaleString('ru-RU')}
                </div>
                {validationErrors.quantity && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">{validationErrors.quantity}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Email (для уведомления)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    type="email"
                    aria-label="Email для уведомлений о заказе"
                    className={`${inputCls} pl-10 h-11`}
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              {/* Drip feed */}
              {selectedService && (
                <DripFeedSettings
                  enabled={dripFeedEnabled}
                  setEnabled={setDripFeedEnabled}
                  runs={runs}
                  setRuns={setRuns}
                  interval={dripInterval}
                  setInterval={setDripInterval}
                />
              )}

              {/* Price */}
              <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Итого к оплате
                </span>
                <div className="text-right">
                  <span className="text-3xl font-black text-slate-900 tabular-nums font-mono tracking-tight">
                    {totalPriceFormatted}
                  </span>
                  <span className="text-lg font-black text-slate-400 ml-1">₽</span>
                  {isCalculating && (
                    <div className="text-[10px] text-sky-500 font-bold uppercase tracking-wider">Считаем...</div>
                  )}
                </div>
              </div>

              {/* Consent */}
              <div className="bg-slate-50 ring-1 ring-slate-100 rounded-xl p-2 px-3 hover:bg-slate-100/50 transition-colors">
                <label className="flex items-start gap-3 cursor-pointer">
                  {/* Expanded touch target 44x44 */}
                  <span className="inline-flex items-center justify-center w-11 h-11 pointer-events-none shrink-0">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={e => setAgreedToTerms(e.target.checked)}
                      aria-label="Согласие с публичной офертой и правилами возврата"
                      className="w-5 h-5 rounded border-slate-300 text-sky-500 focus:ring-sky-500/30 cursor-pointer pointer-events-auto"
                    />
                  </span>
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    Я подтверждаю заказ и соглашаюсь с{' '}
                    <Link
                      href="/legal/terms"
                      className="text-foreground underline hover:no-underline font-semibold"
                      target="_blank"
                    >
                      Договором оферты
                    </Link>{' '}
                    и{' '}
                    <Link
                      href="/legal/refund"
                      className="text-foreground underline hover:no-underline font-semibold"
                      target="_blank"
                    >
                      Политикой возврата (Refund Policy)
                    </Link>
                  </span>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={(() => {
                  if (!selectedService || quantity < selectedService.minQty || isCalculating || !agreedToTerms) return true;
                  const sName = selectedService.name.toLowerCase();
                  const needsPayload = sName.includes('свои') || sName.includes('свой текст') || sName.includes('ключево') || sName.includes('опрос') || sName.includes('голосование');
                  if (needsPayload && !engine.customData.trim()) return true;
                  return false;
                })()}
                aria-label="Создать заказ и перейти к оплате"
                className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                  agreedToTerms
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                Оплатить {totalPriceFormatted} ₽ <ArrowRight className="w-4 h-4" />
              </button>
            </ActionForm>
          )}
        </div>
      </div>
    </div>
  );
}
