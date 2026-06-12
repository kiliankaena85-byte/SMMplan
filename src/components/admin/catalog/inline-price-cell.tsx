'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import type { CatalogServiceDTO } from '@/types/catalog.dto';
import { updateServiceMarkupAction } from '@/actions/admin/catalog/batch';
import {
  TOTAL_MANDATORY_DEDUCTIONS,
  SAFETY_FLOOR_MARKUP,
  applyBeautifulRounding,
} from '@/lib/financial-constants';

const SAFETY_MULTIPLIER = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

export function calcRetailPrice(rate: number, markup: number, usdToRub: number) {
  return applyBeautifulRounding(rate * markup * usdToRub);
}

export function InlinePriceCell({ service, usdToRub, canEditFinance }: { service: CatalogServiceDTO, usdToRub: number, canEditFinance: boolean }) {
  const [markup, setMarkup] = useState(service.markup);
  // localPrice reflects what the user sees/edits in RUB
  const [localPrice, setLocalPrice] = useState(calcRetailPrice(service.rate, service.markup, usdToRub));
  const [isPending, startTransition] = useTransition();

  const isBelowSafety = markup < SAFETY_MULTIPLIER;
  const providerCostRub = service.rate * usdToRub;

  function handlePriceChange(val: string) {
    const newPrice = parseFloat(val) || 0;
    setLocalPrice(newPrice);
    
    // Auto-calculate markup for internal logic
    if (providerCostRub > 0) {
      const newMarkup = newPrice / providerCostRub;
      setMarkup(newMarkup);
    }
  }

  function handlePercentChange(val: string) {
    const newPercent = parseFloat(val) || 0;
    const newMarkup = (newPercent / 100) + 1;
    setMarkup(newMarkup);
    setLocalPrice(calcRetailPrice(service.rate, newMarkup, usdToRub));
  }

  async function save() {
    // Round for beauty before final calculation
    const roundedPrice = applyBeautifulRounding(localPrice);
    const finalMarkup = roundedPrice / providerCostRub;

    if (roundedPrice === calcRetailPrice(service.rate, service.markup, usdToRub)) return;
    
    // HARD BLOCK: Financial Integrity Guard
    if (finalMarkup < SAFETY_MULTIPLIER) {
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-bold text-destructive flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Ошибка маржинальности</span>
          <span>Цена <b>{roundedPrice} ₽</b> (+{((finalMarkup - 1) * 100).toFixed(0)}%) ниже порога безубыточности <b>+{((SAFETY_MULTIPLIER - 1) * 100).toFixed(0)}%</b>.</span>
        </div>
      );
      // Revert UI
      setMarkup(service.markup);
      setLocalPrice(calcRetailPrice(service.rate, service.markup, usdToRub));
      return;
    }

    startTransition(async () => {
      const r = await updateServiceMarkupAction(service.id, finalMarkup);
      if (!r.success) {
        toast.error(r.error ?? 'Ошибка сохранения');
        setMarkup(service.markup);
        setLocalPrice(calcRetailPrice(service.rate, service.markup, usdToRub));
      } else {
        toast.success(
          <div className="flex flex-col">
            <span className="font-bold">Цена обновлена</span>
            <span className="text-[11px] opacity-80">Установлено: {roundedPrice} ₽ (+{((finalMarkup - 1) * 100).toFixed(0)}%)</span>
          </div>
        );
        setLocalPrice(roundedPrice);
        setMarkup(finalMarkup);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase text-muted-foreground/80 font-bold tracking-wider">Цена (₽)</span>
          <div className="relative group">
            <input
              type="number"
              value={localPrice}
              onChange={e => handlePriceChange(e.target.value)}
              onBlur={save}
              onKeyDown={e => e.key === 'Enter' && save()}
              disabled={isPending || !canEditFinance}
              className={`w-28 px-3 py-2 text-sm h-10 font-mono font-bold rounded-xl border outline-none transition-all duration-200 tabular-nums
                ${isBelowSafety
                  ? 'border-rose-300 bg-destructive/10 text-rose-700 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
                } disabled:opacity-50 ${!canEditFinance && 'bg-muted border-transparent text-muted-foreground'}`}
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase text-muted-foreground/80 font-bold tracking-wider">Наценка (%)</span>
          <div className="relative group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">+</span>
            <input
              type="number"
              value={markup > 0 ? ((markup - 1) * 100).toFixed(0) : "0"}
              onChange={e => handlePercentChange(e.target.value)}
              onBlur={save}
              onKeyDown={e => e.key === 'Enter' && save()}
              disabled={isPending || !canEditFinance}
              className={`w-24 pl-6 pr-3 py-2 text-sm h-10 font-mono rounded-xl border outline-none transition-all duration-200 tabular-nums
                ${isBelowSafety
                  ? 'border-rose-300 bg-destructive/10 text-rose-700 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
                } disabled:opacity-50 ${!canEditFinance && 'bg-muted border-transparent text-muted-foreground'}`}
            />
          </div>
        </div>
      </div>
      {isBelowSafety && (
        <span className="text-[10px] text-destructive font-medium flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-3 h-3" />
          Ниже мин. наценки (+{((SAFETY_MULTIPLIER - 1) * 100).toFixed(0)}%)
        </span>
      )}
    </div>
  );
}
