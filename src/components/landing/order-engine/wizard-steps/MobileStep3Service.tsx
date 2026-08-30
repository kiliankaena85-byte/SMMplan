import React from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { TariffCard } from "../TariffCard";
import { Button } from "@/components/ui/button";
import { BrandStyle } from "@/utils/brand-styles";

interface MobileStep3ServiceProps {
  engine: OrderEngine;
  currentStep: number;
  setActiveStep: (step: 1 | 2 | 3 | 4) => void;
  shouldShowTariffs: boolean;
  selectedCategoryName: string;
  brandStyle?: BrandStyle;
  step3Ref: React.RefObject<HTMLDivElement | null>;
}

export function MobileStep3Service({
  engine,
  currentStep,
  setActiveStep,
  shouldShowTariffs,
  selectedCategoryName,
  brandStyle,
  step3Ref
}: MobileStep3ServiceProps) {
  const { selectedService, setSelectedService, isLoading, services, networkId } = engine;

  if (!(currentStep === 3 || (currentStep !== 3 && !!selectedService)) || !shouldShowTariffs) {
    return null;
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      ref={step3Ref}
      className="space-y-3 overflow-visible border-t border-border/30 pt-3"
    >
      {currentStep === 3 ? (
        <>
          <div className="flex items-center justify-between pl-1">
            <span className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
              3. Выберите тариф • {selectedCategoryName}
            </span>
            <span className="text-[11px] font-bold text-primary">
              {services.length} тарифов
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-content2/70 animate-pulse border border-border/40" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground font-semibold bg-content2 rounded-2xl p-4 border border-dashed border-border/50">
              {!networkId
                ? "Вставьте ссылку или выберите категорию в каталоге, чтобы загрузить тарифы."
                : "В этой категории пока нет доступных тарифов. Попробуйте выбрать другую."}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {services.map((srv) => (
                <TariffCard
                  key={srv.id}
                  service={srv}
                  isSelected={selectedService?.id === srv.id}
                  onSelect={(s) => {
                    setSelectedService(s);
                    setActiveStep(4);
                  }}
                  brandStyle={brandStyle}
                />
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              intent="outline"
              onClick={() => setActiveStep(2)}
              className="w-full text-xs font-bold h-11 min-h-[44px] rounded-xl bg-content2 text-foreground border-border/40 hover:bg-content3 cursor-pointer"
            >
              Назад
            </Button>
            {!!selectedService && (
              <Button
                type="button"
                onClick={() => setActiveStep(4)}
                className="w-full text-xs font-bold h-11 min-h-[44px] rounded-xl bg-primary text-primary-foreground cursor-pointer"
              >
                К оформлению →
              </Button>
            )}
          </div>
        </>
      ) : (
        !!selectedService && (
          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className="w-full text-left p-3 bg-content2 hover:bg-content3 border border-border/40 rounded-2xl flex items-center justify-between transition-all cursor-pointer active:scale-[0.99]"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">3. Выбранный тариф</span>
              <span className="text-xs font-bold text-foreground truncate">
                {selectedService.name}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 rotate-90" />
          </button>
        )
      )}
    </motion.div>
  );
}
