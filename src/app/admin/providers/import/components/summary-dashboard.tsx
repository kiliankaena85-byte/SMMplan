"use client";

import React from "react";
import { Package, Sparkles, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

interface SummaryDashboardProps {
  totalInCache: number;
  newServices: number;
  aiReady: number;
  needsAttention: number;
  alreadyImported: number;
  selectedCount: number;
  markup: string;
  onMarkupChange: (val: string) => void;
  onImport: () => void;
  onResync: () => void;
  importDisabled: boolean;
  syncing: boolean;
  importProgress: { current: number; total: number } | null;
  providerName: string;
}

export function SummaryDashboard({
  totalInCache,
  newServices,
  aiReady,
  needsAttention,
  alreadyImported,
  selectedCount,
  markup,
  onMarkupChange,
  onImport,
  onResync,
  importDisabled,
  syncing,
  importProgress,
  providerName,
}: SummaryDashboardProps) {
  const stats = [
    {
      label: "Всего в каталоге",
      value: totalInCache,
      icon: <Package className="w-4 h-4" />,
      color: "text-foreground",
      bg: "bg-muted/50",
    },
    {
      label: "Новых услуг",
      value: newServices,
      icon: <Sparkles className="w-4 h-4" />,
      color: "text-primary",
      bg: "bg-primary/5",
    },
    {
      label: "AI распределил",
      value: aiReady,
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: "text-success",
      bg: "bg-success/5",
    },
    {
      label: "Требуют внимания",
      value: needsAttention,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "text-warning",
      bg: "bg-warning/5",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-[12px] p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-5">
      {/* Provider Name + Resync */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{providerName}</h3>
            <p className="text-[11px] text-muted-foreground">
              {alreadyImported > 0 && `${alreadyImported} услуг уже импортировано`}
            </p>
          </div>
        </div>
        <button
          onClick={onResync}
          disabled={syncing}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-2 rounded-[8px] border border-border hover:bg-muted transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Синхронизация..." : "Обновить каталог"}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} rounded-[10px] px-4 py-3 border border-border/50`}
          >
            <div className={`flex items-center gap-1.5 ${stat.color} mb-1`}>
              {stat.icon}
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                {stat.label}
              </span>
            </div>
            <span className={`text-2xl font-bold ${stat.color} tabular-nums`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-end gap-4 pt-2 border-t border-border/50">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
            Наценка (%)
          </label>
          <input
            type="number"
            step="1"
            min="0"
            value={markup}
            onChange={(e) => onMarkupChange(e.target.value)}
            className="w-28 h-10 text-sm border-border border rounded-[8px] px-3 bg-background focus:ring-1 focus:ring-primary outline-none transition-all duration-200 tabular-nums"
          />
        </div>

        <button
          onClick={onImport}
          disabled={importDisabled}
          className="bg-primary hover:bg-primary/95 text-primary-foreground px-6 h-10 rounded-[8px] font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
        >
          {importProgress !== null ? (
            <>
              <span className="animate-spin text-sm">⏳</span>
              Импорт: {importProgress.current} / {importProgress.total}
            </>
          ) : (
            <>📥 Импортировать выбранные ({selectedCount})</>
          )}
        </button>
      </div>
    </div>
  );
}
