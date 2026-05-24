"use client";

import React, { useState, useMemo } from "react";
import { PublicService } from "@/actions/order/catalog";
import { TariffCard } from "./TariffCard";
import { ArrowLeft, ArrowUpDown } from "lucide-react";

type SortMode = "price-asc" | "price-desc" | "speed";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "price-asc", label: "Дешевле" },
  { value: "price-desc", label: "Дороже" },
  { value: "speed", label: "Быстрее" },
];

interface TariffCatalogProps {
  services: PublicService[];
  selectedService: PublicService | null;
  categoryName: string;
  onSelect: (srv: PublicService) => void;
  onClose: () => void;
  isLoading: boolean;
}

export function TariffCatalog({
  services,
  selectedService,
  categoryName,
  onSelect,
  onClose,
  isLoading,
}: TariffCatalogProps) {
  const [sortMode, setSortMode] = useState<SortMode>("price-asc");

  const sortedServices = useMemo(() => {
    const list = [...services];
    switch (sortMode) {
      case "price-asc":
        return list.sort((a, b) => a.pricePer1kRub - b.pricePer1kRub);
      case "price-desc":
        return list.sort((a, b) => b.pricePer1kRub - a.pricePer1kRub);
      case "speed":
        return list.sort((a, b) => {
          const aFast = a.speed?.includes("Сразу") ? 0 : 1;
          const bFast = b.speed?.includes("Сразу") ? 0 : 1;
          return aFast - bFast;
        });
      default:
        return list;
    }
  }, [services, sortMode]);

  function handleSelect(srv: PublicService) {
    onSelect(srv);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-foreground text-base truncate">
            {categoryName}
          </h2>
          <p className="text-[11px] text-muted-foreground font-medium">
            {services.length} {services.length === 1 ? "тариф" : services.length < 5 ? "тарифа" : "тарифов"}
          </p>
        </div>
      </div>

      {/* Sort chips */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-border/30 shrink-0 overflow-x-auto">
        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSortMode(opt.value)}
            className={`
              text-xs font-bold px-3 py-1.5 rounded-full border whitespace-nowrap transition-all duration-200
              ${sortMode === opt.value
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground"
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          // Shimmer skeleton
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="w-full p-4 rounded-2xl border border-border/50 bg-card animate-pulse"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <div className="h-4 w-16 rounded bg-muted/40" />
                  </div>
                  <div className="h-4 w-3/4 rounded bg-muted/40" />
                  <div className="h-3 w-1/2 rounded bg-muted/30" />
                </div>
                <div className="text-right space-y-1">
                  <div className="h-6 w-14 rounded bg-muted/40" />
                  <div className="h-2.5 w-12 rounded bg-muted/30" />
                </div>
              </div>
            </div>
          ))
        ) : sortedServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 pt-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center">
              <ArrowUpDown className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              Нет доступных тарифов
            </p>
          </div>
        ) : (
          sortedServices.map((srv) => (
            <TariffCard
              key={srv.id}
              service={srv}
              isSelected={selectedService?.id === srv.id}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
