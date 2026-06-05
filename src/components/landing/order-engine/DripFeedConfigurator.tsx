"use client";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useEffect } from "react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Activity, Clock, Plus, Minus } from "lucide-react";

export function DripFeedConfigurator({ engine }: { engine: OrderEngine }) {
  const { selectedService, validationErrors } = engine;

  if (!selectedService) return null;

  const canDrip = selectedService.isDripFeedEnabled;
  const canSmartDrip = selectedService.smartConfig?.isEnabled;

  if (!canDrip && !canSmartDrip) {
    return null;
  }

  // Effect to automatically select a mode if user opens it, or keep it closed by default
  const isAnyDripEnabled = engine.dripFeedEnabled || engine.isSmartDrip;

  const toggleDripFeed = () => {
    if (isAnyDripEnabled) {
      engine.setDripFeedEnabled(false);
      engine.setIsSmartDrip(false);
    } else {
      if (canSmartDrip) {
        engine.setIsSmartDrip(true);
        engine.setDripFeedEnabled(false);
      } else {
        engine.setDripFeedEnabled(true);
        engine.setIsSmartDrip(false);
      }
    }
  };

  return (
    <div className="w-full bg-background border border-border rounded-2xl p-3 shadow-sm mb-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-primary" /> Плавная накрутка (Drip-Feed)
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
            Распределите выполнение заказа на части, чтобы имитировать естественный рост
          </p>
        </div>
        <button
          type="button"
          onClick={toggleDripFeed}
          className={`h-9 px-4 rounded-xl text-xs font-bold transition-all shrink-0 ml-2 ${
            isAnyDripEnabled
              ? "bg-danger/10 text-danger hover:bg-danger/20"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          }`}
        >
          {isAnyDripEnabled ? "Выключить" : "Настроить"}
        </button>
      </div>

      <AnimatePresence>
        {isAnyDripEnabled && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-border/50">
              {/* Mode Selector */}
              {canDrip && canSmartDrip && (
                <div className="flex p-1 bg-content2 rounded-xl mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      engine.setIsSmartDrip(true);
                      engine.setDripFeedEnabled(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[10px] font-black uppercase transition-all ${
                      engine.isSmartDrip
                        ? "bg-background text-primary shadow-sm ring-1 ring-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="w-3 h-3" /> Умный Drip
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      engine.setIsSmartDrip(false);
                      engine.setDripFeedEnabled(true);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[10px] font-black uppercase transition-all ${
                      engine.dripFeedEnabled
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Clock className="w-3 h-3" /> Обычный Drip
                  </button>
                </div>
              )}

              {/* SMART DRIP SETTINGS */}
              {engine.isSmartDrip && (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-extrabold text-foreground uppercase tracking-widest">
                      Срок выполнения (Дней)
                    </label>
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      +{selectedService.smartConfig?.markup ? (selectedService.smartConfig.markup * 100) : 0}% к цене
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3 bg-content2 p-1 rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => engine.setSmartDripDays(Math.max(1, engine.smartDripDays - 1))}
                      className="w-11 h-11 flex items-center justify-center rounded-lg bg-background border border-border text-foreground hover:border-primary hover:text-primary transition-all active:scale-95"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col items-center">
                      <span className="text-base font-black tabular-nums">{engine.smartDripDays}</span>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold">Дней</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => engine.setSmartDripDays(Math.min(30, engine.smartDripDays + 1))}
                      className="w-11 h-11 flex items-center justify-center rounded-lg bg-background border border-border text-foreground hover:border-primary hover:text-primary transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2 leading-relaxed text-center px-2">
                    Нейросеть автоматически распределит <b>{engine.quantity}</b> ед. на <b>{engine.smartDripDays} дней</b>, имитируя случайные всплески активности.
                  </p>
                  {validationErrors?.dripfeed && engine.isSmartDrip && (
                    <p className="text-[10px] font-bold text-danger text-center mt-2 px-2">
                      {validationErrors.dripfeed}
                    </p>
                  )}
                </div>
              )}

              {/* STANDARD DRIP SETTINGS */}
              {engine.dripFeedEnabled && (
                <div className="animate-in fade-in zoom-in-95 duration-200 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-foreground uppercase tracking-widest ml-1">
                      Запусков (Runs)
                    </label>
                    <div className="flex items-center justify-between bg-content2 p-1 rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => engine.setRuns(Math.max(2, engine.runs - 1))}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-background border border-border hover:border-primary active:scale-95 transition-all"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-black tabular-nums">{engine.runs}</span>
                      <button
                        type="button"
                        onClick={() => engine.setRuns(Math.min(100, engine.runs + 1))}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-background border border-border hover:border-primary active:scale-95 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-foreground uppercase tracking-widest ml-1">
                      Интервал (Мин)
                    </label>
                    <div className="flex items-center justify-between bg-content2 p-1 rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => engine.setDripInterval(Math.max(5, engine.dripInterval - 5))}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-background border border-border hover:border-primary active:scale-95 transition-all"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-black tabular-nums">{engine.dripInterval}</span>
                      <button
                        type="button"
                        onClick={() => engine.setDripInterval(Math.min(2880, engine.dripInterval + 5))}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-background border border-border hover:border-primary active:scale-95 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="col-span-2 text-center mt-1">
                    <p className="text-[9px] text-muted-foreground leading-relaxed">
                      Будет выполнено <b>{engine.runs}</b> запусков по <b>{Math.floor(engine.quantity / engine.runs)}</b> ед. каждые <b>{engine.dripInterval} минут</b>.
                      <br/> Итого: <b className="text-foreground">{engine.quantity}</b> ед.
                    </p>
                    {validationErrors?.dripfeed && !engine.isSmartDrip && (
                      <p className="text-[10px] font-bold text-danger mt-2">
                        {validationErrors.dripfeed}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
