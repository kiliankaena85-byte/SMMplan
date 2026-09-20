'use client';

import React from 'react';
import { Pencil, Trash2, Layers } from 'lucide-react';
import { UniversalIcon } from '@/components/ui/UniversalIcon';

export interface NetworkRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort: number;
  isActive: boolean;
  categoriesCount: number;
}

interface NetworkMobileCardProps {
  network: NetworkRow;
  isEditing: boolean;
  onEdit: (n: NetworkRow) => void;
  onDelete: (n: NetworkRow) => void;
}

export function NetworkMobileCard({
  network,
  isEditing,
  onEdit,
  onDelete,
}: NetworkMobileCardProps) {
  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all ${
        isEditing
          ? 'bg-primary/5 border-primary/40 shadow-xs'
          : 'bg-card border-border/70 hover:border-border shadow-2xs'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center shrink-0">
            <UniversalIcon icon={network.icon || `brand:${network.slug}`} size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-foreground truncate">{network.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50">
                {network.slug}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span className={network.categoriesCount > 0 ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}>
                  {network.categoriesCount} {network.categoriesCount === 1 ? 'категория' : 'категорий'}
                </span>
              </span>
              <span className="text-[11px] font-mono text-muted-foreground/80">
                Порядок: {network.sort}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(network)}
            aria-label={`Редактировать соцсеть ${network.name}`}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-primary rounded-xl hover:bg-primary/10 transition-colors cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(network)}
            disabled={network.categoriesCount > 0}
            aria-label={`Удалить соцсеть ${network.name}`}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive rounded-xl hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
