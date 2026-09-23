'use client';

import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { NetworkItem } from './sub/types';

type EmptyFilterValue = 'ALL' | 'WITH_SERVICES' | 'OTHER_TENANTS' | 'EMPTY';

interface CategoryFilterBarProps {
  networks: NetworkItem[];
  searchQuery: string;
  selectedNetworkFilter: string;
  emptyFilter: EmptyFilterValue;
  totalCount: number;
  withServicesCount: number;
  otherTenantsCategoriesCount: number;
  trulyEmptyCategoriesCount: number;
  currentTenantLabel: string;
  currentTenant: string;
  onSearchChange: (val: string) => void;
  onNetworkChange: (val: string) => void;
  onEmptyFilterChange: (val: EmptyFilterValue) => void;
  onReset: () => void;
}

export function CategoryFilterBar({
  networks,
  searchQuery,
  selectedNetworkFilter,
  emptyFilter,
  totalCount,
  withServicesCount,
  otherTenantsCategoriesCount,
  trulyEmptyCategoriesCount,
  currentTenantLabel,
  currentTenant,
  onSearchChange,
  onNetworkChange,
  onEmptyFilterChange,
  onReset,
}: CategoryFilterBarProps) {
  const isFiltersActive = searchQuery || selectedNetworkFilter !== 'ALL' || emptyFilter !== 'ALL';

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
      <div className="relative w-full sm:w-72">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Поиск по категории или соцсети..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-8.5 pl-9 pr-3 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      <div className="w-full sm:w-56">
        <Select value={selectedNetworkFilter} onValueChange={(val) => onNetworkChange(val || 'ALL')}>
          <SelectTrigger className="w-full h-8.5 border border-border bg-background text-foreground text-xs rounded-lg cursor-pointer px-3">
            <SelectValue placeholder="Все соцсети">
              {(value: string) => {
                if (value === 'ALL') return 'Все соцсети';
                return networks.find((n) => n.id === value)?.name ?? value;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" label="Все соцсети" className="text-xs cursor-pointer">Все соцсети</SelectItem>
            {networks.map((n) => (
              <SelectItem key={n.id} value={n.id} label={n.name} className="text-xs cursor-pointer">
                <span className="flex items-center gap-2">
                  <SocialIcon slug={n.slug} size={14} />
                  {n.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/50 text-xs">
        <button
          onClick={() => onEmptyFilterChange('ALL')}
          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
            emptyFilter === 'ALL' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Все ({totalCount})
        </button>
        <button
          onClick={() => onEmptyFilterChange('WITH_SERVICES')}
          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
            emptyFilter === 'WITH_SERVICES' ? 'bg-background text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          С услугами ({withServicesCount})
        </button>
        {otherTenantsCategoriesCount > 0 && (
          <button
            onClick={() => onEmptyFilterChange('OTHER_TENANTS')}
            title={`Категории без активных услуг на ${currentTenantLabel}, но содержащие услуги в других проектах`}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
              emptyFilter === 'OTHER_TENANTS' ? 'bg-sky-500/15 text-sky-500 font-black shadow-xs' : 'text-muted-foreground hover:text-sky-500'
            }`}
          >
            {currentTenant === 'all' ? `Скрытые / архив (${otherTenantsCategoriesCount})` : `В других проектах (${otherTenantsCategoriesCount})`}
          </button>
        )}
        {trulyEmptyCategoriesCount > 0 && (
          <button
            onClick={() => onEmptyFilterChange('EMPTY')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
              emptyFilter === 'EMPTY' ? 'bg-destructive/15 text-destructive font-black shadow-xs' : 'text-muted-foreground hover:text-destructive'
            }`}
          >
            Пустые ({trulyEmptyCategoriesCount})
          </button>
        )}
      </div>

      {isFiltersActive && (
        <button
          onClick={onReset}
          className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 cursor-pointer transition-colors"
        >
          Сбросить
        </button>
      )}
    </div>
  );
}
