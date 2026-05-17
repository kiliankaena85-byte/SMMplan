"use client";

import React, { useState } from "react";
import { Loader2, Link2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface HeroInputProps {
  engine: OrderEngine;
  handleCheckout: () => void;
  linkHasError: boolean;
  setLinkHasError: (val: boolean) => void;
}

export function HeroInput({ engine, handleCheckout, linkHasError, setLinkHasError }: HeroInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { url, setUrl, setEmail, isMassMode, isMassCalculating } = engine;

  const isEmailDetected = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url.trim());

  return (
    <div className="w-full max-w-4xl mx-auto relative z-20 mb-10 mt-4">
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
        <div
          className={`relative flex items-center w-full bg-content1 rounded-full p-2 sm:p-3 border-2 transition-all shadow-[0_8px_30px_-10px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.08)] h-20 md:h-24 ${
            linkHasError
              ? "border-red-400 focus-within:border-red-500 focus-within:shadow-[0_12px_50px_-12px_rgba(248,113,113,0.3)]"
              : "border-border/50 focus-within:border-primary/40 focus-within:shadow-[0_12px_50px_-12px] focus-within:shadow-primary/20"
          }`}
        >
          <div className="pl-6 sm:pl-8 pr-3 flex-shrink-0">
            <Link2 className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground group-focus-within:text-primary transition-colors" />
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
            onBlur={(e) => {
              setTimeout(() => setIsFocused(false), 200);
              const val = e.target.value.trim();
              if (val && !/^https?:\/\//i.test(val) && val.includes(".") && !val.includes(" ")) {
                setUrl(`https://${val}`);
              } else {
                setUrl(val);
              }
            }}
            placeholder="Вставьте ссылку на профиль или пост..."
            className="flex-1 bg-transparent border-none outline-none text-lg sm:text-2xl font-semibold text-foreground placeholder:text-muted-foreground px-2 sm:px-4 h-full w-full"
          />
          <Button
            onClick={handleCheckout}
            disabled={isMassCalculating}
            className="h-full rounded-full px-8 md:px-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg md:text-xl shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            {isMassCalculating ? <Loader2 className="w-6 h-6 animate-spin" /> : "Начать"}
          </Button>
        </div>
      )}
    </div>
  );
}
