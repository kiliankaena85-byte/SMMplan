import React from "react";
import { ChevronDown } from "lucide-react";
import type { FluxService, FluxNetwork, FluxCategory } from "@/types/flux";
import { ServiceIdBadge } from "@/components/ui/service-id-badge";
import { formatEtaSpeedBadge } from "@/utils/format-eta";

interface FluxStepCheckoutHeaderProps {
  selectedService: FluxService;
  services?: FluxService[];
  onSelectService?: (srv: FluxService) => void;
  activeNetwork?: FluxNetwork | null;
  activeCategory?: FluxCategory | null;
}

export function FluxStepCheckoutHeader({ 
  selectedService,
  services = [],
  onSelectService,
  activeNetwork,
  activeCategory,
}: FluxStepCheckoutHeaderProps) {
  const availableServices = services.some(s => s.id === selectedService.id)
    ? services
    : [selectedService, ...services];

  return (
    <>
      {(activeNetwork || activeCategory) && (
        <div className="mb-2">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-0.5 rounded-full inline-block">
            {activeNetwork?.name}{activeCategory?.name ? ` • ${activeCategory.name}` : ''}
          </span>
        </div>
      )}

      {availableServices.length > 1 && onSelectService && (
        <div className="mb-3.5">
          <label className="block text-[10px] sm:text-xs font-bold text-foreground/80 uppercase tracking-wider mb-1">
            Выбор услуги / тарифа
          </label>
          <div className="relative">
            <select
              value={selectedService.id}
              onChange={(e) => {
                const found = availableServices.find(s => s.id === e.target.value);
                if (found) onSelectService(found);
              }}
              className="w-full bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 px-3.5 py-2.5 sm:py-3 rounded-[1.25rem] border border-border/80 text-sm sm:text-base font-bold outline-none cursor-pointer focus:ring-2 focus:ring-primary/20 appearance-none pr-10 truncate shadow-sm transition-all"
            >
              {availableServices.map((s) => (
                <option key={s.id} value={s.id} className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100">
                  {s.numericId ? `#${s.numericId} ` : ''}{s.name} ({s.pricePerUnitRub.toFixed(2)} ₽/шт)
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 sm:mb-5 flex justify-between items-start gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedService.numericId && <ServiceIdBadge numericId={selectedService.numericId} />}
            <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight tracking-tight">
              {selectedService.name}
            </h2>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="text-primary font-black text-lg sm:text-xl tabular-nums font-mono">
            {selectedService.pricePerUnitRub.toFixed(2)} ₽
          </span>
          <span className="text-muted-foreground font-medium text-[10px] sm:text-xs block">за 1 шт.</span>
        </div>
      </div>

      {selectedService.description && (
        <div className="mb-4 sm:mb-5 p-3 sm:p-4 rounded-[1.25rem] sm:rounded-2xl bg-muted/70 border border-border/50 text-[13px] sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap shadow-inner max-h-[30vh] overflow-y-auto">
          {selectedService.description}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <div className="p-2.5 sm:p-3 rounded-[1.25rem] sm:rounded-2xl bg-muted/40 shadow-sm border border-border/40">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Мин. заказ</p>
          <p className="font-bold text-base sm:text-lg">{selectedService.minQty}</p>
        </div>
        <div className="p-2.5 sm:p-3 rounded-[1.25rem] sm:rounded-2xl bg-muted/40 shadow-sm border border-border/40">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Макс. заказ</p>
          <p className="font-bold text-base sm:text-lg">{selectedService.maxQty}</p>
        </div>
        <div className="p-2.5 sm:p-3 rounded-[1.25rem] sm:rounded-2xl bg-muted/40 shadow-sm border border-border/40 col-span-2 sm:col-span-1 flex flex-col justify-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Скорость / ETA</p>
          <p className="font-bold text-primary text-xs sm:text-sm">{formatEtaSpeedBadge(selectedService as any)}</p>
        </div>
      </div>

      <hr className="border-border/10 mb-4 sm:mb-5" />
    </>
  );
}

