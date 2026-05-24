"use client";

import React, { useState } from "react";
import { Loader2, Link2, Mail, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { VisualLinkGuideModal } from "./VisualLinkGuideModal";
import { stripQueryParams, normalizeUsername } from "@/utils/link-normalizer";

interface HeroInputProps {
  engine: OrderEngine;
  handleCheckout: () => void;
  linkHasError: boolean;
  setLinkHasError: (val: boolean) => void;
}

export function HeroInput({ engine, handleCheckout, linkHasError, setLinkHasError }: HeroInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const { url, setUrl, setEmail, isMassMode, isMassCalculating } = engine;

  const isEmailDetected = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url.trim());

  return (
    <div className="w-full max-w-4xl mx-auto relative z-20 mb-4 md:mb-10 mt-4">
      <AnimatePresence>
        {isEmailDetected && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="mb-4 bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md relative z-30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Похоже, вы ввели email-адрес</p>
                <p className="text-xs text-muted-foreground">Использовать его для связи и быстрой регистрации?</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => {
                  setEmail(url.trim());
                  setUrl("");
                  toast.success("Отлично! Мы сохранили ваш Email. Теперь вставьте ссылки на накрутку.");
                }}
                className="bg-primary text-primary-foreground font-bold rounded-xl"
              >
                Да, запомнить
              </Button>
              <Button
                size="sm"
                intent="ghost"
                onClick={() => setUrl("")}
                className="text-muted-foreground hover:text-foreground font-bold"
              >
                Нет, очистить
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isMassMode ? (
        <div
          className={`relative flex flex-col w-full bg-content1 rounded-[2rem] p-4 sm:p-5 border-2 transition-all shadow-[0_8px_30px_-10px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.08)] ${
            linkHasError
              ? "border-red-400 focus-within:border-red-500 focus-within:shadow-[0_12px_50px_-12px_rgba(248,113,113,0.3)]"
              : "border-border/50 focus-within:border-primary/40 focus-within:shadow-[0_12px_50px_-12px] focus-within:shadow-primary/20"
          }`}
        >
          <textarea
            id="landing-url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (linkHasError) setLinkHasError(false);
            }}
            placeholder={`ID услуги | Ссылка | Количество\nПример:\n15 | https://t.me/durov | 100\n18 | https://vk.com/wall-1_1 | 500\n\n(Каждый заказ с новой строки)`}
            className="w-full min-h-[140px] bg-transparent border-none outline-none text-base sm:text-lg font-semibold text-foreground placeholder:text-muted-foreground px-2 sm:px-4 py-2 resize-none"
          />
          <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-2">
            <div className="flex items-center gap-2 pl-2">
              {isMassCalculating ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <Link2 className="w-5 h-5 text-primary" />
              )}
              <span className="text-sm font-bold text-muted-foreground">Режим массового заказа</span>
            </div>
            <Button
              onClick={handleCheckout}
              disabled={isMassCalculating}
              className="rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              {isMassCalculating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Оформить пакет"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {/* Visual Step Guide Indicator (Foolproof UX) */}
          <div className="flex items-center gap-6 mb-2 px-6 select-none">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${
                !url ? 'bg-primary text-primary-foreground scale-110 shadow-md shadow-primary/30 animate-pulse border border-primary/20' : 'bg-success text-success-foreground'
              }`}>
                {!url ? '1' : '✓'}
              </span>
              <span className={`text-[10px] sm:text-xs font-extrabold tracking-wide uppercase transition-colors duration-300 ${
                !url ? 'text-foreground font-black' : 'text-muted-foreground'
              }`}>
                Шаг 1: Ссылка
              </span>
            </div>
            <div className="w-8 h-px bg-border/40 shrink-0"></div>
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${
                url && !engine.selectedService ? 'bg-primary text-primary-foreground scale-110 shadow-md shadow-primary/30 animate-pulse border border-primary/20' 
                : engine.selectedService ? 'bg-success text-success-foreground'
                : 'bg-muted text-muted-foreground'
              }`}>
                {engine.selectedService ? '✓' : '2'}
              </span>
              <span className={`text-[10px] sm:text-xs font-extrabold tracking-wide uppercase transition-colors duration-300 ${
                url && !engine.selectedService ? 'text-foreground font-black' : 'text-muted-foreground'
              }`}>
                Шаг 2: Тариф
              </span>
            </div>
            <div className="w-8 h-px bg-border/40 shrink-0"></div>
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${
                engine.selectedService ? 'bg-primary text-primary-foreground scale-110 shadow-md shadow-primary/30 animate-pulse border border-primary/20' : 'bg-muted text-muted-foreground'
              }`}>
                3
              </span>
              <span className={`text-[10px] sm:text-xs font-extrabold tracking-wide uppercase transition-colors duration-300 ${
                engine.selectedService ? 'text-foreground font-black' : 'text-muted-foreground'
              }`}>
                Шаг 3: Оплата
              </span>
            </div>
          </div>

          <div
            className={`relative flex items-center w-full bg-content1 rounded-full p-1.5 sm:p-2 border-2 transition-all shadow-[0_8px_30px_-10px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.08)] h-14 sm:h-16 md:h-[72px] ${
              linkHasError
                ? "border-red-400 focus-within:border-red-500 focus-within:shadow-[0_12px_50px_-12px_rgba(248,113,113,0.3)]"
                : "border-border/50 focus-within:border-primary/40 focus-within:shadow-[0_12px_50px_-12px] focus-within:shadow-primary/20"
            }`}
          >
            <div className="pl-3 sm:pl-5 pr-1.5 sm:pr-2 flex-shrink-0">
              <Link2 className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input
              id="landing-url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (linkHasError) setLinkHasError(false);
              }}
              onFocus={() => setIsFocused(true)}
              onPaste={(e) => {
                const pastedText = e.clipboardData.getData("text");
                const activeNetwork = engine.catalog.find(n => n.id === engine.networkId);
                const platformSlug = activeNetwork?.slug || "";
                
                // 1. Clean tracking parameters from pasted text
                let cleaned = stripQueryParams(pastedText);
                
                // 2. Normalize username if applicable
                if (platformSlug && (cleaned.startsWith("@") || (!cleaned.includes("/") && !cleaned.includes(".") && cleaned.trim().length > 0))) {
                  cleaned = normalizeUsername(cleaned, platformSlug);
                }
                
                e.preventDefault();
                setUrl(cleaned);
                if (linkHasError) setLinkHasError(false);
                toast.success("Ссылка очищена и нормализована!");
              }}
              onBlur={(e) => {
                setTimeout(() => setIsFocused(false), 200);
                let val = e.target.value.trim();
                const activeNetwork = engine.catalog.find(n => n.id === engine.networkId);
                const platformSlug = activeNetwork?.slug || "";

                if (val) {
                  // 1. Clean parameters
                  val = stripQueryParams(val);
                  
                  // 2. Normalize handle
                  if (platformSlug && (val.startsWith("@") || (!val.includes("/") && !val.includes(".") && val.trim().length > 0))) {
                    val = normalizeUsername(val, platformSlug);
                  } else if (!/^https?:\/\//i.test(val) && val.includes(".") && !val.includes(" ")) {
                    val = `https://${val}`;
                  }
                  
                  setUrl(val);
                }
              }}
              placeholder="Вставьте ссылку на канал, группу или пост..."
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm sm:text-base md:text-lg font-semibold text-foreground placeholder:text-muted-foreground px-1.5 sm:px-3 h-full w-full"
            />
            <Button
              onClick={handleCheckout}
              disabled={isMassCalculating}
              className="h-full rounded-full px-4 sm:px-6 md:px-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm sm:text-base md:text-lg shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 shrink-0"
            >
              {isMassCalculating ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : "Начать"}
            </Button>
          </div>

          <div className="flex justify-between items-center px-6">
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-all duration-200 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-primary/80 animate-pulse" />
              Как правильно скопировать ссылку для заказа?
            </button>
          </div>
        </div>
      )}
      
      <VisualLinkGuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
        initialPlatform={engine.catalog.find(n => n.id === engine.networkId)?.slug}
      />
    </div>
  );
}
