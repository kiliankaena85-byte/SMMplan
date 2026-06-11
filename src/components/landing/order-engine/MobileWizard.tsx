"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { CategoryIcon, cleanCategoryName } from "@/components/ui/CategoryIcon";
import { Zap, Link2, Loader2, Sliders, ChevronDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DynamicPayloadWarnings } from "./DynamicPayloadWarnings";
import { DripFeedConfigurator } from "./DripFeedConfigurator";
import { motion, AnimatePresence } from "framer-motion";
import { LegalCheckbox } from "./LegalCheckbox";
import { TariffCard } from "./TariffCard";
import { getBrandStyles } from "@/utils/brand-styles";

interface MobileWizardProps {
  engine: OrderEngine;
  handleCheckout: () => void;
  isSubmitting: boolean;
  emailInputRef?: React.RefObject<HTMLInputElement | null>;
  emailHasError?: boolean;
  onOpenGuide?: () => void;
  onOpenDocument?: (slug: string) => void;
  onOpenCatalog?: () => void;
}

export function MobileWizard({ 
  engine, 
  handleCheckout, 
  isSubmitting,
  emailInputRef,
  emailHasError,
  onOpenGuide,
  onOpenDocument,
  onOpenCatalog
}: MobileWizardProps) {

  const [showAdvancedParams, setShowAdvancedParams] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [localUrlError, setLocalUrlError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeStep, setActiveStepRaw] = useState<1 | 2 | 3 | 4>(1);
  const [lastResolvedUrl, setLastResolvedUrl] = useState<string>("");
  const [lastSelectedServiceId, setLastSelectedServiceId] = useState<string | undefined>(undefined);
  const [lastCategoryId, setLastCategoryId] = useState<string | null>(null);

  // Refs for scroll-into-view on step transitions
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);

  const setActiveStep = useCallback((step: 1 | 2 | 3 | 4) => {
    setActiveStepRaw(step);
    // Scroll to the new step after a short delay for AnimatePresence
    setTimeout(() => {
      const refMap: Record<number, React.RefObject<HTMLDivElement | null>> = { 2: step2Ref, 3: step3Ref, 4: step4Ref };
      const ref = refMap[step];
      if (ref?.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
  }, []);

  const {
    url, setUrl,
    networkId,
    categoryId, setCategoryId,
    selectedService, setSelectedService,
    quantity, setQuantity,
    email, setEmail,
    promoCode, setPromoCode,
    agreedToTerms, setAgreedToTerms,
    catalog,
    availableCategories,
    services,
    isLoading,
    isCalculating,
    totalPriceFormatted,
    validationErrors,
  } = engine;

  useEffect(() => {
    if (promoCode?.length > 0) {
      setShowPromo(true);
    }
  }, [promoCode]);

  // Track if service was selected from manual catalog (without URL)
  const [catalogHint, setCatalogHint] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (url.trim().length >= 5) {
      setLastResolvedUrl(url);
      if (selectedService) {
        setActiveStep(4);
      } else if (categoryId) {
        setActiveStep(3);
      } else {
        setActiveStep(2);
      }
    } else {
      // If service is already selected (from catalog) but no URL, stay on step 1 with hint
      if (selectedService) {
        setCatalogHint(true);
      }
      setActiveStep(1);
    }
  }, []);

  const proceedFromStep1 = () => {
    if (selectedService) {
      setActiveStep(4);
    } else if (categoryId) {
      setActiveStep(3);
    } else {
      setActiveStep(2);
    }
  };

  // Auto-advance step when URL analysis completes and URL is valid and has changed
  useEffect(() => {
    if (url.trim().length < 5) {
      setActiveStep(1);
      setLastResolvedUrl("");
      return;
    }

    if (!isLoading) {
      const isUrlValid = !validationErrors?.link && !localUrlError;
      if (isUrlValid && url !== lastResolvedUrl) {
        setLastResolvedUrl(url);
        if (selectedService) {
          setActiveStep(4);
        } else if (categoryId) {
          setActiveStep(3);
        } else {
          setActiveStep(2);
        }
      }
    }
  }, [isLoading, url, validationErrors?.link, localUrlError, lastResolvedUrl, selectedService, categoryId]);

  useEffect(() => {
    if (selectedService?.id !== lastSelectedServiceId) {
      setLastSelectedServiceId(selectedService?.id);
      if (selectedService && url.trim().length >= 5) {
        setActiveStep(4);
      } else if (selectedService && url.trim().length < 5) {
        // Service selected from catalog but no URL yet — show step 1 with hint
        setCatalogHint(true);
        setActiveStep(1);
      }
    }
  }, [selectedService, lastSelectedServiceId, url]);

  useEffect(() => {
    if (categoryId !== lastCategoryId) {
      setLastCategoryId(categoryId);
      if (categoryId && !selectedService && url.trim().length >= 5) {
        setActiveStep(3);
      } else if (!categoryId && url.trim().length >= 5) {
        setActiveStep(2);
      }
    }
  }, [categoryId, lastCategoryId, selectedService, url]);

  // Clear catalog hint when URL becomes valid
  useEffect(() => {
    if (catalogHint && url.trim().length >= 5) {
      setCatalogHint(false);
    }
  }, [url, catalogHint]);

  const selectedCategoryName = useMemo(() => {
    if (!catalog || !networkId || !categoryId) return "Тарифы";
    const net = catalog.find(n => n.id === networkId);
    if (!net) return "Тарифы";
    const cat = net.categories.find(c => c.id === categoryId);
    return cat ? cleanCategoryName(cat.name) : "Тарифы";
  }, [catalog, networkId, categoryId]);

  const brandStyle = useMemo(() => {
    if (!catalog || !networkId) return undefined;
    const net = catalog.find(n => n.id === networkId);
    return net ? getBrandStyles(net.slug) : undefined;
  }, [catalog, networkId]);

  if (!mounted) {
    return (
      <div className="md:hidden flex items-center justify-center p-8 bg-card border-b border-border/50">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  // Progressive disclosure variables
  const isLinkFilled = url.trim().length >= 5;
  const shouldShowCategories = isLinkFilled;
  const shouldShowTariffs = (isLinkFilled && !!categoryId) || !!selectedService;
  const shouldShowParameters = isLinkFilled && !!selectedService;

  const currentStep = activeStep as number;

  return (
    <div data-testid="mobile-wizard" className="md:hidden flex flex-col gap-5 p-4 bg-card rounded-3xl shadow-sm relative z-30 animate-in fade-in duration-300">
      
      {/* SECTION 1: Link Input (Core Entry) */}
      <div className="space-y-2">
        {currentStep === 1 ? (
          <div className="space-y-2">
            <label htmlFor="standard-url-input" className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider pl-1">
              1. Введите ссылку на канал, профиль или пост
            </label>
            
            {/* Premium Google Shimmer Border Wrapper */}
            <div className={`relative w-full group rounded-2xl transition-all duration-300 ${isFocused ? 'p-[2px] scale-[1.01]' : 'p-[1px] scale-100'}`}>
              {/* Shimmer Border */}
              <div
                className={`absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none ${
                  validationErrors?.link || localUrlError
                    ? "warning-border-shimmer opacity-100"
                    : "google-border-shimmer opacity-100"
                }`}
              />
              
              {/* Soft backdrop blur glow */}
              <div
                className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none blur-md ${
                  validationErrors?.link || localUrlError
                    ? "warning-border-shimmer opacity-40"
                    : isFocused
                    ? "google-border-shimmer opacity-60 scale-[1.02]"
                    : "google-border-shimmer opacity-20 group-hover:opacity-35"
                }`}
              />
              
              <div className="relative flex items-center w-full bg-content1 rounded-2xl p-0.5 z-10">
                <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="standard-url-input"
                  type="url"
                  value={url}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onChange={e => {
                    setUrl(e.target.value);
                    if (localUrlError) setLocalUrlError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      proceedFromStep1();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  placeholder="https://t.me/channel_or_post"
                  aria-label="Введите ссылку на канал, профиль или пост"
                  className="w-full h-11 pl-10 pr-4 rounded-2xl bg-transparent text-base font-semibold text-foreground placeholder:text-muted-foreground/50 outline-none border-none"
                />
              </div>
            </div>

            {/* Validation Errors */}
            {validationErrors?.link && (
              <p className="text-[11px] font-bold text-danger pl-1 animate-pulse">
                {validationErrors.link}
              </p>
            )}
            {localUrlError && (
              <p className="text-[11px] font-bold text-danger pl-1 animate-pulse">
                {localUrlError}
              </p>
            )}

            {/* Smart Category Swapper helper on step 1 */}
            {(validationErrors?.link || localUrlError) && (
              <div className="mt-1.5">
                <DynamicPayloadWarnings engine={engine} minimalMode={true} />
              </div>
            )}

            {/* Catalog Hint: shown when service selected from catalog but no URL */}
            {catalogHint && selectedService && (
              <div className="flex items-start gap-2.5 p-3 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-foreground/80 font-semibold leading-relaxed">
                  <span className="font-extrabold text-foreground">Тариф «{selectedService.name}» выбран.</span>{" "}
                  Теперь вставьте ссылку на ваш канал, пост или профиль, чтобы оформить заказ.
                </div>
              </div>
            )}

            {/* Link Guide and Catalog Buttons */}
            <div className="flex flex-col gap-2 pt-1.5">
              <div className="flex justify-between items-center px-1">
                <button
                  type="button"
                  onClick={onOpenGuide}
                  aria-label="Где взять ссылку для заказа? Гайд по ссылкам"
                  className="text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer active:scale-95 transition-all h-11 min-h-[44px] px-2 -ml-2"
                >
                  <span>❓</span>
                  <span className="underline">Где взять ссылку?</span>
                </button>
              </div>
              
              <button
                type="button"
                onClick={onOpenCatalog}
                className="text-xs font-bold text-primary hover:underline h-11 min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 w-full border border-dashed border-primary/30 rounded-xl bg-primary/5 active:scale-95 transition-all cursor-pointer"
              >
                <span>📂</span>
                <span>Выбрать тариф из каталога вручную</span>
              </button>
            </div>
          </div>
        ) : (
          url.trim().length >= 5 && (
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className="w-full text-left p-3.5 bg-content2 hover:bg-content3 border border-border/40 rounded-2xl flex items-center justify-between transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">1. Ссылка на канал / пост</span>
                <span className="text-xs font-bold text-foreground truncate">
                  Ссылка: {url}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 rotate-90" />
            </button>
          )
        )}
      </div>

      {/* SECTION 2: Categories (Progressive Reveal / Collapsible) */}
      <AnimatePresence>
        {(currentStep === 2 || (currentStep !== 2 && !!categoryId)) && shouldShowCategories && availableCategories.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            ref={step2Ref}
            className="space-y-3 overflow-visible border-t border-border/30 pt-4"
          >
            {currentStep === 2 ? (
              <>
                <div className="flex items-center justify-between pl-1">
                  <span className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    2. Выберите категорию
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {availableCategories.map((cat) => {
                    const isActive = categoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategoryId(cat.id);
                          setActiveStep(3);
                        }}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer active:scale-[0.99] text-left border min-h-[48px]
                          ${isActive
                            ? `${brandStyle?.activeBg || "bg-primary"} ${brandStyle?.activeText || "text-primary-foreground"} border-transparent shadow-md shadow-primary/10`
                            : "bg-content2 border-border/40 text-foreground/85 hover:text-foreground hover:border-border/80 hover:bg-content3"
                          }
                        `}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive 
                            ? "bg-current/20 text-current" 
                            : "bg-primary/5 text-primary"
                        }`}>
                          <CategoryIcon name={cat.name} size={15} />
                        </div>
                        <span className="truncate">{cleanCategoryName(cat.name)}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Back / Next buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    intent="outline"
                    onClick={() => setActiveStep(1)}
                    className="w-full text-xs font-bold h-11 min-h-[44px] rounded-xl bg-content2 text-foreground border-border/40 hover:bg-content3"
                  >
                    Назад
                  </Button>
                  {!!categoryId && (
                    <Button
                      type="button"
                      onClick={() => setActiveStep(3)}
                      className="w-full text-xs font-bold h-11 min-h-[44px] rounded-xl bg-primary text-primary-foreground"
                    >
                      Далее
                    </Button>
                  )}
                </div>
              </>
            ) : (
              !!categoryId && (
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="w-full text-left p-3.5 bg-content2 hover:bg-content3 border border-border/40 rounded-2xl flex items-center justify-between transition-all cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">2. Категория</span>
                    <span className="text-xs font-bold text-foreground truncate">
                      Категория: {selectedCategoryName}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 rotate-90" />
                </button>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 3: Service Tariffs (Progressive Reveal / Collapsible) */}
      <AnimatePresence>
        {(currentStep === 3 || (currentStep !== 3 && !!selectedService)) && shouldShowTariffs && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            ref={step3Ref}
            className="space-y-3 overflow-visible border-t border-border/30 pt-4"
          >
            {currentStep === 3 ? (
              <>
                <div className="flex items-center justify-between pl-1">
                  <span className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    3. Выберите тариф • {selectedCategoryName}
                  </span>
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-1 gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-20 rounded-2xl bg-muted/20 animate-pulse border border-border/50" />
                    ))}
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground font-semibold bg-content2 rounded-2xl p-4 border border-dashed border-border/50">
                    {!networkId
                      ? "Вставьте ссылку или выберите категорию в каталоге, чтобы загрузить тарифы."
                      : "В этой категории пока нет доступных тарифов. Попробуйте выбрать другую."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 max-h-[40dvh] overflow-y-auto overscroll-contain pr-1">
                    {services.map((srv) => (
                      <TariffCard
                        key={srv.id}
                        service={srv}
                        isSelected={selectedService?.id === srv.id}
                        onSelect={(s) => {
                          setSelectedService(s);
                          setActiveStep(4);
                        }}
                        brandStyle={brandStyle}
                      />
                    ))}
                  </div>
                )}

                {/* Back / Next buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    intent="outline"
                    onClick={() => setActiveStep(2)}
                    className="w-full text-xs font-bold h-11 min-h-[44px] rounded-xl bg-content2 text-foreground border-border/40 hover:bg-content3"
                  >
                    Назад
                  </Button>
                  {!!selectedService && (
                    <Button
                      type="button"
                      onClick={() => setActiveStep(4)}
                      className="w-full text-xs font-bold h-11 min-h-[44px] rounded-xl bg-primary text-primary-foreground"
                    >
                      Далее
                    </Button>
                  )}
                </div>
              </>
            ) : (
              !!selectedService && (
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="w-full text-left p-3.5 bg-content2 hover:bg-content3 border border-border/40 rounded-2xl flex items-center justify-between transition-all cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">3. Выбранный тариф</span>
                    <span className="text-xs font-bold text-foreground truncate">
                      Тариф: {selectedService.name}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 rotate-90" />
                </button>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 4: Order Parameters (Progressive Reveal / Collapsible) */}
      <AnimatePresence>
        {currentStep === 4 && shouldShowParameters && selectedService && (
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

            {/* Dynamic Payload Warnings */}
            <DynamicPayloadWarnings engine={engine} />

            {/* Quantity Input */}
            <div className="space-y-1.5">
              <label htmlFor="quantity-input" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
                Количество ({selectedService.minQty} — {selectedService.maxQty?.toLocaleString()})
              </label>
              <input
                id="quantity-input"
                type="number"
                value={quantity}
                min={selectedService.minQty}
                max={selectedService.maxQty}
                onFocus={(e) => e.target.select()}
                onChange={e => {
                  let val = Number(e.target.value);
                  if (selectedService.maxQty && val > selectedService.maxQty) val = selectedService.maxQty;
                  setQuantity(val);
                }}
                onBlur={() => {
                  // Auto-correct to minQty on blur if user entered too little
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

            {/* Email Input */}
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

            {/* Promocode section */}
            <div className="space-y-1.5">
              {!showPromo ? (
                <button
                  type="button"
                  onClick={() => setShowPromo(true)}
                  className="text-xs font-extrabold text-primary uppercase tracking-wider pl-1 hover:underline flex items-center gap-1 transition-all h-9 cursor-pointer"
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

            {/* Collapsible Advanced settings spoiler (Drip-feed, smart config) */}
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

            {/* Legal Consent Checkbox */}
            <LegalCheckbox
              id="standard-legal-checkbox"
              checked={agreedToTerms}
              onChange={(val) => setAgreedToTerms(val)}
              labelClassName="text-muted-foreground font-medium text-xs"
              onOpenDocument={onOpenDocument}
            />

            {/* Back button (Only if activeStep is 4, to go to step 3) */}
            {currentStep === 4 && (
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
            )}

            {/* Checkout Button — Amazon-style: quantity + price in button text */}
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
        )}
      </AnimatePresence>

      {/* ═══ STICKY BOTTOM CTA BAR (visible on steps 1-3 when service is selected) ═══ */}
      <AnimatePresence>
        {currentStep !== 4 && selectedService && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="sticky bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider truncate">
                  {selectedService.name}
                </p>
                <p className="text-xs font-bold text-foreground/70 truncate">
                  {quantity.toLocaleString()} шт {isCalculating ? '' : `— ${totalPriceFormatted} ₽`}
                </p>
              </div>
              <Button
                onClick={() => {
                  // If URL is missing, guide user to fill it
                  if (!isLinkFilled) {
                    toast.info("Вставьте ссылку на канал или пост, чтобы оформить заказ.", {
                      position: "top-center",
                      duration: 3000
                    });
                    setActiveStep(1);
                    setTimeout(() => {
                      const urlInput = document.getElementById("standard-url-input");
                      if (urlInput) urlInput.focus();
                    }, 200);
                    return;
                  }
                  if (!categoryId) {
                    toast.info("Выберите категорию услуги.", { position: "top-center", duration: 3000 });
                    setActiveStep(2);
                    return;
                  }
                  setActiveStep(4);
                }}
                className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-md shadow-primary/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 min-h-[44px]"
              >
                <span>Оформить</span>
                <Zap className="w-3.5 h-3.5 fill-current" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
