import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Zap, Sliders, ChevronDown, Link2, Pencil, Minus, Plus, RotateCcw, AlertCircle } from "lucide-react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { DynamicPayloadWarnings } from "../DynamicPayloadWarnings";
import { DripFeedConfigurator } from "../DripFeedConfigurator";
import { LegalCheckbox } from "../LegalCheckbox";
import { Button } from "@/components/ui/button";
import { getSocialLinkConfig } from "@/utils/social-link-placeholder";

interface MobileStep4CheckoutProps {
  engine: OrderEngine;
  currentStep: number;
  setActiveStep: (step: 1 | 2 | 3 | 4) => void;
  shouldShowParameters: boolean;
  step4Ref: React.RefObject<HTMLDivElement | null>;
  emailInputRef?: React.RefObject<HTMLInputElement | null>;
  emailHasError?: boolean;
  handleCheckout: (gateway?: string, email?: string) => void;
  isSubmitting: boolean;
  onOpenDocument?: (slug: string) => void;
  checkoutError?: string | null;
  userBalanceCents?: number;
}

export function MobileStep4Checkout({
  engine,
  currentStep,
  setActiveStep,
  shouldShowParameters,
  step4Ref,
  emailInputRef,
  emailHasError,
  handleCheckout,
  isSubmitting,
  onOpenDocument,
  checkoutError,
  userBalanceCents
}: MobileStep4CheckoutProps) {
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [selectedGateway, setSelectedGateway] = useState<string>("yookassa");

  const {
    url, setUrl,
    validationErrors,
    selectedService,
    quantity, setQuantity,
    email, setEmail,
    promoCode, setPromoCode,
    agreedToTerms, setAgreedToTerms,
    isCalculating,
    totalPriceFormatted,
  } = engine;

  const linkConfig = React.useMemo(() => {
    const activeCat = engine.availableCategories.find(c => c.id === engine.categoryId);
    return getSocialLinkConfig(
      engine.activeNetwork?.slug || engine.platform,
      activeCat?.name,
      selectedService?.name,
      selectedService?.targetType,
      selectedService?.linkPlaceholder,
      selectedService?.linkHint
    );
  }, [engine.activeNetwork?.slug, engine.platform, engine.availableCategories, engine.categoryId, selectedService?.name, selectedService?.targetType, selectedService?.linkPlaceholder, selectedService?.linkHint]);

  React.useEffect(() => {
    if (promoCode && promoCode.length > 0) {
      setShowPromo(true);
    }
  }, [promoCode]);

  React.useEffect(() => {
    if (agreedToTerms && email && email.includes('@')) {
      setLocalError(null);
    }
  }, [agreedToTerms, email]);

  const onOrderClick = () => {
    // 1. Check legal checkbox
    if (!agreedToTerms) {
      setLocalError("Пожалуйста, примите условия Оферты и Политики конфиденциальности");
      setShakeKey(Date.now());
      if (engine.setTermsHasError) engine.setTermsHasError(true);
      setTimeout(() => {
        const checkbox = document.getElementById("standard-legal-checkbox");
        if (checkbox) {
          checkbox.scrollIntoView({ behavior: "smooth", block: "center" });
          checkbox.focus();
        }
      }, 100);
      return;
    }

    // 2. Check email
    if (!email || !email.includes('@')) {
      setLocalError("Пожалуйста, укажите email для отслеживания заказа");
      setShakeKey(Date.now());
      setTimeout(() => {
        const emailEl = document.getElementById("email-input");
        if (emailEl) {
          emailEl.scrollIntoView({ behavior: "smooth", block: "center" });
          emailEl.focus();
        }
      }, 100);
      return;
    }

    setLocalError(null);
    handleCheckout(selectedGateway);
  };

  if (currentStep !== 4 || !shouldShowParameters || !selectedService) {
    return null;
  }

  const isLinkReady = url.trim().length >= 5;
  const minQty = selectedService.minQty || 10;
  const maxQty = selectedService.maxQty || 1000000;

  const handleStepQuantity = (delta: number) => {
    const nextVal = Math.min(maxQty, Math.max(minQty, quantity + delta));
    setQuantity(nextVal);
  };

  const handleAddQuantity = (add: number) => {
    const nextVal = Math.min(maxQty, quantity + add);
    setQuantity(nextVal);
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      ref={step4Ref}
      className="space-y-4 overflow-visible border-t border-border/30 pt-3 scroll-mt-20"
    >
      <div className="flex items-center justify-between pl-1">
        <span className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
          4. Параметры и оформление
        </span>
        <span className="text-[11px] font-bold text-primary">
          {selectedService.name}
        </span>
      </div>

      {/* Контекстная ссылка с учетом выбранной услуги */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="mobile-checkout-url-input" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-primary" />
            <span>{linkConfig.label || "Ссылка для выполнения заказа"}</span>
            <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
              {linkConfig.badge}
            </span>
            {isLinkReady && (
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                <span>Изменить</span>
              </button>
            )}
          </div>
        </div>

        {isLinkReady ? (
          <div
            onClick={() => setActiveStep(1)}
            className="p-3 rounded-2xl bg-content2/80 border border-border/60 hover:border-primary/50 transition-all flex items-center justify-between gap-2.5 cursor-pointer group"
            title="Нажмите, чтобы изменить ссылку"
          >
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-foreground font-mono break-all leading-relaxed select-all">
                {url}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                {linkConfig.hint}
              </span>
            </div>
            <span className="text-[11px] font-bold text-primary px-2.5 py-1 rounded-lg bg-primary/10 group-hover:bg-primary/20 shrink-0 flex items-center gap-1 transition-colors">
              <Pencil className="w-3 h-3" />
              <span>Сменить</span>
            </span>
          </div>
        ) : (
          <div>
            <input
              id="mobile-checkout-url-input"
              type="text"
              inputMode="url"
              autoComplete="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              aria-describedby={validationErrors?.link ? "step4-url-error" : undefined}
              placeholder={linkConfig.placeholder}
              className={`w-full h-11 px-4 rounded-2xl border bg-background text-sm text-foreground outline-none transition-all ${
                validationErrors?.link
                  ? 'border-destructive focus:border-destructive ring-2 ring-destructive/30'
                  : 'border-border focus:border-primary focus:ring-2 ring-primary/30'
              }`}
            />
            {linkConfig.hint && !validationErrors?.link && (
              <p className="text-[11px] text-muted-foreground pl-1 mt-1 font-medium">
                {linkConfig.hint}
              </p>
            )}
            {validationErrors?.link && (
              <p id="step4-url-error" className="text-[11px] font-bold text-destructive pl-1 animate-in fade-in duration-200 mt-1">
                {validationErrors.link}
              </p>
            )}
          </div>
        )}
      </div>

      <DynamicPayloadWarnings engine={engine} />

      {/* Количество со степперами и быстрыми чипами */}
      <div className="space-y-2 bg-content2/40 p-3 rounded-2xl border border-border/40">
        <div className="flex items-center justify-between">
          <label htmlFor="quantity-input" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Количество (мин: {minQty.toLocaleString()})
          </label>
          <span className="text-xs font-extrabold text-foreground tabular-nums">
            {quantity.toLocaleString()} шт
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleStepQuantity(-100)}
            disabled={quantity <= minQty}
            aria-label="Уменьшить количество на 100"
            className="w-11 h-11 rounded-xl bg-content2 hover:bg-content3 disabled:opacity-40 border border-border/50 flex items-center justify-center text-foreground font-black shrink-0 active:scale-95 transition-all cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>

          <input
            id="quantity-input"
            type="number"
            inputMode="numeric"
            value={quantity}
            min={minQty}
            max={maxQty}
            onFocus={(e) => {
              const target = e.target;
              setTimeout(() => target.select(), 0);
            }}
            onChange={e => {
              let val = Number(e.target.value);
              if (maxQty && val > maxQty) val = maxQty;
              setQuantity(val);
            }}
            onBlur={() => {
              if (!quantity || quantity < minQty) {
                setQuantity(minQty);
              }
            }}
            className={`w-full h-11 px-3 text-center rounded-xl border bg-background text-base font-black tabular-nums text-foreground outline-none transition-all ${
              quantity < minQty
                ? 'border-danger focus:border-danger ring-2 ring-danger/20'
                : 'border-border focus:border-primary focus:ring-2 ring-primary/20'
            }`}
          />

          <button
            type="button"
            onClick={() => handleStepQuantity(100)}
            disabled={quantity >= maxQty}
            aria-label="Увеличить количество на 100"
            className="w-11 h-11 rounded-xl bg-content2 hover:bg-content3 disabled:opacity-40 border border-border/50 flex items-center justify-center text-foreground font-black shrink-0 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {quantity > 0 && quantity < minQty && (
          <p className="text-[11px] font-bold text-danger pl-1 animate-in fade-in duration-200">
            Минимум: {minQty} шт. При потере фокуса исправим автоматически.
          </p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="email-input" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
          Email для отслеживания
        </label>
        <input
          id="email-input"
          type="email"
          ref={emailInputRef}
          value={email}
          onChange={e => {
            setEmail(e.target.value);
            if (localError) setLocalError(null);
          }}
          placeholder="you@example.com"
          className={`w-full h-11 px-4 rounded-2xl border bg-background text-base text-foreground outline-none transition-all ${
            emailHasError || (localError && (!email || !email.includes('@')))
              ? 'border-danger focus:border-danger ring-2 ring-danger/30 animate-shake'
              : 'border-border focus:border-primary focus:ring-2 ring-primary/30'
          }`}
        />
        {(emailHasError || (localError && (!email || !email.includes('@')))) && (
          <p className="text-[11px] font-bold text-danger pl-1 animate-in fade-in duration-200">
            Укажите email — на него придёт доступ к заказу
          </p>
        )}
      </div>

      {/* Промокод */}
      <div className="space-y-1.5">
        {!showPromo ? (
          <button
            type="button"
            onClick={() => setShowPromo(true)}
            className="text-xs font-extrabold text-primary uppercase tracking-wider pl-1 hover:underline flex items-center gap-1 transition-all h-10 cursor-pointer"
          >
            + Есть промокод?
          </button>
        ) : (
          <div className="space-y-1 animate-in fade-in duration-200">
            <label htmlFor="promo-input" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
              Промокод
            </label>
            <div className="relative">
              <input
                id="promo-input"
                type="text"
                value={promoCode}
                onChange={e => setPromoCode(e.target.value)}
                placeholder="Введите промокод..."
                className="w-full h-11 px-4 rounded-2xl border border-border bg-background text-base text-foreground outline-none focus:border-primary focus:ring-2 ring-primary/20 transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* Дополнительные параметры (Drip-feed) */}
      {(selectedService.isDripFeedEnabled || selectedService.smartConfig?.isEnabled) && (
        <div className="space-y-2 border border-border/50 rounded-2xl bg-content2/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvancedParams(!showAdvancedParams)}
            className="w-full h-11 px-4 flex items-center justify-between text-xs font-extrabold text-foreground uppercase tracking-wider hover:bg-content2/80 active:scale-[0.99] transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <span>Дополнительные параметры</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${showAdvancedParams ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showAdvancedParams && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden px-3 pb-3"
              >
                <DripFeedConfigurator engine={engine} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Согласие 152-ФЗ */}
      <LegalCheckbox
        id="standard-legal-checkbox"
        checked={agreedToTerms}
        onChange={(val) => {
          setAgreedToTerms(val);
          if (val && engine.setTermsHasError) engine.setTermsHasError(false);
        }}
        hasError={engine.termsHasError}
        labelClassName="text-muted-foreground font-medium text-xs"
        onOpenDocument={onOpenDocument}
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          intent="outline"
          onClick={() => setActiveStep(3)}
          className="flex-1 text-xs font-bold h-11 min-h-[44px] rounded-xl bg-content2 text-foreground border-border/40 hover:bg-content3 cursor-pointer"
        >
          Назад к тарифам
        </Button>
        <Button
          type="button"
          intent="ghost"
          onClick={() => {
            engine.resetOrder();
            setActiveStep(1);
          }}
          className="text-xs font-bold h-11 min-h-[44px] rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer flex items-center gap-1.5 px-3 shrink-0"
          title="Сбросить выбранную услугу и ссылку"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Сбросить всё</span>
        </Button>
      </div>

      {/* Интерактивный выбор метода оплаты */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Способ оплаты
          </label>
          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
            0% комиссия через СБП
          </span>
        </div>
        {(() => {
          const totalCents = engine.pricing?.totalCents || Math.round(parseFloat(totalPriceFormatted || "0") * 100);
          const safeBalanceCents = userBalanceCents ?? 0;
          const hasBalance = userBalanceCents !== undefined && userBalanceCents > 0;
          const isBalanceSufficient = hasBalance && safeBalanceCents >= totalCents;

          const gateways = [
            ...(hasBalance ? [{
              id: "balance",
              name: "Мой баланс",
              subtitle: `${(safeBalanceCents / 100).toFixed(0)} ₽`,
              badge: isBalanceSufficient ? "БАЛАНС" : "МАЛО",
              icon: "💰",
              disabled: !isBalanceSufficient
            }] : []),
            { id: "yookassa", name: "СБП / Карты", subtitle: "0% комиссия", badge: "ХИТ", icon: "⚡", disabled: false },
            { id: "cryptobot", name: "Крипта", subtitle: "USDT / TON", icon: "💎", disabled: false },
            { id: "robokassa", name: "Зарубежные", subtitle: "Карты / СНГ", icon: "🌐", disabled: false },
          ];

          return (
            <div className={`grid gap-1.5 ${hasBalance ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
              {gateways.map((gateway) => {
                const isSelected = selectedGateway === gateway.id;
                return (
                  <button
                    key={gateway.id}
                    type="button"
                    onClick={() => {
                      if (gateway.disabled) {
                        setLocalError(`Недостаточно средств на балансе (${(safeBalanceCents / 100).toFixed(2)} ₽). Пополните баланс в ЛК или выберите оплату картой.`);
                        setShakeKey(prev => prev + 1);
                        return;
                      }
                      setLocalError(null);
                      setSelectedGateway(gateway.id);
                    }}
                    className={`p-2 rounded-xl border text-left flex flex-col justify-between gap-0.5 transition-all cursor-pointer active:scale-95 min-h-[52px] relative overflow-hidden ${
                      gateway.disabled
                        ? "opacity-60 cursor-not-allowed border-border/30 bg-content2/50 text-muted-foreground"
                        : isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm"
                        : "border-border/50 bg-content2 hover:bg-content3 hover:border-border text-muted-foreground"
                    }`}
                  >
                    {gateway.badge && (
                      <span className={`absolute top-1 right-1 text-[8px] font-black uppercase tracking-wider px-1 py-0.2 rounded ${
                        gateway.id === 'balance' && isBalanceSufficient
                          ? "bg-emerald-500 text-white"
                          : gateway.disabled
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}>
                        {gateway.badge}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{gateway.icon}</span>
                      <span className={`text-[11px] font-bold ${isSelected ? "text-foreground" : "text-foreground/80"}`}>
                        {gateway.name}
                      </span>
                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground">
                      {gateway.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      <div className="pt-2 border-t border-border/30 space-y-2">
        <AnimatePresence>
          {(localError || checkoutError) && (
            <motion.div
              key={shakeKey}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-3 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-xs font-bold flex items-center gap-2 animate-shake"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
              <span>{localError || checkoutError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={onOrderClick}
          disabled={isSubmitting || quantity < minQty}
          className={`w-full h-12 rounded-2xl bg-primary text-primary-foreground font-black text-sm shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed ${
            (localError || checkoutError) ? 'ring-2 ring-danger/40 animate-shake' : ''
          }`}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isCalculating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Расчёт...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-current" />
              <span>
                {selectedGateway === 'balance'
                  ? `Оплатить с баланса — ${totalPriceFormatted} ₽`
                  : selectedGateway === 'yookassa'
                  ? `Оплатить через СБП / Картой — ${totalPriceFormatted} ₽`
                  : selectedGateway === 'cryptobot'
                  ? `Оплатить в CryptoBot — ${totalPriceFormatted} ₽`
                  : `Оплатить картой — ${totalPriceFormatted} ₽`}
              </span>
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-col items-center gap-1 text-center pt-0.5 pb-1">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
          <span className="text-emerald-500 font-black">✓</span>
          <span>
            {selectedGateway === 'balance'
              ? 'Внутреннее списание • Без комиссий банка'
              : 'Официальный платёж • Электронный чек по 54-ФЗ'}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/75 font-medium">
          Безопасное соединение TLS 1.3 • Без подписок и скрытых списаний
        </p>
      </div>
    </motion.div>
  );
}
