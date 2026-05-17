"use client";

import React from "react";

interface ServicesTableProps {
  services: any[];
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  toggleAll: () => void;
  loading: boolean;
  filters: any;
  setFilters: (f: any) => void;
  pagination: { page: number; totalPages: number; total: number; pageSize: number };
  priceMode?: 'per1000' | 'per1';
  markup?: number;
}

export function ServicesTable({ 
  services, 
  selectedIds, 
  toggleSelection, 
  toggleAll, 
  loading,
  filters,
  setFilters,
  pagination,
  priceMode = 'per1000',
  markup = 0
}: ServicesTableProps) {
  
  const platformMap: Record<string, {name: string, color: string, icon: string}> = {
    'IN': { name: 'Instagram', color: 'bg-pink-100 text-pink-700 border-pink-200', icon: '📸' },
    'TG': { name: 'Telegram', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '✈️' },
    'VK': { name: 'ВКонтакте', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: '💙' },
    'YT': { name: 'YouTube', color: 'bg-red-100 text-red-700 border-red-200', icon: '▶️' },
    'TT': { name: 'TikTok', color: 'bg-zinc-800 text-white border-zinc-700', icon: '🎵' },
    'X': { name: 'Twitter (X)', color: 'bg-slate-100 text-slate-800 border-slate-300', icon: '𝕏' },
  };

  const getPlatformDisplay = (code: string) => {
    const map = platformMap[code.toUpperCase()];
    if (map) return map;
    return { name: code, color: 'bg-slate-100 text-slate-700 border-slate-200', icon: '🌐' };
  };

  const handleSort = (field: string) => {
    let newSort = "none";
    if (filters.sortBy !== `${field}_asc` && filters.sortBy !== `${field}_desc`) {
        newSort = `${field}_asc`;
    } else if (filters.sortBy === `${field}_asc`) {
        newSort = `${field}_desc`;
    }
    setFilters({ ...filters, sortBy: newSort });
  };

  const getSortIcon = (field: string) => {
    if (filters.sortBy === `${field}_asc`) return "↑";
    if (filters.sortBy === `${field}_desc`) return "↓";
    return "↕";
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto flex-1">
        <table className="min-w-full divide-y divide-border table-fixed">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left w-12">
                <input 
                  type="checkbox" 
                  onChange={toggleAll} 
                  checked={services.length > 0 && selectedIds.size === services.filter(s=>!s.alreadyImported).length} 
                  className="rounded border-border text-primary focus:ring-primary"
                />
              </th>
              <th className="w-[10%] px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-left">
                Провайдер ID
              </th>
              <th className="w-[35%] px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-left">
                ИИ Нормализация / Оригинал
              </th>
              <th className="w-[25%] px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-left">
                AI Аналитика (Типы)
              </th>
              <th className="w-[15%] px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-left cursor-pointer hover:bg-border/50 transition-colors"
                  onClick={() => handleSort('price')}>
                Закупка ({priceMode === 'per1' ? 'за 1 шт.' : 'за 1000 шт.'}) {getSortIcon('price')}
              </th>
              <th className="w-[15%] px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-left cursor-pointer hover:bg-border/50 transition-colors"
                  onClick={() => handleSort('anomaly')}>
                Anomaly {getSortIcon('anomaly')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <div className="flex justify-center items-center gap-2">
                    <span className="animate-spin text-xl">⏳</span> Загрузка теневого каталога...
                  </div>
                </td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  По вашему фильтру ничего не найдено.
                </td>
              </tr>
            ) : (
              services.map(s => {
                const metrics = s.metrics || {};
                const hasAnomaly = metrics.anomalyScore > 0;
                
                return (
                  <tr key={s.service} className={`${s.alreadyImported ? 'bg-muted/30 opacity-60' : 'hover:bg-muted/50'} transition-colors`}>
                    <td className="px-4 py-3">
                      <input 
                          type="checkbox" 
                          disabled={s.alreadyImported}
                          checked={selectedIds.has(String(s.service))}
                          onChange={() => toggleSelection(String(s.service))}
                          className="rounded border-border text-primary focus:ring-primary disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">#{s.service}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 max-w-sm">
                        <span className="text-sm font-medium text-foreground truncate" title={s.cleanName}>{s.cleanName || s.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate" title={s.name}>{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {metrics.platform && (() => {
                            const pData = getPlatformDisplay(metrics.platform);
                            return (
                                <span className={`${pData.color} px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1`} title={pData.name}>
                                    <span>{pData.icon}</span>
                                    <span>{pData.name}</span>
                                </span>
                            );
                        })()}
                        {metrics.geo && <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium border">{metrics.geo}</span>}
                        {(s.refill || metrics.warranty > 0) && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-green-200" title="Гарантия/Refill">♻️ {metrics.warranty || 30}D</span>}
                        {metrics.velocity > 0 && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-blue-200" title="Скорость">⚡ {metrics.velocity}/h</span>}
                        {metrics.targetType && <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-purple-200" title="Тип ссылки (Роутинг)">🎯 {metrics.targetType}</span>}
                        {metrics.customDataType && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-orange-200" title="Требует доп. ввода">📝 {metrics.customDataType}</span>}
                        {metrics.isMediaGroupAware && <span className="bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-teal-200" title="Поддержка фото-альбомов (MediaGroup)">📦 MediaGroup</span>}
                        {s.alreadyImported && <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded text-[10px] font-medium">IMPORTED</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      <div className="flex flex-col gap-1">
                        <span className="text-foreground font-semibold">
                          <span className="text-muted-foreground mr-1">Розница:</span>
                          {new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(
                            ((s.rateRub !== undefined ? s.rateRub : parseFloat(s.rate)) * (1 + markup / 100)) / (priceMode === 'per1' ? 1000 : 1)
                          )} ₽
                          <span className="text-[10px] text-muted-foreground font-sans ml-1 font-normal">/ {priceMode === 'per1' ? '1 шт' : '1000 шт'}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground" title={`Закупка (в рублях)`}>
                          Закупка: {new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(
                            (s.rateRub !== undefined ? s.rateRub : parseFloat(s.rate)) / (priceMode === 'per1' ? 1000 : 1)
                          )} ₽
                        </span>
                        {s.providerCurrency === 'USD' && (
                          <span className="text-[10px] text-muted-foreground" title={`Курс: ${s.usdRate || 90} ₽`}>
                            Провайдер: ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(
                              parseFloat(s.rate) / (priceMode === 'per1' ? 1000 : 1)
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                       {hasAnomaly ? (
                         <span className="text-warning font-bold flex items-center gap-1" title="Подозрительная накрутка характеристик">
                           ⚠️ {metrics.anomalyScore}
                         </span>
                       ) : (
                         <span className="text-muted-foreground text-xs">—</span>
                       )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && pagination.totalPages > 1 && (
        <div className="bg-muted/50 border-t border-border px-4 py-3 flex items-center justify-between sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Показано <span className="font-medium">{(pagination.page - 1) * pagination.pageSize + 1}</span> - <span className="font-medium">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> из <span className="font-medium">{pagination.total}</span> услуг
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setFilters({ ...filters, page: Math.max(1, pagination.page - 1) })}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-background text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                >
                  Пред.
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-border bg-background text-sm font-medium text-foreground">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setFilters({ ...filters, page: Math.min(pagination.totalPages, pagination.page + 1) })}
                  disabled={pagination.page === pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-background text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                >
                  След.
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
