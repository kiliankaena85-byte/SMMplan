"use client";

import React from "react";
import { Plus, Minus, Lock } from "lucide-react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { getServiceFlags } from "@/utils/url-analyzer";

interface DrawerQuantityCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedService: any;
  quantity: number;
  setQuantity: (q: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pricing: any;
  engine: OrderEngine;
}

import { formatPricePerUnit } from '@/utils/format-price';

export function DrawerQuantityCard({
  selectedService,
  quantity,
  setQuantity,
  pricing,
}: DrawerQuantityCardProps) {
  const min = selectedService.minQty || 10;
  const max = selectedService.maxQty || 100000;

  const { isCustomComments } = getServiceFlags(selectedService);

  const hasDiscount = pricing && pricing.discountCents > 0;
  const pricePerUnit = hasDiscount && quantity > 0
    ? (pricing.totalCents / 100) / quantity
    : selectedService.pricePerUnitRub;

  const handleIncrement = () => {
    if (isCustomComments) return;
    setQuantity(Math.min(max, quantity + 50));
  };

  const handleDecrement = () => {
    if (isCustomComments) return;
    setQuantity(Math.max(min, quantity - 50));
  };

  const handleQuickAdd = (amount: number) => {
    if (isCustomComments) return;
    setQuantity(Math.min(max, Math.max(min, quantity + amount)));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isCustomComments) return;
    const cleanValue = e.target.value.replace(/\D/g, "");
    let val = cleanValue === "" ? 0 : Number(cleanValue);
    if (val > max) val = max;
    setQuantity(val);
  };

  const handleInputBlur = () => {
    if (isCustomComments) return;
    if (quantity < min) {
      setQuantity(min);
    }
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <label className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider">
          Количество заказа
        </label>
        <span className="text-xs sm:text-sm font-bold text-primary font-mono tabular-nums bg-primary/10 px-2.5 py-1 rounded-lg">
          {formatPricePerUnit(pricePerUnit)} ₽ / шт
        </span>
      </div>

      {/* Stepper controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={quantity <= min || isCustomComments}
          className="w-13 h-13 min-w-[48px] min-h-[48px] bg-background hover:bg-content2 border border-border/80 text-foreground rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-90 cursor-pointer shadow-2xs group"
          title="Уменьшить"
        >
          <Minus className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        <div className="flex-1 relative">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min={min}
            max={max}
            value={quantity || ""}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            disabled={isCustomComments}
            onFocus={(e) => {
              const target = e.target;
              setTimeout(() => target.select(), 0);
            }}
            className={`w-full h-13 px-4 rounded-xl border border-border/80 bg-background text-xl font-black tabular-nums font-mono text-foreground text-center focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs ${
              isCustomComments ? "opacity-75 cursor-not-allowed select-none bg-content2" : ""
            }`}
          />
          {isCustomComments && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" title="Количество заблокировано">
              <Lock className="w-4 h-4" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={quantity >= max || isCustomComments}
          className="w-13 h-13 min-w-[48px] min-h-[48px] bg-background hover:bg-content2 border border-border/80 text-foreground rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-90 cursor-pointer shadow-2xs group"
          title="Увеличить"
        >
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Range Slider */}
      {!isCustomComments && (
        <div className="px-1 pt-1">
          <input
            type="range"
            min={min}
            max={Math.min(max, min * 100)} // Caps the slider range so it stays interactive if max is too large
            value={quantity}
            onChange={handleInputChange}
            className="w-full h-2 bg-border/80 rounded-lg appearance-none cursor-pointer accent-primary transition-all"
            style={{
              background: `linear-gradient(to right, var(--color-primary) ${((quantity - min) / (Math.min(max, min * 100) - min)) * 100}%, var(--color-border) ${((quantity - min) / (Math.min(max, min * 100) - min)) * 100}%)`
            }}
          />
        </div>
      )}

      {/* Quick Add Chips (Yandex Go style) */}
      {!isCustomComments ? (
        <div className="grid grid-cols-4 gap-2 pt-1">
          {[100, 500, 1000, 5000].map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => handleQuickAdd(amount)}
              className="min-h-[44px] bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/50 border border-border/80 text-foreground font-black text-xs sm:text-sm py-2 px-3 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 shadow-2xs flex items-center justify-center tabular-nums font-mono"
            >
              +{amount.toLocaleString("ru-RU")}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-2 leading-snug">
          <span>ℹ️</span>
          <span>Количество рассчитывается автоматически на основе введенного списка комментариев.</span>
        </p>
      )}
    </div>
  );
}
