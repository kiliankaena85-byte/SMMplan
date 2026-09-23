'use client';

import React from 'react';
import { PublicService } from '@/actions/order/catalog';
import { clampOrderQuantity } from '@/hooks/useBaseOrderValidation';

export interface PlanCheckoutQuantityProps {
  quantity: number;
  setQuantity: (qty: number) => void;
  quantityInputRef: React.RefObject<HTMLInputElement | null>;
  minQty: number;
  maxQty: number;
  effectiveMinQty: number;
  handleStepQuantity: (delta: number) => void;
  selectedService: PublicService;
  dripFeedEnabled: boolean;
  setDripFeedEnabled: (val: boolean) => void;
  runs: number;
  setRuns: (r: number) => void;
  dripInterval: number;
  setDripInterval: (i: number) => void;
  setLocalError: (err: string | null) => void;
}

export function PlanCheckoutQuantity({
  quantity,
  setQuantity,
  quantityInputRef,
  minQty,
  maxQty,
  effectiveMinQty,
  handleStepQuantity,
  selectedService,
  dripFeedEnabled,
  setDripFeedEnabled,
  runs,
  setRuns,
  dripInterval,
  setDripInterval,
  setLocalError,
}: PlanCheckoutQuantityProps) {
  const step = minQty < 100 ? Math.max(1, minQty) : 100;
  const isBelowMin = quantity > 0 && quantity < effectiveMinQty;

  return (
    <div id="field-quantity" className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="field-quantity-input" className="text-xs font-black text-foreground uppercase tracking-wider">
          Количество
          <span className="text-destructive font-bold ml-1">*</span>
        </label>
        <span className="text-[11px] text-muted-foreground font-mono">
          Лимиты: {minQty} – {maxQty.toLocaleString('ru-RU')} шт.
        </span>
      </div>

      {/* Stepper Input */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleStepQuantity(-step)}
          disabled={quantity <= effectiveMinQty}
          className="w-12 h-12 rounded-2xl bg-muted/70 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground font-bold text-lg flex items-center justify-center transition-all active:scale-95 disabled:active:scale-100 cursor-pointer shrink-0"
          title={`Уменьшить на ${step}`}
        >
          –
        </button>

        <input
          ref={quantityInputRef}
          id="field-quantity-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={quantity || ''}
          aria-invalid={isBelowMin}
          aria-describedby={isBelowMin ? 'field-quantity-warning' : undefined}
          onFocus={(e) => {
            if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
              e.currentTarget.select();
            }
          }}
          onChange={(e) => {
            const clean = e.target.value.replace(/\D/g, '');
            let parsed = clean ? parseInt(clean, 10) : 0;
            if (maxQty && parsed > maxQty) parsed = maxQty;
            setQuantity(parsed);
            setLocalError(null);
          }}
          onBlur={() => {
            const clamped = clampOrderQuantity(
              quantity,
              minQty,
              maxQty,
              dripFeedEnabled && runs > 0 ? runs : 1
            );
            if (clamped !== quantity) {
              setQuantity(clamped);
            }
          }}
          className={`flex-1 h-12 px-3.5 rounded-2xl bg-background border outline-none font-black text-base text-foreground font-mono text-center transition-all ${
            isBelowMin
              ? 'border-destructive ring-2 ring-destructive/20 focus:border-destructive'
              : 'border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20'
          }`}
        />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleStepQuantity(step)}
          disabled={quantity >= maxQty}
          className="w-12 h-12 rounded-2xl bg-muted/70 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground font-bold text-lg flex items-center justify-center transition-all active:scale-95 disabled:active:scale-100 cursor-pointer shrink-0"
          title={`Увеличить на ${step}`}
        >
          +
        </button>
      </div>

      {/* Inline Warning when below minQty */}
      {isBelowMin && (
        <p id="field-quantity-warning" className="text-[11px] font-bold text-destructive pl-1 animate-in fade-in duration-200">
          {dripFeedEnabled
            ? `Минимум для ${runs} запусков: ${effectiveMinQty.toLocaleString('ru-RU')} шт. (по ${minQty.toLocaleString('ru-RU')} шт./запуск). При потере фокуса исправим автоматически.`
            : `Минимум: ${effectiveMinQty.toLocaleString('ru-RU')} шт. При потере фокуса исправим автоматически.`}
        </p>
      )}

      {/* Drip-Feed Options */}
      {selectedService.isDripFeedEnabled && (
        <div className="mt-3 p-3.5 rounded-2xl bg-muted/30 border border-border/60">
          <label className="flex items-center gap-2 cursor-pointer min-h-[44px] py-1">
            <input
              type="checkbox"
              checked={dripFeedEnabled}
              onChange={(e) => {
                const checked = e.target.checked;
                setDripFeedEnabled(checked);
                if (checked && Number(quantity) < minQty * runs) {
                  setQuantity(minQty * runs);
                }
                setLocalError(null);
              }}
              className="w-5 h-5 rounded text-primary focus:ring-primary cursor-pointer shrink-0"
            />
            <span className="text-xs font-bold text-foreground select-none">
              Постепенный запуск (Drip-Feed)
            </span>
          </label>

          {dripFeedEnabled && (
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border/40 text-xs">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">Запусков ({runs})</label>
                <input
                  type="number"
                  min={2}
                  max={100}
                  value={runs}
                  onFocus={(e) => { const target = e.currentTarget; setTimeout(() => target.select(), 0); }}
                  onClick={(e) => e.currentTarget.select()}
                  onChange={(e) => {
                    const r = Math.max(2, parseInt(e.target.value) || 2);
                    setRuns(r);
                    if (Number(quantity) < minQty * r) setQuantity(minQty * r);
                  }}
                  className="w-full h-11 min-h-[44px] px-3 rounded-xl bg-background border border-border font-mono text-base sm:text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-muted-foreground font-medium mb-1">Интервал (мин)</label>
                <input
                  type="number"
                  min={10}
                  max={1440}
                  value={dripInterval}
                  onFocus={(e) => { const target = e.currentTarget; setTimeout(() => target.select(), 0); }}
                  onClick={(e) => e.currentTarget.select()}
                  onChange={(e) => setDripInterval(Math.max(10, parseInt(e.target.value) || 60))}
                  className="w-full h-11 min-h-[44px] px-3 rounded-xl bg-background border border-border font-mono text-base sm:text-xs font-bold"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
