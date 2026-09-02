import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Zap, Sliders, ChevronDown, Link2, Pencil, Minus, Plus } from "lucide-react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { DynamicPayloadWarnings } from "../DynamicPayloadWarnings";
import { DripFeedConfigurator } from "../DripFeedConfigurator";
import { LegalCheckbox } from "../LegalCheckbox";
import { Button } from "@/components/ui/button";

interface MobileStep4CheckoutProps {
  engine: OrderEngine;
  currentStep: number;
  setActiveStep: (step: 1 | 2 | 3 | 4) => void;
  shouldShowParameters: boolean;
  step4Ref: React.RefObject<HTMLDivElement | null>;
  emailInputRef?: React.RefObject<HTMLInputElement | null>;
  emailHasError?: boolean;
  handleCheckout: () => void;
  isSubmitting: boolean;
  onOpenDocument?: (slug: string) => void;
}

const QUICK_QUANTITY_PRESETS = [100, 500, 1000, 5000];

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
  onOpenDocument
}: MobileStep4CheckoutProps) {
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

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

  React.useEffect(() => {
    if (promoCode && promoCode.length > 0) {
      setShowPromo(true);
    }
  }, [promoCode]);

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
      className="space-y-4 overflow-visible border-t border-border/30 pt-3"
    >
      <div className="flex items-center justify-between pl-1">
        <span className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
          4. Параметры и оформление
        </span>
        <span className="text-[11px] font-bold text-primary">
          {selectedService.name}
        </span>
      </div>

      {/* Ссылка на объект (Канал / Пост / Профиль) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="mobile-checkout-url-input" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-primary" />
            <span>Ссылка на объект</span>
            <span className="text-destructive">*</span>
          </label>
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

        {isLinkReady ? (
          <div className="p-3 rounded-2xl bg-content2/80 border border-border/60 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground truncate font-mono">{url}</span>
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className="text-xs font-bold text-primary px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 shrink-0 cursor-pointer"
            >
              Сменить
            </button>
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
              placeholder="https://t.me/channel_or_post"
              className={`w-full h-11 px-4 rounded-2xl border bg-background text-sm text-foreground outline-none transition-all ${
                validationErrors?.link
                  ? 'border-destructive focus:border-destructive ring-2 ring-destructive/30'
                  : 'border-border focus:border-primary focus:ring-2 ring-primary/30'
              }`}
            />
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
              if (quantity < minQty) {
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

        {/* Быстрые пресеты */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {QUICK_QUANTITY_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleAddQuantity(preset)}
              className="py-1.5 px-1 rounded-lg bg-content2 hover:bg-primary/10 hover:text-primary border border-border/40 text-[11px] font-extrabold text-muted-foreground transition-all active:scale-95 text-center cursor-pointer"
            >
              +{preset >= 1000 ? `${preset / 1000}k` : preset}
            </button>
          ))}
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
          Email для чека
        </label>
        <input
          id="email-input"
          type="email"
          ref={emailInputRef}
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={`w-full h-11 px-4 rounded-2xl border bg-background text-base text-foreground outline-none transition-all ${
            emailHasError
              ? 'border-danger focus:border-danger ring-2 ring-danger/30'
              : 'border-border focus:border-primary focus:ring-2 ring-primary/30'
          }`}
        />
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

      <div className="flex gap-2">
        <Button
          type="button"
          intent="outline"
          onClick={() => setActiveStep(3)}
          className="w-full text-xs font-bold h-11 min-h-[44px] rounded-xl bg-content2 text-foreground border-border/40 hover:bg-content3 cursor-pointer"
        >
          Назад к тарифам
        </Button>
      </div>

      <div className="pt-2 border-t border-border/30 space-y-2">
        <Button
          onClick={handleCheckout}
          disabled={isSubmitting}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-black text-sm shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] min-h-[48px]"
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
              <span>Заказать {quantity.toLocaleString()} шт — {totalPriceFormatted} ₽</span>
            </>
          )}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-wider">
        СБП • МИР • Visa • Cryptobot
      </p>
    </motion.div>
  );
}
