"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { CheckoutVariantProps } from "./types";
import { DrawerOrderSummary } from "../drawer/DrawerOrderSummary";
import { DrawerQuantityCard } from "../drawer/DrawerQuantityCard";
import { DrawerFormInputs } from "../drawer/DrawerFormInputs";
import { DrawerPaymentSelector } from "../drawer/DrawerPaymentSelector";
import { DripFeedConfigurator } from "../DripFeedConfigurator";
import { LegalCheckbox } from "../LegalCheckbox";

export function StepWizardCheckout({
  selectedService,
  url,
  setShowLinkModal,
  quantity,
  setQuantity,
  pricing,
  email,
  setEmail,
  promoCode,
  setPromoCode,
  isCalculating,
  isSubmitting,
  handleCheckout,
  onClose,
  emailInputRef,
  emailHasError,
  termsHasError,
  engine,
  onOpenDocument,
  userBalanceCents
}: CheckoutVariantProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [gateway, setGateway] = useState<"yookassa" | "cryptobot" | "balance">("yookassa");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Reset to step 1 when new service is selected
  useEffect(() => {
    setStep(1);
  }, [selectedService?.id]);

  const formattedTotal = React.useMemo(() => {
    if (!pricing) return "0.00";
    return (pricing.totalCents / 100).toFixed(2);
  }, [pricing]);

  const getButtonText = () => {
    if (isSubmitting) return "Секунду...";
    if (gateway === "cryptobot") return "Оплатить через CryptoBot";
    if (gateway === "balance") return "Оплатить балансом";
    return "Оплатить картой РФ / СБП";
  };

  const steps = [
    { num: 1, title: "Количество", desc: "Объем заказа" },
    { num: 2, title: "Данные", desc: "Ссылка и Email" },
    { num: 3, title: "Оплата", desc: "Шлюз и чек" },
  ];

  return (
    <AnimatePresence>
      {selectedService && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/70 backdrop-blur-md cursor-pointer"
          />

          {/* Wizard Card (No vertical scroll on desktop; graceful scroll on small mobile) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh] z-10"
          >
            {/* Top Wizard Header */}
            <div className="px-4 sm:px-5 py-3 border-b border-border/80 bg-muted/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                  ID {selectedService.numericId}
                </span>
                <span className="text-xs sm:text-sm font-black text-foreground truncate max-w-[280px] sm:max-w-[420px]">
                  {selectedService.name}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-content2 hover:bg-content3 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0"
                title="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="grid grid-cols-3 border-b border-border/60 bg-muted/10 shrink-0">
              {steps.map((s) => {
                const isActive = step === s.num;
                const isPassed = step > s.num;
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => {
                      if (isPassed || (s.num === 2 && quantity > 0) || (s.num === 3 && quantity > 0 && url)) {
                        setStep(s.num as 1 | 2 | 3);
                      }
                    }}
                    className={`py-2.5 px-2.5 sm:px-4 text-left transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? "border-primary bg-primary/5 text-primary"
                        : isPassed
                        ? "border-emerald-500/60 text-foreground hover:bg-muted/40"
                        : "border-transparent text-muted-foreground/60 hover:text-muted-foreground"
                    }`}
                  >
                    <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isPassed
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                    </div>
                    <div className="hidden sm:block min-w-0">
                      <p className={`text-xs font-black leading-tight truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                        {s.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-none mt-0.5 truncate">
                        {s.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Wizard Dynamic Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 scrollbar-thin">
              {/* STEP 1: QUANTITY */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-3"
                >
                  <DrawerOrderSummary
                    selectedService={selectedService}
                    url={url}
                    setShowLinkModal={setShowLinkModal}
                    engine={engine}
                  />

                  <DrawerQuantityCard
                    selectedService={selectedService}
                    quantity={quantity}
                    setQuantity={setQuantity}
                    pricing={pricing}
                    engine={engine}
                  />

                  <DripFeedConfigurator engine={engine} />
                </motion.div>
              )}

              {/* STEP 2: LINK & EMAIL */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-3"
                >
                  <DrawerOrderSummary
                    selectedService={selectedService}
                    url={url}
                    setShowLinkModal={setShowLinkModal}
                    engine={engine}
                  />

                  <DrawerFormInputs
                    email={email}
                    setEmail={setEmail}
                    promoCode={promoCode}
                    setPromoCode={setPromoCode}
                    emailInputRef={emailInputRef}
                    emailHasError={emailHasError}
                    engine={engine}
                  />
                </motion.div>
              )}

              {/* STEP 3: PAYMENT GATEWAY */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-3"
                >
                  <DrawerPaymentSelector
                    gateway={gateway}
                    setGateway={setGateway}
                    userBalanceCents={userBalanceCents}
                    totalCents={pricing?.totalCents || 0}
                  />

                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Услуга:</span>
                      <span className="font-bold text-foreground truncate max-w-[280px]">{selectedService.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Количество:</span>
                      <span className="font-bold text-foreground font-mono">{quantity.toLocaleString("ru-RU")} шт</span>
                    </div>
                    {url && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">Цель:</span>
                        <span className="font-mono text-primary truncate max-w-[260px]">{url}</span>
                      </div>
                    )}
                    {email && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">Чек на email:</span>
                        <span className="font-bold text-foreground">{email}</span>
                      </div>
                    )}
                  </div>

                  <motion.div
                    animate={termsHasError ? { x: [0, -6, 6, -6, 6, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className={`w-full rounded-xl transition-all ${
                      termsHasError ? "ring-2 ring-destructive/40 bg-destructive/5 border border-destructive/20 p-2" : ""
                    }`}
                  >
                    <LegalCheckbox
                      id="wizard-legal-checkbox"
                      checked={engine?.agreedToTerms ?? false}
                      onChange={(val) => engine?.setAgreedToTerms(val)}
                      className="w-full text-[10px] font-bold text-muted-foreground justify-start"
                      onOpenDocument={onOpenDocument}
                    />
                  </motion.div>
                </motion.div>
              )}
            </div>

            {/* Wizard Navigation Footer */}
            <div className="border-t border-border/80 bg-muted/10 px-4 sm:px-5 py-3.5 shrink-0 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                  Итого к оплате
                </span>
                <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums font-mono">
                  {formattedTotal} <span className="text-primary text-lg sm:text-xl">₽</span>
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                    className="min-h-[44px] h-11 px-3.5 sm:px-4 rounded-xl bg-content2 hover:bg-content3 border border-border text-foreground font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Назад</span>
                  </button>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                    className="min-h-[44px] h-11 px-5 sm:px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
                  >
                    <span>Далее: {steps[step].title}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCheckout(gateway)}
                    disabled={isSubmitting || isCalculating}
                    className="min-h-[44px] h-11 px-5 sm:px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>{getButtonText()}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
