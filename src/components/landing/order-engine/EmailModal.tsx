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
}: {
  showEmailModal: boolean;
  setShowEmailModal: (show: boolean) => void;
  email: string;
  setEmail: (email: string) => void;
  url: string;
  totalPriceFormatted: string;
  isSubmitting: boolean;
  handleCheckout: () => void;
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
        
        <div className="relative mb-6">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="you@example.com"
            autoFocus
            className="w-full h-14 pl-12 pr-6 rounded-2xl border-2 border-border bg-content1 text-[15px] font-semibold text-foreground placeholder-slate-400 focus:border-primary/50 focus:shadow-[0_8px_20px_-6px] focus:shadow-primary/15 outline-none transition-all"
            onKeyDown={e => {
              if (e.key === 'Enter' && email.includes('@')) {
                setShowEmailModal(false);
                handleCheckout();
              }
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-right flex-1">
            <p className="text-xs text-muted-foreground font-bold uppercase">Итого</p>
            <p className="text-2xl font-black text-foreground tabular-nums">{totalPriceFormatted} ₽</p>
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
