"use client";

import React, { useState, useMemo, useEffect } from "react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { cleanCategoryName, CategoryIcon } from "@/components/ui/CategoryIcon";
import { Globe, Layers, Zap, ChevronRight, ArrowLeft, Link2, CheckSquare, Square, Loader2, Sparkles } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { Button } from "@/components/ui/button";
import { TariffCatalog } from "./TariffCatalog";
import { DynamicPayloadWarnings } from "./DynamicPayloadWarnings";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { motion, AnimatePresence } from "framer-motion";

interface MobileWizardProps {
  engine: OrderEngine;
  handleCheckout: () => void;
  isSubmitting: boolean;
}

export function MobileWizard({ engine, handleCheckout, isSubmitting }: MobileWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [showCatalog, setShowCatalog] = useState(false);
  const [proMode, setProMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  const {
    url, setUrl,
    networkId, setNetworkId,
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
    pricingError,
    validationErrors,
    platform,
  } = engine;

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
    const PRIORITY = ['подписчик', 'участники', 'просмотр', 'охват', 'лайк', 'нравится', 'реакц', 'сердц', 'коммент', 'отзыв', 'репост', 'поделит', 'авто', 'статистик', 'звезд', 'premium'];
    return [...availableCategories].sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aIdx = PRIORITY.findIndex(p => aName.includes(p));
      const bIdx = PRIORITY.findIndex(p => bName.includes(p));
      const scoreA = aIdx === -1 ? 999 : aIdx;
      const scoreB = bIdx === -1 ? 999 : bIdx;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.name.localeCompare(b.name);
    });
  }, [availableCategories]);

  const activeCategoryName = useMemo(() => {
    const cat = sortedCategories.find(c => c.id === categoryId);
    return cat ? cleanCategoryName(cat.name) : "Тарифы";
  }, [sortedCategories, categoryId]);

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
            className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary transition-all active:scale-95 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>Режим PRO: ВКЛ</span>
          </button>
        </div>

        {/* URL Input */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1 flex justify-between">
            <span>Ссылка на соцсеть</span>
            {validationErrors?.link && <span className="text-danger font-black animate-pulse">! Ошибка</span>}
          </label>
          <div className="relative">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://t.me/durov"
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
                    {catalog.map((net) => (
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
                className="relative -my-2 -mx-2 py-2 px-2 text-[9px] font-extrabold text-primary uppercase tracking-wide cursor-pointer hover:underline"
              >
                Показать все ({services.length})
              </button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse border border-border/50" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {services.slice(0, 3).map((srv) => {
                  const isSelected = selectedService?.id === srv.id;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setSelectedService(srv)}
                      className={`p-2 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between min-h-[64px] cursor-pointer ${
                        isSelected
                          ? "border-primary/40 bg-primary/[0.04] ring-1 ring-primary/20"
                          : "border-border bg-background hover:border-primary/10"
                      }`}
                    >
                      <span className="block text-[9px] font-black text-foreground line-clamp-2 leading-tight">
                        {srv.name}
                      </span>
                      <span className="block text-[10px] font-extrabold text-primary mt-1 tabular-nums">
                        {srv.pricePerUnitRub} ₽ <span className="text-[7px] text-muted-foreground font-semibold">/ шт</span>
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
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
            Количество {selectedService && `(${selectedService.minQty} — ${selectedService.maxQty?.toLocaleString()})`}
          </label>
          <input
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
            className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-black tabular-nums text-foreground outline-none focus:border-primary"
          />
        </div>

        {/* Legal Consent */}
        <label className="flex items-center gap-2 px-2.5 py-2.5 bg-content2 border border-border/40 rounded-xl cursor-pointer select-none active:scale-[0.99] transition-transform">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="sr-only"
          />
          <div className="text-primary shrink-0 transition-transform duration-100">
            {agreedToTerms ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground/30" />}
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold leading-none">
            Я принимаю <Link href={ROUTES.LEGAL.TERMS} target="_blank" className="underline text-foreground">Оферту</Link> и <Link href={ROUTES.LEGAL.PRIVACY} target="_blank" className="underline text-foreground">Политику</Link>
          </span>
        </label>

        {/* Price + Pay CTA */}
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/30">
          <div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Итого</span>
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
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-md shadow-primary/10 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>💳 Купить</>}
            </Button>
            <p className="text-[7.5px] text-muted-foreground/80 text-center font-bold mt-1 uppercase tracking-wider">
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

    return (
      <div className="md:hidden flex flex-col gap-4 p-4 bg-card border-b border-border/50 shadow-sm sticky top-16 z-30 animate-in fade-in duration-200">
        {/* Top Header Row with PRO Toggle */}
        <div className="flex items-center justify-between border-b border-border/30 pb-2">
          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center">1</div>
              <span className="text-[10px] font-extrabold text-foreground">Шаг 1 из 2</span>
            </div>
            <div className="w-8 h-px bg-border/50" />
            <div className="flex items-center gap-1 opacity-30">
              <div className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[9px] font-black flex items-center justify-center">2</div>
              <span className="text-[10px] font-bold text-muted-foreground">Оплата</span>
            </div>
          </div>
          {/* PRO Mode Switch */}
          <button
            type="button"
            onClick={handleProModeToggle}
            className="relative flex items-center gap-1 px-3.5 py-2 rounded-full bg-content2 hover:bg-content3 border border-border/50 text-xs font-bold text-muted-foreground transition-all active:scale-95 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-muted" />
            <span>Режим PRO</span>
          </button>
        </div>

        {/* 1. URL Link Field (Primary First Element) */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider pl-1">
            1. Введите ссылку на канал, профиль или пост
          </label>
          <div className="relative">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://t.me/channel_or_post"
              className={`w-full h-11 pl-10 pr-4 rounded-xl border bg-background text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 ${
                validationErrors?.link ? 'border-danger/60 focus:border-danger ring-2 ring-danger/10' : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/10'
              }`}
            />
          </div>
          {validationErrors?.link && (
            <p className="text-[11px] font-bold text-danger pl-1 animate-pulse">
              {validationErrors.link}
            </p>
          )}
        </div>

        {/* 2. Unfolding Selection Parameters (Smooth Reveal) */}
        <AnimatePresence>
          {isLinkFilled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col gap-4 overflow-visible"
            >
              {/* Grid: Platform & Category selects */}
              <div className={platform ? "space-y-1" : "grid grid-cols-2 gap-3"}>
                {/* Platform select */}
                {!platform && (
                  <div className="space-y-1">
                    <span className="block text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider pl-1">
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
                          {catalog.map((net) => (
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
                    <span className="block text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider pl-1">
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
                    <span className="block text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      Выберите тарифный план
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCatalog(true)}
                      className="relative -my-2 -mx-2 py-2 px-2 text-[9px] font-extrabold text-primary uppercase tracking-wide cursor-pointer hover:underline"
                    >
                      Показать весь каталог ({services.length})
                    </button>
                  </div>

                  {isLoading ? (
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse border border-border/50" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {services.slice(0, 3).map((srv) => {
                        const isSelected = selectedService?.id === srv.id;
                        return (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => setSelectedService(srv)}
                            className={`p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between min-h-[72px] cursor-pointer ${
                              isSelected
                                ? "border-primary/45 bg-primary/[0.04] ring-1 ring-primary/25"
                                : "border-border bg-background hover:border-primary/10"
                            }`}
                          >
                            <span className="block text-[9.5px] font-black text-foreground line-clamp-2 leading-tight">
                              {srv.name}
                            </span>
                            <span className="block text-[11px] font-black text-primary mt-1.5 tabular-nums">
                              {srv.pricePerUnitRub} ₽ <span className="text-[7.5px] text-muted-foreground font-semibold">/ шт</span>
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
                      className="text-right text-[10px] font-bold text-primary hover:underline mt-1 cursor-pointer block w-full"
                    >
                      Посмотреть другие тарифы →
                    </button>
                  )}
                </div>
              )}

              {/* Checkout Progress button */}
              {selectedService && (
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceedToStep2}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/10 mt-1 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1"
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
            className="relative -my-2 -mx-2 py-2 px-2 flex items-center gap-1 text-[11.5px] font-extrabold text-primary hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Назад к услугам
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[9px] font-black flex items-center justify-center">✓</div>
            <div className="w-6 h-px bg-primary/30" />
            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center">2</div>
            <span className="text-[10px] font-extrabold text-foreground">Шаг 2 из 2</span>
          </div>
        </div>

        {/* Selection summary card */}
        {selectedService && (
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-primary/[0.04] border border-primary/20 mt-1">
            <div className="min-w-0">
              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider leading-none">
                {catalog.find(n => n.id === networkId)?.name} • {activeCategoryName}
              </p>
              <p className="font-extrabold text-foreground text-xs truncate mt-1">
                {selectedService.name}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-black text-foreground tabular-nums text-sm">
                {selectedService.pricePerUnitRub} ₽
              </span>
              <span className="text-[8px] text-muted-foreground font-semibold block">/ шт</span>
            </div>
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="p-4 space-y-3">
        {/* Quantity */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
            Укажите количество
            {selectedService && (
              <span className="text-muted-foreground/60 ml-1 font-semibold normal-case">
                (мин {selectedService.minQty} — макс {selectedService.maxQty?.toLocaleString()})
              </span>
            )}
          </label>
          <input
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
            className="w-full h-10 px-4 rounded-xl border border-border bg-background text-base font-black tabular-nums text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>



        {/* Dynamic payload warnings & comments */}
        <DynamicPayloadWarnings engine={engine} />

        {/* Legal checkbox */}
        <label className="flex items-start gap-2.5 p-2.5 bg-content2 border border-border/40 rounded-xl cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="sr-only"
          />
          <div className="text-primary shrink-0 mt-0.5 transition-transform duration-100">
            {agreedToTerms ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-muted-foreground/30" />}
          </div>
          <p className="text-[10px] text-muted-foreground/85 font-semibold leading-relaxed">
            Я соглашаюсь с{" "}
            <Link href={ROUTES.LEGAL.TERMS} target="_blank" onClick={(e) => e.stopPropagation()} className="underline text-foreground hover:text-primary">
              Офертой
            </Link>{" "}
            и{" "}
            <Link href={ROUTES.LEGAL.PRIVACY} target="_blank" onClick={(e) => e.stopPropagation()} className="underline text-foreground hover:text-primary">
              Политикой
            </Link>
          </p>
        </label>

        {/* Total Price + Pay */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/30">
          <div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Итого к оплате</p>
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
            className="flex-1 max-w-[160px] h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-black text-sm shadow-md shadow-primary/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>💳 Оплатить</>}
          </Button>
        </div>

        <p className="text-[9.5px] text-muted-foreground/80 font-bold text-center pt-1 leading-none">
          🔒 Безопасная оплата через СБП, МИР, Visa, Cryptobot
        </p>
      </div>
    </div>
  );
}
