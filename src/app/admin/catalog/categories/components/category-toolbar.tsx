'use client';

import { Trash2, GitMerge, Globe, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryItem, NetworkItem } from './sub/types';

interface CategoryToolbarProps {
  networks: NetworkItem[];
  categories: CategoryItem[];
  currentTenant: string;
  currentTenantLabel: string;
  trulyEmptyCategoriesCount: number;
  otherTenantsCategoriesCount: number;
  selectedNetworkFilter: string;
  activeTrulyEmptyCount: number;
  onCleanupEmpty: () => void;
  onMerge: () => void;
  onManageNetworks: () => void;
  onAddCategory: () => void;
}

export function CategoryToolbar({
  networks,
  categories,
  currentTenantLabel,
  trulyEmptyCategoriesCount,
  otherTenantsCategoriesCount,
  selectedNetworkFilter,
  activeTrulyEmptyCount,
  onCleanupEmpty,
  onMerge,
  onManageNetworks,
  onAddCategory,
}: CategoryToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg border border-border/50">
          {networks.length} соцсетей · {categories.length} категорий
        </span>
        {trulyEmptyCategoriesCount > 0 && (
          <span className="text-xs font-mono font-bold text-destructive bg-destructive/10 px-2.5 py-1 rounded-lg border border-destructive/25">
            Без услуг: {trulyEmptyCategoriesCount}
          </span>
        )}
        {otherTenantsCategoriesCount > 0 && (
          <span
            className="text-xs font-mono font-bold text-sky-500 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/25"
            title={`Категории без активных услуг на ${currentTenantLabel}, но содержащие услуги в других проектах`}
          >
            В других проектах: {otherTenantsCategoriesCount}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {activeTrulyEmptyCount > 0 && (
          <Button
            intent="destructive"
            size="sm"
            onClick={onCleanupEmpty}
            className="font-bold h-8.5 bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Очистить пустые ({selectedNetworkFilter !== 'ALL' ? `${activeTrulyEmptyCount} в сети` : activeTrulyEmptyCount})
          </Button>
        )}

        <Button
          intent="outline"
          size="sm"
          onClick={onMerge}
          className="font-bold h-8.5 bg-background text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <GitMerge className="w-3.5 h-3.5 mr-1.5" />
          Объединить
        </Button>

        <Button
          intent="outline"
          size="sm"
          onClick={onManageNetworks}
          className="font-bold h-8.5 bg-background text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 mr-1.5" />
          Соцсети ({networks.length})
        </Button>

        <Button
          intent="primary"
          size="sm"
          onClick={onAddCategory}
          className="font-bold h-8.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Добавить категорию
        </Button>
      </div>
    </div>
  );
}
