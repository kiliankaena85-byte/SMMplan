"use client";

import React from "react";
import { motion } from "framer-motion";
import { Link2, Edit3, ChevronRight, Loader2, CheckSquare, Square } from "lucide-react";
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
}) {
  if (!selectedService) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      className="fixed bottom-0 left-0 right-0 z-[200] hidden sm:block"
    >
      <div className="backdrop-blur-2xl bg-gradient-to-r from-slate-900 to-slate-950 border-t border-slate-800 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          
          {/* Left: Selected service name */}
          <div className="flex-1 min-w-0 max-w-[320px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Выбрано</p>
            <p className="text-sm font-bold text-white truncate leading-tight">{selectedService.name}</p>
            <div className="flex items-center gap-2 mt-1.5 opacity-80 hover:opacity-100 transition-opacity">
              <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                <Link2 className="w-2.5 h-2.5 text-sky-400" />
              </div>
              <p className="text-[12px] font-medium text-slate-300 truncate max-w-[180px]">
                {url || "Ссылка не указана"}
              </p>
              <button 
                onClick={() => setShowLinkModal(true)}
                className="ml-1 p-1 hover:bg-slate-700 rounded-md transition-colors text-slate-400 hover:text-white group"
                title="Изменить ссылку"
              >
                <Edit3 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          {/* Center: Live Calculator — qty × unitPrice = total */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <input 
                type="number" 
                value={quantity} 
                min={selectedService.minQty || 10}
                max={selectedService.maxQty}
                onChange={e => {
                  let val = Number(e.target.value);
                  if (selectedService?.maxQty && val > selectedService.maxQty) val = selectedService.maxQty;
                  setQuantity(val);
                }} 
                className="w-28 h-12 px-4 rounded-xl border-2 border-slate-700 bg-slate-800/80 text-lg font-black tabular-nums text-white text-center focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
              />
              <span className="absolute -top-2 left-3 text-[9px] font-bold text-slate-400 bg-slate-900 px-1.5 rounded-sm uppercase">Кол-во</span>
            </div>
            
            <span className="text-slate-600 font-bold text-lg">×</span>
            
            <span className="text-sm font-bold text-slate-300 tabular-nums whitespace-nowrap">
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
            
            <span className="text-slate-600 font-bold text-lg">=</span>
            
            <div className="bg-slate-950 px-5 h-12 rounded-xl border border-sky-500/30 flex items-center justify-center min-w-[120px] shadow-[0_0_20px_rgba(14,165,233,0.1)]">
              <p className="text-xl font-black text-white tabular-nums tracking-tight">
                {pricing ? (pricing.totalCents / 100).toFixed(2) : '0.00'} <span className="text-sky-500 ml-0.5">₽</span>
              </p>
            </div>
          </div>

          {/* Right: Checkout */}
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-end justify-center gap-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <button 
                  type="button" 
                  className="focus:outline-none" 
                  onClick={() => setAgreedToTerms(!agreedToTerms)} 
                >
                  {agreedToTerms 
                    ? <CheckSquare className="w-5 h-5" /> 
                    : <Square className="w-5 h-5 text-slate-600 group-hover:text-slate-400" />
                  }
                </button>
                <span className="text-xs text-slate-400 font-medium">
                  <Link href="/p/offer" className="underline hover:text-sky-400 transition-colors">Оферта</Link>
                </span>
              </label>

              <Button 
                onClick={handleCheckout}
                disabled={isSubmitting || !agreedToTerms}
                className={`h-12 px-8 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-[0_10px_30px_-10px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-2 group ${
                  (isSubmitting || !agreedToTerms) ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'
                }`}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Оплатить <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></>
                )}
              </Button>
              <div className="flex items-center gap-1.5 mt-1 opacity-70">
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Оплата:</span>
                 <span className="text-[9px] font-medium text-slate-300 uppercase tracking-wider">РФ / СБП / Крипта</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
