import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { CategoryIcon, cleanCategoryName } from "@/components/ui/CategoryIcon";
import { Button } from "@/components/ui/button";
import { BrandStyle } from "@/utils/brand-styles";
import { matchesSuggestedCategory } from "@/services/analyzer/category-matcher";

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
  const [showAllCategories, setShowAllCategories] = React.useState(false);
  const { categoryId, setCategoryId, availableCategories, suggestedCategories, detectedType, platform, url, services, isLoading } = engine;
  // FIX(B2-badges): suggestedCategories берётся из engine (useOrderEngine отдаёт стейт,
  // наполненный анализатором ссылки). Локальная заглушка `const suggestedCategories: string[] = []`
  // делала бейджи «Подходит» всегда пустыми.

  const allNetworkCategories = (engine.activeNetwork?.categories || []).filter(c => (c.serviceCount ?? 0) > 0);
  const isLinkActive = url && url.trim().length >= 5;
  const rawCategories = (isLinkActive && !showAllCategories && availableCategories.length > 0) 
    ? availableCategories 
    : allNetworkCategories;
  const categoriesToDisplay = rawCategories.filter(c => (c.serviceCount ?? 0) > 0);

  const formatDetectedType = (t: string | null | undefined) => {
    if (!t) return "";
    const clean = t.toLowerCase();
    if (clean === 'post' || clean === 'private_post' || clean === 'photo') return "поста";
    if (clean === 'channel' || clean === 'chat' || clean === 'group') return "канала";
    if (clean === 'profile' || clean === 'user' || clean === 'account') return "профиля";
    if (clean === 'video' || clean === 'reel' || clean === 'reels' || clean === 'clip') return "видео/Reels";
    if (clean === 'story' || clean === 'stories') return "Stories";
    return clean;
  };

  if (!(currentStep === 2 || (currentStep !== 2 && !!categoryId)) || !shouldShowCategories || (availableCategories.length === 0 && allNetworkCategories.length === 0)) {
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
            <div className="flex flex-col">
              <span className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                2. Выберите цель продвижения
              </span>
              {isLinkActive && detectedType && (
                <span className="text-[11px] font-bold text-success flex items-center gap-1 mt-0.5">
                  <span>✓ Подобрано для {formatDetectedType(detectedType)} {platform || ""}</span>
                </span>
              )}
            </div>
            <span className="text-[11px] font-bold text-primary shrink-0">
              {categoriesToDisplay.length} {categoriesToDisplay.length === 1 ? 'категория' : 'категорий'}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {categoriesToDisplay.map((cat) => {
              const isActive = categoryId === cat.id;
              const isSuggested = suggestedCategories && suggestedCategories.length > 0
                ? matchesSuggestedCategory(cat.name, suggestedCategories, (cat as { analyzerTags?: string | null }).analyzerTags, detectedType)
                : false;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(cat.id);
                    setActiveStep(3);
                    if (typeof window !== 'undefined' && cat.slug) {
                      const netSlug = engine.activeNetwork?.slug || 'services';
                      window.history.replaceState(null, '', `/services/${netSlug}/${cat.slug}`);
                    }
                  }}
                  className={`
                    flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer active:scale-[0.99] text-left border min-h-[48px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none relative overflow-hidden w-full
                    ${isActive
                      ? `${brandStyle?.activeBg || "bg-primary"} ${brandStyle?.activeText || "text-primary-foreground"} border-transparent shadow-md shadow-primary/20`
                      : "bg-content2 border-border/40 text-foreground/85 hover:text-foreground hover:border-border/80 hover:bg-content3"
                    }
                  `}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive 
                      ? "bg-current/20 text-current" 
                      : "bg-primary/5 text-primary"
                  }`}>
                    <CategoryIcon name={cat.name} icon={(cat as { icon?: string | null }).icon} size={16} />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold leading-snug break-words">{cleanCategoryName(cat.name)}</span>
                    {isLinkActive && isSuggested && (
                      <span className="text-[10px] font-semibold text-success/90 flex items-center gap-0.5 mt-0.5">
                        <span>Подходит</span>
                      </span>
                    )}
                  </div>
                  {typeof cat.serviceCount === 'number' && cat.serviceCount > 0 && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      isActive ? "bg-current/20 text-current" : "bg-content3 text-muted-foreground"
                    }`}>
                      {cat.serviceCount}
                    </span>
                  )}
                  {isActive && (
                    <Check className="w-4 h-4 shrink-0 opacity-90" />
                  )}
                </button>
              );
            })}
          </div>

          {isLinkActive && allNetworkCategories.length > availableCategories.length && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {showAllCategories ? "Скрыть другие категории" : `Показать все категории ${engine.activeNetwork?.name || ''} (${allNetworkCategories.length})`}
              </button>
            </div>
          )}

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
                disabled={services.length === 0 && !isLoading}
                className="w-full text-xs font-bold h-11 min-h-[44px] rounded-xl bg-primary text-primary-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {services.length === 0 && !isLoading ? 'Нет доступных тарифов' : 'К тарифам →'}
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
