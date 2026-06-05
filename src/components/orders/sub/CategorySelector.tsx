'use client';

import React from 'react';

interface CategorySelectorProps {
  categoryId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setCategoryId: (id: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availableCategories: any[];
}

export function CategorySelector({
  categoryId,
  setCategoryId,
  availableCategories = []
}: CategorySelectorProps) {
  return (
    <>
      {/* Desktop view */}
      <div
        className="hidden md:flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        role="tablist"
        aria-label="Категории услуг"
      >
        {availableCategories.map(cat => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={categoryId === cat.id}
            onClick={() => setCategoryId(cat.id)}
            className={`h-11 px-4 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
              categoryId === cat.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Mobile view */}
      <div className="block md:hidden space-y-2">
        <label htmlFor="category-select" className="block text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
          Категория
        </label>
        <div className="relative">
          <select
            id="category-select"
            value={categoryId || ''}
            onChange={e => setCategoryId(e.target.value)}
            className="w-full h-12 pl-4 pr-10 rounded-xl border border-border bg-card text-sm font-semibold text-foreground outline-none transition-all duration-200 appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            {availableCategories.map(cat => (
              <option key={cat.id} value={cat.id} className="text-foreground bg-card">
                {cat.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>
    </>
  );
}
