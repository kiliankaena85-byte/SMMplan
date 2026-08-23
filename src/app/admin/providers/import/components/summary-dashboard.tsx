'use client';

import React from "react";
import { Package, Sparkles, AlertTriangle, CheckCircle2, RefreshCw, ChevronDown, Layers, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProviderItem } from "../types";

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
  providers: ProviderItem[];
  selectedProviderId: string;
  onProviderChange: (providerId: string) => void;
  targetTenant: 'smmplan' | 'flux' | 'both';
  onTargetTenantChange: (tenant: 'smmplan' | 'flux' | 'both') => void;
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
  providers,
  selectedProviderId,
  onProviderChange,
  targetTenant,
  onTargetTenantChange,
}: SummaryDashboardProps) {
  const currentProvider = providers.find(p => p.id === selectedProviderId) || providers[0];
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
    <div className="relative overflow-hidden bg-card/60 backdrop-blur-md border border-border/50 rounded-[24px] p-6 shadow-sm space-y-6 ring-1 ring-border/5">
      {/* Premium Backdrop Pattern */}
      <div className="absolute inset-0 z-0 opacity-70 premium-dot-grid pointer-events-none" />

      {/* Provider Selector + Resync */}
      <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          
          {/* Provider Select Dropdown */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
              Источник услуг (Провайдер API)
            </label>
            <div className="flex items-center gap-2">
              <Select value={selectedProviderId} onValueChange={(val) => val && onProviderChange(val)}>
                <SelectTrigger className="w-[260px] sm:w-[320px] h-9 text-xs font-bold bg-background/90 border-border/80 shadow-xs">
                  <SelectValue placeholder="Выберите провайдера..." />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs font-medium py-2">
                      <div className="flex items-center justify-between w-full gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              p.isActive ? 'bg-success animate-pulse' : 'bg-muted-foreground/40'
                            }`}
                          />
                          <span className="font-bold text-foreground truncate max-w-[170px]">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-muted-foreground">
                          {p.balanceCurrency && (
                            <span className="bg-muted px-1.5 py-0.5 rounded text-[9px] font-bold">{p.balanceCurrency}</span>
                          )}
                          <span>{p.serviceCount ?? 0} услуг</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {alreadyImported > 0 && (
                <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-1.5 rounded-xl border border-border/40 whitespace-nowrap">
                  Импортировано: <b className="text-foreground">{alreadyImported}</b>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            intent="outline"
            size="sm"
            onClick={onResync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-semibold h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Синхронизация..." : "Обновить каталог API"}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} rounded-[10px] px-4 py-3 border border-border/50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200`}
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
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-4 pt-3 border-t border-border/50">
        <div className="flex flex-wrap items-end gap-3">
          {/* Target Tenant Selector */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
              Целевой сайт (Бренд)
            </label>
            <Select value={targetTenant} onValueChange={(val) => val && onTargetTenantChange(val as 'smmplan' | 'flux' | 'both')}>
              <SelectTrigger className="w-[200px] h-10 text-xs font-bold bg-background">
                <SelectValue placeholder="Выберите бренд..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="smmplan" className="text-xs font-semibold">
                  🟦 SMMplan (smmplan.pro)
                </SelectItem>
                <SelectItem value="flux" className="text-xs font-semibold">
                  🟣 SMMflux (smmflux.ru)
                </SelectItem>
                <SelectItem value="both" className="text-xs font-semibold">
                  🌐 Оба бренда (SMMplan + SMMflux)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Markup */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
              Наценка (%)
            </label>
            <Input
              type="number"
              step="1"
              min="0"
              value={markup}
              onChange={(e) => onMarkupChange(e.target.value)}
              className="w-28 h-10 text-sm font-bold tabular-nums bg-background"
            />
          </div>
        </div>

        <Button
          intent="primary"
          onClick={onImport}
          disabled={importDisabled}
          className="h-10 px-6 font-bold text-sm shadow-sm"
        >
          {importProgress !== null ? (
            <>
              <span className="animate-spin text-sm">⏳</span>
              Импорт: {importProgress.current} / {importProgress.total}
            </>
          ) : (
            <>📥 Импортировать выбранные ({selectedCount})</>
          )}
        </Button>
      </div>

      {/* Visual Progress Bar during import */}
      {importProgress !== null && (
        <div className="space-y-1.5 pt-2 border-t border-border/40 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-semibold text-primary">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Пакетный импорт в базу данных... ({importProgress.current} из {importProgress.total})
            </span>
            <span className="font-mono text-xs">{Math.min(100, Math.round((importProgress.current / Math.max(importProgress.total, 1)) * 100))}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, Math.round((importProgress.current / Math.max(importProgress.total, 1)) * 100))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
