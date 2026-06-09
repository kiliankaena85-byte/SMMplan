"use client";

import React, { useState, useMemo, useEffect } from "react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { cleanCategoryName, CategoryIcon } from "@/components/ui/CategoryIcon";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Globe, Layers, Zap, ChevronRight, ArrowLeft, Link2, CheckSquare, Square, Loader2, Sparkles } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { Button } from "@/components/ui/button";
import { TariffCatalog } from "./TariffCatalog";
import { DynamicPayloadWarnings } from "./DynamicPayloadWarnings";
import { DripFeedConfigurator } from "./DripFeedConfigurator";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { motion, AnimatePresence } from "framer-motion";
import { LegalCheckbox } from "./LegalCheckbox";

interface MobileWizardProps {
  engine: OrderEngine;
  handleCheckout: () => void;
  isSubmitting: boolean;
  emailInputRef?: React.RefObject<HTMLInputElement | null>;
  emailHasError?: boolean;
  onOpenGuide?: () => void;
  onOpenDocument?: (slug: string) => void;
}

function getCategoryDemandScore(name: string): number {
  const n = name.toLowerCase();
  
  if ((n.includes('подписчик') || n.includes('участник') || n.includes('follow') || n.includes('member')) && !n.includes('premium') && !n.includes('премиум') && !n.includes('бот')) {
    return 10;
  }
  if (n.includes('просмотр') || n.includes('охват') || n.includes('view') || n.includes('watch') || n.includes('stat') || n.includes('стат')) {
    return 20;
  }
  if (n.includes('лайк') || n.includes('like') || n.includes('нравится') || n.includes('heart')) {
    return 30;
  }
  if (n.includes('реакц') || n.includes('reaction') || n.includes('emoji') || n.includes('эмоци')) {
    return 40;
  }
  if (n.includes('premium') || n.includes('премиум')) {
    return 95;
  }
  if (n.includes('буст') || n.includes('boost') || n.includes('level')) {
    return 60;
  }
  if (n.includes('коммент') || n.includes('comment') || n.includes('отзыв') || n.includes('review')) {
    return 70;
  }
  if (n.includes('репост') || n.includes('repost') || n.includes('share') || n.includes('поделит')) {
    return 80;
  }
  if (n.includes('звезд') || n.includes('star') || n.includes('coin')) {
    return 90;
  }
  if (n.includes('бот') || n.includes('bot') || n.includes('инвайт') || n.includes('invite') || n.includes('referral') || n.includes('рефер')) {
    return 100;
  }
  return 999;
}

