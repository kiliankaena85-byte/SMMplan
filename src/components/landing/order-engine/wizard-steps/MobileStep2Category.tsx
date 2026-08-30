import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { CategoryIcon, cleanCategoryName } from "@/components/ui/CategoryIcon";
import { Button } from "@/components/ui/button";
import { BrandStyle } from "@/utils/brand-styles";

interface MobileStep2CategoryProps {
  engine: OrderEngine;
  currentStep: number;
  setActiveStep: (step: 1 | 2 | 3 | 4) => void;
  shouldShowCategories: boolean;
  selectedCategoryName: string;
  brandStyle?: BrandStyle;
  step2Ref: React.RefObject<HTMLDivElement | null>;
}

export function MobileStep2Category({
  engine,
  currentStep,
  setActiveStep,
  shouldShowCategories,
  selectedCategoryName,
  brandStyle,
  step2Ref
}: MobileStep2CategoryProps) {
  const { categoryId, setCategoryId, availableCategories } = engine;

  if (!(currentStep === 2 || (currentStep !== 2 && !!categoryId)) || !shouldShowCategories || availableCategories.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      ref={step2Ref}
      className="space-y-3 overflow-visible border-t border-border/30 pt-3"
    >
      {currentStep === 2 ? (
        <>
          <div className="flex items-center justify-between pl-1">
            <span className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
              2. Выберите категорию
            </span>
            <span className="text-[11px] font-bold text-primary">
              {availableCategories.length} категорий
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {availableCategories.map((cat) => {
              const isActive = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(cat.id);
                    setActiveStep(3);
                  }}
                  className={`
                    flex items-center gap-2 p-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer active:scale-[0.98] text-left border min-h-[48px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none relative overflow-hidden
                    ${isActive
                      ? `${brandStyle?.activeBg || "bg-primary"} ${brandStyle?.activeText || "text-primary-foreground"} border-transparent shadow-md shadow-primary/20`
                      : "bg-content2 border-border/40 text-foreground/85 hover:text-foreground hover:border-border/80 hover:bg-content3"
                    }
                  `}
                >
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive 
                      ? "bg-current/20 text-current" 
                      : "bg-primary/5 text-primary"
                  }`}>
                    <CategoryIcon name={cat.name} icon={(cat as { icon?: string | null }).icon} size={14} />
                  </div>
                  <span className="truncate flex-1 text-[11px] leading-tight">{cleanCategoryName(cat.name)}</span>
                  {isActive && (
                    <Check className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              intent="outline"
              onClick={() => setActiveStep(1)}
              className="w-full text-xs font-bold h-11 min-h-[44px] rounded-xl bg-content2 text-foreground border-border/40 hover:bg-content3 cursor-pointer"
            >
              Назад
            </Button>
            {!!categoryId && (
              <Button
                type="button"
                onClick={() => setActiveStep(3)}
                className="w-full text-xs font-bold h-11 min-h-[44px] rounded-xl bg-primary text-primary-foreground cursor-pointer"
              >
                К тарифам →
              </Button>
            )}
          </div>
        </>
      ) : (
        !!categoryId && (
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className="w-full text-left p-3 bg-content2 hover:bg-content3 border border-border/40 rounded-2xl flex items-center justify-between transition-all cursor-pointer active:scale-[0.99]"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">2. Категория</span>
              <span className="text-xs font-bold text-foreground truncate">
                {selectedCategoryName}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 rotate-90" />
          </button>
        )
      )}
    </motion.div>
  );
}
