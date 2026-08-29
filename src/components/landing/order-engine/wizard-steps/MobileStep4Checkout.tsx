import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Zap, Sliders, ChevronDown, Link2, Pencil } from "lucide-react";
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
    if (promoCode?.length > 0) {
      setShowPromo(true);
    }
  }, [promoCode]);

  if (currentStep !== 4 || !shouldShowParameters || !selectedService) {
    return null;
  }

  const isLinkReady = url.trim().length >= 5;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      ref={step4Ref}
      className="space-y-4 overflow-visible border-t border-border/30 pt-4"
    >
      <span className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider pl-1">
        4. Параметры заказа
      </span>

      {/* Ссылка на объект (Канал / Пост / Профиль) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="step4-url-input" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1.5">
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
          <div className="p-3 rounded-xl bg-content2/80 border border-border/60 flex items-center justify-between gap-2">
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
              id="step4-url-input"
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              aria-describedby={validationErrors?.link ? "step4-url-error" : undefined}
              placeholder="https://t.me/channel_or_post"
              className={`w-full h-11 px-4 rounded-xl border bg-background text-sm text-foreground outline-none transition-all ${
                validationErrors?.link
                  ? 'border-destructive focus:border-destructive ring-2 ring-destructive/30'
                  : 'border-border focus:border-primary focus:ring-2 ring-primary/30'
              }`}
            />
            {validationErrors?.link && (
              <p id="step4-url-error" className="text-[11px] font-bold text-destructive pl-1 animate-in fade-in duration-200">
                {validationErrors.link}
              </p>
            )}
          </div>
        )}
      </div>

      <DynamicPayloadWarnings engine={engine} />

      <div className="space-y-1.5">
        <label htmlFor="quantity-input" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
          Количество ({selectedService.minQty} — {selectedService.maxQty?.toLocaleString()})
        </label>
        <input
          id="quantity-input"
          type="number"
          inputMode="numeric"
          value={quantity}
          min={selectedService.minQty}
          max={selectedService.maxQty}
          onFocus={(e) => {
            const target = e.target;
            setTimeout(() => target.select(), 0);
          }}
          onChange={e => {
            let val = Number(e.target.value);
            if (selectedService.maxQty && val > selectedService.maxQty) val = selectedService.maxQty;
            setQuantity(val);
          }}
          onBlur={() => {
            if (quantity < selectedService.minQty) {
              setQuantity(selectedService.minQty);
            }
          }}
          className={`w-full h-11 px-4 rounded-xl border bg-background text-base font-black tabular-nums text-foreground outline-none transition-all ${
            quantity < selectedService.minQty
              ? 'border-danger focus:border-danger ring-2 ring-danger/20'
              : 'border-border focus:border-primary focus:ring-2 ring-primary/20'
          }`}
        />
        {quantity > 0 && quantity < selectedService.minQty && (
          <p className="text-[11px] font-bold text-danger pl-1 animate-in fade-in duration-200">
            Минимум: {selectedService.minQty} шт. При потере фокуса исправим автоматически.
          </p>
        )}
      </div>

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
          className={`w-full h-11 px-4 rounded-xl border bg-background text-base text-foreground outline-none transition-all ${
            emailHasError
              ? 'border-danger focus:border-danger ring-2 ring-danger/30'
              : 'border-border focus:border-primary focus:ring-2 ring-primary/30'
          }`}
        />
      </div>

      <div className="space-y-1.5">
        {!showPromo ? (
          <button
            type="button"
            onClick={() => setShowPromo(true)}
            className="text-xs font-extrabold text-primary uppercase tracking-wider pl-1 hover:underline flex items-center gap-1 transition-all h-11 min-h-[44px] cursor-pointer"
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
                className="w-full h-11 px-4 rounded-xl border border-border bg-background text-base text-foreground outline-none focus:border-primary focus:ring-2 ring-primary/20 transition-all"
              />
            </div>
          </div>
        )}
      </div>

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

      {/* FZ-152 compliance marker: согласие на обработку персональных данных /legal/privacy */}
      <LegalCheckbox
        id="standard-legal-checkbox"
        checked={agreedToTerms}
        onChange={(val) => setAgreedToTerms(val)}
        labelClassName="text-muted-foreground font-medium text-xs"
        onOpenDocument={onOpenDocument}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          intent="outline"
          onClick={() => setActiveStep(3)}
          className="w-full text-xs font-bold h-11 min-h-[44px] rounded-xl bg-content2 text-foreground border-border/40 hover:bg-content3"
        >
          Назад к тарифам
        </Button>
      </div>

      <div className="pt-4 border-t border-border/30 space-y-2">
        <Button
          onClick={handleCheckout}
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] min-h-[48px]"
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
