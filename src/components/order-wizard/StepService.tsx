import React from "react";
import { motion } from "framer-motion";
import { ArrowLeftIcon } from "lucide-react";
import { PublicCategory, PublicService } from "@/actions/order/catalog";
import { slideVariants } from "./animations";

interface StepServiceProps {
  direction: number;
  selectedCategory: PublicCategory;
  services: PublicService[];
  isLoadingServices: boolean;
  selectService: (srv: PublicService) => void;
  goBack: () => void;
}

export function StepService({ direction, selectedCategory, services, isLoadingServices, selectService, goBack }: StepServiceProps) {
  return (
    <motion.div
      key="step-service"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full max-w-2xl"
    >
      <motion.div 
        layoutId={`category-card-${selectedCategory.id}`}
        className="bg-card border shadow-sm rounded-2xl p-4 sm:p-5 md:p-6 w-full mx-auto"
      >
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <button
            onClick={goBack}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight line-clamp-1">{selectedCategory.name}</h2>
        </div>
        
        <div className="flex flex-col gap-3 sm:gap-4 max-h-[60vh] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
          {isLoadingServices ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-muted rounded-xl h-24 w-full"></div>
            ))
          ) : services.length === 0 ? (
            <div className="col-span-1 sm:col-span-2 text-center text-muted-foreground p-8">
              В этой категории пока нет услуг
            </div>
          ) : (
            services.map((service, index) => (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={service.id}
                onClick={() => selectService(service as PublicService)}
                className="p-4 sm:p-5 bg-card hover:bg-accent border hover:border-primary/50 rounded-xl cursor-pointer transition-all hover:shadow-md group flex flex-col text-left"
              >
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  {service.speed && (
                    <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                      {service.speed}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                    до {service.maxQty}
                  </span>
                  {(service as any).refill && (
                    <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Гарантия
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-bold group-hover:text-primary transition-colors mb-2 line-clamp-2">{service.name}</h3>
                <div className="mt-auto pt-2 border-t border-border/50 flex justify-between items-end w-full">
                  <div className="flex flex-col">
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Цена</span>
                    <span className="text-base sm:text-lg font-black text-foreground tabular-nums">₽{service.pricePerUnitRub.toFixed(2)}</span>
                  </div>
                </div>
              </motion.button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
