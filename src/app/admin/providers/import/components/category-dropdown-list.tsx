'use client';

import React from 'react';
import { Search, Plus, Check, X } from 'lucide-react';
import type { CategoryItem } from '../types';

export interface CategoryDropdownListProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  search: string;
  setSearch: (val: string) => void;
  activeNetworkFilter: string;
  setActiveNetworkFilter: (val: string) => void;
  networksList: Array<{ id: string; name: string; slug: string }>;
  filteredGroups: Array<{ network: string; items: CategoryItem[] }>;
  selectedValue: string;
  onSelect: (id: string) => void;
  onOpenCreateDialog: (initialName?: string) => void;
  getNetIcon: (netName?: string) => string;
  isMobile?: boolean;
}

export function CategoryDropdownList({
  inputRef,
  search,
  setSearch,
  activeNetworkFilter,
  setActiveNetworkFilter,
  networksList,
  filteredGroups,
  selectedValue,
  onSelect,
  onOpenCreateDialog,
  getNetIcon,
  isMobile = false,
}: CategoryDropdownListProps) {
  return (
    <div
      className={`absolute left-0 top-full mt-1.5 z-50 bg-popover text-popover-foreground border border-border/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 ${
        isMobile ? 'w-[90vw] max-w-[380px]' : 'w-[280px] sm:w-[320px]'
      }`}
    >
      {/* 🔍 Search Input & Network Filters */}
      <div className="p-2 border-b border-border/60 bg-muted/20">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск категории..."
            className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-border/70 bg-background focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {networksList.length > 1 && (
          <div className="flex items-center gap-1 mt-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveNetworkFilter('ALL')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeNetworkFilter === 'ALL'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              Все
            </button>
            {networksList.slice(0, 6).map((net) => (
              <button
                key={net.name}
                type="button"
                onClick={() => setActiveNetworkFilter(net.name)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                  activeNetworkFilter === net.name
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{getNetIcon(net.name)}</span>
                <span>{net.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 📋 Filtered Categories List */}
      <div className="max-h-56 overflow-y-auto p-1 divide-y divide-border/30">
        {filteredGroups.length === 0 ? (
          <div className="py-4 px-3 text-center text-xs text-muted-foreground">
            <p>Категорий не найдено</p>
            {search && (
              <button
                type="button"
                onClick={() => onOpenCreateDialog(search)}
                className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Создать «{search}»
              </button>
            )}
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.network} className="py-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>{getNetIcon(group.network)}</span>
                <span>{group.network}</span>
              </div>
              <div className="space-y-0.5">
                {group.items.map((cat) => {
                  const isSelected = cat.id === selectedValue;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => onSelect(cat.id)}
                      className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-primary/15 text-primary font-bold'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ➕ Bottom Action */}
      <div className="p-1.5 border-t border-border/60 bg-muted/20">
        <button
          type="button"
          onClick={() => onOpenCreateDialog()}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg border border-primary/20 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Создать категорию</span>
        </button>
      </div>
    </div>
  );
}
