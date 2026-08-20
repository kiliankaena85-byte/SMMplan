"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Mail, Ticket } from "lucide-react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { getServiceFlags } from "@/utils/url-analyzer";

interface DrawerFormInputsProps {
  email: string;
  setEmail: (e: string) => void;
  promoCode: string;
  setPromoCode: (p: string) => void;
  emailInputRef?: React.RefObject<HTMLInputElement | null>;
  emailHasError?: boolean;
  engine: OrderEngine;
}

export function DrawerFormInputs({
  email,
  setEmail,
  promoCode,
  setPromoCode,
  emailInputRef,
  emailHasError,
  engine
}: DrawerFormInputsProps) {
  const [showPromo, setShowPromo] = useState(promoCode.length > 0);
  const { selectedService, customData, setCustomData, setQuantity } = engine;

  useEffect(() => {
    if (promoCode.length > 0) {
      setShowPromo(true);
    }
  }, [promoCode]);

  const { isCustomComments, isPoll, customFieldLabel } = getServiceFlags(selectedService);

  // Auto-sync quantity with comments line count if it is a comments service
  const handleCustomDataChange = (val: string) => {
    setCustomData(val);
    if (isCustomComments) {
      const lines = val.split("\n").filter(line => line.trim().length > 0);
      setQuantity(lines.length || (selectedService?.minQty || 10));
    }
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
      {/* Custom Fields (Comments / Answer Option, etc.) */}
      {customFieldLabel && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <label className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider block">
            {customFieldLabel}
          </label>
          <div className="relative">
            {isCustomComments ? (
              <textarea
                value={customData}
                onChange={(e) => handleCustomDataChange(e.target.value)}
                placeholder="Каждая строка — новый комментарий..."
                className="w-full min-h-[110px] p-3.5 rounded-xl border border-border/80 bg-background text-sm font-bold text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs resize-y"
              />
            ) : (
              <input
                type="text"
                value={customData}
                onChange={(e) => handleCustomDataChange(e.target.value)}
                placeholder={isPoll ? "Например: 2" : "Слова через запятую..."}
                className="w-full h-12 px-3.5 rounded-xl border border-border/80 bg-background text-sm font-bold text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs"
              />
            )}
          </div>
          {isCustomComments && (
            <div className="space-y-1 mt-1.5 ml-1">
              <p className="text-xs text-muted-foreground font-medium">
                Количество заказа автоматически установится равным числу комментариев.
              </p>
              {engine.quantity < (selectedService?.minQty || 10) ? (
                <p className="text-xs font-bold text-destructive animate-pulse">
                  ⚠️ Вы ввели {engine.quantity} {engine.quantity === 1 ? "комментарий" : engine.quantity < 5 && engine.quantity > 0 ? "комментария" : "комментариев"}. Для заказа требуется минимум {selectedService?.minQty || 10}.
                </p>
              ) : (
                <p className="text-xs font-bold text-success">
                  ✓ Введено {engine.quantity} комментариев (минимум {selectedService?.minQty || 10}).
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Email Input Block */}
      <div className="space-y-2">
        <label className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider block">
          Электронная почта
        </label>
        <motion.div
          animate={emailHasError ? { x: [0, -6, 6, -6, 6, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary">
            <Mail className="w-5 h-5" />
          </div>
          <input
            type="email"
            ref={emailInputRef}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={`w-full h-13 pl-11 pr-4 rounded-xl border bg-background text-sm sm:text-base font-bold text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs ${
              emailHasError
                ? "border-destructive focus:border-destructive ring-2 ring-destructive/20 text-destructive"
                : "border-border/80"
            }`}
          />
        </motion.div>
        <p className="text-xs text-muted-foreground font-medium ml-1">
          {emailHasError ? (
            <span className="text-destructive font-bold">Введите корректный email адрес для чека</span>
          ) : (
            "Для отправки электронного чека 54-ФЗ и отслеживания заказа"
          )}
        </p>
      </div>

      {/* Promo Code Input Block */}
      <div className="space-y-2 pt-1">
        {!showPromo ? (
          <button
            type="button"
            onClick={() => setShowPromo(true)}
            className="w-full h-12 border border-dashed border-border/90 hover:border-primary/70 bg-background hover:bg-primary/5 text-xs font-black uppercase tracking-wider text-foreground hover:text-primary rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] shadow-2xs cursor-pointer"
          >
            <Ticket className="w-4 h-4 text-primary" />
            <span>У меня есть промокод</span>
          </button>
        ) : (
          <div className="space-y-1.5">
            <div className="relative animate-in slide-in-from-right-3 fade-in duration-200">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="ПРОМОКОД"
                className="w-full h-12 px-4 pr-10 rounded-xl border border-border/80 bg-background text-sm font-mono font-black tracking-widest uppercase text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs"
              />
              <span className="absolute -top-2.5 left-3 text-[10px] font-black text-primary bg-background px-2 py-0.5 rounded-md uppercase tracking-wider border border-border/80">
                Промокод
              </span>
              <button
                type="button"
                onClick={() => {
                  setPromoCode("");
                  setShowPromo(false);
                }}
                className="absolute top-1/2 -translate-y-1/2 right-3 w-6 h-6 rounded-full bg-content2 hover:bg-content3 flex items-center justify-center text-foreground cursor-pointer transition-all active:scale-90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
