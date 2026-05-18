'use client';

import { useOrderEngine } from '@/hooks/useOrderEngine';
import { ActionForm } from '@/components/admin/action-form';
import { checkoutAction } from '@/actions/order/checkout';
import { DripFeedSettings } from '@/components/orders/DripFeedSettings';
import { PlatformSelectorFallback } from '@/components/orders/PlatformSelectorFallback';
import { IntelligencePlatform } from '@/services/analyzer/link-rules';
import {
  Plus, Minus, Search, Mail, ArrowRight,
  Loader2, Clock, CheckCircle2, Wallet, CreditCard, Bitcoin
} from 'lucide-react';
import React, { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

/** Превращает URL в тексте в кликабельную ссылку */
function linkifyText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 break-all">{part}</a>
    ) : part
  );
}

const inputCls =
  'w-full rounded-xl border border-border bg-background text-foreground ' +
  'text-sm outline-none placeholder:text-muted-foreground ' +
  'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200';



export function SmartOrderForm() {
  const [gateway, setGateway] = useState<'yookassa' | 'balance' | 'cryptobot'>('yookassa');
  const engine = useOrderEngine();
  const {
    url, setUrl,
    categoryId, setCategoryId,
    selectedService, setSelectedService,
    quantity, setQuantity,
    email, setEmail,
    promoCode, setPromoCode,
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

  const formRef = React.useRef<HTMLFormElement>(null);
  const idempotencyKeyRef = React.useRef<string>('');
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [requirementsConfirmed, setRequirementsConfirmed] = useState(false);
  const [modalRequirements, setModalRequirements] = useState<string[]>([]);
  const [viewportBottom, setViewportBottom] = useState(0);

  React.useEffect(() => {
    idempotencyKeyRef.current = crypto.randomUUID();
    
    if (!window.visualViewport) return;
    const vp = window.visualViewport;
    const update = () => {
      const diff = window.innerHeight - vp.height;
      setViewportBottom(diff > 0 ? diff : 0);
    };
    vp.addEventListener('resize', update);
    vp.addEventListener('scroll', update);
    update();
    return () => {
      vp.removeEventListener('resize', update);
      vp.removeEventListener('scroll', update);
    };
  }, []);

  React.useEffect(() => {
    setRequirementsConfirmed(false);
    const reqs = (selectedService?.features as any)?.requirements;
    if (reqs && Array.isArray(reqs) && reqs.length > 0) {
       setModalRequirements(reqs);
    } else {
       setModalRequirements([]);
    }
  }, [selectedService]);

  const handlePreSubmit = () => {
    if (modalRequirements.length > 0 && !requirementsConfirmed) {
       setShowRequirementsModal(true);
    } else {
       formRef.current?.requestSubmit();
    }
  };

  const confirmRequirementsAndSubmit = () => {
    setRequirementsConfirmed(true);
    setShowRequirementsModal(false);
    setTimeout(() => {
       formRef.current?.requestSubmit();
    }, 50);
  };

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
      promoCodeStr: promoCode || undefined,
      gateway,
      idempotencyKey: idempotencyKeyRef.current,
    });

    if (res.success && res.data?.paymentUrl) {
      window.location.href = res.data.paymentUrl;
      return res;
    }
    
    if (!res.success && res.error?.startsWith('VOUCHER_USE_BALANCE:')) {
      toast.error(
        'Это ваучер на пополнение баланса. Перейдите в раздел «Мой баланс» для активации.',
        {
          position: 'top-center',
          duration: 6000,
          action: {
            label: 'Мой баланс',
            onClick: () => window.location.href = '/dashboard/add-funds'
          }
        }
      );
      return { ...res, error: undefined }; // Prevent ActionForm from showing a second toast
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
      {/* ── Manual Selection Fallback (Error State) ── */}
      {showFallback && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-500">
           <PlatformSelectorFallback 
             onSelect={(p) => engine.setManualPlatform(p)} 
             availablePlatforms={availablePlatforms}
           />
        </div>
      )}

      {/* ── Network pills (Manual Platform Selection) ── */}
      {(!engine.platform && engine.catalog.length > 1) && (
        <div
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
          role="tablist"
          aria-label="Платформы"
        >
          {engine.catalog.map(net => (
            <button
              key={net.id}
              type="button"
              role="tab"
              aria-selected={engine.networkId === net.id || (!engine.networkId && engine.catalog[0].id === net.id)}
              onClick={() => {
                 engine.setNetworkId(net.id);
                 if (net.categories.length > 0) {
                   engine.setCategoryId(net.categories[0].id);
                 }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
                (engine.networkId === net.id || (!engine.networkId && engine.catalog[0].id === net.id))
                  ? 'bg-zinc-800 text-primary-foreground shadow-sm'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
              }`}
            >
              {net.name}
            </button>
          ))}
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
              placeholder="Вставьте ссылку, например t.me/channel или instagram.com/username"
              aria-label="Ссылка на страницу для продвижения"
              inputMode="url"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className={`${inputCls} h-14 pl-12 pr-4 text-base`}
            />
          </div>
          {validationErrors.link && (
            <p className="text-sm text-destructive font-semibold mt-2 px-1 animate-in slide-in-from-top-1">
              {validationErrors.link}
            </p>
          )}

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
                onClick={() => setSelectedService(selectedService?.id === srv.id ? null : srv)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                  selectedService?.id === srv.id
                    ? 'ring-2 ring-primary bg-primary/5 shadow-sm'
                    : 'ring-1 ring-border bg-card hover:ring-primary/50 hover:bg-muted hover:shadow-md hover:-translate-y-0.5 shadow-sm'
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
                    <div className="font-black text-foreground tracking-tight tabular-nums font-mono text-base">{srv.pricePer1kRub} ₽</div>
                    <div className="text-[10px] font-bold text-muted-foreground tracking-wider">/ 1000</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Checkout */}
        {selectedService && (
          <div className="bg-card shadow-sm ring-1 ring-border rounded-2xl p-6 space-y-6 lg:sticky lg:top-6">
            <ActionForm action={handleAction} className="space-y-5" formRef={formRef}>
              {/* Selected service badge */}
              <div className="bg-muted ring-1 ring-border rounded-xl p-4">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Выбрано</div>
                <div className="text-sm font-semibold text-foreground line-clamp-2">{selectedService.name}</div>
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
                      <div className="bg-destructive/10 border border-rose-500/20 text-destructive text-xs font-bold p-3 rounded-lg flex items-start gap-2">
                        <span className="text-base leading-none">⚡</span>
                        Внимание! Услуга только для запущенного стрима. Если стрим прервется — гарантия сгорает.
                      </div>
                    )}
                    {isPrivateChannel && (
                      <div className="bg-warning/10 border border-amber-500/20 text-warning text-xs font-bold p-3 rounded-lg flex items-start gap-2">
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
                          className={`${inputCls} text-base min-h-[100px] py-3 px-4 resize-y`}
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
                          inputMode={isPoll ? "numeric" : "text"}
                          className={`${inputCls} text-base h-12 px-4`}
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
                    inputMode="numeric"
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
                    inputMode="email"
                    aria-label="Email для уведомлений о заказе"
                    className={`${inputCls} text-base pl-10 h-11`}
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              {/* Promo Code */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Промокод
                </label>
                <div className="relative">
                  <input
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                    type="text"
                    aria-label="Промокод"
                    className={`${inputCls} text-base px-4 h-11 uppercase font-mono tracking-wider`}
                    placeholder="WINTER2026"
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
              <div className="border-t border-border pt-5 flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Итого к оплате
                </span>
                <div className="text-right">
                  <span className="text-3xl font-black text-foreground tabular-nums font-mono tracking-tight">
                    {totalPriceFormatted}
                  </span>
                  <span className="text-lg font-black text-muted-foreground ml-1">₽</span>
                  {isCalculating && (
                    <div className="text-[10px] text-primary font-bold uppercase tracking-wider">Считаем...</div>
                  )}
                </div>
              </div>

              {/* Gateway Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Способ оплаты
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGateway('yookassa')}
                    className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                      gateway === 'yookassa'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" /> Карта
                  </button>
                  <button
                    type="button"
                    onClick={() => setGateway('balance')}
                    className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                      gateway === 'balance'
                        ? 'border-emerald-600 bg-emerald-600/10 text-emerald-600 shadow-sm ring-1 ring-emerald-600/20'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Wallet className="w-4 h-4" /> Баланс
                  </button>
                  <button
                    type="button"
                    onClick={() => setGateway('cryptobot')}
                    className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                      gateway === 'cryptobot'
                        ? 'border-orange-500 bg-orange-500/10 text-orange-600 shadow-sm ring-1 ring-orange-500/20'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Bitcoin className="w-4 h-4" /> Крипто
                  </button>
                </div>
              </div>

              {/* Floating Bottom Bar (VisualViewport Aware) */}
              <div 
                className="fixed left-0 right-0 bg-card border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] p-4 z-50 lg:static lg:bg-transparent lg:border-none lg:shadow-none lg:p-0"
                style={{ 
                  bottom: viewportBottom > 0 ? `${viewportBottom}px` : '0px',
                  paddingBottom: viewportBottom > 0 ? '1rem' : 'max(1rem, env(safe-area-inset-bottom))'
                }}
              >
                {/* Consent */}
                <div className="bg-muted/50 ring-1 ring-border rounded-xl p-2 px-3 hover:bg-muted/80 transition-colors mb-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    {/* Expanded touch target 44x44 */}
                    <span className="inline-flex items-center justify-center w-11 h-11 pointer-events-none shrink-0">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={e => {
                          if (navigator.vibrate) navigator.vibrate(20);
                          setAgreedToTerms(e.target.checked);
                        }}
                        aria-label="Согласие с публичной офертой и правилами возврата"
                        className="w-5 h-5 rounded border-slate-300 text-sky-500 focus:ring-sky-500/30 cursor-pointer pointer-events-auto"
                      />
                    </span>
                    <span className="text-xs text-muted-foreground leading-relaxed mt-2.5">
                      Я подтверждаю заказ и соглашаюсь с{' '}
                      <Link
                        href="/legal/terms"
                        className="text-foreground underline hover:no-underline font-semibold"
                        target="_blank"
                      >
                        Договором оферты
                      </Link>
                    </span>
                  </label>
                </div>

                {/* Submit */}
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(50);
                    handlePreSubmit();
                  }}
                  disabled={(() => {
                    if (!selectedService || quantity < selectedService.minQty || isCalculating || !agreedToTerms) return true;
                    const sName = selectedService.name.toLowerCase();
                    const needsPayload = sName.includes('свои') || sName.includes('свой текст') || sName.includes('ключево') || sName.includes('опрос') || sName.includes('голосование');
                    if (needsPayload && !engine.customData.trim()) return true;
                    return false;
                  })()}
                  aria-label="Создать заказ и перейти к оплате"
                  className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-200 ${
                    agreedToTerms
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  Оплатить {totalPriceFormatted} ₽ <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* Spacer so content isn't hidden under floating bar on mobile */}
              <div className="h-40 lg:hidden" />
            </ActionForm>
          </div>
        )}
      </div>

      {/* REQUIREMENTS MODAL */}
      {showRequirementsModal && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-200">
            <div className="p-6 pb-0">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Важные требования</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Провайдер этой услуги установил жесткие требования. Если их не соблюсти, ваш заказ может быть отменен или зависнуть:
              </p>
              
              <ul className="space-y-3 mb-6 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                {modalRequirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-foreground font-medium">
                    <span className="text-warning mt-0.5">•</span> <span>{linkifyText(req)}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-6 pt-2 flex flex-col sm:flex-row gap-3">
              <button 
                type="button"
                onClick={() => setShowRequirementsModal(false)} 
                className="flex-1 px-4 py-3 text-sm font-semibold text-muted-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button 
                type="button"
                onClick={confirmRequirementsAndSubmit} 
                className="flex-1 px-4 py-3 text-sm font-bold bg-warning text-primary-foreground hover:bg-amber-600 rounded-xl transition-colors shadow-sm"
              >
                Я ознакомился, оплатить
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
