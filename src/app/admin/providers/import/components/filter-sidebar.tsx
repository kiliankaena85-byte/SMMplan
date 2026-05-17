"use client";

import React from "react";

interface FilterSidebarProps {
  filters: any;
  setFilters: (filters: any) => void;
}

export function FilterSidebar({ filters, setFilters }: FilterSidebarProps) {
  const handleChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 }); // reset page on filter change
  };

  return (
    <div className="w-64 flex-shrink-0 bg-background border border-border rounded-lg p-4 space-y-6">
      <div>
        <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider mb-3">Базовые фильтры</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Поиск</label>
            <input 
              type="text"
              placeholder="ID или название..."
              value={filters.search || ""}
              onChange={(e) => handleChange("search", e.target.value)}
              className="w-full text-sm border-border border rounded-md p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Соцсеть (Платформа)</label>
            <select 
              value={filters.platform || "ALL"} 
              onChange={(e) => handleChange("platform", e.target.value)}
              className="w-full text-sm border-border border rounded-md p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="ALL">Все соцсети</option>
              <option value="telegram">Telegram</option>
              <option value="instagram">Instagram</option>
              <option value="vk">ВКонтакте</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Категория (Тип)</label>
            <select 
              value={filters.category || "ALL"} 
              onChange={(e) => handleChange("category", e.target.value)}
              className="w-full text-sm border-border border rounded-md p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="ALL">Все типы</option>
              <option value="followers">Подписчики (Followers)</option>
              <option value="likes">Лайки (Likes)</option>
              <option value="views">Просмотры (Views)</option>
              <option value="comments">Комментарии (Comments)</option>
              <option value="reactions">Реакции (Reactions)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Регион (Geo)</label>
            <select 
              value={filters.geo || "ALL"} 
              onChange={(e) => handleChange("geo", e.target.value)}
              className="w-full text-sm border-border border rounded-md p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="ALL">Весь мир (Все)</option>
              <option value="RU">Россия (RU)</option>
              <option value="USA">США / English (USA)</option>
              <option value="KZ">Казахстан (KZ)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Сортировка</label>
            <select 
              value={filters.sortBy || "none"} 
              onChange={(e) => handleChange("sortBy", e.target.value)}
              className="w-full text-sm border-border border rounded-md p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="none">По умолчанию</option>
              <option value="price_asc">Сначала дешевые</option>
              <option value="price_desc">Сначала дорогие</option>
              <option value="anomaly">Сначала подозрительные</option>
            </select>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-border"></div>

      <div>
        <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
          ✨ AI Метрики
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Скорость (Velocity)</label>
            <select 
              value={filters.velocity || "ALL"} 
              onChange={(e) => handleChange("velocity", e.target.value)}
              className="w-full text-sm border-border border rounded-md p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="ALL">Любая</option>
              <option value="FAST">⚡ Быстрая (&gt; 50/ч)</option>
              <option value="MEDIUM">🚶 Средняя</option>
              <option value="SLOW">🐢 Медленная (&lt; 10/ч)</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={filters.hasRefill || false}
              onChange={(e) => handleChange("hasRefill", e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-foreground">♻️ Только с гарантией</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={filters.hasAnomaly || false}
              onChange={(e) => handleChange("hasAnomaly", e.target.checked)}
              className="rounded border-border text-warning focus:ring-warning"
            />
            <span className="text-sm font-medium text-foreground">⚠️ Высокий Anomaly Score</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={filters.retailReady || false}
              onChange={(e) => handleChange("retailReady", e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-foreground">🛍️ Для розницы (min ≤ 100)</span>
          </label>
        </div>
      </div>

      <div className="h-px w-full bg-border"></div>

      <div>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={filters.hideImported || false}
              onChange={(e) => handleChange("hideImported", e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-muted-foreground">Скрыть уже импортированные</span>
          </label>
        </div>
      </div>
    </div>
  );
}