export function MobileWizard({ 
  engine, 
  handleCheckout, 
  isSubmitting,
  emailInputRef,
  emailHasError,
  onOpenGuide,
  onOpenDocument
}: MobileWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [showCatalog, setShowCatalog] = useState(false);
  const [proMode, setProMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [showCatalogManually, setShowCatalogManually] = useState(false);
  const [localUrlError, setLocalUrlError] = useState<string | null>(null);

  const {
    url, setUrl,
    networkId, setNetworkId,
    categoryId, setCategoryId,
    selectedService, setSelectedService,
    quantity, setQuantity,
    email, setEmail,
    promoCode, setPromoCode,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    agreedToTerms, setAgreedToTerms,
    catalog,
    availableCategories,
    services,
    isLoading,
    isCalculating,
    totalPriceFormatted,
    pricingError,
    validationErrors,
    platform,
  } = engine;

  useEffect(() => {
    if (promoCode?.length > 0) {
      setShowPromo(true);
    }
  }, [promoCode]);

  const activePlatform = platform || engine.manualPlatform;

  const filteredCatalog = useMemo(() => {
    if (activePlatform && activePlatform !== "OTHER") {
      const activePlatformStr = activePlatform.toLowerCase();
      const matched = catalog.find(n => 
        n.slug.toLowerCase().includes(activePlatformStr) || 
        activePlatformStr.includes(n.slug.toLowerCase())
      );
      if (matched) {
        return [matched];
      }
    }
    return catalog;
  }, [catalog, activePlatform]);

  // Hydration-safe localStorage load
  useEffect(() => {
    const saved = localStorage.getItem("smmplan_pro_mode");
    if (saved === "true") {
      setProMode(true);
    }
    setMounted(true);
  }, []);

  const handleProModeToggle = () => {
    const nextVal = !proMode;
    setProMode(nextVal);
    localStorage.setItem("smmplan_pro_mode", String(nextVal));
  };

  // Sorted categories
  const sortedCategories = useMemo(() => {
    return [...availableCategories].sort((a, b) => {
      const scoreA = getCategoryDemandScore(a.name);
      const scoreB = getCategoryDemandScore(b.name);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.name.localeCompare(b.name);
    });
  }, [availableCategories]);

  const activeCategoryName = useMemo(() => {
    const cat = sortedCategories.find(c => c.id === categoryId);
    return cat ? cleanCategoryName(cat.name) : "Тарифы";
  }, [sortedCategories, categoryId]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const canProceedToStep2 = !!selectedService && url.trim().length >= 8;

  if (!mounted) {
    return (
      <div className="md:hidden flex items-center justify-center p-8 bg-card border-b border-border/50">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  // ─── RENDERING PRO MODE (Single-Page high-density dashboard) ────────────────
  if (proMode) {
    return (
      <div className="md:hidden flex flex-col gap-4 p-4 bg-card border-b border-border/50 shadow-sm sticky top-16 z-30 animate-in fade-in duration-200">
        {/* PRO Mode Header */}
        <div className="flex items-center justify-between border-b border-border/30 pb-2">
          <h3 className="font-extrabold text-foreground text-xs flex items-center gap-1.5 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-primary fill-current animate-pulse" />
            <span>Панель реселлера</span>
          </h3>
          <button
            type="button"
            onClick={handleProModeToggle}
            aria-label="Выключить режим PRO"
            className="relative flex items-center gap-1.5 px-3.5 h-11 min-h-[44px] min-w-[44px] rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary transition-all active:scale-95 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>Режим PRO: ВКЛ</span>
          </button>
        </div>

        {/* URL Input */}
        <div className="space-y-1">
          <label htmlFor="pro-url-input" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1 flex justify-between">
            <span>Ссылка на соцсеть</span>
            {validationErrors?.link && <span className="text-danger font-black animate-pulse">! Ошибка</span>}
          </label>
          <div className="relative">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              id="pro-url-input"
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Вставьте ссылку..."
              aria-label="Ссылка на соцсеть"
              className={`w-full h-10 pl-10 pr-4 rounded-xl border bg-background text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 outline-none transition-all ${
                validationErrors?.link ? 'border-danger/60 focus:border-danger ring-2 ring-danger/10' : 'border-border focus:border-primary'
              }`}
            />
          </div>
          {validationErrors?.link && (
            <p className="text-[10px] font-bold text-danger pl-1">{validationErrors.link}</p>
          )}
        </div>

        {/* Grid Platform + Category */}
        <div className={platform ? "space-y-1" : "grid grid-cols-2 gap-3"}>
          {!platform && (
            <div className="space-y-1">
              <span className="block text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider pl-1">
                Соцсеть
              </span>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary z-10">
                  {networkId ? (
                    <SocialIcon
                      slug={catalog.find(n => n.id === networkId)?.slug || ""}
                      size={14}
                      colored={true}
                    />
                  ) : (
                    <Globe className="w-3.5 h-3.5" />
                  )}
                </div>
                <Select
                  value={networkId || ""}
                  onValueChange={(val) => setNetworkId(val || "")}
                >
                  <SelectTrigger className="w-full h-11 pl-8 pr-8 rounded-xl border border-border bg-background text-sm font-semibold text-foreground">
                    <SelectValue placeholder="Платформа">
                      {(value: string) => {
                        if (!value) return null;
                        return catalog.find(n => n.id === value)?.name ?? value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    {filteredCatalog.map((net) => (
                      <SelectItem key={net.id} value={net.id} label={net.name} className="cursor-pointer py-2.5 text-xs">
                        <span className="flex items-center gap-1.5">
                          <SocialIcon slug={net.slug} size={14} colored={true} />
                          <span>{net.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <span className="block text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider pl-1">
              Услуга
            </span>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary z-10">
                {categoryId ? (
                  <CategoryIcon name={sortedCategories.find(c => c.id === categoryId)?.name || ""} size={14} />
                ) : (
                  <Layers className="w-3.5 h-3.5" />
                )}
              </div>
              <Select
                value={categoryId || ""}
                onValueChange={(val) => setCategoryId(val || "")}
                disabled={!networkId || sortedCategories.length === 0}
              >
                <SelectTrigger className="w-full h-11 pl-8 pr-8 rounded-xl border border-border bg-background text-sm font-semibold text-foreground">
                  <SelectValue placeholder="Категория">
                    {(value: string) => {
                      if (!value) return null;
                      const cat = sortedCategories.find(c => c.id === value);
                      return cat ? cleanCategoryName(cat.name) : value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-full">
                  {sortedCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} label={cleanCategoryName(cat.name)} className="cursor-pointer py-2.5 text-xs">
                      <span className="flex items-center gap-1.5">
                        <CategoryIcon name={cat.name} size={14} className="text-primary shrink-0" />
                        <span>{cleanCategoryName(cat.name)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tariffs Grid Select */}
        {categoryId && (isLoading || services.length > 0) && (
          <div className="space-y-1">
            <div className="flex items-center justify-between pl-1">
              <span className="block text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                Тарифный план
              </span>
              <button
                type="button"
                onClick={() => setShowCatalog(true)}
                aria-label="Показать все тарифы"
                className="relative px-3 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-[10.5px] font-extrabold text-primary uppercase tracking-wide cursor-pointer hover:underline"
              >
                Показать все ({services.length})
              </button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse border border-border/50" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {services.slice(0, 3).map((srv) => {
                  const isSelected = selectedService?.id === srv.id;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setSelectedService(srv)}
                      className={`p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between min-h-[72px] cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary/45"
                          : "border-border bg-background hover:border-primary"
                      }`}
                    >
                      <span className="block text-[10.5px] font-black text-foreground line-clamp-2 leading-tight">
                        {srv.name}
                      </span>
                      {isSelected && srv.description && (
                        <span className="block text-[9.5px] text-muted-foreground/80 mt-1 leading-relaxed whitespace-pre-line">
                          {srv.description}
                        </span>
                      )}
                      <span className="block text-[11.5px] font-extrabold text-primary mt-1 tabular-nums">
                        {srv.pricePerUnitRub} ₽ <span className="text-[8px] text-muted-foreground font-semibold">/ шт</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Dynamic payload warnings & comments */}
        <DynamicPayloadWarnings engine={engine} />

        {/* Quantity (Reseller Mode) */}
        <div className="space-y-1">
          <label htmlFor="pro-quantity-input" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
            Количество {selectedService && `(${selectedService.minQty} — ${selectedService.maxQty?.toLocaleString()})`}
          </label>
          <input
            id="pro-quantity-input"
            type="number"
            value={quantity}
            min={selectedService?.minQty || 10}
            max={selectedService?.maxQty}
            onFocus={(e) => e.target.select()}
            onChange={e => {
              let val = Number(e.target.value);
              if (selectedService?.maxQty && val > selectedService.maxQty) val = selectedService.maxQty;
              setQuantity(val);
            }}
            aria-label="Количество"
            className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-black tabular-nums text-foreground outline-none focus:border-primary"
          />
        </div>

        <DripFeedConfigurator engine={engine} />

        {/* Active Legal Notice with Checkbox (152-FZ compliance) - Pro Mode */}
        <LegalCheckbox
          id="pro-legal-checkbox"
          checked={agreedToTerms}
          onChange={(val) => setAgreedToTerms(val)}
          labelClassName="text-muted-foreground font-medium"
          onOpenDocument={onOpenDocument}
        />

        {/* Price + Pay CTA */}
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/30">
          <div>
            <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider block">Итого</span>
            <div className="flex items-center gap-1 min-h-[24px]">
              {isCalculating ? (
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              ) : (
                <p className="text-xl font-black text-foreground tabular-nums leading-none">
                  {totalPriceFormatted.replace('₽', '').trim()} <span className="text-xs text-primary">₽</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center flex-1 max-w-[140px]">
            <Button
              onClick={handleCheckout}
              disabled={isSubmitting}
              className={`w-full h-11 min-h-[44px] min-w-[44px] rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-md shadow-primary/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isSubmitting ? 'opacity-50 grayscale cursor-not-allowed pointer-events-none' : 'active:scale-95'
              }`}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>💳 Купить</>}
            </Button>
            <p className="text-[9px] text-muted-foreground text-center font-bold mt-1 uppercase tracking-wider">
              СБП • МИР • Visa • Cryptobot
            </p>
          </div>
        </div>

        {/* Catalog Overlay */}
        {showCatalog && (
          <TariffCatalog
            services={services}
            selectedService={selectedService}
            categoryName={activeCategoryName}
            onSelect={(srv) => setSelectedService(srv)}
            onClose={() => setShowCatalog(false)}
            isLoading={isLoading}
          />
        )}
      </div>
    );
  }

  // ─── RENDERING DEFAULT VIEW (Hybrid 2-Step Stepper - Variant D) ──────────────

  // ─── STEP 1: Service Selection with Link-First Unfolding
  if (step === 1) {
    const isLinkFilled = url.trim().length >= 8;
    const isBrowsingAllowed = isLinkFilled || showCatalogManually;

    return (
      <div className="md:hidden flex flex-col gap-4 p-4 bg-card border-b border-border/50 shadow-sm sticky top-16 z-30 animate-in fade-in duration-200">
        {/* Top Header Row with PRO Toggle */}
        <div className="flex items-center justify-between border-b border-border/30 pb-2">
          {/* Compact Step Indicator: current step + mini progress bar */}
          {(() => {
            const stepNames = ['Ссылка', 'Категория', 'Услуга', 'Оплата'];
            const currentStep = selectedService ? 4 : categoryId ? 3 : (url.trim().length >= 8 || showCatalogManually) ? 2 : 1;
            return (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
                    {currentStep}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-extrabold text-foreground leading-tight">{stepNames[currentStep - 1]}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold leading-tight">Шаг {currentStep} из 4</span>
                  </div>
                </div>
                {/* Mini 4-segment progress bar */}
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4].map(s => (
                    <div
                      key={s}
                      className={`h-1 w-5 rounded-full transition-all duration-300 ${
                        s < currentStep ? 'bg-success' : s === currentStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>
            );
          })()}
          {/* PRO Mode Switch */}
          <button
            type="button"
            onClick={handleProModeToggle}
            aria-label="Включить режим PRO"
            className="relative flex items-center gap-1 px-3.5 h-11 min-h-[44px] min-w-[44px] rounded-full bg-content2 hover:bg-content3 border border-border text-xs font-bold text-muted-foreground transition-all active:scale-95 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-muted" />
            <span>Режим PRO</span>
          </button>
        </div>

        {/* 1. URL Link Field (Primary First Element) */}
        <div className="space-y-1.5">
          <label htmlFor="standard-url-input" className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider pl-1">
            1. Введите ссылку на канал, профиль или post
          </label>
          <div className="relative">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="standard-url-input"
              type="url"
              value={url}
              onChange={e => {
                setUrl(e.target.value);
                if (localUrlError) setLocalUrlError(null);
                if (e.target.value.trim().length >= 8) {
                  setLocalUrlError(null);
                }
              }}
              placeholder="https://t.me/channel_or_post"
              aria-label="Введите ссылку на канал, профиль или пост"
              className={`w-full h-11 pl-10 pr-4 rounded-xl border bg-background text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 ${
                validationErrors?.link || localUrlError ? 'border-danger focus:border-danger ring-2 ring-danger/30' : 'border-border focus:border-primary focus:ring-2 ring-primary/30'
              }`}
            />
          </div>
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
          <div className="flex justify-between items-center px-1 pt-1.5">
            <button
              type="button"
              onClick={onOpenGuide}
              aria-label="Где взять ссылку для заказа? Гайд по ссылкам"
              className="text-[11px] font-bold text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer active:scale-95 transition-all h-11 min-h-[44px] min-w-[44px]"
            >
              <span>❓</span>
              <span className="underline">Где взять ссылку для заказа?</span>
            </button>
          </div>
          {!isBrowsingAllowed && (
            <button
              type="button"
              onClick={() => setShowCatalogManually(true)}
              className="text-xs font-bold text-primary hover:underline h-11 min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 w-full border border-dashed border-primary/30 rounded-xl bg-primary/5 active:scale-95 transition-all mt-2 cursor-pointer"
            >
              <span>📂</span>
              <span>Посмотреть тарифы без ссылки</span>
            </button>
          )}
        </div>

        {/* 2. Unfolding Selection Parameters (Smooth Reveal) */}
        <AnimatePresence>
          {isBrowsingAllowed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="flex flex-col gap-4 overflow-visible"
            >
              {/* Grid: Platform & Category selects */}
              <div className={platform ? "space-y-1" : "grid grid-cols-2 gap-3"}>
                {/* Platform select */}
                {!platform && (
                  <div className="space-y-1">
                    <span className="block text-[11.5px] font-extrabold text-muted-foreground uppercase tracking-wider pl-1">
                      Платформа
                    </span>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary z-10">
                        {networkId ? (
                          <SocialIcon
                            slug={catalog.find(n => n.id === networkId)?.slug || ""}
                            size={14}
                            colored={true}
                          />
                        ) : (
                          <Globe className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <Select
                        value={networkId || ""}
                        onValueChange={(val) => setNetworkId(val || "")}
                      >
                        <SelectTrigger className="w-full h-11 pl-8 pr-8 rounded-xl border border-border bg-background text-sm font-semibold text-foreground">
                          <SelectValue placeholder="Соцсеть">
                            {(value: string) => {
                              if (!value) return null;
                              return catalog.find(n => n.id === value)?.name ?? value;
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="w-full">
                          {filteredCatalog.map((net) => (
                            <SelectItem key={net.id} value={net.id} label={net.name} className="cursor-pointer py-2.5 text-xs">
                              <span className="flex items-center gap-1.5">
                                <SocialIcon slug={net.slug} size={14} colored={true} />
                                <span>{net.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Category select */}
                {networkId && sortedCategories.length > 0 && (
                  <div className="space-y-1 animate-in fade-in duration-200">
                    <span className="block text-[11.5px] font-extrabold text-muted-foreground uppercase tracking-wider pl-1">
                      Категория
                    </span>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary z-10">
                        {categoryId ? (
                          <CategoryIcon name={sortedCategories.find(c => c.id === categoryId)?.name || ""} size={14} />
                        ) : (
                          <Layers className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <Select
                        value={categoryId || ""}
                        onValueChange={(val) => setCategoryId(val || "")}
                      >
                        <SelectTrigger className="w-full h-11 pl-8 pr-8 rounded-xl border border-border bg-background text-sm font-semibold text-foreground">
                          <SelectValue placeholder="Категория">
                            {(value: string) => {
                              if (!value) return null;
                              const cat = sortedCategories.find(c => c.id === value);
                              return cat ? cleanCategoryName(cat.name) : value;
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="w-full">
                          {sortedCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} label={cleanCategoryName(cat.name)} className="cursor-pointer py-2.5 text-xs">
                              <span className="flex items-center gap-1.5">
                                <CategoryIcon name={cat.name} size={14} className="text-primary shrink-0" />
                                <span>{cleanCategoryName(cat.name)}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Premium Tariff Cards Grid (Economy / Standard / Premium) */}
              {categoryId && (isLoading || services.length > 0) && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pl-1">
                    <span className="block text-[11.5px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      Выберите тарифный план
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCatalog(true)}
                      className="relative px-2 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-[9px] font-extrabold text-primary uppercase tracking-wide cursor-pointer hover:underline"
                    >
                      Показать весь каталог ({services.length})
                    </button>
                  </div>

                  {isLoading ? (
                    <div className="grid grid-cols-1 gap-2.5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse border border-border/50" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {services.slice(0, 3).map((srv) => {
                        const isSelected = selectedService?.id === srv.id;
                        return (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => setSelectedService(srv)}
                            className={`p-3 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between min-h-[82px] cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                                : "border-border bg-background hover:border-primary"
                            }`}
                          >
                            <span className="block text-[11px] font-black text-foreground line-clamp-2 leading-tight">
                              {srv.name}
                            </span>
                            {isSelected && srv.description && (
                              <span className="block text-[10px] text-muted-foreground/80 mt-1.5 leading-relaxed whitespace-pre-line">
                                {srv.description}
                              </span>
                            )}
                            <span className="block text-[12px] font-black text-primary mt-1.5 tabular-nums">
                              {srv.pricePerUnitRub} ₽ <span className="text-[9px] text-muted-foreground font-semibold">/ шт</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {services.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowCatalog(true)}
                      aria-label="Посмотреть другие тарифы"
                      className="text-right text-[10px] font-bold text-primary hover:underline mt-1 cursor-pointer block w-full h-11 min-h-[44px] min-w-[44px] flex items-center justify-end"
                    >
                      Посмотреть другие тарифы →
                    </button>
                  )}
                </div>
              )}

              {/* Checkout Progress button */}
              {selectedService && (
                <Button
                  onClick={() => {
                    if (url.trim().length < 8) {
                      setLocalUrlError("Пожалуйста, введите корректную ссылку для продолжения оформления заказа");
                      const inputEl = document.getElementById("standard-url-input");
                      if (inputEl) {
                        inputEl.focus();
                        inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                      return;
                    }
                    setLocalUrlError(null);
                    setStep(2);
                  }}
                  className="w-full h-11 min-h-[44px] min-w-[44px] rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/30 mt-1 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  Далее — Ввод количества <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Catalog Overlay */}
        {showCatalog && (
          <TariffCatalog
            services={services}
            selectedService={selectedService}
            categoryName={activeCategoryName}
            onSelect={(srv) => setSelectedService(srv)}
            onClose={() => setShowCatalog(false)}
            isLoading={isLoading}
          />
        )}
      </div>
    );
  }

  // ─── STEP 2: Checkout (Clean layout with Quantity, Email, Legal check and total pricing)
  return (
    <div className="md:hidden flex flex-col bg-card border-b border-border/50 shadow-sm sticky top-16 z-30 animate-in fade-in duration-200">
      {/* Header Row with Back + Target Info */}
      <div className="px-4 pt-3 pb-2 border-b border-border/30">
        <div className="flex items-center justify-between mb-2.5">
          <button
            type="button"
            onClick={() => setStep(1)}
            aria-label="Назад к выбору услуг"
            className="relative px-3 h-11 min-h-[44px] min-w-[44px] flex items-center gap-1 text-[11.5px] font-extrabold text-primary hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Назад к услугам
          </button>
          {/* Compact Step 4 indicator */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
                4
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold text-foreground leading-tight">Оплата</span>
                <span className="text-[8px] text-muted-foreground font-semibold leading-tight">Шаг 4 из 4</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4].map(s => (
                <div
                  key={s}
                  className={`h-1 w-5 rounded-full ${s < 4 ? 'bg-success' : 'bg-primary'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Selection summary card */}
        {selectedService && (
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-primary/10 border border-primary/40 mt-1">
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider leading-none">
                {catalog.find(n => n.id === networkId)?.name} • {activeCategoryName}
              </p>
              <p className="font-extrabold text-foreground text-xs line-clamp-3 break-words mt-1">
                {selectedService.name}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-black text-foreground tabular-nums text-sm">
                {selectedService.pricePerUnitRub} ₽
              </span>
              <span className="text-[9px] text-muted-foreground font-semibold block">/ шт</span>
            </div>
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="p-4 space-y-3">
        {/* Quantity */}
        <div className="space-y-1">
          <label htmlFor="step2-quantity-input" className="text-[11.5px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
            Укажите количество
            {selectedService && (
              <span className="text-muted-foreground/60 ml-1 font-semibold normal-case">
                (мин {selectedService.minQty} — макс {selectedService.maxQty?.toLocaleString()})
              </span>
            )}
          </label>
          <input
            id="step2-quantity-input"
            type="number"
            value={quantity}
            min={selectedService?.minQty || 10}
            max={selectedService?.maxQty}
            onFocus={(e) => e.target.select()}
            onChange={e => {
              let val = Number(e.target.value);
              if (selectedService?.maxQty && val > selectedService.maxQty) val = selectedService.maxQty;
              setQuantity(val);
            }}
            aria-label="Укажите количество"
            className="w-full h-11 min-h-[44px] px-4 rounded-xl border border-border bg-background text-base font-black tabular-nums text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        <div className="animate-in fade-in duration-200">
          <DripFeedConfigurator engine={engine} />
        </div>

        {/* Email */}
        <div className="space-y-1 animate-in fade-in duration-200">
          <label htmlFor="step2-email-input" className="text-[11.5px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
            Email для получения чека
          </label>
          <input
            id="step2-email-input"
            type="email"
            ref={emailInputRef}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email для получения чека"
            className={`w-full h-11 px-4 rounded-xl border bg-background text-sm text-foreground outline-none transition-all ${
              emailHasError
                ? 'border-destructive focus:border-destructive ring-2 ring-destructive/40'
                : 'border-border focus:border-primary focus:ring-2 ring-primary/30'
            }`}
          />
        </div>

        {/* Promo Code Toggle or Input */}
        <div className="space-y-1 animate-in fade-in duration-200">
          {!showPromo ? (
            <button
              type="button"
              onClick={() => setShowPromo(true)}
              aria-label="Ввести промокод"
              className="text-[11.5px] font-bold text-primary uppercase tracking-wider pl-1 hover:underline flex items-center gap-1 transition-all h-11 min-h-[44px] min-w-[44px]"
            >
              + Есть промокод?
            </button>
          ) : (
            <div className="flex flex-col gap-1 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="flex items-center justify-between pl-1">
                <label htmlFor="step2-promo-input" className="text-[11.5px] font-bold text-muted-foreground uppercase tracking-wider">
                  Промокод
                </label>
                <button 
                  type="button" 
                  onClick={() => {
                    setPromoCode("");
                    setShowPromo(false);
                  }}
                  aria-label="Скрыть промокод"
                  className="text-[11px] text-muted-foreground hover:text-foreground font-bold underline h-11 min-h-[44px] min-w-[44px] flex items-center justify-center px-2"
                >
                  Скрыть
                </button>
              </div>
              <input
                id="step2-promo-input"
                type="text"
                value={promoCode}
                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                placeholder="ПРОМОКОД"
                aria-label="Промокод"
                className="w-full h-11 min-h-[44px] px-4 rounded-xl border border-border bg-background text-xs font-mono tracking-wider uppercase text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
              />
              {pricingError === 'voucher' && (
                <div className="text-[9px] font-bold text-warning-text bg-warning/10 border border-warning/30 rounded-lg px-2 py-1 mt-0.5">
                  Это ваучер на баланс. Активируйте в личном кабинете.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic payload warnings & comments */}
        <DynamicPayloadWarnings engine={engine} />

        {/* Fabricated metrics removed to protect platform integrity */}

        {/* Active Legal Notice with Checkbox (152-FZ compliance) - Step 2 */}
        <LegalCheckbox
          id="step2-legal-checkbox"
          checked={agreedToTerms}
          onChange={(val) => setAgreedToTerms(val)}
          labelClassName="text-muted-foreground font-medium"
          onOpenDocument={onOpenDocument}
        />

        {/* Total Price + Pay */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/30">
          <div>
            <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">Итого к оплате</p>
            <div className="flex items-center gap-1 min-h-[32px]">
              {isCalculating ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <p className="text-2xl font-black text-foreground tabular-nums leading-none">
                  {totalPriceFormatted.replace('₽', '').trim()} <span className="text-lg text-primary">₽</span>
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={handleCheckout}
            disabled={isSubmitting}
            className={`flex-1 max-w-[160px] h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-black text-sm shadow-md shadow-primary/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isSubmitting ? 'opacity-50 grayscale cursor-not-allowed pointer-events-none' : 'active:scale-95'
            }`}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>💳 Оплатить</>}
          </Button>
        </div>

        <p className="text-[10.5px] text-muted-foreground font-bold text-center pt-1 leading-none">
          🔒 Безопасная оплата через СБП, МИР, Visa, Cryptobot
        </p>
      </div>
    </div>
  );
}
