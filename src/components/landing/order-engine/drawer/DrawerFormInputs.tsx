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
    <div className="bg-content2/60 border border-border/20 rounded-3xl p-4 pb-5 space-y-3.5">
      {/* Custom Fields (Comments / Answer Option, etc.) */}
      {customFieldLabel && (
        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider block">
            {customFieldLabel}
          </label>
          <div className="relative">
            {isCustomComments ? (
              <textarea
                value={customData}
                onChange={(e) => handleCustomDataChange(e.target.value)}
                placeholder="Каждая строка — новый комментарий..."
                className="w-full min-h-[100px] p-3 rounded-2xl border border-border/50 bg-background text-xs font-bold text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm resize-y"
              />
            ) : (
              <input
                type="text"
                value={customData}
                onChange={(e) => handleCustomDataChange(e.target.value)}
                placeholder={isPoll ? "Например: 2" : "Слова через запятую..."}
                className="w-full h-11 px-3 rounded-2xl border border-border/50 bg-background text-xs font-bold text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
              />
            )}
          </div>
          {isCustomComments && (
            <div className="space-y-1 mt-1 ml-1">
              <p className="text-[10px] text-muted-foreground">
                Количество заказа автоматически установится равным числу комментариев.
              </p>
              {engine.quantity < (selectedService?.minQty || 10) ? (
                <p className="text-[10px] font-bold text-destructive animate-pulse">
                  ⚠️ Вы ввели {engine.quantity} {engine.quantity === 1 ? "комментарий" : engine.quantity < 5 && engine.quantity > 0 ? "комментария" : "комментариев"}. Для заказа требуется минимум {selectedService?.minQty || 10}.
                </p>
              ) : (
                <p className="text-[10px] font-bold text-success">
                  ✓ Введено {engine.quantity} комментариев (минимум {selectedService?.minQty || 10}).
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Email Input Block */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider block">
          Электронная почта
        </label>
        <motion.div
          animate={emailHasError ? { x: [0, -6, 6, -6, 6, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Mail className="w-4 h-4" />
          </div>
          <input
            type="email"
            ref={emailInputRef}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={`w-full h-11 pl-9 pr-3 rounded-2xl border bg-background text-xs font-bold text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm ${
              emailHasError
                ? "border-destructive focus:border-destructive ring-2 ring-destructive/20 text-destructive"
                : "border-border/50"
            }`}
          />
        </motion.div>
        <p className="text-[10px] text-muted-foreground ml-1">
          {emailHasError ? (
            <span className="text-destructive font-bold">Введите корректный email адрес</span>
          ) : (
            "Для отправки электронного чека и отслеживания статуса"
          )}
        </p>
      </div>

      {/* Promo Code Input Block */}
      <div className="space-y-1.5 pt-1">
        {!showPromo ? (
          <button
            type="button"
            onClick={() => setShowPromo(true)}
            className="w-full h-11 border border-dashed border-border/60 hover:border-primary/50 bg-background hover:bg-primary/5 text-[10px] font-black uppercase text-muted-foreground hover:text-primary rounded-2xl flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.99] shadow-sm cursor-pointer"
          >
            <Ticket className="w-3.5 h-3.5" />
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
                className="w-full h-11 px-3 pr-8 rounded-2xl border border-border/50 bg-background text-xs font-mono font-black tracking-widest uppercase text-foreground focus:border-primary outline-none transition-all shadow-sm"
              />
              <span className="absolute -top-2 left-3 text-[9px] font-black text-muted-foreground bg-background px-1.5 rounded-md uppercase tracking-wider border border-border/40">
                Промокод
              </span>
              <button
                type="button"
                onClick={() => {
                  setPromoCode("");
                  setShowPromo(false);
                }}
                className="absolute top-1/2 -translate-y-1/2 right-3 w-5 h-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
