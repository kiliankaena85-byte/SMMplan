"use client";

import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ServicesTableProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  services: any[];
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  toggleAll: () => void;
  loading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFilters: (f: any) => void;
  pagination: { page: number; totalPages: number; total: number; pageSize: number };
  markup?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: any[];
  selectedCategories: Record<string, string>;
  onCategoryChange: (serviceId: string, categoryId: string) => void;
  autoMappedCategories: Record<string, string>;
  aiConfidence?: Record<string, boolean>;
  showCategoryColumn?: boolean;
  validationErrors?: Set<string>;
}

const platformMap: Record<string, { name: string; color: string; icon: string }> = {
  INSTAGRAM: { name: "Instagram", color: "bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/30", icon: "📸" },
  IN: { name: "Instagram", color: "bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/30", icon: "📸" },
  TELEGRAM: { name: "Telegram", color: "bg-[#e8f4fd] text-[#2481cc] border-[#d4ebfc] dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/30", icon: "✈️" },
  TG: { name: "Telegram", color: "bg-[#e8f4fd] text-[#2481cc] border-[#d4ebfc] dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/30", icon: "✈️" },
  VK: { name: "ВКонтакте", color: "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30", icon: "💙" },
  YOUTUBE: { name: "YouTube", color: "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30", icon: "▶️" },
  YT: { name: "YouTube", color: "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30", icon: "▶️" },
  TIKTOK: { name: "TikTok", color: "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800/30 dark:text-zinc-400 dark:border-zinc-700/30", icon: "🎵" },
  TT: { name: "TikTok", color: "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800/30 dark:text-zinc-400 dark:border-zinc-700/30", icon: "🎵" },
  TWITTER: { name: "Twitter (X)", color: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/30", icon: "𝕏" },
  X: { name: "Twitter (X)", color: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/30", icon: "𝕏" },
};

const getPlatformDisplay = (code: string) => {
  const map = platformMap[code.toUpperCase()];
  if (map) return map;
  return { name: code, color: "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/20 dark:text-slate-400 dark:border-slate-700/30", icon: "🌐" };
};

export function ServicesTable({
  services,
  selectedIds,
  toggleSelection,
  toggleAll,
  loading,
  filters,
  setFilters,
  pagination,
  markup = 0,
  categories = [],
  selectedCategories = {},
  onCategoryChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  autoMappedCategories = {},
  aiConfidence = {},
  showCategoryColumn = false,
  validationErrors = new Set<string>(),
}: ServicesTableProps) {
  const handleSort = (field: string) => {
    let newSort = "none";
    if (filters.sortBy !== `${field}_asc` && filters.sortBy !== `${field}_desc`) {
      newSort = `${field}_asc`;
    } else if (filters.sortBy === `${field}_asc`) {
      newSort = `${field}_desc`;
    }
    setFilters({ ...filters, sortBy: newSort, page: 1 });
  };

  const getSortIcon = (field: string) => {
    if (filters.sortBy === `${field}_asc`) return <ArrowUp className="w-3.5 h-3.5 text-primary animate-in fade-in zoom-in-75 duration-200" />;
    if (filters.sortBy === `${field}_desc`) return <ArrowDown className="w-3.5 h-3.5 text-primary animate-in fade-in zoom-in-75 duration-200" />;
    return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/80 transition-colors" />;
  };

  const importableServices = services.filter((s) => !s.alreadyImported && (s.pricePerUnitProcurementRub || 0) > 0);
  const importableIds = importableServices.map((s) => String(s.service));
  const isAllPageSelected = importableIds.length > 0 && importableIds.every((id) => selectedIds.has(id));
  const isCheckboxDisabled = importableIds.length === 0;

  // Dynamic column count
  // Dynamic grid template columns based on category column visibility
  // On mobile: 1 column. On desktop: 4 or 5 columns
  const gridTemplate = showCategoryColumn 
    ? "grid-cols-[40px_minmax(0,1.5fr)_minmax(0,1.5fr)_150px_200px_80px]" 
    : "grid-cols-[40px_minmax(0,1.5fr)_minmax(0,1.5fr)_150px_80px]";

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-card border border-border/60 ring-1 ring-border/5 rounded-xl shadow-sm overflow-hidden">
      <div className="flex-1 w-full overflow-hidden">
        {/* Desktop Header */}
        <div className={`hidden lg:grid ${gridTemplate} gap-4 bg-muted/30 border-b border-border/60 sticky top-0 z-10 select-none items-center backdrop-blur-sm`}>
          <div className="px-4 py-3 pl-6">
            <input
              type="checkbox"
              onChange={toggleAll}
              checked={isAllPageSelected}
              disabled={isCheckboxDisabled}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            />
          </div>
          <div
            className="py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-foreground transition-all duration-200"
            onClick={() => handleSort("name")}
          >
            <div className="flex items-center gap-1.5">
              <span>Услуга</span>
              {getSortIcon("name")}
            </div>
          </div>
          <div
            className="py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-foreground transition-all duration-200"
            onClick={() => handleSort("platform")}
          >
            <div className="flex items-center gap-1.5">
              <span>Платформа и теги</span>
              {getSortIcon("platform")}
            </div>
          </div>
          <div
            className="py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-foreground transition-all duration-200"
            onClick={() => handleSort("price")}
          >
            <div className="flex items-center gap-1.5">
              <span>Стоимость</span>
              {getSortIcon("price")}
            </div>
          </div>
          {showCategoryColumn && (
            <div className="py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Категория
            </div>
          )}
          <div className="py-3 pr-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Статус
          </div>
        </div>
        
        {/* Mobile Select All */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              onChange={toggleAll}
              checked={isAllPageSelected}
              disabled={isCheckboxDisabled}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <span className="text-sm font-semibold text-foreground">Выбрать все на странице</span>
          </label>
        </div>

        <div className="bg-card flex flex-col divide-y divide-border">
            {loading ? (
              <div className="p-16 text-center text-sm text-muted-foreground">
                <div className="flex justify-center items-center gap-2">
                  <span className="animate-spin text-xl">⏳</span> Загрузка каталога...
                </div>
              </div>
            ) : services.length === 0 ? (
              <div className="p-16 text-center text-sm text-muted-foreground">
                Услуги по заданным критериям не найдены.
              </div>
            ) : (
              services.map((s) => {
                const metrics = s.metrics || {};
                const hasAnomaly = metrics.anomalyScore > 0;
                const pricePerUnitProcurement = s.pricePerUnitProcurementRub || 0;
                const pricePerUnitRetail = pricePerUnitProcurement * (1 + markup / 100);
                const isFreeProcurement = pricePerUnitProcurement <= 0;
                const isDisabled = s.alreadyImported || isFreeProcurement;
                const isSelected = selectedIds.has(String(s.service));

                const handleRowClick = (e: React.MouseEvent) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("button") || target.closest("select") || target.closest("a") || target.closest('[role="combobox"]') || target.closest("input")) return;
                  if (!isDisabled) toggleSelection(String(s.service));
                };

                return (
                  <div
                    key={s.service}
                    onClick={handleRowClick}
                    className={`transition-colors duration-200 cursor-pointer p-4 lg:p-0 border-b border-border/40 last:border-0 ${
                      s.alreadyImported
                        ? "bg-slate-50/60 dark:bg-slate-900/40 opacity-75 cursor-not-allowed"
                        : isFreeProcurement
                        ? "bg-destructive/5 hover:bg-destructive/10"
                        : isSelected
                        ? "bg-primary/5 hover:bg-primary/10"
                        : "hover:bg-muted/30 even:bg-muted/10"
                    }`}
                  >
                    {/* Desktop Layout */}
                    <div className={`hidden lg:grid ${gridTemplate} gap-4 items-center min-h-[72px]`}>
                      <div className="px-4 pl-6">
                        <input
                          type="checkbox"
                          disabled={isDisabled}
                          checked={isSelected}
                          onChange={() => toggleSelection(String(s.service))}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="flex flex-col gap-0.5 py-3 pr-2 min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate block w-full" title={s.cleanName || s.name}>
                          {s.cleanName || s.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium truncate block w-full" title={`#${s.service} • ${s.name}`}>
                          #{s.service} • {s.name}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 py-3 pr-2">
                        {metrics.platform && (() => {
                          const pData = getPlatformDisplay(metrics.platform);
                          return (
                            <span className={`${pData.color} px-2 py-0.5 rounded-[6px] text-[10px] font-semibold border flex items-center gap-1 select-none whitespace-nowrap`}>
                              <span>{pData.icon}</span>
                              <span>{pData.name}</span>
                            </span>
                          );
                        })()}
                        {metrics.geo && (
                          <span className="bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-[6px] text-[10px] font-semibold select-none whitespace-nowrap">
                            {metrics.geo}
                          </span>
                        )}
                        {(s.refill || metrics.warranty > 0) && (
                          <span className="bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-[6px] text-[10px] font-semibold select-none whitespace-nowrap" title="Гарантия">
                            ♻️ {metrics.warranty || 30}D
                          </span>
                        )}
                        {hasAnomaly && (
                          <span className="bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold select-none whitespace-nowrap" title={`Anomaly: ${metrics.anomalyScore}`}>
                            ⚠️ {metrics.anomalyScore}
                          </span>
                        )}
                        {parseInt(s.min, 10) > 0 && (
                          <span className="bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-[6px] text-[10px] font-semibold select-none whitespace-nowrap" title="Минимальный заказ">
                            от {s.min} шт
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-0.5 py-3 pr-2 font-mono min-w-0">
                        <span className="text-foreground font-bold text-xs truncate block w-full tabular-nums tracking-tight">
                          {new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(pricePerUnitRetail)} ₽
                          <span className="text-[10px] text-muted-foreground font-sans ml-1 font-medium select-none tracking-normal">розн.</span>
                        </span>
                        <span className="text-muted-foreground font-medium text-[10px] truncate block w-full tabular-nums tracking-tight">
                          {new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(pricePerUnitProcurement)} ₽
                          <span className="font-sans ml-0.5 select-none tracking-normal">закуп.</span>
                        </span>
                        {isFreeProcurement && (
                          <span className="text-[10px] text-destructive font-bold bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 rounded-[4px] w-fit mt-1">
                            ОШИБКА: 0 ₽
                          </span>
                        )}
                      </div>

                      {showCategoryColumn && (
                        <div className="py-3 pr-2 min-w-0">
                          {s.alreadyImported ? (
                            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 select-none bg-slate-100 dark:bg-slate-800/50 px-2 py-1.5 rounded-[8px] border border-border w-fit max-w-full truncate">
                              📦 Импортировано
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1 w-full min-w-0">
                              <Select
                                value={selectedCategories[String(s.service)] || ""}
                                onValueChange={(val) => onCategoryChange(String(s.service), val || "")}
                              >
                                <SelectTrigger size="sm" className={`w-full bg-background text-xs rounded-[8px] border h-9 py-1 px-2 ${validationErrors.has(String(s.service)) ? 'border-destructive ring-1 ring-destructive' : 'border-border'}`}>
                                  <SelectValue placeholder="Выберите">
                                    {(value: string) => {
                                      if (!value) return "Выберите";
                                      const cat = categories.find((c) => c.id === value);
                                      return cat ? `${cat.network.name} • ${cat.name}` : value;
                                    }}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-popover text-popover-foreground border border-border rounded-[8px] max-h-60 w-[220px]">
                                  {categories.map((c) => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs cursor-pointer">
                                      {c.network.name} • {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {aiConfidence[String(s.service)] ? (
                                <span className="text-[10px] font-semibold text-success mt-1 block select-none">
                                  🪄 Автоопределение ИИ
                                </span>
                              ) : validationErrors.has(String(s.service)) ? (
                                <span className="text-[10px] font-bold text-destructive mt-1 block select-none">
                                  ❌ Необходима категория
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-warning mt-1 block select-none">
                                  ⚠️ Выберите вручную
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="py-3 pr-4">
                        {s.alreadyImported ? (
                          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-[6px] border border-border font-semibold select-none">
                            📦
                          </span>
                        ) : isFreeProcurement ? (
                          <span className="text-[10px] text-destructive bg-destructive/10 px-2 py-1 rounded-[6px] border border-destructive/20 font-bold select-none">
                            ❌
                          </span>
                        ) : (
                          <span className="text-[10px] text-success bg-success/10 px-2 py-1 rounded-[6px] border border-success/20 font-bold select-none">
                            ✅
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className="lg:hidden flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            disabled={isDisabled}
                            checked={isSelected}
                            onChange={() => toggleSelection(String(s.service))}
                            className="mt-1 rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                          />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-foreground line-clamp-2">
                              {s.cleanName || s.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium line-clamp-1">
                              #{s.service} • {s.name}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {s.alreadyImported ? (
                            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-[6px] border border-border font-semibold select-none">📦</span>
                          ) : isFreeProcurement ? (
                            <span className="text-[10px] text-destructive bg-destructive/10 px-2 py-1 rounded-[6px] border border-destructive/20 font-bold select-none">❌</span>
                          ) : (
                            <span className="text-[10px] text-success bg-success/10 px-2 py-1 rounded-[6px] border border-success/20 font-bold select-none">✅</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 ml-7">
                        {metrics.platform && (() => {
                          const pData = getPlatformDisplay(metrics.platform);
                          return (
                            <span className={`${pData.color} px-2 py-0.5 rounded-[6px] text-[10px] font-semibold border flex items-center gap-1 select-none`}>
                              <span>{pData.icon}</span>
                              <span>{pData.name}</span>
                            </span>
                          );
                        })()}
                        {metrics.geo && <span className="bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-[6px] text-[10px] font-semibold select-none">{metrics.geo}</span>}
                        {(s.refill || metrics.warranty > 0) && <span className="bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-[6px] text-[10px] font-semibold select-none">♻️ {metrics.warranty || 30}D</span>}
                        {hasAnomaly && <span className="bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold select-none">⚠️ {metrics.anomalyScore}</span>}
                        {parseInt(s.min, 10) > 0 && <span className="bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-[6px] text-[10px] font-semibold select-none">от {s.min} шт</span>}
                      </div>

                      <div className="flex justify-between items-end ml-7 pt-2 border-t border-border/40 mt-2">
                        <div className="flex flex-col font-mono">
                          <span className="text-foreground font-bold text-sm tabular-nums tracking-tight">
                            {new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(pricePerUnitRetail)} ₽
                            <span className="text-[10px] text-muted-foreground font-sans ml-1 font-medium tracking-normal">розница</span>
                          </span>
                          <span className="text-muted-foreground font-medium text-[11px] tabular-nums tracking-tight">
                            {new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(pricePerUnitProcurement)} ₽
                            <span className="font-sans ml-0.5 tracking-normal">закупка</span>
                          </span>
                        </div>
                      </div>

                      {showCategoryColumn && (
                        <div className="ml-7 pt-2">
                          {s.alreadyImported ? (
                            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 select-none bg-slate-100 dark:bg-slate-800/50 px-2 py-1.5 rounded-[8px] border border-border w-fit">
                              📦 Уже импортировано
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1 w-full">
                              <Select value={selectedCategories[String(s.service)] || ""} onValueChange={(val) => onCategoryChange(String(s.service), val || "")}>
                                <SelectTrigger size="sm" className={`w-full bg-background text-xs rounded-[8px] border h-10 px-3 ${validationErrors.has(String(s.service)) ? 'border-destructive ring-1 ring-destructive' : 'border-border'}`}>
                                  <SelectValue placeholder="Выберите категорию">
                                    {(value: string) => {
                                      if (!value) return "Выберите категорию";
                                      const cat = categories.find((c) => c.id === value);
                                      return cat ? `${cat.network.name} • ${cat.name}` : value;
                                    }}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-popover text-popover-foreground border border-border rounded-[8px] max-h-60 w-[90vw] max-w-[400px]">
                                  {categories.map((c) => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs cursor-pointer py-2">
                                      {c.network.name} • {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {aiConfidence[String(s.service)] ? (
                                <span className="text-[10px] font-semibold text-success mt-1">🪄 Автоопределение ИИ</span>
                              ) : validationErrors.has(String(s.service)) ? (
                                <span className="text-[10px] font-bold text-destructive mt-1">❌ Ошибка: Выберите категорию</span>
                              ) : (
                                <span className="text-[10px] font-semibold text-warning mt-1">⚠️ Выберите вручную</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
      </div>

      {/* Pagination Footer */}
      {!loading && pagination.totalPages > 1 && (
        <div className="bg-muted/30 border-t border-border px-4 py-3.5 flex items-center justify-between sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-muted-foreground">
              Показано{" "}
              <span className="font-bold text-foreground">{(pagination.page - 1) * pagination.pageSize + 1}</span> -{" "}
              <span className="font-bold text-foreground">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> из{" "}
              <span className="font-bold text-foreground">{pagination.total}</span>
            </p>
            <nav className="relative z-0 inline-flex rounded-[8px] shadow-sm -space-x-px border border-border overflow-hidden" aria-label="Пагинация">
              <button
                onClick={() => setFilters({ ...filters, page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-3 py-2 bg-card text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50 transition-all duration-200 select-none border-r border-border/60 cursor-pointer active:scale-95"
              >
                ← Пред.
              </button>
              <span className="relative inline-flex items-center px-4 py-2 bg-card text-xs font-bold text-foreground select-none border-r border-border/60 tabular-nums">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setFilters({ ...filters, page: Math.min(pagination.totalPages, pagination.page + 1) })}
                disabled={pagination.page === pagination.totalPages}
                className="relative inline-flex items-center px-3 py-2 bg-card text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50 transition-all duration-200 select-none cursor-pointer active:scale-95"
              >
                След. →
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
