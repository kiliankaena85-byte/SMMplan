"use client";

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
import { Download, Search, SlidersHorizontal, RotateCcw } from "lucide-react";

/* ── AI Auto-Mapping ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const autoMapCategory = (s: any, categories: any[]) => {
  const platform = (s.metrics?.platform || "").toUpperCase();
  const category = (s.metrics?.category || "").toUpperCase();
  const serviceName = (s.name || "").toLowerCase();

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

  // Find the best category by scoring
  let bestCategory = null;
  let maxScore = -1;

  for (const c of targetCategories) {
    const catSlug = (c.slug || "").toUpperCase();
    const catName = (c.name || "").toLowerCase();
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
        
        // Count matching words
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

  // No confident match - return empty string to force manual mapping (prevent silent fallback)
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ImportWizard({ categories, providers }: { categories: any[]; providers: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Core state
  const [providerId, setProviderId] = useState<string>(providers[0]?.id || "");
  const [missingCategoryIds, setMissingCategoryIds] = useState<Set<string>>(new Set());
  // Bulk assigner state
  const [bulkCategory, setBulkCategory] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [services, setServices] = useState<any[]>([]);
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
        aiMap[idStr] = result.id;
        confidence[idStr] = result.confident;
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

  // Load services
  const loadServices = useCallback(async () => {
    if (!providerId) return;
    try {
      setLoading(true);
      setError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await fetchPaginatedExternalServices(providerId, filters, filters.page, filters.pageSize);
      if (!res.success) {
        if (res.emptyCache) {
          setIsEmptyCache(true);
          setServices([]);
          setPagination({ page: 1, totalPages: 1, total: 0, pageSize: 50 });
          setPlatformCounts({});
          setProviderCategories([]);
          return;
        }
        throw new Error(res.error || "Ошибка загрузки");
      }
      setIsEmptyCache(false);
      setServices(res.data || []);
      setPagination(res.pagination);
      if (res.platformCounts) setPlatformCounts(res.platformCounts);
      if (res.providerCategories) setProviderCategories(res.providerCategories);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [providerId, filters]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Force sync
  const handleForceSync = async () => {
    if (!providerId) return;
    try {
      setSyncing(true);
      setError(null);
      setIsEmptyCache(false);
      setServices([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await fetchExternalServices(providerId, true);
      if (!res.success) throw new Error(res.error || "Ошибка синхронизации");
      await loadServices();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e.message);
      setIsEmptyCache(true);
    } finally {
      setSyncing(false);
    }
  };

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    const currentPageIds = services.filter((s) => !s.alreadyImported && s.pricePerUnitProcurementRub > 0).map((s) => String(s.service));
    const allSelected = currentPageIds.every((id) => selectedIds.has(id)) && currentPageIds.length > 0;
    const newSet = new Set(selectedIds);
    if (allSelected) {
      currentPageIds.forEach((id) => newSet.delete(id));
    } else {
      currentPageIds.forEach((id) => newSet.add(id));
    }
    setSelectedIds(newSet);
  };

  const onCategoryChange = (serviceId: string, categoryId: string) => {
    setSelectedCategories((prev) => ({ ...prev, [serviceId]: categoryId }));
    if (missingCategoryIds.has(serviceId)) {
      setMissingCategoryIds((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  };

  const handleBulkAssign = () => {
    if (!bulkCategory) return;
    const nextCategories = { ...selectedCategories };
    selectedIds.forEach((id) => {
      nextCategories[id] = bulkCategory;
    });
    setSelectedCategories(nextCategories);
    setMissingCategoryIds(new Set());
    setBulkCategory(""); // reset
  };

  // Computed: split services into ready / needs attention
  const { readyServices, attentionServices } = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ready: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attention: any[] = [];
    services.forEach((s) => {
      if (s.alreadyImported) return; // skip imported
      const idStr = String(s.service);
      const isConfident = aiConfidence[idStr] === true;
      const isFreeProcurement = (s.pricePerUnitProcurementRub || 0) <= 0;
      if (isConfident && !isFreeProcurement) {
        ready.push(s);
      } else {
        attention.push(s);
      }
    });
    return { readyServices: ready, attentionServices: attention };
  }, [services, aiConfidence]);

  // Summary stats
  const summaryStats = useMemo(() => {
    return {
      totalInCache: platformCounts.ALL || pagination.total,
      newServices: pagination.total,
      aiReady: readyServices.length,
      needsAttention: attentionServices.length,
      alreadyImported: (platformCounts.ALL || 0) - pagination.total,
    };
  }, [pagination, readyServices, attentionServices, platformCounts]);

  // Platform breakdown for confirmation
  const platformBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; icon: string; name: string }> = {};
    selectedIds.forEach((id) => {
      const svc = services.find((s) => String(s.service) === id);
      if (!svc) return;
      const platform = svc.metrics?.platform?.toLowerCase() || "other";
      const tab = PLATFORM_TABS.find((t) => t.id === platform) || PLATFORM_TABS[6];
      if (!counts[platform]) counts[platform] = { count: 0, icon: tab.icon, name: tab.name };
      counts[platform].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [selectedIds, services]);

  // Import handler
  const handleBatchImport = async () => {
    if (selectedIds.size === 0) return setError("Выберите хотя бы 1 услугу");
    setShowConfirmModal(false);

    const missing = new Set<string>();
    selectedIds.forEach((id) => {
      if (!selectedCategories[id]) missing.add(id);
    });
    if (missing.size > 0) {
      setMissingCategoryIds(missing);
      return setError(`Для ${missing.size} выбранных услуг не выбрана категория. Назначьте категорию или используйте массовое применение.`);
    }
    setMissingCategoryIds(new Set());

    try {
      setError(null);
      setSuccess(null);
      const idsArray = Array.from(selectedIds);
      const total = idsArray.length;
      
      // Strict validation: check for missing categories
      const missingCategories = idsArray.filter((id) => !selectedCategories[id]);
      if (missingCategories.length > 0) {
        return setError(
          `Для ${missingCategories.length} выбранных услуг не указана категория. Используйте массовое назначение или выберите категорию вручную.`
        );
      }

      setImportProgress({ current: 0, total });

      const BATCH_SIZE = 50;
      let importedCount = 0;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunk = idsArray.slice(i, i + BATCH_SIZE);
        const chunkMap: Record<string, string> = {};
        chunk.forEach((id) => {
          chunkMap[id] = selectedCategories[id];
        });
        const percentVal = parseFloat(markup);
        const multiplier = isNaN(percentVal) || percentVal <= 0 ? 0 : 1 + percentVal / 100;
        
        // Pass the first mapped category as the mandatory categoryId, since all are overridden by chunkMap
        const fallbackCategoryId = chunkMap[chunk[0]];
        const res = await importSelectedServices(chunk, fallbackCategoryId, multiplier, providerId, chunkMap);
        
        if (res && !res.success) {
          throw new Error(
            `Ошибка на услугах ${i + 1}-${Math.min(i + BATCH_SIZE, total)} из ${total}. ` +
              `Уже импортировано: ${importedCount}. Ошибка: ${res.error}.`
          );
        }
        setSelectedIds((prev) => {
          const next = new Set(prev);
          chunk.forEach((id) => next.delete(id));
          return next;
        });
        importedCount += res?.imported || 0;
        setImportProgress({ current: Math.min(i + BATCH_SIZE, total), total });
      }

      setSuccess(`✅ Успешно импортировано ${importedCount} услуг!`);
      startTransition(() => {
        loadServices();
        router.refresh();
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImportProgress(null);
    }
  };

  const currentProvider = providers.find((p) => p.id === providerId);

  // ─── Step 1: Empty Cache ───
  if (isEmptyCache && !loading) {
    return (
      <div className="space-y-6">
        {/* Provider Selector */}
        <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-5 shadow-sm ring-1 ring-border/5">
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
            Провайдер
          </label>
          <Select value={providerId} onValueChange={(val) => { setProviderId(val || ""); setIsEmptyCache(false); }}>
            <SelectTrigger size="default" className="w-full max-w-sm h-11 bg-background text-sm rounded-[8px] border border-border">
              <SelectValue>
                {(value: string) => {
                  if (!value) return "Выберите провайдера";
                  return providers.find((p) => p.id === value)?.name ?? value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground border border-border rounded-[8px]">
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-sm cursor-pointer">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="p-3.5 bg-warning/10 text-warning border border-warning/20 rounded-xl text-sm font-semibold animate-in fade-in duration-200">
            {error}
          </div>
        )}

        {/* Sync CTA */}
        <div className="relative overflow-hidden flex flex-col items-center justify-center py-20 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl shadow-sm ring-1 ring-border/5">
          {/* Premium Backdrop Pattern */}
          <div className="absolute inset-0 z-0 opacity-70 premium-dot-grid pointer-events-none" />
          
          <div className="relative z-10 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5 shadow-inner">
            <Download className="w-7 h-7 text-primary" />
          </div>
          <h3 className="relative z-10 text-lg font-bold mb-2 text-foreground">Каталог провайдера пуст</h3>
          <p className="relative z-10 text-muted-foreground text-sm max-w-md text-center mb-6 px-4 leading-relaxed">
            Загрузите полный каталог услуг от{" "}
            <span className="font-semibold text-foreground">{currentProvider?.name || "провайдера"}</span>{" "}
            для просмотра и импорта. Это займет несколько секунд.
          </p>
          <button
            onClick={handleForceSync}
            disabled={syncing}
            className="relative z-10 bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-8 py-3 rounded-[10px] shadow-sm disabled:opacity-50 transition-all duration-200 flex items-center gap-2.5 cursor-pointer text-sm hover:-translate-y-0.5 active:scale-95"
          >
            {syncing ? (
              <>
                <span className="animate-spin">⏳</span> Загрузка каталога...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Загрузить каталог
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
 
  // ─── Step 2: Main Workspace ───
  const displayServices = activeTab === "ready" ? readyServices : attentionServices;
 
  return (
    <div className="space-y-5">
      {/* Provider Selector (compact) */}
      {providers.length > 1 && (
        <div className="relative overflow-hidden bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-sm ring-1 ring-border/5">
          {/* Premium Backdrop Pattern */}
          <div className="absolute inset-0 z-0 opacity-40 premium-dot-grid pointer-events-none" />
          <div className="relative z-10">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
              Провайдер
            </label>
            <Select value={providerId} onValueChange={(val) => { setProviderId(val || ""); setSelectedIds(new Set()); }}>
              <SelectTrigger size="default" className="w-full max-w-sm h-10 bg-background text-sm rounded-[8px] border border-border">
                <SelectValue>
                  {(value: string) => {
                    if (!value) return "Выберите провайдера";
                    return providers.find((p) => p.id === value)?.name ?? value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground border border-border rounded-[8px]">
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-sm cursor-pointer">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Summary Dashboard */}
      <SummaryDashboard
        totalInCache={summaryStats.totalInCache}
        newServices={summaryStats.newServices}
        aiReady={summaryStats.aiReady}
        needsAttention={summaryStats.needsAttention}
        alreadyImported={summaryStats.alreadyImported > 0 ? summaryStats.alreadyImported : 0}
        selectedCount={selectedIds.size}
        markup={markup}
        onMarkupChange={setMarkup}
        onImport={() => setShowConfirmModal(true)}
        onResync={handleForceSync}
        importDisabled={importProgress !== null || selectedIds.size === 0 || isPending}
        syncing={syncing}
        importProgress={importProgress}
        providerName={currentProvider?.name || "Провайдер"}
      />

      {/* Alerts */}
      {error && (
        <div className="p-3.5 bg-warning/10 text-warning border border-warning/20 rounded-xl text-sm font-semibold animate-in fade-in duration-200">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3.5 bg-success/10 text-success border border-success/20 rounded-xl text-sm font-semibold animate-in fade-in duration-200">
          {success}
        </div>
      )}

      {/* Ready / Attention Tabs */}
      <div className="flex items-center gap-1.5 bg-muted/40 p-1.5 rounded-[14px] w-fit border border-border/40">
        <button
          onClick={() => setActiveTab("ready")}
          className={`px-4 py-2.5 rounded-[10px] text-sm font-bold transition-all duration-300 cursor-pointer flex items-center gap-2 active:scale-[0.98] ${
            activeTab === "ready"
              ? "bg-card text-foreground shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
          }`}
        >
          ✅ Готовые к импорту
          <span className={`text-xs px-2 py-0.5 rounded-full tabular-nums font-bold ${
            activeTab === "ready" ? "bg-success/15 text-success-600 dark:text-success-400" : "bg-muted text-muted-foreground"
          }`}>
            {readyServices.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("attention")}
          className={`px-4 py-2.5 rounded-[10px] text-sm font-bold transition-all duration-300 cursor-pointer flex items-center gap-2 active:scale-[0.98] ${
            activeTab === "attention"
              ? "bg-card text-foreground shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
          }`}
        >
          ⚠️ Требуют настройки
          <span className={`text-xs px-2 py-0.5 rounded-full tabular-nums font-bold ${
            activeTab === "attention" ? "bg-warning/15 text-warning-600 dark:text-warning-400" : "bg-muted text-muted-foreground"
          }`}>
            {attentionServices.length}
          </span>
        </button>
      </div>

      {/* Platform Tabs + Filters */}
      <div className="space-y-3">
        {/* Horizontal Platform Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {PLATFORM_TABS.map((tab) => {
            const count = platformCounts[tab.id] ?? 0;
            const isActive = filters.platform === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilters((prev) => ({ ...prev, platform: tab.id, page: 1 }))}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border ${
                  isActive
                    ? "bg-secondary text-secondary-foreground border-border shadow-sm"
                    : "bg-transparent text-muted-foreground hover:bg-muted/50 border-transparent hover:border-border"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted-foreground/15 text-muted-foreground"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search + Filter Toggle + Reset */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск по названию или ID..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full text-sm bg-background text-foreground placeholder-muted-foreground border border-border rounded-[8px] py-2.5 pl-9 pr-3 focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
            />
            {localSearch && (
              <button onClick={() => setLocalSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer">
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-[8px] text-xs font-semibold border transition-all duration-200 cursor-pointer ${
              showFilters
                ? "bg-primary/5 text-primary border-primary/20"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Фильтры
          </button>
          
          {isFiltersActive && (
            <button
              onClick={() => {
                setLocalSearch("");
                setFilters({ ...DEFAULT_FILTERS });
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-[8px] text-xs font-semibold border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-all duration-200 cursor-pointer animate-in fade-in zoom-in-95 duration-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Сбросить
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-1 duration-200 shadow-sm ring-1 ring-border/5">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Категория на сайте</label>
              <select
                value={filters.category || "ALL"}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value, page: 1 }))}
                className="w-full text-xs border border-border rounded-[6px] p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="ALL">Все типы</option>
                <option value="SUBSCRIBERS">Подписчики / Участники</option>
                <option value="LIKES">Лайки / Нравится</option>
                <option value="VIEWS">Просмотры / Охват</option>
                <option value="REPOSTS">Репосты / Поделиться</option>
                <option value="REACTIONS">Реакции / Эмодзи</option>
                <option value="COMMENTS">Комментарии / Отзывы</option>
                <option value="POLLS">Голоса / Опросы</option>
                <option value="STORIES">Сториз / Истории</option>
                <option value="BOOSTS">Бусты (Levels)</option>
                <option value="BOTS">Роботы / Боты</option>
                <option value="REFERRALS">Рефералы</option>
                <option value="FRIENDS">Заявки в друзья</option>
                <option value="PLAYS">Прослушивания</option>
                <option value="TRAFFIC">Трафик / Посещения</option>
                <option value="STARS">Звезды (Stars)</option>
                <option value="PREMIUM">Premium</option>
                <option value="OTHER">Другое</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Категория провайдера</label>
              <select
                value={filters.providerCategory || "ALL"}
                onChange={(e) => setFilters((prev) => ({ ...prev, providerCategory: e.target.value, page: 1 }))}
                className="w-full text-xs border border-border rounded-[6px] p-2 bg-background focus:ring-1 focus:ring-primary outline-none max-w-full"
              >
                <option value="ALL">Все категории ({providerCategories.reduce((acc, curr) => acc + curr.count, 0)})</option>
                {providerCategories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Статус импорта</label>
              <select
                value={filters.importStatus || "ALL"}
                onChange={(e) => setFilters((prev) => ({ ...prev, importStatus: e.target.value, page: 1 }))}
                className="w-full text-xs border border-border rounded-[6px] p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="ALL">Все услуги</option>
                <option value="NOT_IMPORTED">Только новые</option>
                <option value="IMPORTED">Только импортированные</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Сортировка</label>
              <select
                value={filters.sortBy || "none"}
                onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value, page: 1 }))}
                className="w-full text-xs border border-border rounded-[6px] p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="none">По умолчанию</option>
                <option value="price_asc">Цена: дешевые</option>
                <option value="price_desc">Цена: дорогие</option>
                <option value="name_asc">Имя: А-Я</option>
                <option value="min_asc">Мин. заказ: ↑</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Цена закупки (₽)</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="от"
                  value={filters.minPrice}
                  onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: e.target.value, page: 1 }))}
                  className="w-full text-xs border border-border rounded-[6px] p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
                />
                <span className="text-muted-foreground text-xs">—</span>
                <input
                  type="number"
                  placeholder="до"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value, page: 1 }))}
                  className="w-full text-xs border border-border rounded-[6px] p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Регион</label>
              <select
                value={filters.geo || "ALL"}
                onChange={(e) => setFilters((prev) => ({ ...prev, geo: e.target.value, page: 1 }))}
                className="w-full text-xs border border-border rounded-[6px] p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="ALL">Весь мир</option>
                <option value="RU">Россия</option>
                <option value="USA">США</option>
                <option value="KZ">Казахстан</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 pt-2 col-span-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filters.hasRefill}
                    onChange={(e) => setFilters((prev) => ({ ...prev, hasRefill: e.target.checked, page: 1 }))}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground font-semibold">♻️ С гарантией</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filters.retailReady}
                    onChange={(e) => setFilters((prev) => ({ ...prev, retailReady: e.target.checked, page: 1 }))}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground font-semibold">🛍️ Для розницы (min ≤ 100)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filters.hasAnomaly}
                    onChange={(e) => setFilters((prev) => ({ ...prev, hasAnomaly: e.target.checked, page: 1 }))}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground font-semibold">🔸 С аномалиями</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-200 shadow-sm ring-1 ring-primary/10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-primary">Выбрано услуг: {selectedIds.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={bulkCategory} onValueChange={(val) => setBulkCategory(val || "")}>
              <SelectTrigger className="w-[260px] h-9 bg-background/50 shadow-sm border-primary/20 text-xs transition-colors hover:border-primary/40 focus:ring-1 focus:ring-primary/20">
                <SelectValue placeholder="Массовое назначение категории...">
                  {(value: string) => {
                    if (!value) return "Массовое назначение категории...";
                    const cat = categories.find((c) => c.id === value);
                    return cat ? `${cat.network.name} • ${cat.name}` : value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px] bg-popover text-popover-foreground border border-border shadow-md rounded-[8px]">
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs cursor-pointer focus:bg-primary/10">
                    {c.network.name} • {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={handleBulkAssign}
              disabled={!bulkCategory}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 h-9 rounded-xl text-xs font-bold disabled:opacity-50 transition-all shadow-sm active:scale-95 disabled:active:scale-100 cursor-pointer"
            >
              Применить ко всем
            </button>
          </div>
        </div>
      )}

      {/* Services Table */}
      <ServicesTable
        services={displayServices}
        validationErrors={missingCategoryIds}
        selectedIds={selectedIds}
        toggleSelection={toggleSelection}
        toggleAll={toggleAll}
        loading={loading || syncing}
        filters={filters}
        setFilters={setFilters}
        pagination={pagination}
        markup={parseFloat(markup) || 0}
        categories={categories}
        selectedCategories={selectedCategories}
        onCategoryChange={onCategoryChange}
        autoMappedCategories={autoMappedCategories}
        aiConfidence={aiConfidence}
        showCategoryColumn={true}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleBatchImport}
        selectedCount={selectedIds.size}
        markup={parseFloat(markup) || 0}
        platformBreakdown={platformBreakdown}
        isPending={importProgress !== null}
      />
    </div>
  );
}
