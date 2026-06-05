"use client";

import React from "react";
import { PublicService } from "@/actions/order/catalog";
import { CheckCircle2, Clock, Zap } from "lucide-react";

interface TariffCardProps {
  service: PublicService;
  isSelected: boolean;
  onSelect: (srv: PublicService) => void;
}

function getBadgeStyle(badge: string) {
  switch (badge) {
    case "ПРЕМИУМ":
      return "bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-700 border-amber-200/50";
    case "ЭКОНОМ":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-200/50";
    case "ЖИВЫЕ":
      return "bg-sky-500/10 text-sky-700 border-sky-200/50";
    case "ХИТ":
      return "bg-primary/10 text-primary border-primary/20";
    case "ГАРАНТИЯ":
      return "bg-violet-500/10 text-violet-700 border-violet-200/50";
    default:
      return "bg-muted text-muted-foreground border-border/50";
  }
}

export function TariffCard({ service, isSelected, onSelect }: TariffCardProps) {
  const isQuarantined = service.cooldownUntil && new Date(service.cooldownUntil) > new Date();

  return (
    <button
      type="button"
      onClick={() => !isQuarantined && onSelect(service)}
      disabled={!!isQuarantined}
      className={`
        w-full text-left p-4 rounded-2xl border transition-all duration-300
        ${isSelected
          ? "ring-2 ring-primary/80 border-primary/45 bg-primary/[0.03] shadow-[0_12px_25px_-5px_rgba(var(--primary-rgb),0.1)] md:-translate-y-0.5"
          : "border-border/50 bg-card hover:border-primary/40 md:hover:-translate-y-0.5 md:hover:shadow-[0_12px_25px_-8px_rgba(0,0,0,0.06)] dark:md:hover:shadow-[0_12px_25px_-8px_rgba(0,0,0,0.25)]"
        }
        ${isQuarantined ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.99]"}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Info */}
        <div className="flex-1 min-w-0">
          {/* Badge + selected indicator */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {isSelected && (
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            )}
            {service.badge && (
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getBadgeStyle(service.badge)}`}>
                {service.badge}
              </span>
            )}
          </div>

          {/* Name */}
          <h4 className="font-bold text-foreground text-sm leading-tight mb-1.5">
            {service.name}
          </h4>

          {/* Meta line */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {service.speed}
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              от {service.minQty} шт
            </span>
          </div>

          {/* Description (truncated on unselected, expanded on selected) */}
          {service.description && (
            <p className={`text-[11px] text-muted-foreground/70 mt-2 leading-relaxed whitespace-pre-line transition-all duration-300 ${
              isSelected ? "" : "line-clamp-2"
            }`}>
              {service.description}
            </p>
          )}
        </div>

        {/* Right: Price */}
        <div className="text-right shrink-0 pt-1">
          <div className="font-black text-foreground tabular-nums font-mono text-lg leading-none">
            {service.pricePerUnitRub} ₽
          </div>
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
            / шт
          </div>
        </div>
      </div>

      {/* Quarantine warning */}
      {isQuarantined && (
        <div className="mt-2 text-[10px] font-semibold text-warning bg-warning/10 rounded-lg px-2 py-1">
          ⏳ Временно недоступен
        </div>
      )}
    </button>
  );
}
