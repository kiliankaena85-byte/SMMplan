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
}

export function CatalogSidebar({
  categories,
  categoryId,
  totalServices
}: CatalogSidebarProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  return (
    <div className="space-y-4">
      {/* Platform & Categories Selector Card */}
      <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-4 flex flex-col">
        <h3 className="text-xs font-bold text-foreground mb-3 uppercase tracking-widest select-none">
          🗂️ Фильтр категорий
        </h3>

        {/* Platforms Horizontal Scroll Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-border/50 scrollbar-hide shrink-0 -mx-1 px-1">
          <button
            onClick={() => setSelectedPlatform('ALL')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
              selectedPlatform === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/65 hover:bg-muted text-muted-foreground border border-border/20'
            }`}
          >
            Все
          </button>
          {platforms.map(p => (
            <button
              key={p.slug}
              type="button"
              onClick={() => setSelectedPlatform(p.slug)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                selectedPlatform === p.slug
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/65 hover:bg-muted text-muted-foreground border border-border/20'
              }`}
            >
              <SocialIcon slug={p.slug} size={10} />
              {p.name}
            </button>
          ))}
        </div>

        {/* Live Filter Categories Input */}
        <div className="relative mb-3 shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Быстрый поиск категории..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background/50 text-foreground placeholder:text-muted-foreground/80 focus:border-primary focus:ring-1 focus:ring-primary/25 outline-none transition-all"
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
    </div>
  );
}
