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
    <div className="bg-content2/60 border border-border/20 rounded-3xl p-4 pb-5 space-y-3.5">
      {/* Platform & Service Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-background rounded-2xl border border-border/40 shadow-sm shrink-0">
          <SocialIcon slug={networkSlug} size={28} colored />
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-[9px] font-black text-primary uppercase tracking-wider mb-1">
            {networkName}
          </span>
          <h4 className="text-sm font-extrabold text-foreground leading-normal break-words">
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded mr-1.5 bg-background border border-border/40 text-muted-foreground align-middle inline-block select-all">
              ID {selectedService.numericId}
            </span>
            {selectedService.name}
          </h4>

          {selectedService.description && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setIsDescExpanded(!isDescExpanded)}
                className="text-[10px] font-black text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{isDescExpanded ? "Скрыть описание" : "Подробнее о тарифе"}</span>
              </button>
              
              {isDescExpanded && (
                <div className="mt-2 text-xs font-bold text-muted-foreground bg-background/55 border border-border/20 rounded-2xl p-3.5 whitespace-pre-wrap leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                  {selectedService.description}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Target Link Info */}
      <div className="bg-background/80 border border-border/30 rounded-2xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link2 className="w-4 h-4 text-primary shrink-0" />
          <p 
            className="text-xs font-bold text-muted-foreground truncate"
            title={url || "Ссылка не указана"}
          >
            {url || "Ссылка не указана"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowLinkModal(true)}
          className="p-1.5 hover:bg-content2 text-muted-foreground hover:text-foreground rounded-lg transition-colors shrink-0 cursor-pointer"
          title="Изменить ссылку"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Limits & Details Badge Info */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-bold text-muted-foreground">
        {selectedService.speed && (
          <div className="px-2.5 py-1 bg-background border border-border/40 rounded-xl">
            Запуск: <span className="text-foreground">{selectedService.speed}</span>
          </div>
        )}
        <div className="px-2.5 py-1 bg-background border border-border/40 rounded-xl">
          Мин: <span className="text-foreground">{selectedService.minQty}</span>
        </div>
        {selectedService.maxQty && (
          <div className="px-2.5 py-1 bg-background border border-border/40 rounded-xl">
            Макс: <span className="text-foreground">{selectedService.maxQty.toLocaleString("ru-RU")}</span>
          </div>
        )}
      </div>

      {/* Warranty indicator */}
      {selectedService.name.toLowerCase().includes("без гарант") && (
        <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 text-danger text-[11px] font-bold rounded-2xl">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Тариф без гарантийного восстановления в случае списаний.</span>
        </div>
      )}
    </div>
  );
}
