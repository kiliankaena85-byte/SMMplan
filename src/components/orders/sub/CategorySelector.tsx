'use client';

import React from 'react';

interface CategorySelectorProps {
  categoryId: string | null;
  setCategoryId: (id: string) => void;
  availableCategories: Array<{ id: string; name: string; slug?: string }>;
}

export function CategorySelector({
  categoryId,
  setCategoryId,
  availableCategories = []
}: CategorySelectorProps) {
  return (
      <div className="space-y-2">
        <label htmlFor="category-select" className="block text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
          Категория
        </label>
        <div className="relative">
          <select
            id="category-select"
            value={categoryId || ''}
            onChange={e => setCategoryId(e.target.value)}
            className="w-full h-12 pl-4 pr-10 rounded-xl border border-border bg-card text-sm font-semibold text-foreground outline-none transition-all duration-200 appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer hover:border-primary/50"
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
  );
}
