"use client";

import React from "react";
import { motion } from "framer-motion";
import { X, Link2, Mail, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmailModal({
  showEmailModal,
  setShowEmailModal,
  email,
  setEmail,
  url,
  totalPriceFormatted,
  isSubmitting,
  handleCheckout,
  promoCode,
  setPromoCode,
  pricingError,
  isCalculating,
}: {
  showEmailModal: boolean;
  setShowEmailModal: (show: boolean) => void;
  email: string;
  setEmail: (email: string) => void;
  url: string;
  totalPriceFormatted: string;
  isSubmitting: boolean;
  handleCheckout: () => void;
  promoCode: string;
  setPromoCode: (code: string) => void;
  pricingError?: string | null;
  isCalculating?: boolean;
}) {
  if (!showEmailModal) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
      onClick={() => setShowEmailModal(false)}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-content1 rounded-3xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.2)] p-8 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-black text-foreground">Почти готово!</h3>
            <p className="text-sm text-muted-foreground mt-1">Укажите email для получения чека</p>
          </div>
          <button onClick={() => setShowEmailModal(false)} className="w-8 h-8 rounded-full bg-default-100 hover:bg-default-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        
        {/* Context Link Display */}
        <div className="bg-content2 rounded-xl p-3 flex items-center gap-3 mb-6 border border-border/50">
           <div className="w-10 h-10 rounded-lg bg-content1 shadow-sm flex items-center justify-center shrink-0 border border-border/50">
              <Link2 className="w-5 h-5 text-primary" />
           </div>
           <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest leading-none mb-1">Оформляется для</p>
              <p className="text-sm font-bold text-foreground truncate leading-tight">{url || "Ссылка не указана"}</p>
           </div>
        </div>
        
        <div className="relative mb-4">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="you@example.com"
            autoFocus
            className="w-full h-14 pl-12 pr-6 rounded-2xl border-2 border-border bg-content1 text-[15px] font-semibold text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:shadow-[0_8px_20px_-6px] focus:shadow-primary/15 outline-none transition-all"
            onKeyDown={e => {
              if (e.key === 'Enter' && email.includes('@')) {
                setShowEmailModal(false);
                handleCheckout();
              }
            }}
          />
        </div>

        {/* Promo Code Input */}
        <div className="relative mb-6">
          <div className="flex flex-col gap-1.5">
            <input 
              type="text" 
              value={promoCode} 
              onChange={e => setPromoCode(e.target.value.toUpperCase())} 
              placeholder="ПРОМОКОД (ЕСЛИ ЕСТЬ)"
              className="w-full h-12 px-5 rounded-2xl border-2 border-border bg-content1 text-[13px] font-mono tracking-wider uppercase text-foreground placeholder:text-muted-foreground/55 focus:border-primary/50 focus:shadow-[0_8px_20px_-6px] focus:shadow-primary/15 outline-none transition-all"
            />
            {pricingError === 'voucher' && (
              <div className="text-[10px] font-bold text-warning bg-warning/5 border border-warning/15 rounded-xl px-2.5 py-1.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                Это ваучер на баланс. Активируйте в личном кабинете.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-right flex-1">
            <p className="text-xs text-muted-foreground font-bold uppercase mb-0.5">Итого</p>
            <div className="flex items-center justify-end gap-1.5 min-h-[32px]">
              {isCalculating ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <p className="text-2xl font-black text-foreground tabular-nums">{totalPriceFormatted} <span className="text-primary font-bold">₽</span></p>
              )}
            </div>
          </div>
          <Button
            onClick={() => {
              if (email.includes('@')) {
                setShowEmailModal(false);
                handleCheckout();
              }
            }}
            disabled={!email.includes('@') || isSubmitting}
            className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-lg transition-all flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>Перейти к оплате <ChevronRight className="w-5 h-5" /></>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-5 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
          <span>Карты РФ</span>
          <span className="w-1 h-1 rounded-full bg-default-200"></span>
          <span>СБП</span>
          <span className="w-1 h-1 rounded-full bg-default-200"></span>
          <span>Крипта</span>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-3">
          Чек отправляется автоматически на указанный email
        </p>
      </motion.div>
    </motion.div>
  );
}
