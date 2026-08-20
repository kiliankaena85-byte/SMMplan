"use client";

import React from "react";
import { Link2, Edit3, ShieldAlert } from "lucide-react";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { OrderEngine } from "@/hooks/useOrderEngine";

interface DrawerOrderSummaryProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedService: any;
  url: string;
  setShowLinkModal: (show: boolean) => void;
  engine?: OrderEngine;
}

export function DrawerOrderSummary({
  selectedService,
  url,
  setShowLinkModal,
  engine
}: DrawerOrderSummaryProps) {
  const [isDescExpanded, setIsDescExpanded] = React.useState(false);

  const selectedNetworkObj = React.useMemo(() => {
    if (!engine) return null;
    return engine.catalog.find(n => n.id === engine.networkId);
  }, [engine]);

  const networkSlug = selectedNetworkObj?.slug || "other";
  const networkName = selectedNetworkObj?.name || "Платформа";

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
      {/* Platform & Service Header */}
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 bg-background rounded-xl border border-border/80 shadow-xs shrink-0 flex items-center justify-center">
          <SocialIcon slug={networkSlug} size={32} colored />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-xs font-black text-primary uppercase tracking-wider">
              {networkName}
            </span>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-background border border-border/80 text-foreground/80">
              #{selectedService.numericId}
            </span>
          </div>
          <h4 className="text-base font-black text-foreground leading-snug break-words">
            {selectedService.name}
          </h4>

          {selectedService.description && (
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => setIsDescExpanded(!isDescExpanded)}
                className="text-xs font-black text-primary hover:text-primary/80 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>{isDescExpanded ? "Скрыть описание" : "Подробнее о тарифе"}</span>
              </button>
              
              {isDescExpanded && (
                <div className="mt-2 text-xs font-medium text-foreground/90 bg-background border border-border/80 rounded-xl p-3.5 whitespace-pre-wrap leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                  {selectedService.description}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Target Link Info */}
      <div className="bg-background border border-border/80 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link2 className="w-4.5 h-4.5 text-primary shrink-0" />
          <p 
            className="text-xs sm:text-sm font-bold text-foreground truncate"
            title={url || "Ссылка не указана"}
          >
            {url || <span className="text-muted-foreground font-medium">Ссылка не указана</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowLinkModal(true)}
          className="p-2 hover:bg-content2 text-primary hover:text-primary/80 rounded-lg transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-bold"
          title="Изменить ссылку"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Изменить</span>
        </button>
      </div>

      {/* Limits & Details Badge Info */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs font-bold text-foreground">
        {selectedService.speed && (
          <div className="px-3 py-1.5 bg-background border border-border/80 rounded-xl shadow-2xs">
            Запуск: <span className="text-primary font-black ml-1">{selectedService.speed}</span>
          </div>
        )}
        <div className="px-3 py-1.5 bg-background border border-border/80 rounded-xl shadow-2xs">
          Мин: <span className="font-black text-foreground ml-1">{selectedService.minQty}</span>
        </div>
        {selectedService.maxQty && (
          <div className="px-3 py-1.5 bg-background border border-border/80 rounded-xl shadow-2xs">
            Макс: <span className="font-black text-foreground ml-1">{selectedService.maxQty.toLocaleString("ru-RU")}</span>
          </div>
        )}
      </div>

      {/* Warranty indicator */}
      {selectedService.name.toLowerCase().includes("без гарант") && (
        <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 text-danger text-xs font-bold rounded-xl">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Тариф без гарантийного восстановления в случае списаний.</span>
        </div>
      )}
    </div>
  );
}
