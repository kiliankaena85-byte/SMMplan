'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CategoryItem } from '../types';
import { CategoryCreateDialog } from './category-create-dialog';
import { CategoryDropdownList } from './category-dropdown-list';

interface SearchableCategorySelectProps {
  value: string;
  onChange: (categoryId: string) => void;
  categories: CategoryItem[];
  categoriesByNetwork: { network: string; items: CategoryItem[] }[];
  onCategoryCreated?: (newCategory: CategoryItem) => void;
  suggestedPlatform?: string | null;
  suggestedName?: string | null;
  isMobile?: boolean;
  hasError?: boolean;
  disabled?: boolean;
}

const networkIcons: Record<string, string> = {
  INSTAGRAM: '📸',
  TELEGRAM: '✈️',
  VK: '💙',
  VKONTAKTE: '💙',
  YOUTUBE: '▶️',
  TIKTOK: '🎵',
  TWITTER: '𝕏',
  DZEN: '📰',
  FACEBOOK: '👥',
  DISCORD: '🎮',
  TWITCH: '🟣',
  RUTUBE: '🔴',
  PINTEREST: '📌',
  THREADS: '🧵',
};

export function getNetworkIcon(netName?: string) {
  if (!netName) return '🌐';
  const upper = netName.toUpperCase();
  for (const [key, icon] of Object.entries(networkIcons)) {
    if (upper.includes(key)) return icon;
  }
  return '🌐';
}

export function SearchableCategorySelect({
  value,
  onChange,
  categories,
  categoriesByNetwork,
  onCategoryCreated,
  suggestedPlatform,
  suggestedName,
  isMobile = false,
  hasError = false,
  disabled = false,
}: SearchableCategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeNetworkFilter, setActiveNetworkFilter] = useState<string>('ALL');
  const [isCreating, setIsCreating] = useState(false);
  const [createInitialName, setCreateInitialName] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCat = useMemo(() => categories.find((c) => c.id === value), [categories, value]);

  const networksList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; slug: string }>();
    categories.forEach((c) => {
      if (c.network?.name) {
        map.set(c.network.name, {
          id: c.network.id || c.networkId || '',
          name: c.network.name,
          slug: c.network.slug || c.network.name.toLowerCase(),
        });
      }
    });
    return Array.from(map.values());
  }, [categories]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result: { network: string; items: CategoryItem[] }[] = [];

    for (const group of categoriesByNetwork) {
      if (activeNetworkFilter !== 'ALL' && group.network !== activeNetworkFilter) continue;

      const matchingItems = group.items.filter((c) => {
        if (!q) return true;
        return c.name.toLowerCase().includes(q) || group.network.toLowerCase().includes(q);
      });

      if (matchingItems.length > 0) {
        result.push({ network: group.network, items: matchingItems });
      }
    }
    return result;
  }, [categoriesByNetwork, search, activeNetworkFilter]);

  const handleOpenCreateDialog = (name?: string) => {
    setCreateInitialName(name || search || suggestedName || '');
    setIsCreating(true);
  };

  const handleCreated = (createdCat: CategoryItem) => {
    onCategoryCreated?.(createdCat);
    onChange(createdCat.id);
    setIsCreating(false);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* ── Trigger Button ── */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-1.5 text-left rounded-lg border transition-all cursor-pointer select-none ${
          isMobile ? 'h-10 px-3 text-xs' : 'h-8 px-2 py-1 text-xs'
        } ${
          hasError
            ? 'border-destructive ring-1 ring-destructive bg-destructive/5 text-destructive'
            : selectedCat
            ? 'border-border bg-background hover:bg-muted/50 text-foreground'
            : 'border-border/80 bg-background hover:bg-muted/40 text-muted-foreground'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="truncate flex items-center gap-1.5 min-w-0 font-medium">
          {selectedCat ? (
            <>
              <span className="shrink-0 text-xs">{getNetworkIcon(selectedCat.network?.name)}</span>
              <span className="text-muted-foreground font-normal shrink-0 text-[11px]">
                {selectedCat.network?.name || 'Соцсеть'} •
              </span>
              <span className="font-semibold truncate text-foreground">{selectedCat.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{isMobile ? 'Выберите категорию...' : 'Выберите категорию'}</span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* ── Dropdown Popover ── */}
      {isOpen && (
        <CategoryDropdownList
          inputRef={inputRef}
          search={search}
          setSearch={setSearch}
          activeNetworkFilter={activeNetworkFilter}
          setActiveNetworkFilter={setActiveNetworkFilter}
          networksList={networksList}
          filteredGroups={filteredGroups}
          selectedValue={value}
          onSelect={(catId) => {
            onChange(catId);
            setIsOpen(false);
          }}
          onOpenCreateDialog={handleOpenCreateDialog}
          getNetIcon={getNetworkIcon}
          isMobile={isMobile}
        />
      )}

      {/* ── Modal: Quick Create Category ── */}
      <CategoryCreateDialog
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onCreated={handleCreated}
        networksList={networksList}
        suggestedPlatform={suggestedPlatform}
        suggestedName={createInitialName}
        getNetIcon={getNetworkIcon}
      />
    </div>
  );
}
