'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Globe } from 'lucide-react';
import { SocialIcon } from '@/components/ui/SocialIcon';

interface NetworkDTO {
  id: string;
  name: string;
  slug: string;
}

interface CategoryDTO {
  id: string;
  name: string;
  serviceCount: number;
  network: NetworkDTO | null;
}

interface CatalogSidebarProps {
  categories: CategoryDTO[];
  categoryId?: string;
  totalServices: number;
  usdToRub?: number;
}

export function CatalogSidebar({
  categories,
  categoryId,
  totalServices,
  usdToRub = 90.0,
}: CatalogSidebarProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Pricing Calculator States
  const [costUsd, setCostUsd] = useState<string>('0.20');
  const [markup, setMarkup] = useState<string>('3.0');

  // Extract unique platforms from categories
  const platforms = useMemo(() => {
    const map = new Map<string, { name: string; slug: string }>();
    categories.forEach(c => {
      if (c.network) {
        map.set(c.network.slug, { name: c.network.name, slug: c.network.slug });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  // Filter categories by selected platform and search query
  const filteredCategories = useMemo(() => {
    return categories.filter(c => {
      const matchesPlatform = selectedPlatform === 'ALL' || c.network?.slug === selectedPlatform;
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPlatform && matchesSearch;
    });
  }, [categories, selectedPlatform, searchQuery]);

  // Calculator calculations
  const parsedCost = parseFloat(costUsd) || 0;
  const parsedMarkup = parseFloat(markup) || 1;
  const wholesalePer1k = parsedCost * usdToRub;
  const retailPer1k = parsedCost * parsedMarkup * usdToRub;
  const retailPerUnit = retailPer1k / 1000;
  const netMargin = retailPer1k - wholesalePer1k - (retailPer1k * 0.145);

  return (
    <div className="space-y-4">
      {/* Platform & Categories Selector Card */}
      <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm ring-1 ring-border/5 p-4 flex flex-col">
        <h3 className="text-xs font-bold text-foreground mb-3 uppercase tracking-widest select-none">
          🗂️ Фильтр категорий
        </h3>

        {/* Platforms Horizontal Scroll Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-border/50 scrollbar-hide shrink-0 -mx-1 px-1">
          <button
            onClick={() => setSelectedPlatform('ALL')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-95 ${
              selectedPlatform === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/65 hover:bg-muted text-muted-foreground border border-border/20 hover:border-border/40'
            }`}
          >
            Все
          </button>
          {platforms.map(p => (
            <button
              key={p.slug}
              type="button"
              onClick={() => setSelectedPlatform(p.slug)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95 ${
                selectedPlatform === p.slug
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/65 hover:bg-muted text-muted-foreground border border-border/20 hover:border-border/40'
              }`}
            >
              <SocialIcon slug={p.slug} size={10} />
              {p.name}
            </button>
          ))}
        </div>

        {/* Live Filter Categories Input */}
        <div className="relative mb-3 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Быстрый поиск категории..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border/60 bg-background/50 text-foreground placeholder:text-muted-foreground/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
          />
        </div>

        {/* Categories List Container with strict scroll heights to prevent overlaps */}
        <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1 select-none scrollbar-thin">
          <Link
            href="/admin/catalog"
            onClick={() => {
              setSelectedPlatform('ALL');
              setSearchQuery('');
            }}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
              !categoryId ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span className="truncate">Все услуги</span>
            </div>
            <span className="opacity-80 tabular-nums text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-md font-semibold">{totalServices}</span>
          </Link>

          {filteredCategories.length === 0 ? (
            <div className="text-[10px] text-center text-muted-foreground py-6">
              Категории не найдены
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/admin/catalog?category=${cat.id}`}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                  categoryId === cat.id
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate mr-2">
                  {cat.network && <SocialIcon slug={cat.network.slug} size={12} />}
                  <span className="truncate">{cat.name}</span>
                </div>
                <span className="opacity-80 tabular-nums text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-md font-semibold flex-shrink-0">
                  {cat.serviceCount}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Staff Pricing Calculator Widget */}
      <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm ring-1 ring-border/5 p-5 space-y-4">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-widest select-none flex items-center gap-1.5">
          🧮 Калькулятор наценки
        </h3>
        
        <div className="space-y-3">
          {/* Cost USD Input */}
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1 block">
              Себестоимость провайдера ($ за 1000 шт)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costUsd}
              onChange={(e) => setCostUsd(e.target.value)}
              placeholder="Например, 0.20"
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-border/60 rounded-xl bg-background/50 text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            />
          </div>

          {/* Markup Input */}
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1 block">
              Множитель наценки (markup)
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
              placeholder="Например, 3.0"
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-border/60 rounded-xl bg-background/50 text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            />
          </div>

          {/* Warning Indicator */}
          {parsedMarkup < 2.34 && (
            <div className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl p-2.5 leading-relaxed font-semibold">
              ⚠️ Наценка ниже безопасного порога (2.34). Розничная цена может не покрывать комиссии эквайринга (14.5%) и налоги!
            </div>
          )}

          {/* Calculations list */}
          <div className="pt-3 border-t border-border/50 space-y-2 text-xs">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-muted-foreground">Курс пересчета:</span>
              <span className="font-mono font-bold text-foreground tabular-nums">1$ = {usdToRub.toFixed(2)} ₽</span>
            </div>
            
            <div className="flex justify-between items-center py-0.5">
              <span className="text-muted-foreground">Закупка (за 1к):</span>
              <span className="font-mono font-bold text-foreground tabular-nums">{wholesalePer1k.toFixed(2)} ₽</span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-muted-foreground">Цена продажи (за 1к):</span>
              <span className="font-mono font-bold text-foreground tabular-nums">{retailPer1k.toFixed(2)} ₽</span>
            </div>

            <div className="bg-primary/5 border border-primary/20 p-2.5 rounded-xl flex justify-between items-center py-1.5">
              <span className="text-primary font-bold text-[10px] uppercase tracking-wider">В UI (за 1 шт):</span>
              <span className="font-mono font-black text-sm text-primary tabular-nums">{retailPerUnit.toFixed(4)} ₽</span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-t border-border/50 pt-2">
              <span className="text-muted-foreground">Чистая маржа (за 1к):</span>
              <span className={`font-mono font-bold tabular-nums ${netMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                {netMargin.toFixed(2)} ₽
              </span>
            </div>
            <div className="text-[9px] text-muted-foreground leading-normal text-right">
              (Вычет: себестоимость + 14.5% комиссия/налог)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
