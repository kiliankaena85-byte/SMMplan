import type { CategoryItem, ExternalServiceItem } from '../../types';
import type { ImportServicesResult } from '@/services/admin/catalog.service';

export interface MixedTypeWarning {
  targetCategoryId: string;
  targetCategoryName: string;
  types: Array<{ normCategory: string; count: number; examples: string[] }>;
}

export const PLATFORM_TABS = [
  { id: 'ALL', name: 'Все', icon: '🌐' },
  { id: 'telegram', name: 'Telegram', icon: '✈️' },
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'vk', name: 'ВКонтакте', icon: '💙' },
  { id: 'youtube', name: 'YouTube', icon: '▶️' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
  { id: 'other', name: 'Другие', icon: '⚙️' },
];

export const DEFAULT_FILTERS = {
  page: 1,
  pageSize: 50,
  platform: 'ALL',
  geo: 'ALL',
  velocity: 'ALL',
  hasRefill: false,
  hasAnomaly: false,
  importStatus: 'NOT_IMPORTED',
  search: '',
  sortBy: 'none',
  category: 'ALL',
  retailReady: false,
  providerCategory: 'ALL',
  minPrice: '',
  maxPrice: '',
};

export function formatMarkupLabel(markupStr: string): string {
  const p = parseFloat(markupStr);
  if (isNaN(p) || p < 0) return '×3.0';
  if (p === 0) return 'авто';
  const multiplier = Math.round((1 + p / 100) * 100) / 100;
  return `×${multiplier.toFixed(2).replace(/\.?0+$/, '')}`;
}

export function computeMarkupMultiplier(markupStr: string): number {
  const p = parseFloat(markupStr);
  if (isNaN(p) || p < 0) return 3.0;
  if (p === 0) return 0; // auto-pricing signal
  return Math.round((1 + p / 100) * 100) / 100;
}

export function checkIsFiltersActive(filters: typeof DEFAULT_FILTERS): boolean {
  return (
    filters.platform !== 'ALL' ||
    filters.geo !== 'ALL' ||
    filters.velocity !== 'ALL' ||
    filters.hasRefill !== false ||
    filters.hasAnomaly !== false ||
    filters.importStatus !== 'NOT_IMPORTED' ||
    filters.search !== '' ||
    filters.sortBy !== 'none' ||
    filters.category !== 'ALL' ||
    filters.retailReady !== false ||
    filters.providerCategory !== 'ALL' ||
    filters.minPrice !== '' ||
    filters.maxPrice !== ''
  );
}

export function groupCategoriesByNetwork(categories: CategoryItem[]): Array<{ network: string; items: CategoryItem[] }> {
  const groups: Record<string, CategoryItem[]> = {};
  const ordered: string[] = [];
  for (const cat of categories) {
    const netName = cat.network?.name || 'Без сети';
    if (!groups[netName]) {
      groups[netName] = [];
      ordered.push(netName);
    }
    groups[netName].push(cat);
  }
  return ordered.map((name) => ({ network: name, items: groups[name] }));
}

export type ImportTab = 'all' | 'ready' | 'attention' | 'selected';

export interface LoadServicesCallbacks {
  setLoading: (b: boolean) => void;
  setError: (e: string | null) => void;
  setIsEmptyCache: (b: boolean) => void;
  setServices: (s: ExternalServiceItem[]) => void;
  setPagination: (p: any) => void;
  setPlatformCounts: (c: Record<string, number>) => void;
  setProviderCategories: (c: any[]) => void;
  setErrorWithTimer: (msg: string | null) => void;
  addKnownServices?: (services: ExternalServiceItem[]) => void;
}

export interface SyncProviderCallbacks {
  setSyncing: (b: boolean) => void;
  setErrorWithTimer: (msg: string | null) => void;
  setSuccessWithTimer: (msg: string | null) => void;
  setIsEmptyCache: (b: boolean) => void;
  loadServices: () => Promise<void>;
}

export interface SelectAllFilteredCallbacks {
  setSelectingAllFiltered: (b: boolean) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSuccessWithTimer: (msg: string | null) => void;
  setErrorWithTimer: (msg: string | null) => void;
  localCategories?: CategoryItem[];
  setAutoMappedCategories?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setAiConfidence?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setSelectedCategories?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  addKnownServices?: (services: ExternalServiceItem[]) => void;
}

export interface ExecuteImportCallbacks {
  setShowConfirmModal: (b: boolean) => void;
  setImportProgress: (p: { current: number; total: number } | null) => void;
  setError: (e: string | null) => void;
  setImportReport: (r: ImportServicesResult | null) => void;
  setSuccessWithTimer: (msg: string | null) => void;
  setSelectedIds: (s: Set<string>) => void;
  loadServices: () => Promise<void>;
  refreshRouter: () => void;
  setErrorWithTimer: (msg: string | null) => void;
}

