"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link2, Edit3, ChevronRight, Loader2, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { DripFeedConfigurator } from "./DripFeedConfigurator";

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
  engine,
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
  engine?: OrderEngine;
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
      className="fixed bottom-6 left-1/2 w-full max-w-5xl z-[200] hidden md:block px-4"
    >
      <div className="bg-background border-2 border-primary shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-3xl p-4 pr-5 relative">
        <button
          type="button"
          onClick={onClearSelection}
          className="absolute -top-3 -right-3 w-8 h-8 bg-card hover:bg-muted text-foreground hover:text-destructive rounded-full flex items-center justify-center border-2 border-primary shadow-lg transition-all z-10"
          title="Сбросить выбор"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center justify-between gap-6">
          
          {/* Left: Selected service name */}
          <div className="flex-1 min-w-0 max-w-[240px] pl-4 py-2">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Выбранный тариф:</p>
            <p className="text-sm font-extrabold text-foreground line-clamp-2 break-words leading-tight">{selectedService.name}</p>
            <div className="flex items-center gap-2 mt-2 opacity-95 hover:opacity-100 transition-opacity">
              <div className="w-5 h-5 rounded-md bg-default-100 border border-default-300 flex items-center justify-center shrink-0">
                <Link2 className="w-3 h-3 text-primary" />
              </div>
              <p className="text-[12px] font-bold text-foreground truncate max-w-[140px]">
                {url || "Ссылка не указана"}
              </p>
              <button 
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="ml-1 p-1 hover:bg-default-200 rounded-md transition-colors text-muted-foreground hover:text-foreground group"
                title="Изменить ссылку"
              >
                <Edit3 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          {/* Center: Live Calculator & Legal Consent */}
          <div className="flex flex-col items-center justify-center gap-1 relative">
            {engine && (
              <div className="w-full absolute bottom-full mb-4 left-0">
                <DripFeedConfigurator engine={engine} />
              </div>
            )}
            <div className="flex items-center gap-3">
              {/* Quantity */}
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
                  className="w-24 h-12 px-2 rounded-xl border-2 border-default-400 bg-background text-base font-black tabular-nums text-foreground text-center focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                />
                <span className="absolute -top-2 left-3 text-[9px] font-black text-foreground bg-background px-1.5 rounded-md uppercase tracking-wider border border-default-300">Кол-во</span>
              </div>

              {/* Email */}
              <div className="relative">
                <input 
                  type="email" 
                  ref={emailInputRef}
                  value={email} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} 
                  placeholder="you@example.com"
                  className={`w-48 h-12 px-3 rounded-xl border-2 bg-background text-xs font-black text-foreground focus:border-primary outline-none transition-all shadow-sm ${
                    emailHasError
                      ? 'border-destructive focus:border-destructive ring-2 ring-destructive/20'
                      : 'border-default-400 focus:border-primary'
                  }`}
                />
                <span className={`absolute -top-2 left-3 text-[9px] font-black bg-background px-1.5 rounded-md uppercase tracking-wider border transition-colors ${
                  emailHasError 
                    ? 'text-destructive border-destructive font-black' 
                    : 'text-foreground border-default-300'
                }`}>
                  {emailHasError ? 'Неверный Email' : 'Email для чека'}
                </span>
              </div>

              {/* Promo Code Toggle or Input */}
              {!showPromo ? (
                <button
                  type="button"
                  onClick={() => setShowPromo(true)}
                  className="h-12 px-3 border-2 border-dashed border-default-400 hover:border-primary/80 bg-background hover:bg-primary/5 text-[9px] font-black uppercase text-muted-foreground hover:text-primary rounded-xl flex items-center justify-center gap-1 transition-all duration-200 active:scale-95 shadow-sm shrink-0 cursor-pointer"
                >
                  <span>% Промокод</span>
                </button>
              ) : (
                <div className="relative animate-in slide-in-from-right-3 fade-in duration-200 shrink-0">
                  <input 
                    type="text" 
                    value={promoCode} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPromoCode(e.target.value.toUpperCase())} 
                    placeholder="ПРОМОКОД"
                    className="w-28 h-12 px-2 pr-7 rounded-xl border-2 border-default-400 bg-background text-[10px] font-mono font-black tracking-widest uppercase text-foreground text-center focus:border-primary outline-none transition-all shadow-sm"
                  />
                  <span className="absolute -top-2 left-3 text-[9px] font-black text-foreground bg-background px-1.5 rounded-md uppercase tracking-wider border border-default-300">Промокод</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPromoCode("");
                      setShowPromo(false);
                    }}
                    className="absolute top-1/2 -translate-y-1/2 right-2 w-4 h-4 rounded-full bg-default-100 hover:bg-default-200 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                    title="Скрыть"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
              
              <span className="text-muted-foreground font-bold text-base">×</span>
              
              <span className="text-xs font-extrabold text-foreground tabular-nums whitespace-nowrap">
                {formatPricePerUnit(pricePerUnit)} ₽<span className="text-[10px] text-muted-foreground font-normal ml-0.5">/шт</span>
              </span>

              <span className="text-muted-foreground font-bold text-base">=</span>
              <div className="bg-primary/5 px-4 h-12 rounded-xl border-2 border-primary/30 flex items-center justify-center min-w-[100px] shadow-sm animate-in fade-in zoom-in-95 duration-200">
                {isCalculating ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <p className="text-lg font-black text-primary tabular-nums tracking-tight">
                    {pricing ? (pricing.totalCents / 100).toFixed(2) : '0.00'}{' '}
                    <span className="text-primary ml-0.5">₽</span>
                  </p>
                )}
              </div>
            </div>

            {/* Fabricated metrics removed to protect platform integrity */}

            {/* Passive Legal Notice (BUG-03: no checkbox friction) */}
            <p className="text-[10px] text-foreground/80 font-extrabold text-center mt-1 max-w-[340px] leading-relaxed">
              Нажимая «Оплатить», вы соглашаетесь с{' '}
              <Link 
                href={ROUTES.LEGAL.TERMS} 
                target="_blank"
                className="underline text-primary hover:text-primary-600 transition-colors font-bold"
              >
                Офертой
              </Link>{' '}
              и{' '}
              <Link 
                href={ROUTES.LEGAL.PRIVACY} 
                target="_blank"
                className="underline text-primary hover:text-primary-600 transition-colors font-bold"
              >
                Политикой
              </Link>
            </p>
          </div>

          {/* Right: Checkout */}
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center justify-center gap-1">
              <Button 
                type="button"
                onClick={handleCheckout}
                disabled={isSubmitting}
                className={`h-12 sm:h-14 w-full sm:w-auto px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group ${
                  isSubmitting ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'
                }`}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Оплатить <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></>
                )}
              </Button>
              <div className="flex flex-col items-center gap-1 mt-1 opacity-95">
                <span className="text-[9px] font-black text-foreground uppercase tracking-widest">
                  Безопасная оплата
                </span>
                <span className="text-[9px] font-extrabold text-primary uppercase tracking-wider flex items-center gap-1.5 font-sans mt-0.5">
                  СБП • МИР • Visa • Cryptobot
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
