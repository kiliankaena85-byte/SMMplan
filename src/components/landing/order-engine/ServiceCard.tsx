"use client";

import { memo } from "react";
import { PublicService } from "@/actions/order/catalog";
import { getBrandColor } from "@/lib/constants/brandColors";
import { trackEvent } from "@/lib/analytics";

interface ServiceCardProps {
  service: PublicService;
  isSelected: boolean;
  onSelect: (id: string) => void;
  platformId: string;
}

export const ServiceCard = memo(function ServiceCard({
  service,
  isSelected,
  onSelect,
  platformId,
}: ServiceCardProps) {
  const brand = getBrandColor(platformId);
  
  return (
    <button
      onClick={() => {
        onSelect(service.id);
        trackEvent("service_selected", { serviceId: service.id, price: service.pricePer1kRub });
      }}
      className={`
        relative w-full p-4 md:p-6 rounded-3xl border text-left transition-all duration-300
        ${isSelected 
          ? `bg-gradient-to-br ${brand.gradient} shadow-lg border-transparent text-primary-foreground md:-translate-y-1` 
          : "bg-content1 border-border/50 md:hover:border-primary/30 active:bg-content2 md:hover:-translate-y-1"
        }
        min-h-[120px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
      `}
      style={isSelected ? { boxShadow: `0 10px 25px -5px ${brand.shadow}` } : undefined}
    >
      <div className="font-semibold text-sm md:text-base pr-8 leading-tight line-clamp-3 break-words">
        {service.name}
      </div>
      <div className={`mt-3 text-lg font-bold tabular-nums flex items-baseline gap-1 ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
        {service.pricePer1kRub}₽ 
        <span className={`text-xs font-normal ${isSelected ? "opacity-90" : "text-muted-foreground"}`}>/ 1000 шт.</span>
      </div>
      
      {/* Badges */}
      {service.badge && (
        <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
          {service.badge}
        </span>
      )}
      
      {/* Constraints like min/max or slots can go here */}
      <div className={`absolute bottom-4 right-4 text-[10px] ${isSelected ? "opacity-90" : "text-muted-foreground"}`}>
        min {service.minQty}
      </div>
    </button>
  );
});
