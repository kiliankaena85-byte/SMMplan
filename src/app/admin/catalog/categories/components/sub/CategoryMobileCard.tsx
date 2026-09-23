'use client';

import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { UniversalIcon } from '@/components/ui/UniversalIcon';
import { cleanCategoryName } from '@/components/ui/CategoryIcon';
import { CategoryItem } from './types';

interface CategoryMobileCardProps {
  category: CategoryItem;
  networkSlug: string;
  onEdit: (c: CategoryItem) => void;
  onDelete: (c: CategoryItem) => void;
}

export function CategoryMobileCard({
  category: c,
  networkSlug,
  onEdit,
  onDelete,
}: CategoryMobileCardProps) {
  const tenantCount = c.tenantServicesCount ?? c._count?.services ?? 0;
  const globalCount = c.globalServicesCount ?? c._count?.services ?? 0;
  const isTrulyEmpty = globalCount === 0;

  return (
    <div className="bg-background/80 border border-border/70 rounded-xl p-3 flex flex-col gap-2.5 shadow-2xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center shrink-0 text-foreground">
            <UniversalIcon icon={c.icon || c.network?.icon || `brand:${networkSlug}`} size={16} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-foreground text-xs truncate min-w-0">
              {cleanCategoryName(c.name)}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono truncate min-w-0">
              /{c.slug}
            </span>
          </div>
        </div>

        {/* Action Buttons (Touch Target >= 44px) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(c)}
            title="Редактировать категорию"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-border/60 hover:border-primary/50 text-muted-foreground hover:text-primary active:bg-primary/10 transition-all duration-150 active:scale-95 cursor-pointer"
          >
            <Pencil className="w-4 h-4 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onDeleteCategorySafe(c)}
            title={
              isTrulyEmpty
                ? "Удалить пустую категорию"
                : tenantCount === 0
                  ? `Содержит ${globalCount} услуг в других проектах`
                  : "Удалить категорию"
            }
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-all duration-150 active:scale-95 cursor-pointer ${
              isTrulyEmpty
                ? "border-destructive/40 text-destructive bg-destructive/10"
                : "border-border/60 text-muted-foreground hover:text-destructive active:bg-destructive/10"
            }`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Warnings if any */}
      {c.requireWarning && (
        <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1">
          ⚠️ {c.warningMessage}
        </div>
      )}

      {/* Meta tags and counters */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">
            Сорт: {c.sort}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px]">
            Услуг: {tenantCount}
          </span>
        </div>

        {c.analyzerTags && (
          <div className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={c.analyzerTags}>
            🏷️ {c.analyzerTags.split(',').slice(0, 2).map((t) => t.trim()).join(', ')}
          </div>
        )}
      </div>
    </div>
  );

  function onDeleteCategorySafe(cat: CategoryItem) {
    onDelete(cat);
  }
}
