import React, { useMemo } from "react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { cleanCategoryName, CategoryIcon } from "@/components/ui/CategoryIcon";
import { Globe, Layers, Zap, Clock, CheckCircle2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SocialIcon } from "@/components/ui/SocialIcon";

export function MobileSelectors({ engine }: { engine: OrderEngine }) {
  const {
    networkId,
    setNetworkId,
    categoryId,
    setCategoryId,
    selectedService,
    setSelectedService,
    catalog,
    availableCategories,
    services,
    isLoading,
  } = engine;

  const sortedCategories = useMemo(() => {
    const PRIORITY = ['подписчик', 'участники', 'просмотр', 'охват', 'лайк', 'нравится', 'реакц', 'сердц', 'коммент', 'отзыв', 'репост', 'поделит', 'авто', 'статистик', 'звезд', 'premium'];
    return [...availableCategories].sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aIdx = PRIORITY.findIndex(p => aName.includes(p));
      const bIdx = PRIORITY.findIndex(p => bName.includes(p));
      
      const scoreA = aIdx === -1 ? 999 : aIdx;
      const scoreB = bIdx === -1 ? 999 : bIdx;
      
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
      return a.name.localeCompare(b.name);
    });
  }, [availableCategories]);

  return (
    <div className="md:hidden flex flex-col gap-4 p-4 bg-card border-b border-border/50 shadow-sm sticky top-16 z-30">
      {/* 1. Платформа (Social Network) */}
      <div className="space-y-1">
        <span className="block text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider pl-1">
          Платформа
        </span>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-primary z-10">
            {networkId ? (
              <SocialIcon 
                slug={catalog.find(n => n.id === networkId)?.slug || ""} 
                size={16} 
                colored={true} 
              />
            ) : (
              <Globe className="w-4 h-4" />
            )}
          </div>
          <Select 
            value={networkId || ""} 
            onValueChange={(val) => {
              setNetworkId(val || "");
            }}
          >
            <SelectTrigger className="w-full h-12 pl-10 pr-10 rounded-xl border border-border bg-background text-sm font-semibold text-foreground relative flex items-center justify-between cursor-pointer focus:border-primary focus:ring-2 focus:ring-primary/20">
              <SelectValue placeholder="-- Выберите платформу --">
                {(value: string) => {
                  if (!value) return null;
                  return catalog.find(n => n.id === value)?.name ?? value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="w-full">
              {catalog.map((net) => (
                <SelectItem key={net.id} value={net.id} label={net.name} className="cursor-pointer py-2">
                  <span className="flex items-center gap-2">
                    <SocialIcon slug={net.slug} size={16} colored={true} />
                    <span>{net.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2. Категория услуг */}
      {networkId && sortedCategories.length > 0 && (
        <div className="space-y-1 animate-in fade-in duration-200">
          <span className="block text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider pl-1">
            Категория услуг
          </span>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-primary z-10">
              {categoryId ? (
                <CategoryIcon 
                  name={sortedCategories.find(c => c.id === categoryId)?.name || ""} 
                  size={16} 
                />
              ) : (
                <Layers className="w-4 h-4" />
              )}
            </div>
            <Select 
              value={categoryId || ""} 
              onValueChange={(val) => {
                setCategoryId(val || "");
              }}
            >
              <SelectTrigger className="w-full h-12 pl-10 pr-10 rounded-xl border border-border bg-background text-sm font-semibold text-foreground relative flex items-center justify-between cursor-pointer focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="-- Выберите категорию --">
                  {(value: string) => {
                    if (!value) return null;
                    const cat = sortedCategories.find(c => c.id === value);
                    return cat ? cleanCategoryName(cat.name) : value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-full">
                {sortedCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} label={cleanCategoryName(cat.name)} className="cursor-pointer py-2">
                    <span className="flex items-center gap-2">
                      <CategoryIcon name={cat.name} size={16} className="text-primary shrink-0" />
                      <span>{cleanCategoryName(cat.name)}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* 3. Услуга/Тариф */}
      {categoryId && (isLoading || services.length > 0) && (
        <div className="space-y-1 animate-in fade-in duration-200">
          <span className="block text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider pl-1">
            Тариф
          </span>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-primary z-10">
              <Zap className="w-4 h-4" />
            </div>
            <Select 
              disabled={isLoading}
              value={selectedService?.id || ""} 
              onValueChange={(val) => {
                const srv = services.find((s) => s.id === val);
                setSelectedService(srv || null);
              }}
            >
              <SelectTrigger className="w-full h-12 pl-10 pr-10 rounded-xl border border-border bg-background text-sm font-semibold text-foreground relative flex items-center justify-between cursor-pointer focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder={isLoading ? "Загрузка тарифов..." : "-- Выберите тариф --"}>
                  {(value: string) => {
                    if (!value) return null;
                    const srv = services.find(s => s.id === value);
                    return srv ? `${srv.name} — ${srv.pricePerUnitRub} ₽` : value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-full">
                {services.map((srv) => (
                  <SelectItem key={srv.id} value={srv.id} label={`${srv.name} — ${srv.pricePerUnitRub} ₽`} className="cursor-pointer py-2">
                    <span className="flex flex-col items-start gap-0.5 w-full">
                      <span className="font-bold text-foreground text-xs leading-none whitespace-normal pr-4">
                        {srv.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-2">
                        <span>{srv.pricePerUnitRub} ₽ / шт</span>
                        {srv.speed && <span>• {srv.speed}</span>}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Premium Service Loading Shimmer Skeleton */}
      {isLoading && (
        <div className="p-4 rounded-2xl border border-border/50 bg-content2 shadow-sm animate-pulse mt-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-3">
              {/* Title shimmer */}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted/40 shrink-0 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-muted/40 animate-pulse" />
              </div>
              
              {/* Badges shimmer */}
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-12 rounded bg-muted/30 animate-pulse" />
                <div className="h-3.5 w-16 rounded bg-muted/30 animate-pulse" />
              </div>
              
              {/* Description line shimmer */}
              <div className="h-3 w-5/6 rounded bg-muted/20 animate-pulse" />
            </div>
            
            {/* Price shimmer on the right */}
            <div className="text-right shrink-0 space-y-2">
              <div className="h-5 w-16 rounded bg-muted/40 ml-auto animate-pulse" />
              <div className="h-2.5 w-12 rounded bg-muted/30 ml-auto animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Premium Service Live Preview Card */}
      {!isLoading && selectedService && (
        <div className="p-4 rounded-2xl ring-2 ring-primary/80 bg-primary/[0.03] border border-primary/20 shadow-sm animate-in fade-in zoom-in-95 duration-200 mt-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span className="font-bold text-foreground text-sm leading-tight">
                  {selectedService.name}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedService.badge && (
                  <span className="text-[9px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                    {selectedService.badge}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 shrink-0">
                  <Clock className="w-3.5 h-3.5" /> {selectedService.speed}
                </span>
              </div>
              {selectedService.description && (
                <p className="text-[11px] text-muted-foreground/80 mt-2 leading-relaxed font-medium whitespace-pre-line">
                  {selectedService.description}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="font-black text-foreground tracking-tight tabular-nums font-mono text-base">
                {selectedService.pricePerUnitRub} ₽
              </div>
              <div className="text-[9px] font-extrabold text-muted-foreground tracking-wider uppercase">/ шт</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
