import React, { useMemo, useState } from "react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { Card } from "@/components/ui/card";
import { Check, CheckCircle2, ChevronDown } from "lucide-react";
import { getBrandColor } from "./BrandColors";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

export function ServiceGrid({ engine }: { engine: OrderEngine }) {
  const { services, selectedService, setSelectedService, networkId, catalog, isLoading } = engine;
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);

  const selectedNetworkObj = useMemo(() => {
    return catalog.find(n => n.id === networkId);
  }, [catalog, networkId]);

  const desktopGridContent = useMemo(() => {
    return services.map((srv, i) => {
      const isSelected = selectedService?.id === srv.id;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const brand = getBrandColor(selectedNetworkObj?.slug);
      const isQuarantined = srv.cooldownUntil && new Date(srv.cooldownUntil) > new Date();

      const descriptionText = isQuarantined 
        ? "Услуга временно приостановлена. Пожалуйста, выберите аналогичную услугу из списка."
        : srv.description 
          ? srv.description
          : srv.name.toLowerCase().includes('без гарант')
            ? "Услуга без гарантии. В случае отписок восстановление не производится."
            : "Стандартные условия сервиса. Скорость зависит от текущей нагрузки провайдера.";

      return (
        <motion.div
          key={srv.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
          className="h-full"
        >
          <Card 
            onClick={() => {
              if (isQuarantined) return;
              setSelectedService(isSelected ? null : srv);
            }}
            className={`group w-full flex flex-col p-4 sm:p-5 border-2 rounded-[2rem] relative overflow-visible transition-all duration-300 ease-out h-full ${
              isQuarantined ? 'cursor-not-allowed opacity-75 grayscale-[0.5] bg-content2 border-transparent' 
              : isSelected ? 'cursor-pointer border-transparent text-primary-foreground z-[50] bg-primary shadow-[0_20px_40px_-10px_var(--tw-shadow-color)] shadow-primary/30 scale-[1.02]' 
              : 'cursor-pointer bg-content1 border-border/40 z-[1] hover:border-border hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1'
            }`}
          >
            <div className={`absolute inset-0 rounded-[2rem] opacity-0 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-white/20 to-transparent ${isSelected && !isQuarantined ? 'opacity-100' : 'group-hover:opacity-10'}`} />
          
          {srv.badge && !isQuarantined && (
            <div 
              className={`absolute -top-3 -right-2 z-20 px-3 py-1 rounded-full text-[10px] tracking-widest font-black uppercase transition-all duration-300 pointer-events-none flex items-center justify-center transform-gpu border-2 ${
                isSelected 
                  ? 'bg-content1 text-primary border-primary shadow-lg shadow-primary/30' 
                  : 'bg-primary text-primary-foreground border-transparent shadow-md'
              }`}
            >
              {srv.badge}
            </div>
          )}
          {isQuarantined && (
            <div className="absolute -top-3 -right-2 z-20 px-3 py-1 rounded-full text-[10px] tracking-widest font-black uppercase shadow-sm bg-danger text-danger-foreground border-2 border-danger-200">
              КАРАНТИН
            </div>
          )}
          
          <div className="flex-1 flex flex-col pt-2 relative z-10">
             <h4 className={`font-extrabold text-base transition-colors duration-300 leading-snug mb-4 min-h-[44px] break-words flex items-center flex-wrap gap-2 ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
               <span 
                 onClick={(e) => {
                   e.stopPropagation();
                   navigator.clipboard.writeText(srv.numericId.toString());
                   toast.success(`ID услуги ${srv.numericId} скопирован в буфер обмена!`);
                 }}
                 className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded cursor-pointer hover:scale-105 active:scale-95 transition-all select-all flex items-center gap-1 ${
                   isSelected ? 'bg-primary-foreground/25 text-primary-foreground' : 'bg-muted text-muted-foreground border border-border/40'
                 }`}
                 title="Кликните, чтобы скопировать ID"
               >
                 ID {srv.numericId}
               </span>
               <span>{srv.name}</span>
             </h4>
             <div className="flex-1 mb-6 flex flex-col">
                <p className={`text-sm font-medium leading-relaxed p-4 rounded-2xl border transition-all duration-300 text-pretty ${
                  isSelected && !isQuarantined ? 'bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground/90 shadow-inner' 
                  : isQuarantined ? 'bg-danger/10 border-danger/20 text-danger' 
                  : 'bg-content2/50 border-border/50 text-muted-foreground'
                }`}>
                  <span className="line-clamp-6 whitespace-pre-line">
                    {descriptionText}
                  </span>
                </p>
             </div>
             <p className={`text-xs font-bold flex items-center transition-colors duration-300 justify-between mt-auto px-1 ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground/80'}`}>
               <span>Запуск: <span className={isSelected ? 'text-primary-foreground' : 'text-foreground'}>{srv.speed}</span></span>
               <span>Мин: <span className={isSelected ? 'text-primary-foreground' : 'text-foreground'}>{srv.minQty}</span></span>
             </p>
          </div>
          
          <div className={`mt-6 pt-5 flex justify-between items-end px-1 relative z-10 transition-colors duration-300 ${isSelected ? 'border-t border-primary-foreground/20' : 'border-t border-border/40'}`}>
            <div>
              <p className={`text-[10px] uppercase font-black tracking-wider mb-1.5 transition-colors duration-300 ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>Цена за 1 шт.</p>
              <p className={`text-3xl font-black tabular-nums leading-none transition-colors duration-300 ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {srv.pricePerUnitRub} ₽
              </p>
            </div>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
              isSelected ? 'border-primary-foreground bg-primary-foreground text-primary shadow-sm scale-110' : 'border-border/60 bg-transparent text-transparent group-hover:border-border'
            }`}>
              <Check className="w-4 h-4" strokeWidth={isSelected ? 4 : 3} />
            </div>
          </div>
          </Card>
        </motion.div>
      );
    });
  }, [services, selectedService, selectedNetworkObj, setSelectedService]);

  const mobileDropdownContent = useMemo(() => {
    return services.map((srv) => (
      <div
        key={`dd-${srv.id}`}
        role="button"
        tabIndex={0}
        onClick={() => {
           setSelectedService(selectedService?.id === srv.id ? null : srv);
           setIsServiceDropdownOpen(false);
        }}
        className={`cursor-pointer w-full text-left p-4 rounded-2xl transition-all flex items-start justify-between gap-4 relative overflow-hidden border-2 ${
           selectedService?.id === srv.id 
           ? 'bg-primary/5 border-primary/30 shadow-md' 
           : 'hover:bg-content2 border-transparent hover:border-border/50'
        }`}
      >
        <div className="flex-1 flex flex-col">
          <div className="font-bold text-[13px] sm:text-sm leading-tight text-foreground line-clamp-3">
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded mr-2 align-middle inline-block -mt-0.5 shrink-0 ${selectedService?.id === srv.id ? 'bg-primary text-primary-foreground' : 'bg-default-100 text-muted-foreground'}`}>
               ID {srv.numericId}
            </span>
            {srv.name}
          </div>
          <div className="mt-2 text-xs font-semibold text-muted-foreground flex items-center gap-3">
            <span className={selectedService?.id === srv.id ? 'text-primary' : ''}>
              {srv.pricePerUnitRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽/шт
            </span>
            <span className="opacity-70">Мин: {srv.minQty}</span>
          </div>
        </div>
        <div className="flex flex-col items-end justify-start shrink-0 pt-0.5">
           {selectedService?.id === srv.id && (
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
                 <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
              </div>
           )}
        </div>
      </div>
    ));
  }, [services, selectedService, setSelectedService]);

  if (isLoading) {
    return (
      <>
        {/* Mobile Dropdown Skeleton */}
        <div className="sm:hidden mb-4 animate-pulse">
          <div className="w-full h-[88px] bg-content1 border-2 border-border/30 rounded-2xl flex items-center justify-between p-4">
            <div className="flex flex-col gap-2 pr-4 flex-1">
              <div className="h-3 w-20 bg-content2 rounded animate-pulse" />
              <div className="h-5 w-3/4 bg-content2 rounded animate-pulse" />
            </div>
            <div className="w-8 h-8 rounded-full bg-content2 shrink-0 animate-pulse" />
          </div>
        </div>

        {/* Desktop Grid Skeleton */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div 
              key={i} 
              className="w-full flex flex-col p-6 border-2 border-border/30 rounded-3xl bg-content1 h-[320px] justify-between animate-pulse"
            >
              <div className="flex-1 flex flex-col pt-2 gap-4">
                {/* Title skeleton */}
                <div className="space-y-2">
                  <div className="h-5 w-5/6 bg-content2 rounded-xl" />
                  <div className="h-5 w-1/2 bg-content2 rounded-xl" />
                </div>
                {/* Description card skeleton */}
                <div className="h-28 w-full bg-content2/50 border border-border/30 rounded-2xl" />
                {/* Meta line skeleton */}
                <div className="flex justify-between items-center px-1">
                  <div className="h-3.5 w-1/3 bg-content2 rounded" />
                  <div className="h-3.5 w-1/4 bg-content2 rounded" />
                </div>
              </div>
              
              {/* Footer price skeleton */}
              <div className="mt-6 pt-5 border-t border-border/30 flex justify-between items-end px-1">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-content2 rounded" />
                  <div className="h-8 w-24 bg-content2 rounded-xl" />
                </div>
                <div className="w-8 h-8 rounded-full bg-content2 shrink-0 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile Dropdown */}
      <div className="relative z-[60] sm:hidden mb-4">
        <button
          onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
          className="w-full flex items-center justify-between p-4 bg-content1 border-2 border-border/50 rounded-2xl shadow-sm hover:border-primary/50 transition-all text-left group min-h-[88px]"
        >
          <div className="flex flex-col gap-1.5 pr-4 flex-1">
             <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Тарифный план</span>
             {selectedService ? (
                 <h4 className="font-extrabold text-foreground text-[15px] sm:text-lg leading-tight transition-colors line-clamp-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded mr-1.5 bg-default-100 text-muted-foreground align-middle inline-block -mt-0.5 shrink-0">
                       ID {selectedService.numericId}
                    </span>
                    {selectedService.name}
                 </h4>
             ) : (
                 <h4 className="font-extrabold text-muted-foreground text-[15px] sm:text-lg">Выберите услугу из списка...</h4>
             )}
          </div>
          <div className={`w-8 h-8 rounded-full bg-content2 flex items-center justify-center shrink-0 transition-transform duration-300 ${isServiceDropdownOpen ? 'rotate-180 bg-primary/10' : ''}`}>
             <ChevronDown className={`w-5 h-5 transition-colors ${isServiceDropdownOpen ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
          </div>
        </button>

        <AnimatePresence>
          {isServiceDropdownOpen && (
            <>
              <div className="fixed inset-0 z-[40]" onClick={() => setIsServiceDropdownOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.15 } }}
                className="absolute top-[calc(100%+8px)] left-0 w-full bg-content1 border border-border rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] max-h-[400px] overflow-y-auto z-[50] p-2 flex flex-col gap-1 scrollbar-thin overflow-x-hidden"
              >
                {mobileDropdownContent}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop Grid */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {desktopGridContent}
      </div>
    </>
  );
}
