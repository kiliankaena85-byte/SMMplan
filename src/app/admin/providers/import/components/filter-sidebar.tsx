"use client";

import React from "react";

interface FilterSidebarProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFilters: (filters: any) => void;
  platformCounts?: Record<string, number>;
}

const platformChats = [
  { id: "ALL", name: "Все соцсети", icon: "🌐", bg: "bg-sky-50 text-sky-600 border-sky-100" },
  { id: "telegram", name: "Telegram", icon: "✈️", bg: "bg-[#e8f4fd] text-[#2481cc] border-[#d4ebfc]" },
  { id: "instagram", name: "Instagram", icon: "📸", bg: "bg-pink-50 text-pink-600 border-pink-100" },
  { id: "vk", name: "ВКонтакте", icon: "💙", bg: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  { id: "youtube", name: "YouTube", icon: "▶️", bg: "bg-red-50 text-red-600 border-red-100" },
  { id: "tiktok", name: "TikTok", icon: "🎵", bg: "bg-zinc-100 text-zinc-800 border-zinc-200" },
  { id: "other", name: "Другие", icon: "⚙️", bg: "bg-slate-50 text-slate-600 border-slate-100" }
];

export function FilterSidebar({ filters, setFilters, platformCounts }: FilterSidebarProps) {
  const [localSearch, setLocalSearch] = React.useState(filters.search || "");
  const [isOpen, setIsOpen] = React.useState(false);

  // Keep local search value synced when external filters.search changes
  React.useEffect(() => {
    setLocalSearch(filters.search || "");
  }, [filters.search]);

  // Debounced search sync
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== (filters.search || "")) {
        setFilters({ ...filters, search: localSearch, page: 1 });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, filters, setFilters]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 }); // reset page on filter change
  };

  return (
    <div className="w-full md:w-72 flex-shrink-0 bg-card border border-border rounded-[12px] p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] flex flex-col gap-4">
      {/* Mobile Toggle Header */}
      <div className="flex items-center justify-between md:hidden">
        <span className="font-bold text-sm text-foreground flex items-center gap-2 select-none">
          🔍 Фильтры и соцсети
        </span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs bg-muted hover:bg-muted-foreground/10 text-foreground px-3 py-1.5 rounded-[8px] font-semibold border border-border transition-all duration-200 select-none cursor-pointer"
        >
          {isOpen ? "Скрыть ✕" : "Показать ☰"}
        </button>
      </div>

      {/* Content wrapper - Collapsible on mobile, always visible on desktop */}
      <div className={`${isOpen ? "flex" : "hidden md:flex"} flex-col gap-5 w-full`}>
        {/* Telegram-style Search Input */}
        <div className="space-y-2">
          <div className="relative">
            <input 
              type="text"
              placeholder="Поиск..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full text-sm bg-muted text-foreground placeholder-muted-foreground border border-border rounded-[20px] py-2 pl-4 pr-10 focus:bg-card focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
            />
            {localSearch && (
              <button 
                onClick={() => setLocalSearch("")}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground text-xs"
                aria-label="Очистить поиск"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Telegram-style Chat List (Platforms) */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 px-1">
            Диалоги (Соцсети)
          </h4>
          <div className="space-y-1">
            {platformChats.map((chat) => {
              const isActive = filters.platform === chat.id;
              const count = platformCounts?.[chat.id] ?? 0;
              
              return (
                <div
                  key={chat.id}
                  onClick={() => handleChange("platform", chat.id)}
                  className={`flex items-center justify-between p-2 rounded-[8px] transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? "bg-secondary text-secondary-foreground" 
                      : "hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg border ${chat.bg} shadow-sm select-none`}>
                      {chat.icon}
                    </div>
                    <span className="text-sm font-semibold truncate max-w-[130px]">
                      {chat.name}
                    </span>
                  </div>
                  
                  {count > 0 && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center select-none ${
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted-foreground/15 text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Supplementary Filters */}
        <div className="space-y-5 pt-4 border-t border-border flex flex-col gap-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Параметры фильтрации
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 px-1">Категория (Тип)</label>
              <select 
                value={filters.category || "ALL"} 
                onChange={(e) => handleChange("category", e.target.value)}
                className="w-full text-sm border border-border rounded-[8px] p-2 bg-background focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
              >
                <option value="ALL">Все типы</option>
                <option value="SUBSCRIBERS">Подписчики (Followers)</option>
                <option value="LIKES">Лайки (Likes)</option>
                <option value="VIEWS">Просмотры (Views)</option>
                <option value="COMMENTS">Комментарии (Comments)</option>
                <option value="REACTIONS">Реакции (Reactions)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 px-1">Регион (Geo)</label>
              <select 
                value={filters.geo || "ALL"} 
                onChange={(e) => handleChange("geo", e.target.value)}
                className="w-full text-sm border border-border rounded-[8px] p-2 bg-background focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
              >
                <option value="ALL">Весь мир (Все)</option>
                <option value="RU">Россия (RU)</option>
                <option value="USA">США / English (USA)</option>
                <option value="KZ">Казахстан (KZ)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 px-1">Сортировка</label>
              <select 
                value={filters.sortBy || "none"} 
                onChange={(e) => handleChange("sortBy", e.target.value)}
                className="w-full text-sm border border-border rounded-[8px] p-2 bg-background focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
              >
                <option value="none">По умолчанию</option>
                <option value="id_asc">ID: по возрастанию</option>
                <option value="id_desc">ID: по убыванию</option>
                <option value="name_asc">Имя: А-Я</option>
                <option value="name_desc">Имя: Я-А</option>
                <option value="category_asc">Категория: А-Я</option>
                <option value="category_desc">Категория: Я-А</option>
                <option value="platform_asc">Платформа: А-Я</option>
                <option value="platform_desc">Платформа: Я-А</option>
                <option value="price_asc">Цена: Сначала дешевые</option>
                <option value="price_desc">Цена: Сначала дорогие</option>
                <option value="min_asc">Минимум: по возрастанию</option>
                <option value="min_desc">Минимум: по убыванию</option>
                <option value="anomaly">Сначала подозрительные</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 px-1">Скорость (Velocity)</label>
              <select 
                value={filters.velocity || "ALL"} 
                onChange={(e) => handleChange("velocity", e.target.value)}
                className="w-full text-sm border border-border rounded-[8px] p-2 bg-background focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
              >
                <option value="ALL">Любая</option>
                <option value="FAST">⚡ Быстрая (&gt; 50/ч)</option>
                <option value="MEDIUM">Средняя</option>
                <option value="SLOW">🐢 Медленная (&lt; 10/ч)</option>
              </select>
            </div>
          </div>

          {/* Checkbox Options styled in Telegram theme */}
          <div className="space-y-3.5 pt-4 border-t border-border flex flex-col gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer group select-none">
              <input 
                type="checkbox" 
                checked={filters.hasRefill || false}
                onChange={(e) => handleChange("hasRefill", e.target.checked)}
                className="rounded border border-border text-primary focus:ring-primary h-4 w-4 transition-all duration-200 cursor-pointer"
              />
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                ♻️ Только с гарантией
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer group select-none">
              <input 
                type="checkbox" 
                checked={filters.hasAnomaly || false}
                onChange={(e) => handleChange("hasAnomaly", e.target.checked)}
                className="rounded border border-border text-orange-600 focus:ring-orange-500 h-4 w-4 transition-all duration-200 cursor-pointer"
              />
              <span className="text-sm font-medium text-foreground group-hover:text-orange-600 transition-colors duration-200">
                🔸 Высокий Anomaly Score
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer group select-none">
              <input 
                type="checkbox" 
                checked={filters.retailReady || false}
                onChange={(e) => handleChange("retailReady", e.target.checked)}
                className="rounded border border-border text-primary focus:ring-primary h-4 w-4 transition-all duration-200 cursor-pointer"
              />
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                🛍️ Для розницы (min ≤ 100)
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer group select-none">
              <input 
                type="checkbox" 
                checked={filters.hideImported || false}
                onChange={(e) => handleChange("hideImported", e.target.checked)}
                className="rounded border border-border text-primary focus:ring-primary h-4 w-4 transition-all duration-200 cursor-pointer"
              />
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                Скрыть импортированные
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
