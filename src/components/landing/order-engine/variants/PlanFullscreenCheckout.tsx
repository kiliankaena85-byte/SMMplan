'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, X, Link as LinkIcon, Mail, ShieldCheck, Clock, CreditCard, Wallet, Coins, AlertCircle, Sparkles, Check } from 'lucide-react';
import { PublicService } from '@/actions/order/catalog';
import { OrderEngine } from '@/hooks/useOrderEngine';
import { getAvailableGatewaysAction } from '@/actions/order/checkout';
import Link from 'next/link';

function formatEtaSpeedBadge(service: PublicService): string {
  if (service.speed && service.speed.trim()) {
    return service.speed;
  }
  return 'Моментально (до 15 мин)';
}

export interface PlanFullscreenCheckoutProps {
  engine: OrderEngine;
  selectedService: PublicService;
  onClose: () => void;
  onOpenDocument?: (slug: string) => void;
  userBalanceCents?: number;
  handleCheckout: (gateway?: string, overrideEmail?: string) => void;
  isSubmitting?: boolean;
  checkoutError?: string | null;
}

export function PlanFullscreenCheckout({
  engine,
  selectedService,
  onClose,
  onOpenDocument,
  userBalanceCents = 0,
  handleCheckout,
  isSubmitting = false,
  checkoutError = null,
}: PlanFullscreenCheckoutProps) {
  const {
    url, setUrl,
    quantity, setQuantity,
    email, setEmail,
    customData, setCustomData,
    agreedToTerms, setAgreedToTerms,
    dripFeedEnabled, setDripFeedEnabled,
    runs, setRuns,
    dripInterval, setDripInterval,
    catalog,
    networkId,
    pricing,
    totalPriceFormatted,
    isWarningConfirmed, setIsWarningConfirmed,
  } = engine;

  const [selectedGateway, setSelectedGateway] = useState<string>('yookassa');
  const [availableGateways, setAvailableGateways] = useState<{ yookassa: boolean; robokassa: boolean; cryptobot: boolean } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState<number>(0);

  const linkInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Identify active network and category from catalog
  const activeNetwork = catalog.find(n => n.id === networkId) ||
    catalog.find(n => n.categories.some(c => c.id === selectedService.categoryId)) ||
    catalog[0] || null;

  const activeCategory = activeNetwork?.categories.find(c => c.id === selectedService.categoryId) || null;

  // History API: Browser Back button handling & Scroll to top
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
      window.history.pushState({ smmplan_fullscreen_checkout: true }, '', window.location.href);
    }

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  const handleBackClick = () => {
    onClose();
  };

  const handleResetClick = () => {
    engine.resetOrder();
    onClose();
  };

  // Fetch available gateways and filter inactive ones
  useEffect(() => {
    getAvailableGatewaysAction().then((res) => {
      if (res.success && res.data) {
        setAvailableGateways(res.data);
        if (selectedGateway !== 'balance' && !res.data[selectedGateway as keyof typeof res.data]) {
          const first = (['yookassa', 'cryptobot'] as const).find((g) => res.data?.[g]);
          if (first) setSelectedGateway(first);
        }
      }
    });
  }, [selectedGateway]);

  // Autofocus link input on mount if link is empty
  useEffect(() => {
    if (!url && linkInputRef.current) {
      linkInputRef.current.focus();
    }
  }, [url]);

  // Initialize minimum quantity if not set or below min
  const minQty = selectedService.minQty || 100;
  const maxQty = selectedService.maxQty || 1000000;

  useEffect(() => {
    if (!quantity || Number(quantity) < minQty) {
      setQuantity(minQty);
    }
  }, [minQty, quantity, setQuantity]);

  // Drip-Feed floor invariant
  const effectiveMinQty = dripFeedEnabled && runs > 0 ? minQty * runs : minQty;

  const handleStepQuantity = (delta: number) => {
    const current = Number(quantity) || minQty;
    const next = Math.max(effectiveMinQty, Math.min(maxQty, current + delta));
    setQuantity(next);
    setLocalError(null);
  };

  // Form submission with fail-closed validation and shake
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Link validation
    if (!url || url.trim().length < 3) {
      setLocalError('Пожалуйста, укажите ссылку на объект продвижения');
      setShakeKey(Date.now());
      linkInputRef.current?.focus();
      linkInputRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 2. Requirement confirmation if service has warning
    const hasRequirement = selectedService.clientRequirement || selectedService.clientConfirmation || selectedService.requireWarning;
    if (hasRequirement && !isWarningConfirmed) {
      setLocalError(selectedService.warningMessage || selectedService.clientRequirement || 'Пожалуйста, подтвердите требования к заказу');
      setShakeKey(Date.now());
      return;
    }

    // 3. Custom data validation
    if (selectedService.customDataType && selectedService.customDataType !== 'NONE' && !customData.trim()) {
      setLocalError(selectedService.customDataLabel || 'Пожалуйста, укажите дополнительные данные для заказа');
      setShakeKey(Date.now());
      return;
    }

    // 4. Quantity validation
    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty < effectiveMinQty) {
      setLocalError(
        dripFeedEnabled
          ? `Для ${runs} запусков минимальный заказ: ${effectiveMinQty} шт. (по ${minQty} шт./запуск)`
          : `Минимальное количество для заказа: ${minQty} шт.`
      );
      setShakeKey(Date.now());
      quantityInputRef.current?.focus();
      quantityInputRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (numQty > maxQty) {
      setLocalError(`Максимальное количество для заказа: ${maxQty} шт.`);
      setShakeKey(Date.now());
      quantityInputRef.current?.focus();
      return;
    }

    // 5. Email validation
    if (!email || !email.includes('@')) {
      setLocalError('Пожалуйста, укажите корректный email для отправки чека и доступа к заказу');
      setShakeKey(Date.now());
      emailInputRef.current?.focus();
      emailInputRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 6. Terms validation
    if (!agreedToTerms) {
      setLocalError('Пожалуйста, подтвердите согласие с Офертой и Политикой конфиденциальности');
      setShakeKey(Date.now());
      return;
    }

    setLocalError(null);
    handleCheckout(selectedGateway);
  };

  const hasBalance = userBalanceCents > 0;
  const totalCents = pricing?.totalCents || 0;
  const isBalanceSufficient = userBalanceCents >= totalCents;

  const paymentOptions = [
    {
      id: 'yookassa',
      name: 'Банковская карта РФ / СБП',
      desc: 'Оплата без комиссии через ЮKassa, Mir Pay, SberPay, СБП',
      icon: CreditCard,
      active: availableGateways?.yookassa ?? true,
      disabled: false,
    },
    {
      id: 'cryptobot',
      name: 'CryptoBot',
      desc: 'Криптовалюта (USDT, TON, BTC)',
      icon: Coins,
      active: availableGateways?.cryptobot ?? false,
      disabled: false,
    },
    ...(hasBalance ? [{
      id: 'balance',
      name: 'Личный баланс',
      desc: isBalanceSufficient
        ? `Баланс: ${(userBalanceCents / 100).toFixed(2)} ₽`
        : `Недостаточно средств: ${(userBalanceCents / 100).toFixed(2)} ₽ (нужно ${(totalCents / 100).toFixed(2)} ₽)`,
      icon: Wallet,
      active: true,
      disabled: !isBalanceSufficient,
    }] : []),
  ].filter(opt => opt.active);

  return (
    <div className="w-full flex flex-col items-center py-2 sm:py-6 px-2 sm:px-4 animate-in fade-in duration-300">
      
      {/* ── TOP NAVIGATION BAR (SMM-Flux Style) ── */}
      <div className="w-full max-w-2xl sm:max-w-3xl flex items-center justify-between mb-4 sm:mb-6 p-2.5 sm:p-3 rounded-2xl bg-card border border-border/80 shadow-md">
        <button
          type="button"
          onClick={handleBackClick}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl hover:bg-muted text-foreground text-xs sm:text-sm font-extrabold transition-all cursor-pointer active:scale-95 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <span>Назад к тарифам</span>
        </button>

        <div className="flex items-center gap-2 px-2 min-w-0">
          {activeNetwork?.icon && (
            <img src={activeNetwork.icon} alt="" className="w-5 h-5 object-contain shrink-0" />
          )}
          <span className="font-extrabold text-xs sm:text-sm text-foreground truncate">
            {activeNetwork?.name || 'Каталог'} {activeCategory ? `• ${activeCategory.name}` : ''}
          </span>
        </div>

        <button
          type="button"
          onClick={handleResetClick}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold transition-all cursor-pointer active:scale-95 shrink-0"
          title="Сбросить выбор услуги"
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Сброс</span>
        </button>
      </div>

      {/* ── MAIN FULLSCREEN CHECKOUT CARD ── */}
      <div className="w-full max-w-2xl sm:max-w-3xl bg-card border border-border/80 shadow-2xl rounded-3xl p-4 sm:p-7 md:p-8 relative">
        
        {/* Tariff Recap Header */}
        <div className="mb-5 pb-5 border-b border-border/60 flex flex-col sm:flex-row justify-between items-start gap-3">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3" />
              Выбранный тариф
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground leading-tight tracking-tight">
              {selectedService.name}
            </h1>
          </div>

          <div className="sm:text-right shrink-0">
            <span className="text-2xl sm:text-3xl font-black text-primary font-mono block tabular-nums">
              {selectedService.pricePerUnitRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ₽
            </span>
            <span className="text-xs text-muted-foreground font-medium block">
              за 1 шт.
            </span>
          </div>
        </div>

        {/* Tariff Description */}
        {selectedService.description && (
          <div className="mb-5 p-3.5 rounded-2xl bg-muted/50 border border-border/50 text-xs sm:text-[13px] text-muted-foreground leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
            {selectedService.description}
          </div>
        )}

        {/* Speed / Limits Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mb-0.5">
              Мин. заказ
            </p>
            <p className="font-extrabold text-sm sm:text-base text-foreground font-mono">
              {minQty} шт.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mb-0.5">
              Макс. заказ
            </p>
            <p className="font-extrabold text-sm sm:text-base text-foreground font-mono">
              {maxQty.toLocaleString('ru-RU')} шт.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 col-span-2 sm:col-span-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mb-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-500" />
              Старт / Скорость
            </p>
            <p className="font-bold text-xs sm:text-sm text-foreground truncate">
              {formatEtaSpeedBadge(selectedService)}
            </p>
          </div>
        </div>

        {/* ── FORM ── */}
        <form onSubmit={handleFormSubmit} noValidate className="space-y-5">
          
          {/* 1. Ссылка */}
          <div id="field-link" className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="landing-url" className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-primary" />
                <span>Ссылка для заказа</span>
                <span className="text-destructive font-bold">*</span>
              </label>
              {activeNetwork && (
                <span className="text-[11px] font-bold text-primary">
                  {activeNetwork.name}
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <input
                ref={linkInputRef}
                id="landing-url"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (localError) setLocalError(null);
                }}
                placeholder={
                  selectedService.linkPlaceholder ||
                  (activeNetwork?.slug === 'telegram'
                    ? 'https://t.me/channel или @channel'
                    : activeNetwork?.slug === 'vk'
                    ? 'https://vk.com/...'
                    : activeNetwork?.slug === 'instagram'
                    ? 'https://instagram.com/...'
                    : 'Вставьте ссылку на канал, группу, профиль или пост')
                }
                className="w-full h-12 px-3.5 pr-10 rounded-2xl bg-background border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm text-foreground font-mono transition-all"
              />
              {url.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setUrl('')}
                  className="absolute right-3 w-6 h-6 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground flex items-center justify-center transition-colors cursor-pointer"
                  title="Очистить ссылку"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground pl-1">
              {selectedService.linkHint || 'Укажите ссылку на открытый канал, группу или конкретный пост.'}
            </p>
          </div>

          {/* Warning / Client Requirement Checkbox */}
          {(selectedService.clientRequirement || selectedService.clientConfirmation || selectedService.requireWarning) && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWarningConfirmed}
                  onChange={(e) => {
                    setIsWarningConfirmed(e.target.checked);
                    if (localError) setLocalError(null);
                  }}
                  className="w-4 h-4 rounded text-primary focus:ring-primary mt-0.5 cursor-pointer"
                />
                <span className="text-foreground font-medium leading-relaxed">
                  {selectedService.warningMessage || selectedService.clientRequirement || 'Подтверждаю, что мой канал/профиль открыт и ссылка верна'}
                </span>
              </label>
            </div>
          )}

          {/* Custom Data Textarea */}
          {selectedService.customDataType && selectedService.customDataType !== 'NONE' && (
            <div id="field-customData" className="space-y-1.5">
              <label className="block text-xs font-black text-foreground uppercase tracking-wider">
                {selectedService.customDataLabel || 'Дополнительные данные'}
                <span className="text-destructive font-bold ml-1">*</span>
              </label>
              <textarea
                value={customData}
                onChange={(e) => {
                  setCustomData(e.target.value);
                  if (localError) setLocalError(null);
                }}
                placeholder="Укажите текст комментариев, ответы или параметры услуги"
                className="w-full h-20 p-3 rounded-2xl bg-background border border-border/80 focus:border-primary outline-none text-xs text-foreground resize-none transition-all"
              />
            </div>
          )}

          {/* 2. Количество */}
          <div id="field-quantity" className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-foreground uppercase tracking-wider">
                Количество
                <span className="text-destructive font-bold ml-1">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                Лимиты: {minQty} – {maxQty.toLocaleString('ru-RU')} шт.
              </span>
            </div>

            {/* Stepper Input */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStepQuantity(-100)}
                className="w-12 h-12 rounded-2xl bg-muted/70 hover:bg-muted text-foreground font-bold text-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
                title="Уменьшить на 100"
              >
                –
              </button>

              <input
                ref={quantityInputRef}
                type="number"
                min={effectiveMinQty}
                max={maxQty}
                value={quantity}
                onChange={(e) => {
                  setQuantity(parseInt(e.target.value) || 0);
                  if (localError) setLocalError(null);
                }}
                className="flex-1 h-12 px-3.5 rounded-2xl bg-background border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-black text-base text-foreground font-mono text-center transition-all"
              />

              <button
                type="button"
                onClick={() => handleStepQuantity(100)}
                className="w-12 h-12 rounded-2xl bg-muted/70 hover:bg-muted text-foreground font-bold text-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
                title="Увеличить на 100"
              >
                +
              </button>
            </div>

            {/* Drip-Feed Options */}
            {selectedService.isDripFeedEnabled && (
              <div className="mt-3 p-3.5 rounded-2xl bg-muted/30 border border-border/60">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dripFeedEnabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setDripFeedEnabled(checked);
                      if (checked && Number(quantity) < minQty * runs) {
                        setQuantity(minQty * runs);
                      }
                      if (localError) setLocalError(null);
                    }}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-xs font-bold text-foreground">
                    Постепенный запуск (Drip-Feed)
                  </span>
                </label>

                {dripFeedEnabled && (
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border/40 text-xs">
                    <div>
                      <label className="block text-muted-foreground font-medium mb-1">
                        Запусков ({runs})
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={100}
                        value={runs}
                        onChange={(e) => {
                          const r = Math.max(2, parseInt(e.target.value) || 2);
                          setRuns(r);
                          if (Number(quantity) < minQty * r) {
                            setQuantity(minQty * r);
                          }
                        }}
                        className="w-full h-10 px-3 rounded-xl bg-background border border-border font-mono text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-muted-foreground font-medium mb-1">
                        Интервал (мин)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={1440}
                        value={dripInterval}
                        onChange={(e) => setDripInterval(Math.max(10, parseInt(e.target.value) || 60))}
                        className="w-full h-10 px-3 rounded-xl bg-background border border-border font-mono text-xs font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Email */}
          <div id="field-email" className="space-y-1.5">
            <label htmlFor="email-input" className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span>Email для чека (54-ФЗ) и доступа</span>
              <span className="text-destructive font-bold">*</span>
            </label>
            <input
              ref={emailInputRef}
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (localError) setLocalError(null);
              }}
              placeholder="example@mail.ru"
              className="w-full h-12 px-3.5 rounded-2xl bg-background border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm text-foreground transition-all"
            />
            <p className="text-[11px] text-muted-foreground pl-1">
              По закону 54-ФЗ фискальный чек об оплате и ссылка на статус заказа будут отправлены на этот адрес.
            </p>
          </div>

          {/* 4. Способ оплаты */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-foreground uppercase tracking-wider block">
              Способ оплаты
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {paymentOptions.map((opt) => {
                const isSelected = selectedGateway === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      if (opt.disabled) return;
                      setSelectedGateway(opt.id);
                      if (localError) setLocalError(null);
                    }}
                    className={`min-h-[56px] p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer active:scale-98 ${
                      opt.disabled
                        ? 'opacity-50 cursor-not-allowed bg-muted/20 border-border/40'
                        : isSelected
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-xs'
                        : 'border-border/80 bg-background hover:bg-muted/40 hover:border-border'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-xs sm:text-sm text-foreground truncate">
                        {opt.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {opt.desc}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Legal Checkbox (152-ФЗ и Оферта) */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-muted-foreground leading-relaxed">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  if (localError) setLocalError(null);
                }}
                className="w-4 h-4 rounded text-primary focus:ring-primary mt-0.5 cursor-pointer shrink-0"
              />
              <span>
                Я принимаю условия{' '}
                <Link
                  href="/legal/terms"
                  onClick={(e) => {
                    if (onOpenDocument) {
                      e.preventDefault();
                      onOpenDocument('terms');
                    }
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  Публичной оферты
                </Link>{' '}
                и даю согласие на обработку персональных данных в соответствии с{' '}
                <Link
                  href="/legal/privacy"
                  onClick={(e) => {
                    if (onOpenDocument) {
                      e.preventDefault();
                      onOpenDocument('privacy');
                    }
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  Политикой конфиденциальности (152-ФЗ)
                </Link>.
              </span>
            </label>
          </div>

          {/* ── ERROR MESSAGE BANNER (In Focus Right Above Submit) ── */}
          {(localError || checkoutError) && (
            <div
              key={shakeKey}
              className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive flex items-center gap-2.5 text-xs font-bold animate-shake"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{localError || checkoutError}</span>
            </div>
          )}

          {/* ── SUBMIT CTA BUTTON ── */}
          <div className="pt-2">
            <button
              id="checkout-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 min-h-[56px] rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-primary/25 transition-all duration-150 active:scale-[0.99] cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Создание заказа...</span>
                </>
              ) : (
                <>
                  <span>Оплатить {totalPriceFormatted} ₽</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Безопасная оплата
              </span>
              <span>•</span>
              <span>Чек 54-ФЗ</span>
              <span>•</span>
              <span>Моментальный старт</span>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
