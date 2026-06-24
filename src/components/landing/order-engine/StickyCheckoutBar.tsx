"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link2, Edit3, ChevronRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { DripFeedConfigurator } from "./DripFeedConfigurator";
import { LegalCheckbox } from "./LegalCheckbox";

function formatPricePerUnit(price: number): string {
  if (price === 0) return '0.00';
  let formatted: string;
  if (price < 0.01) {
    formatted = price.toFixed(6);
  } else if (price < 0.1) {
    formatted = price.toFixed(4);
  } else {
    formatted = price.toFixed(2);
  }
  
  if (formatted.includes('.')) {
    while (formatted.endsWith('0') && formatted.split('.')[1].length > 2) {
      formatted = formatted.slice(0, -1);
    }
  }
  return formatted;
}

export function StickyCheckoutBar({
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
  onClearSelection,
  emailInputRef,
  emailHasError,
  termsHasError,
  engine,
  onOpenDocument,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedService: any;
  url: string;
  setShowLinkModal: (show: boolean) => void;
  quantity: number;
  setQuantity: (q: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pricing: any;
  email: string;
  setEmail: (v: string) => void;
  promoCode: string;
  setPromoCode: (v: string) => void;
  isCalculating: boolean;
  isSubmitting: boolean;
  handleCheckout: () => void;
  onClearSelection: () => void;
  emailInputRef?: React.RefObject<HTMLInputElement | null>;
  emailHasError?: boolean;
  termsHasError?: boolean;
  engine?: OrderEngine;
  onOpenDocument?: (slug: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showPromo, setShowPromo] = useState(promoCode.length > 0);

  useEffect(() => {
    if (promoCode.length > 0) {
      setShowPromo(true);
    }
  }, [promoCode]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide if scrolling down past 100px threshold
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } 
      // Show if scrolling up
      else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    if (selectedService) {
      setIsVisible(true);
    }
  }, [selectedService?.id]);

  if (!selectedService) return null;

  const hasDiscount = pricing && pricing.discountCents > 0;
  const pricePerUnit = hasDiscount && quantity > 0
    ? (pricing.totalCents / 100) / quantity
    : selectedService.pricePerUnitRub;

  return (
    <motion.div
      initial={{ y: 150, opacity: 0, x: '-50%' }}
      animate={{ y: isVisible ? 0 : 150, opacity: isVisible ? 1 : 0, x: '-50%' }}
      exit={{ y: 150, opacity: 0, x: '-50%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      className="fixed bottom-6 left-1/2 w-full max-w-6xl z-[200] hidden md:block px-4"
    >
      <div className="bg-card/90 backdrop-blur-xl border border-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)] rounded-2xl py-3 px-6 pr-8 relative">
        <button
          type="button"
          onClick={onClearSelection}
          className="absolute -top-3 -right-3 w-8 h-8 bg-card hover:bg-muted text-foreground hover:text-destructive rounded-full flex items-center justify-center border border-border shadow-lg transition-all z-10"
          title="Сбросить выбор"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="grid grid-cols-12 gap-4 items-center">
          
          {/* Left Zone: Selected Tariff & Link (4 columns) */}
          <div className="col-span-4 min-w-0 pr-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-[9px] font-black text-primary uppercase tracking-wider mb-1.5">
              Тариф
            </span>
            <p className="text-sm font-extrabold text-foreground truncate leading-snug" title={selectedService.name}>
              {selectedService.name}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 opacity-90 hover:opacity-100 transition-opacity">
              <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <p className="text-[11px] font-bold text-muted-foreground truncate max-w-[200px]" title={url}>
                {url || "Ссылка не указана"}
              </p>
              <button 
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground shrink-0"
                title="Изменить ссылку"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Center Zone: Aligned Inputs (5 columns) */}
          <div className="col-span-5 flex flex-col items-center justify-center relative px-2">
            {engine && (
              <div className="w-full absolute bottom-full mb-4 left-0">
                <DripFeedConfigurator engine={engine} />
              </div>
            )}
            
            <div className="flex items-center gap-3 w-full justify-center">
              {/* Quantity Input */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative">
                  <input 
                    type="number" 
                    value={quantity} 
                    min={selectedService.minQty || 10}
                    max={selectedService.maxQty}
                    onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      let val = Number(e.target.value);
                      if (selectedService?.maxQty && val > selectedService.maxQty) val = selectedService.maxQty;
                      setQuantity(val);
                    }} 
                    className="w-24 h-10 px-2 rounded-xl border border-border bg-background text-sm font-black tabular-nums text-foreground text-center focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                  />
                  <span className="absolute -top-2 left-2.5 text-[9px] font-bold text-muted-foreground bg-card px-1 rounded-md uppercase tracking-wider border border-border">Кол-во</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-bold mt-1.5 tabular-nums">
                  {formatPricePerUnit(pricePerUnit)} ₽ <span className="font-normal opacity-70">/ шт</span>
                </span>
              </div>

              {/* Email Input */}
              <motion.div 
                animate={emailHasError ? { x: [0, -6, 6, -6, 6, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="relative w-52 shrink-0 mb-5"
              >
                <input 
                  type="email" 
                  ref={emailInputRef}
                  value={email} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} 
                  placeholder="you@example.com"
                  className={`w-full h-10 px-3 rounded-xl border bg-background text-xs font-bold text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm ${
                    emailHasError ? 'border-destructive focus:border-destructive ring-2 ring-destructive/20' : 'border-border'
                  }`}
                />
                <span className={`absolute -top-2.5 left-3 text-[9px] font-black bg-card px-1.5 rounded-md uppercase tracking-wider border transition-colors ${
                  emailHasError 
                    ? 'text-destructive border-destructive font-black' 
                    : 'text-muted-foreground border-border'
                }`}>
                  {emailHasError ? 'Неверный Email' : 'Email для чека'}
                </span>
              </motion.div>

              {/* Promo Code Toggle/Input */}
              <div className="shrink-0 mb-5">
                {!showPromo ? (
                  <button
                    type="button"
                    onClick={() => setShowPromo(true)}
                    className="h-10 px-3.5 border border-dashed border-border hover:border-primary/50 bg-background hover:bg-primary/5 text-[9px] font-black uppercase text-muted-foreground hover:text-primary rounded-xl flex items-center justify-center gap-1 transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
                  >
                    <span>% Промокод</span>
                  </button>
                ) : (
                  <div className="relative animate-in slide-in-from-right-3 fade-in duration-200">
                    <input 
                      type="text" 
                      value={promoCode} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPromoCode(e.target.value.toUpperCase())} 
                      placeholder="ПРОМОКОД"
                      className="w-28 h-10 px-2 pr-7 rounded-xl border border-border bg-background text-[10px] font-mono font-black tracking-widest uppercase text-foreground text-center focus:border-primary outline-none transition-all shadow-sm"
                    />
                    <span className="absolute -top-2.5 left-3 text-[9px] font-black text-muted-foreground bg-card px-1.5 rounded-md uppercase tracking-wider border border-border">Промокод</span>
                    <button
                      type="button"
                      onClick={() => { setPromoCode(""); setShowPromo(false); }}
                      className="absolute top-1/2 -translate-y-1/2 right-2 w-4 h-4 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Zone: Price, Pay Button & Consent (3 columns) */}
          <div className="col-span-3 flex flex-col items-end gap-2 pl-2">
            <div className="flex items-center gap-3.5 w-full justify-end">
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Итог</span>
                {isCalculating ? (
                  <div className="h-7 flex items-center justify-end w-16">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                ) : (
                  <p className="text-2xl font-black text-foreground tabular-nums tracking-tight leading-none">
                    {pricing ? (pricing.totalCents / 100).toFixed(2) : '0.00'}<span className="text-primary ml-0.5 text-xl">₽</span>
                  </p>
                )}
              </div>
              
              <Button 
                type="button"
                onClick={handleCheckout}
                disabled={isSubmitting}
                className={`h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md shadow-primary/10 transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  isSubmitting ? 'opacity-50 grayscale cursor-not-allowed pointer-events-none' : 'hover:scale-[1.02] active:scale-95'
                }`}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>Оплатить <ChevronRight className="w-4 h-4" /></>
                )}
              </Button>
            </div>
            
            {/* Legal terms agreement with Shake & Glow feedback on error */}
            <motion.div 
              animate={termsHasError ? { x: [0, -6, 6, -6, 6, 0] } : {}}
              transition={{ duration: 0.4 }}
              className={`w-full max-w-[280px] rounded-lg transition-all ${
                termsHasError ? 'ring-2 ring-destructive/40 bg-destructive/5 px-2 py-0.5 border border-destructive/20' : ''
              }`}
            >
               <LegalCheckbox
                id="desktop-legal-checkbox"
                checked={engine?.agreedToTerms ?? false}
                onChange={(val) => engine?.setAgreedToTerms(val)}
                className="justify-end w-full"
                onOpenDocument={onOpenDocument}
              />
            </motion.div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
