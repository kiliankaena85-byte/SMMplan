'use client';

import React from 'react';
import type { PublicService } from '@/actions/order/catalog';

interface BoostTierCardsProps {
  services: PublicService[];
  selectedServiceId: string;
  onSelectService: (service: PublicService) => void;
  isLoading?: boolean;
}

export const BoostTierCards: React.FC<BoostTierCardsProps> = ({
  services,
  selectedServiceId,
  onSelectService,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-20 rounded-xl bg-muted/40 animate-pulse border border-border/40" />
        ))}
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="w-full p-4 text-center rounded-xl bg-muted/20 border border-border/40 text-muted-foreground text-xs">
        Услуги в данной категории временно обновляются. Пожалуйста, выберите другую услугу.
      </div>
    );
  }

  const sortedServices = [...services].sort((a, b) => a.pricePerUnitRub - b.pricePerUnitRub);

  const getTierMeta = (index: number, total: number) => {
    if (total === 1) {
      return { 
        title: 'Оптимальный', 
        badge: 'Хит', 
        speed: 'Средняя скорость', 
        guarantee: 'Гарантия 30 дней' 
      };
    }
    if (index === 0) {
      return { 
        title: 'Эконом', 
        badge: 'Быстрый старт', 
        speed: 'Старт 5–15 мин', 
        guarantee: 'Базовое качество' 
      };
    }
    if (index === total - 1) {
      return { 
        title: 'Премиум', 
        badge: 'HQ Живые', 
        speed: 'Плавный рост', 
        guarantee: 'Без отписок · 100% гарантия' 
      };
    }
    return { 
      title: 'Стандарт', 
      badge: 'Выбор 80%', 
      speed: 'Оптимальная скорость', 
      guarantee: 'Авто-докрутка Refill' 
    };
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
      {sortedServices.map((service, idx) => {
        const isSelected = service.id === selectedServiceId;
        const meta = getTierMeta(idx, sortedServices.length);

        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelectService(service)}
            className={`
              relative flex flex-col p-3 rounded-xl cursor-pointer text-left
              transition-all duration-150 select-none border outline-none
              active:scale-[0.98]
              ${isSelected
                ? 'bg-primary/10 border-primary shadow-xs ring-2 ring-primary/30'
                : 'bg-background hover:bg-muted/40 border-border/80 hover:border-border'
              }
            `}
          >
            {/* Header: Title + Badge */}
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="font-bold text-sm text-foreground">
                {meta.title}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isSelected 
                  ? 'bg-primary text-primary-foreground font-bold' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {meta.badge}
              </span>
            </div>

            {/* Micro specs */}
            <div className="space-y-0.5 text-[11px] text-muted-foreground mb-2">
              <p className="truncate">⚡ {meta.speed}</p>
              <p className="truncate">🛡️ {meta.guarantee}</p>
            </div>

            {/* Price (Strictly per 1 pc) */}
            <div className="mt-auto pt-1.5 border-t border-border/40 flex items-baseline justify-between">
              <span className="text-[11px] text-muted-foreground">Тариф:</span>
              <span className="text-xs font-bold text-foreground">
                {service.pricePerUnitRub < 0.01 
                  ? service.pricePerUnitRub.toFixed(4) 
                  : service.pricePerUnitRub.toFixed(2)
                } ₽ / шт
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
