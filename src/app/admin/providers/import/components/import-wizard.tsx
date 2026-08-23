'use client';

import { inferTargetTypeFromName, inferTargetTypeFromCategory, isTargetTypeCompatible } from '@/utils/target-type';
import { useState, useEffect, useCallback, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  fetchPaginatedExternalServices,
  importSelectedServices,
  fetchExternalServices,
} from "@/actions/admin/providers/import-cherry-pick";
import { ServicesTable } from "./services-table";
import { SummaryDashboard } from "./summary-dashboard";
import { ConfirmationModal } from "./confirmation-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Search, SlidersHorizontal, RotateCcw, RefreshCw, Link2 } from "lucide-react";
import { ServiceEditModal, type ServiceOverride } from "./service-edit-modal";
import { TARGET_TYPE_OPTIONS } from "../lib/target-type-config";
import type { ExternalServiceItem, CategoryItem, ProviderItem } from "../types";

/* ── AI Auto-Mapping ── */
const autoMapCategory = (s: ExternalServiceItem, categories: CategoryItem[]): { id: string; confident: boolean } | null => {
  const platform = (s.metrics?.platform || "").toUpperCase();
  const category = (s.metrics?.category || "").toUpperCase();
  const serviceName = (s.name || "").toLowerCase();
  const serviceTargetType = inferTargetTypeFromName(s.name);

  // 1. Filter categories for this platform
  const platformCategories = categories.filter(c => {
    const netSlug = c.network?.slug?.toUpperCase() || "";
    return netSlug === platform;
  });

  const targetCategories = platformCategories.length > 0 ? platformCategories : categories;

  // Keyword dictionary for mapping types
  const keywords = {
    SUBSCRIBERS: ['sub', 'member', 'channel', 'group', 'joiner', 'follower', 'подпис', 'участ', 'друг', 'фолловер', 'читател', 'инвайт', 'буст', 'boost'],
    LIKES: ['like', 'heart', 'favorite', 'upvote', 'лайк', 'нравится', 'сердеч', 'клас'],
    VIEWS: ['view', 'play', 'impression', 'reach', 'просм', 'показ', 'глаз', 'видео', 'стат'],
    REPOSTS: ['repost', 'share', 'retweet', 'репост', 'подели'],
    REACTIONS: ['react', 'emoji', 'fire', 'thumb', 'реакц', 'эмод'],
    COMMENTS: ['comment', 'reply', 'custom comment', 'коммен', 'отзыв'],
    STORIES: ['story', 'stories', 'сторис']
  };

  let bestCategory: CategoryItem | null = null;
  let maxScore = -1;

  for (const c of targetCategories) {
    const catSlug = ((c.slug || c.id) || "").toUpperCase();
    const catName = (c.name || "").toLowerCase();
    const catTargetType = inferTargetTypeFromCategory(c.name);

    // CRITICAL: Strict target-type compatibility check
    if (!isTargetTypeCompatible(serviceTargetType, catTargetType)) {
      continue;
    }

    let score = 0;

    // A. Direct metric category match (highest weight)
    if (category && keywords[category as keyof typeof keywords]) {
      const words = keywords[category as keyof typeof keywords];
      const matchesCat = words.some(w => catSlug.includes(w.toUpperCase()) || catName.includes(w));
      if (matchesCat) {
        score += 25;
      }
    }

    // B. Keyword intersection scoring
    for (const [, words] of Object.entries(keywords)) {
      const serviceMatches = words.some(w => serviceName.includes(w));
      if (serviceMatches) {
        const catMatches = words.some(w => catSlug.includes(w.toUpperCase()) || catName.includes(w));
        if (catMatches) {
          score += 15;
        }
        
        words.forEach((w: string) => {
          if (serviceName.includes(w) && (catName.includes(w) || catSlug.includes(w.toUpperCase()))) {
            score += 5;
          }
        });
      }
    }

    // C. Word-by-word exact overlap scoring
    const nameWords = serviceName.split(/[\s_\-+.#()/]+/);
    const catWords = catName.split(/[\s_\-+.#()/]+/);
    nameWords.forEach((nw: string) => {
      if (nw.length > 2 && catWords.includes(nw)) {
        score += 10;
      }
    });

    if (score > maxScore) {
      maxScore = score;
      bestCategory = c;
    }
  }

  if (bestCategory && maxScore >= 10) {
    return { id: bestCategory.id, confident: true };
  }

  return { id: "", confident: false };
};

/* ── Platform Tabs ── */
const PLATFORM_TABS = [
  { id: "ALL", name: "Все", icon: "🌐" },
  { id: "telegram", name: "Telegram", icon: "✈️" },
  { id: "instagram", name: "Instagram", icon: "📸" },
  { id: "vk", name: "ВКонтакте", icon: "💙" },
  { id: "youtube", name: "YouTube", icon: "▶️" },
  { id: "tiktok", name: "TikTok", icon: "🎵" },
  { id: "other", name: "Другие", icon: "⚙️" },
];

const DEFAULT_FILTERS = {
  page: 1,
  pageSize: 50,
  platform: "ALL",
  geo: "ALL",
  velocity: "ALL",
  hasRefill: false,
  hasAnomaly: false,
  importStatus: "NOT_IMPORTED",
  search: "",
  sortBy: "none",
  category: "ALL",
  retailReady: false,
  providerCategory: "ALL",
  minPrice: "",
  maxPrice: "",
};

/* ── Main Component ── */
export function ImportWizard({ 
  categories, 
  providers,
  initialProviderId,
  initialTenant,
}: { 
  categories: CategoryItem[]; 
  providers: ProviderItem[];
  initialProviderId?: string;
  initialTenant?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Core state
  const [providerId, setProviderId] = useState<string>(
    initialProviderId || providers.find(p => p.isActive)?.id || providers[0]?.id || ""
  );
  const [missingCategoryIds, setMissingCategoryIds] = useState<Set<string>>(new Set());
  // Bulk assigner state
  const [bulkCategory, setBulkCategory] = useState<string>("");
  const [services, setServices] = useState<ExternalServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isEmptyCache, setIsEmptyCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Selection & mapping
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string>>({});
  const [autoMappedCategories, setAutoMappedCategories] = useState<Record<string, string>>({});
  const [aiConfidence, setAiConfidence] = useState<Record<string, boolean>>({});
  const [markup, setMarkup] = useState<string>("50");
  const [targetTenant, setTargetTenant] = useState<'smmplan' | 'flux' | 'both'>(
    (initialTenant === 'flux' || initialTenant === 'smmplan' || initialTenant === 'both') ? initialTenant : 'smmplan'
  );

  // Pre-import customization & overrides
  const [serviceOverrides, setServiceOverrides] = useState<Record<string, ServiceOverride>>({});
  const [editingService, setEditingService] = useState<ExternalServiceItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [bulkTargetType, setBulkTargetType] = useState<string>("");

  const handleSaveOverride = (svcId: string, override: ServiceOverride) => {
    setServiceOverrides((prev) => ({
      ...prev,
      [svcId]: { ...prev[svcId], ...override },
    }));
    if (override.categoryId) {
      setSelectedCategories((prev) => ({ ...prev, [svcId]: override.categoryId! }));
      setMissingCategoryIds((prev) => {
        const next = new Set(prev);
        next.delete(svcId);
        return next;
      });
    }
  };

  const handleTargetTypeChange = (svcId: string, targetType: string) => {
    setServiceOverrides((prev) => ({
      ...prev,
      [svcId]: { ...prev[svcId], targetType },
    }));
  };

  const handleBulkTargetType = () => {
    if (!bulkTargetType) return;
    const targetIds = selectedIds.size > 0 ? Array.from(selectedIds) : services.map((s) => String(s.service));
    setServiceOverrides((prev) => {
      const next = { ...prev };
      targetIds.forEach((id) => {
        next[id] = { ...next[id], targetType: bulkTargetType };
      });
      return next;
    });
  };

  const handleOpenEditModal = (service: ExternalServiceItem) => {
    setEditingService(service);
    setIsEditModalOpen(true);
  };

  const handleProviderChange = (newProviderId: string) => {
    setProviderId(newProviderId);
    setSelectedIds(new Set());
    setSelectedCategories({});
    setAutoMappedCategories({});
    setServiceOverrides({});
    setError(null);
    setSuccess(null);
    setFilters((prev) => ({ ...prev, page: 1 }));
    
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('providerId', newProviderId);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Filters
  const [activeTab, setActiveTab] = useState<"ready" | "attention">("ready");
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [localSearch, setLocalSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, pageSize: 50 });
  const [platformCounts, setPlatformCounts] = useState<Record<string, number>>({});
  const [providerCategories, setProviderCategories] = useState<{ name: string; count: number }[]>([]);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Check if any filters are active (excluding page/pageSize)
  const isFiltersActive = useMemo(() => {
    return (
      filters.platform !== "ALL" ||
      filters.geo !== "ALL" ||
      filters.velocity !== "ALL" ||
      filters.hasRefill !== false ||
      filters.hasAnomaly !== false ||
      filters.importStatus !== "NOT_IMPORTED" ||
      filters.search !== "" ||
      filters.sortBy !== "none" ||
      filters.category !== "ALL" ||
      filters.retailReady !== false ||
      filters.providerCategory !== "ALL" ||
      filters.minPrice !== "" ||
      filters.maxPrice !== ""
    );
  }, [filters]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== (filters.search || "")) {
        setFilters((prev) => ({ ...prev, search: localSearch, page: 1 }));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, filters.search]);

  // Auto-mapping on services load
  useEffect(() => {
    if (services.length > 0) {
      const aiMap: Record<string, string> = {};
      const confidence: Record<string, boolean> = {};
      services.forEach((s) => {
        const idStr = String(s.service);
        const result = autoMapCategory(s, categories);
        if (result) {
          aiMap[idStr] = result.id;
          confidence[idStr] = result.confident;
        }
      });
      setAutoMappedCategories((prev) => ({ ...prev, ...aiMap }));
      setAiConfidence((prev) => ({ ...prev, ...confidence }));
      setSelectedCategories((prev) => {
        const next = { ...prev };
        services.forEach((s) => {
          const idStr = String(s.service);
          if (!next[idStr]) next[idStr] = aiMap[idStr];
        });
        return next;
      });
    }
  }, [services, categories]);

  // Load paginated services from Redis cache
  const loadServices = useCallback(async () => {
    if (!providerId) return;
    setLoading(true);
    setError(null);
    setIsEmptyCache(false);

    try {
      const { page: _p, pageSize: _ps, ...restFilters } = filters;
      const res = await fetchPaginatedExternalServices(
        providerId,
        { ...restFilters, targetTenant },
        filters.page,
        filters.pageSize
      );

      if (res.success && res.data) {
        setServices(res.data);
        if (res.pagination) setPagination(res.pagination);
        if (res.platformCounts) setPlatformCounts(res.platformCounts);
        if (res.providerCategories) setProviderCategories(res.providerCategories);
      } else if ('emptyCache' in res && res.emptyCache) {
        setIsEmptyCache(true);
        setServices([]);
      } else {
        setError(res.error || "Не удалось загрузить услуги");
        setServices([]);
      }
    } catch {
      setError("Ошибка соединения при загрузке услуг");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [providerId, filters, targetTenant]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Sync cache with provider
  const handleSyncCache = async () => {
    if (!providerId) return;
    setSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetchExternalServices(providerId);
      if (res.success) {
        setSuccess(`Синхронизировано ${"count" in res ? res.count : 0} услуг`);
        setIsEmptyCache(false);
        await loadServices();
      } else {
        setError('error' in res ? res.error : "Ошибка синхронизации");
      }
    } catch {
      setError("Не удалось синхронизировать каталог провайдера");
    } finally {
      setSyncing(false);
    }
  };

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    const importable = services.filter((s) => !s.alreadyImported);
    const allSelected = importable.every((s) => selectedIds.has(String(s.service)));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        importable.forEach((s) => next.delete(String(s.service)));
      } else {
        importable.forEach((s) => next.add(String(s.service)));
      }
      return next;
    });
  };

  // Bulk actions on current filter/search
  const handleSelectAllFiltered = async () => {
    try {
      setLoading(true);
      const { page: _p, pageSize: _ps, ...restFilters } = filters;
      const res = await fetchPaginatedExternalServices(
        providerId,
        restFilters,
        1,
        5000
      );
      if (res.success && res.data) {
        const idsToAdd = res.data
          .filter((s: ExternalServiceItem) => !s.alreadyImported)
          .map((s: ExternalServiceItem) => String(s.service));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          idsToAdd.forEach((id: string) => next.add(id));
          return next;
        });
      }
    } catch (e) {
      console.error("Failed to select all filtered:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyBulkCategory = () => {
    if (!bulkCategory) return;
    setSelectedCategories((prev) => {
      const next = { ...prev };
      services.forEach((s) => {
        const id = String(s.service);
        if (selectedIds.has(id) || selectedIds.size === 0) {
          next[id] = bulkCategory;
        }
      });
      return next;
    });
    setMissingCategoryIds((prev) => {
      const next = new Set(prev);
      services.forEach((s) => {
        const id = String(s.service);
        if (selectedIds.has(id) || selectedIds.size === 0) {
          next.delete(id);
        }
      });
      return next;
    });
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setLocalSearch("");
  };

  // Ready vs Attention counts
  const readyServices = useMemo(() => {
    return services.filter((s) => {
      const catId = selectedCategories[String(s.service)] || autoMappedCategories[String(s.service)];
      const minPrice = parseFloat(filters.minPrice) || 0;
      const maxPrice = parseFloat(filters.maxPrice) || Infinity;
      const isPriceValid = (s.pricePerUnitProcurementRub ?? 0) >= minPrice && (s.pricePerUnitProcurementRub ?? 0) <= maxPrice;
      return !!catId && isPriceValid;
    });
  }, [services, selectedCategories, autoMappedCategories, filters.minPrice, filters.maxPrice]);

  const attentionServices = useMemo(() => {
    return services.filter((s) => {
      const catId = selectedCategories[String(s.service)] || autoMappedCategories[String(s.service)];
      const minPrice = parseFloat(filters.minPrice) || 0;
      const maxPrice = parseFloat(filters.maxPrice) || Infinity;
      const isPriceValid = (s.pricePerUnitProcurementRub ?? 0) >= minPrice && (s.pricePerUnitProcurementRub ?? 0) <= maxPrice;
      return !catId || !isPriceValid || s.metrics?.priceAnomaly;
    });
  }, [services, selectedCategories, autoMappedCategories, filters.minPrice, filters.maxPrice]);

  // Import Execution
  const handleStartImport = async () => {
    if (selectedIds.size === 0) return;
    
    // Check for missing category mappings
    const missing = new Set<string>();
    selectedIds.forEach((id) => {
      const catId = selectedCategories[id] || autoMappedCategories[id];
      if (!catId) missing.add(id);
    });

    if (missing.size > 0) {
      setMissingCategoryIds(missing);
      setError(`Необходимо сопоставить категорию для ${missing.size} выбранных услуг перед импортом.`);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmImport = async () => {
    setShowConfirmModal(false);
    setImportProgress({ current: 0, total: selectedIds.size });
    setError(null);

    const externalIds = Array.from(selectedIds);
    const firstCatId = selectedCategories[externalIds[0]] || autoMappedCategories[externalIds[0]] || "";
    const categoryIdMap: Record<string, string> = {};
    externalIds.forEach(id => {
      categoryIdMap[id] = selectedCategories[id] || autoMappedCategories[id] || firstCatId;
    });

    try {
      const res = await importSelectedServices(
        externalIds,
        firstCatId,
        parseFloat(markup) || 50,
        providerId,
        categoryIdMap,
        targetTenant,
        serviceOverrides
      );

      if (res.success) {
        setSuccess(`Успешно импортировано ${("imported" in res && res.imported !== undefined ? res.imported : externalIds.length)} услуг!`);
        setSelectedIds(new Set());
        setServiceOverrides({});
        await loadServices();
        router.refresh();
      } else {
        setError(res.error || "Ошибка при импорте услуг");
      }
    } catch {
      setError("Не удалось выполнить импорт");
    } finally {
      setImportProgress(null);
    }
  };

  // Incompatible services computation for safety validation
  const incompatibleIds = useMemo(() => {
    const set = new Set<string>();
    selectedIds.forEach((id) => {
      const s = services.find((srv) => String(srv.service) === id);
      if (s) {
        const catId = selectedCategories[id] || autoMappedCategories[id];
        const cat = categories.find((c) => c.id === catId);
        if (cat) {
          const serviceType = serviceOverrides[id]?.targetType || (s.metrics?.targetType as string) || inferTargetTypeFromName(s.name);
          const catType = inferTargetTypeFromCategory(cat.name);
          if (!isTargetTypeCompatible(serviceType, catType)) {
            set.add(id);
          }
        }
      }
    });
    return set;
  }, [selectedIds, services, selectedCategories, autoMappedCategories, categories, serviceOverrides]);

  const handleExcludeIncompatible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      incompatibleIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Controls & Summary */}
      <SummaryDashboard
        totalInCache={pagination.total}
        newServices={services.filter(s => !s.alreadyImported).length}
        aiReady={readyServices.length}
        needsAttention={attentionServices.length}
        alreadyImported={services.filter(s => s.alreadyImported).length}
        selectedCount={selectedIds.size}
        markup={markup}
        onMarkupChange={setMarkup}
        onImport={handleStartImport}
        onResync={handleSyncCache}
        importDisabled={selectedIds.size === 0 || syncing}
        syncing={syncing}
        importProgress={importProgress}
        providers={providers}
        selectedProviderId={providerId}
        onProviderChange={handleProviderChange}
        targetTenant={targetTenant}
        onTargetTenantChange={setTargetTenant}
      />

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          {success}
        </div>
      )}

      {/* Empty Cache Hero State */}
      {isEmptyCache && !loading && (
        <div className="bg-card/60 backdrop-blur-md border border-border/60 rounded-[24px] p-8 text-center max-w-xl mx-auto space-y-4 shadow-sm my-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Download className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">
              Каталог «{providers.find(p => p.id === providerId)?.name || 'Провайдер'}» не загружен
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Для безопасного выбора и Cherry-Pick импорта услуги поставщика буферизуются в теневой каталог. Загрузите список услуг в один клик через официальный API шлюза.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSyncCache}
            disabled={syncing}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-md active:scale-95 text-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Синхронизация каталога через API...' : '⚡ Загрузить каталог поставщика (API)'}
          </button>
        </div>
      )}

      {/* Main Table / Grid Container */}
      <div className="flex flex-col gap-4">
        {/* Search & Platform Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Поиск по названию услуги..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border text-sm flex items-center gap-1.5 transition-colors ${
                isFiltersActive ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Фильтры</span>
            </button>
            {isFiltersActive && (
              <button
                onClick={resetFilters}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Сбросить фильтры"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            {incompatibleIds.size > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                ⚠️ {incompatibleIds.size} конфликт типов
              </span>
            )}
          </div>

          {/* Bulk Assigners: Category & Target Type */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Target Type */}
            <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/60">
              <Select value={bulkTargetType} onValueChange={(val) => setBulkTargetType(val || "")}>
                <SelectTrigger className="w-[155px] h-8 text-xs bg-background">
                  <SelectValue placeholder="Тип ссылки..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 w-[240px]">
                  {TARGET_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.type} value={opt.type} className="text-xs py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span>{opt.icon}</span>
                        <span className="font-medium">{opt.shortLabel}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={handleBulkTargetType}
                disabled={!bulkTargetType}
                className="px-2.5 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Задать тип
              </button>
            </div>

            {/* Bulk Category */}
            <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/60">
              <Select value={bulkCategory} onValueChange={(val) => setBulkCategory(val || "")}>
                <SelectTrigger className="w-[170px] h-8 text-xs bg-background">
                  <SelectValue placeholder="Категория..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 w-[240px]">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs">
                      {(cat.network?.name || "") ? `${cat.network?.name} • ${cat.name}` : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={handleApplyBulkCategory}
                disabled={!bulkCategory}
                className="px-2.5 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Задать кат. ({selectedIds.size || services.length})
              </button>
            </div>
          </div>
        </div>

        {/* Platform Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border">
          {PLATFORM_TABS.map((tab) => {
            const count = platformCounts[tab.id.toLowerCase()] || 0;
            const isActive = filters.platform.toLowerCase() === tab.id.toLowerCase();
            return (
              <button
                key={tab.id}
                onClick={() => setFilters((prev) => ({ ...prev, platform: tab.id, page: 1 }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Services Table */}
        <ServicesTable
          services={activeTab === "ready" ? readyServices : attentionServices}
          selectedIds={selectedIds}
          toggleSelection={toggleSelection}
          toggleAll={toggleAll}
          loading={loading}
          filters={filters}
          setFilters={setFilters}
          pagination={pagination}
          markup={parseFloat(markup) || 50}
          categories={categories}
          selectedCategories={selectedCategories}
          onCategoryChange={(svcId, catId) => {
            setSelectedCategories((prev) => ({ ...prev, [svcId]: catId }));
            setMissingCategoryIds((prev) => {
              const next = new Set(prev);
              next.delete(svcId);
              return next;
            });
          }}
          autoMappedCategories={autoMappedCategories}
          aiConfidence={aiConfidence}
          showCategoryColumn={true}
          validationErrors={missingCategoryIds}
          serviceOverrides={serviceOverrides}
          onTargetTypeChange={handleTargetTypeChange}
          onOpenEditModal={handleOpenEditModal}
        />
      </div>

      {/* Service Pre-Import Edit Modal */}
      <ServiceEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        service={editingService}
        categories={categories}
        defaultMarkup={parseFloat(markup) || 50}
        initialOverride={editingService ? serviceOverrides[String(editingService.service)] : undefined}
        onSaveOverride={handleSaveOverride}
        targetTenant={targetTenant}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmImport}
        selectedCount={selectedIds.size}
        markup={parseFloat(markup) || 50}
        platformBreakdown={[]}
        isPending={isPending}
        targetTenant={targetTenant}
        onTargetTenantChange={setTargetTenant}
        incompatibleCount={incompatibleIds.size}
        onExcludeIncompatible={handleExcludeIncompatible}
      />
    </div>
  );
}
