"use client";

import React from "react";
import { X, AlertTriangle, CheckCircle2 } from "lucide-react";

interface PlatformBreakdown {
  name: string;
  count: number;
  icon: string;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
  markup: number;
  platformBreakdown: PlatformBreakdown[];
  isPending: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  markup,
  platformBreakdown,
  isPending,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-[16px] shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Подтверждение импорта
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[8px] hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Summary */}
          <div className="bg-primary/5 rounded-[10px] px-4 py-3 border border-primary/10">
            <p className="text-sm font-semibold text-foreground">
              Импортировать{" "}
              <span className="text-primary font-bold">{selectedCount}</span>{" "}
              {selectedCount === 1
                ? "услугу"
                : selectedCount < 5
                ? "услуги"
                : "услуг"}
              ?
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Наценка: <span className="font-bold text-foreground">{markup}%</span>
            </p>
          </div>

          {/* Platform Breakdown */}
          {platformBreakdown.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Разбивка по платформам
              </p>
              <div className="space-y-1.5">
                {platformBreakdown.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-[8px]"
                  >
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <span>{item.icon}</span>
                      <span className="font-medium">{item.name}</span>
                    </span>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2.5 px-3 py-2.5 bg-warning/5 border border-warning/15 rounded-[8px]">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Дубликаты будут автоматически пропущены. Уже импортированные услуги
              не будут перезаписаны.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20 rounded-b-[16px]">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground bg-background border border-border rounded-[8px] hover:bg-muted transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-6 py-2.5 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/95 rounded-[8px] shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? (
              <>
                <span className="animate-spin">⏳</span> Импортирую...
              </>
            ) : (
              <>✅ Подтвердить импорт</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
