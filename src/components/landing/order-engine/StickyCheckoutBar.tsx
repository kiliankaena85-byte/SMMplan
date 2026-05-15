"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link2, Edit3, ChevronRight, Loader2, CheckSquare, Square, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function StickyCheckoutBar({
  selectedService,
  url,
  setShowLinkModal,
  quantity,
  setQuantity,
  pricing,
  agreedToTerms,
  setAgreedToTerms,
  isSubmitting,
  handleCheckout,
  onClearSelection,
}: {
  selectedService: any;
  url: string;
  setShowLinkModal: (show: boolean) => void;
  quantity: number;
  setQuantity: (q: number) => void;
  pricing: any;
  agreedToTerms: boolean;
  setAgreedToTerms: (v: boolean) => void;
  isSubmitting: boolean;
  handleCheckout: () => void;
  onClearSelection: () => void;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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

  return (
    <motion.div
      initial={{ y: 150, opacity: 0, x: '-50%' }}
      animate={{ y: isVisible ? 0 : 150, opacity: isVisible ? 1 : 0, x: '-50%' }}
      exit={{ y: 150, opacity: 0, x: '-50%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      className="fixed bottom-6 left-1/2 w-full max-w-5xl z-[200] hidden sm:block px-4"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] p-3 pr-4 relative">
        <button
          onClick={onClearSelection}
          className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full flex items-center justify-center border border-slate-600 shadow-lg transition-all z-10"
          title="Сбросить выбор"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center justify-between gap-6">
          
          {/* Left: Selected service name */}
          <div className="flex-1 min-w-0 max-w-[320px] pl-6 py-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Выбрано</p>
            <p className="text-sm font-bold text-white truncate leading-tight">{selectedService.name}</p>
            <div className="flex items-center gap-2 mt-2 opacity-80 hover:opacity-100 transition-opacity">
              <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
                <Link2 className="w-3 h-3 text-primary/70" />
              </div>
              <p className="text-[12px] font-medium text-slate-300 truncate max-w-[180px]">
                {url || "Ссылка не указана"}
              </p>
              <button 
                onClick={() => setShowLinkModal(true)}
                className="ml-1 p-1 hover:bg-slate-800 rounded-md transition-colors text-muted-foreground hover:text-white group"
                title="Изменить ссылку"
              >
                <Edit3 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          {/* Center: Live Calculator & Legal Consent */}
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-3">
              <div className="relative">
                <input 
                  type="number" 
                  value={quantity} 
                  min={selectedService.minQty || 10}
                  max={selectedService.maxQty}
                  onFocus={(e) => e.target.select()}
                  onChange={e => {
                    let val = Number(e.target.value);
                    if (selectedService?.maxQty && val > selectedService.maxQty) val = selectedService.maxQty;
                    setQuantity(val);
                  }} 
                  className="w-28 h-12 px-4 rounded-xl border border-slate-700 bg-slate-800 text-lg font-black tabular-nums text-white text-center focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                />
                <span className="absolute -top-2 left-3 text-[9px] font-bold text-muted-foreground bg-slate-900 px-1.5 rounded-sm uppercase">Кол-во</span>
              </div>
              
              <span className="text-muted-foreground font-bold text-lg">×</span>
              
              <span className="text-sm font-bold text-muted-foreground tabular-nums whitespace-nowrap">
                {pricing && quantity > 0 ? (
                  ((pricing.totalCents / 100) / quantity) < 0.1 
                    ? ((pricing.totalCents / 100) / quantity).toFixed(4)
                    : ((pricing.totalCents / 100) / quantity).toFixed(2)
                ) : (
                  (selectedService.pricePer1kRub / 1000) < 0.1 
                    ? (selectedService.pricePer1kRub / 1000).toFixed(4) 
                    : (selectedService.pricePer1kRub / 1000).toFixed(2)
                )} ₽
              </span>
              
              <span className="text-muted-foreground font-bold text-lg">=</span>
              
              <div className="bg-slate-800 px-5 h-12 rounded-xl border border-slate-700 flex items-center justify-center min-w-[120px] shadow-inner">
                <p className="text-xl font-black text-white tabular-nums tracking-tight">
                  {pricing ? (pricing.totalCents / 100).toFixed(2) : '0.00'} <span className="text-primary/70 ml-0.5">₽</span>
                </p>
              </div>
            </div>

            {/* Centered Legal Checkbox */}
            <label className="flex items-center justify-center gap-2.5 cursor-pointer group mt-1 w-full max-w-[340px]">
              <button 
                type="button" 
                className="focus:outline-none flex-shrink-0" 
                onClick={() => setAgreedToTerms(!agreedToTerms)} 
              >
                {agreedToTerms 
                  ? <CheckSquare className="w-5 h-5 text-primary/70" /> 
                  : <Square className="w-5 h-5 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
                }
              </button>
              <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
                Я принимаю условия <Link href="/legal/terms" className="underline hover:text-primary/70 transition-colors">Оферты</Link> и <Link href="/legal/privacy" className="underline hover:text-primary/70 transition-colors">Политики</Link>
              </span>
            </label>
          </div>

          {/* Right: Checkout */}
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center justify-center gap-1">
              <Button 
                onClick={handleCheckout}
                disabled={isSubmitting}
                className={`h-12 sm:h-14 w-full sm:w-auto px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-[0_4px_20px] shadow-primary/30 transition-all flex items-center justify-center gap-2 group ${
                  isSubmitting ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'
                }`}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Оплатить <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></>
                )}
              </Button>
              <div className="flex items-center gap-1.5 mt-1 opacity-70">
                 <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Оплата:</span>
                 <span className="text-[9px] font-medium text-slate-300 uppercase tracking-wider">РФ / СБП / Крипта</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
