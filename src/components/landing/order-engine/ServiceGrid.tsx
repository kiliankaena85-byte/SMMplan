import React, { useMemo, useState } from "react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { Card } from "@/components/ui/card";
import { Check, CheckCircle2, ChevronDown } from "lucide-react";
import { getBrandColor } from "./BrandColors";
import { AnimatePresence, motion } from "framer-motion";

export function ServiceGrid({ engine }: { engine: OrderEngine }) {
  const { services, selectedService, setSelectedService, networkId, catalog } = engine;
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);

  const selectedNetworkObj = useMemo(() => {
    return catalog.find(n => n.id === networkId);
  }, [catalog, networkId]);

  const desktopGridContent = useMemo(() => {
    return services.map((srv) => {
      const isSelected = selectedService?.id === srv.id;
      const brand = getBrandColor(selectedNetworkObj?.slug);
      const isQuarantined = srv.cooldownUntil && new Date(srv.cooldownUntil) > new Date();

      return (
        <Card 
          key={srv.id}
          onClick={() => {
            if (isQuarantined) return;
            if (isSelected) {
              setSelectedService(null);
            } else {
              setSelectedService(srv);
            }
          }}
          className={`group w-full flex flex-col p-5 md:p-6 border-2 rounded-[2rem] relative overflow-visible transition-all duration-500 ease-out h-full ${
            isQuarantined ? 'cursor-not-allowed opacity-60 grayscale-[0.3] bg-content1' 
            : isSelected ? 'cursor-pointer border-transparent text-primary-foreground z-[50] bg-primary shadow-[0_20px_50px_-15px] shadow-primary/40' : 'cursor-pointer bg-content1 border-border/50 z-[1] hover:border-border hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:-translate-y-1 shadow-sm'
          }`}
        >
          <div className={`absolute inset-0 rounded-[2rem] opacity-0 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-white/20 to-transparent ${isSelected && !isQuarantined ? 'opacity-100' : 'group-hover:opacity-10'}`} />
          {srv.badge && !isQuarantined && (
            <div 
              className={`absolute -top-3 -right-2 z-20 px-2.5 py-1 rounded-md text-[10px] tracking-widest font-black uppercase transition-all duration-300 pointer-events-none flex items-center justify-center transform-gpu border-2 ${
                isSelected 
                  ? 'bg-content1 text-primary border-primary shadow-[0_8px_16px_-4px] shadow-primary/30' 
                  : 'bg-primary text-primary-foreground border-transparent shadow-sm'
              }`}
            >
              {srv.badge}
            </div>
          )}
          {isQuarantined && (
            <div className="absolute -top-3 -right-2 z-20 px-2.5 py-1 rounded-md text-[10px] tracking-widest font-black uppercase shadow-sm bg-rose-100 text-rose-700 border-2 border-rose-200">
              QUALITY CHECK
            </div>
          )}
          
          <div className="flex-1 flex flex-col pt-1 relative z-10">
             <h4 className={`font-extrabold text-[15px] transition-colors duration-300 leading-[22px] mb-4 min-h-[44px] break-words ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>{srv.name}</h4>
             <div className="flex-1 mb-5 flex flex-col">
               <p className={`text-[13px] font-medium leading-relaxed p-4 rounded-xl border transition-all duration-300 ${isSelected && !isQuarantined ? 'bg-content1/10 border-white/20 text-white/90 shadow-inner' : isQuarantined ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-default-100/60 border-border/60 text-muted-foreground'}`}>
                 <span className="line-clamp-6">
                   {isQuarantined 
                     ? `Временно приостановлено для контроля качества (до ${new Date(srv.cooldownUntil!).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}). Пожалуйста, выберите аналогичную рабочую услугу.` 
                     : (srv.description || (srv.name.toLowerCase().includes('без гарант') 
                     ? "Услуга без гарантии. В случае отписок или списаний восстановление (докрутка) не производится." 
                     : "Стандартные условия сервиса. Скорость и качество зависят от выбранного провайдера."))}
                 </span>
               </p>
             </div>
             <p className={`text-xs font-bold flex items-center transition-colors duration-300 justify-between mt-auto px-1 ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
               <span>Запуск: <span className={isSelected ? 'text-white' : 'text-foreground'}>{srv.speed}</span></span>
               <span>Мин: <span className={isSelected ? 'text-white' : 'text-foreground'}>{srv.minQty}</span></span>
             </p>
          </div>
          <div className={`mt-5 pt-4 flex justify-between items-end px-1 relative z-10 transition-colors duration-300 ${isSelected ? 'border-t border-white/20' : 'border-t border-border/50'}`}>
            <div>
              <p className={`text-[10px] uppercase font-black tracking-wider mb-1 transition-colors duration-300 ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>Цена за 1 шт.</p>
              <p className={`text-2xl font-black tabular-nums leading-none transition-colors duration-300 ${isSelected ? 'text-white' : 'text-foreground'}`}>
                  {parseFloat(((srv.pricePer1kRub / 1000) < 0.1 ? (srv.pricePer1kRub / 1000).toFixed(4) : (srv.pricePer1kRub / 1000).toFixed(2))).toString()} ₽
              </p>
            </div>
            <div className={`w-7 h-7 rounded-full border-[2.5px] flex items-center justify-center transition-all duration-300 ${
              isSelected ? 'border-white bg-content1 scale-110 shadow-md text-primary' : 'border-border bg-content2 text-slate-300 group-hover:border-primary/50 group-hover:text-primary'
            }`}>
              <Check className="w-4 h-4" strokeWidth={3} />
            </div>
          </div>
        </Card>
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
           if (selectedService?.id === srv.id) {
             setSelectedService(null);
          } else {
             setSelectedService(srv);
           }
           setIsServiceDropdownOpen(false);
        }}
        className={`cursor-pointer w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-3 relative overflow-hidden ${
           selectedService?.id === srv.id 
           ? 'bg-primary/5 border-primary/20' 
           : 'hover:bg-content2 border-transparent'
        } border`}
      >
        <div className="flex-1 flex flex-col pt-0.5">
          <div className="font-bold text-[13px] sm:text-sm leading-tight text-foreground line-clamp-3">
            <span className={`text-[9px] font-mono px-1 py-0.5 rounded mr-1.5 align-middle inline-block -mt-0.5 shrink-0 ${selectedService?.id === srv.id ? 'bg-primary/20 text-primary' : 'bg-default-100 text-muted-foreground'}`}>
               ID {srv.numericId}
            </span>
            {srv.name}
          </div>
          <div className="mt-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-3">
            <span>{((srv.pricePer1kRub / 1000) < 0.1 ? (srv.pricePer1kRub / 1000) : (srv.pricePer1kRub / 1000)).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ₽/шт</span>
            <span>Мин: {srv.minQty}</span>
          </div>
        </div>
        <div className="flex flex-col items-end justify-start gap-2 shrink-0 pt-0.5">
           {selectedService?.id === srv.id && (
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center mt-0.5">
                 <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
              </div>
           )}
        </div>
      </div>
   ));
  }, [services, selectedService, setSelectedService]);

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
