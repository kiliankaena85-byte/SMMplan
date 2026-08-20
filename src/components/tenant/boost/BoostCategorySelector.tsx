'use client';

import React, { useRef } from 'react';
import type { PublicCategory } from '@/actions/order/catalog';

interface BoostCategorySelectorProps {
  categories: PublicCategory[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export const BoostCategorySelector: React.FC<BoostCategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!categories || categories.length === 0) return null;

  // Icons for popular category keywords
  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('подписчик') || lower.includes('участник') || lower.includes('фолловер')) return '👥';
    if (lower.includes('просмотр') || lower.includes('охват') || lower.includes('глаз')) return '👁️';
    if (lower.includes('лайк') || lower.includes('сердеч')) return '❤️';
    if (lower.includes('реакци')) return '🔥';
    if (lower.includes('коммент') || lower.includes('отзыв')) return '💬';
    if (lower.includes('репост') || lower.includes('поделит')) return '🔄';
    if (lower.includes('буст') || lower.includes('голос') || lower.includes('stars')) return '⭐';
    if (lower.includes('сторис') || lower.includes('истори')) return '📱';
    return '⚡';
  };

  return (
    <div className="w-full relative">
      {/* Horizontally scrollable flex container for unlimited categories */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((cat) => {
          const isSelected = cat.id === selectedCategoryId;
          const icon = getCategoryIcon(cat.name);

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`
                px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5
                transition-all duration-150 cursor-pointer select-none outline-none border active:scale-95 shrink-0
                ${isSelected
                  ? 'bg-foreground text-background border-foreground font-bold shadow-xs'
                  : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-transparent'
                }
              `}
            >
              <span>{icon}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
