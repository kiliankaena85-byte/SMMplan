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

function formatPricePerUnit(price: number): string {
  if (price === 0) return "0.00";
  let formatted: string;
  if (price < 0.01) {
    formatted = price.toFixed(6);
  } else if (price < 0.1) {
    formatted = price.toFixed(4);
  } else {
    formatted = price.toFixed(2);
  }
  if (formatted.includes(".")) {
    while (formatted.endsWith("0") && formatted.split(".")[1].length > 2) {
      formatted = formatted.slice(0, -1);
    }
  }
  return formatted;
}

export function DrawerQuantityCard({
  selectedService,
  quantity,
  setQuantity,
  pricing,
  engine: _engine
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
    <div className="bg-content2/60 border border-border/20 rounded-3xl p-4 pb-5 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
          Количество заказа
        </label>
        <span className="text-xs font-bold text-muted-foreground">
          {formatPricePerUnit(pricePerUnit)} ₽ / шт
        </span>
      </div>

      {/* Stepper controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={quantity <= min || isCustomComments}
          className="w-12 h-12 bg-background hover:bg-content3 border border-border/50 text-foreground rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-90 cursor-pointer shadow-sm"
          title="Уменьшить на 50"
        >
          <Minus className="w-4 h-4" />
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
            onFocus={(e) => e.target.select()}
            className={`w-full h-12 px-3 rounded-2xl border border-border/50 bg-background text-sm font-black tabular-nums text-foreground text-center focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm ${
              isCustomComments ? "opacity-75 cursor-not-allowed select-none bg-content2" : ""
            }`}
          />
          {isCustomComments && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" title="Количество заблокировано">
              <Lock className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={quantity >= max || isCustomComments}
          className="w-12 h-12 bg-background hover:bg-content3 border border-border/50 text-foreground rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-90 cursor-pointer shadow-sm"
          title="Увеличить на 50"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Range Slider */}
      {!isCustomComments && (
        <div className="px-1">
          <input
            type="range"
            min={min}
            max={Math.min(max, min * 100)} // Caps the slider range so it stays interactive if max is too large
            value={quantity}
            onChange={handleInputChange}
            className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary transition-all"
            style={{
              background: `linear-gradient(to right, var(--color-primary) ${((quantity - min) / (Math.min(max, min * 100) - min)) * 100}%, var(--color-border) ${((quantity - min) / (Math.min(max, min * 100) - min)) * 100}%)`
            }}
          />
        </div>
      )}

      {/* Quick Add Chips (Yandex Go style) */}
      {!isCustomComments ? (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {[100, 500, 1000, 5000].map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => handleQuickAdd(amount)}
              className="bg-background hover:bg-primary/10 hover:text-primary border border-border/50 text-muted-foreground text-[10px] font-black py-1.5 px-3 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
            >
              +{amount.toLocaleString("ru-RU")}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[10px] font-bold text-primary bg-primary/5 border border-primary/20 rounded-xl p-2.5 flex items-center gap-1.5 leading-snug">
          <span>ℹ️</span>
          <span>Количество рассчитывается автоматически на основе введенного списка комментариев.</span>
        </p>
      )}
    </div>
  );
}
