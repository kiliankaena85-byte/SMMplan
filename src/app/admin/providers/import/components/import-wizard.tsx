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
import { Download, Search, SlidersHorizontal } from "lucide-react";

/* ── AI Auto-Mapping ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const autoMapCategory = (s: any, categories: any[]) => {
  const platform = (s.metrics?.platform || "").toUpperCase();
  const category = (s.metrics?.category || "").toUpperCase();
  const serviceName = (s.name || "").toLowerCase();

  const target = categories.find((c) => {
    const netSlug = c.network?.slug?.toUpperCase() || "";
    const catSlug = c.slug?.toUpperCase() || "";
    const catName = (c.name || "").toLowerCase();

    if (netSlug === platform) {
      if (category === "SUBSCRIBERS" && (catSlug.includes("SUB") || catSlug.includes("MEMBER") || catSlug.includes("CHANNEL") || catSlug.includes("GROUP") || catName.includes("подпис") || catName.includes("участ"))) return true;
      if (category === "LIKES" && (catSlug.includes("LIKE") || catSlug.includes("HEART") || catName.includes("лайк"))) return true;
      if (category === "VIEWS" && (catSlug.includes("VIEW") || catSlug.includes("PLAY") || catName.includes("просм"))) return true;
      if (category === "REPOSTS" && (catSlug.includes("REPOST") || catSlug.includes("SHARE") || catName.includes("репост"))) return true;
      if (category === "REACTIONS" && (catSlug.includes("REACT") || catSlug.includes("EMOJI") || catName.includes("реакц"))) return true;
      if (category === "COMMENTS" && (catSlug.includes("COMMENT") || catSlug.includes("REPLY") || catName.includes("коммен"))) return true;
      if (category === "STORIES" && (catSlug.includes("STORY") || catSlug.includes("STORIES") || catName.includes("сторис"))) return true;
    }
    return false;
  });
  if (target) return { id: target.id, confident: true };

  const nameTarget = categories.find((c) => {
    const netSlug = c.network?.slug?.toUpperCase() || "";
    const catName = (c.name || "").toLowerCase();
    if (netSlug === platform) {
      if (serviceName.includes("sub") || serviceName.includes("member") || serviceName.includes("подпис") || serviceName.includes("участ")) {
        return catName.includes("подпис") || catName.includes("участ") || c.slug.includes("sub");
      }
      if (serviceName.includes("like") || serviceName.includes("лайк")) {
        return catName.includes("лайк") || c.slug.includes("like");
      }
      if (serviceName.includes("view") || serviceName.includes("просм")) {
        return catName.includes("просм") || c.slug.includes("view");
      }
    }
    return false;
  });
  if (nameTarget) return { id: nameTarget.id, confident: true };

  const fallbackNet = categories.find((c) => (c.network?.slug || "").toUpperCase() === platform);
  if (fallbackNet) return { id: fallbackNet.id, confident: false };

  return { id: categories[0]?.id || "", confident: false };
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

/* ── Main Component ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ImportWizard({ categories, providers }: { categories: any[]; providers: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Core state
  const [providerId, setProviderId] = useState<string>(providers[0]?.id || "");
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [targetCategory, setTargetCategory] = useState<string>(categories[0]?.id || "");

  // Filters
  const [activeTab, setActiveTab] = useState<"ready" | "attention">("ready");
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 50,
    platform: "ALL",
    geo: "ALL",
    velocity: "ALL",
    hasRefill: false,
    hasAnomaly: false,
    hideImported: true,
    search: "",
    sortBy: "none",
    category: "ALL",
    retailReady: false,
  });
  const [localSearch, setLocalSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, pageSize: 50 });
  const [platformCounts, setPlatformCounts] = useState<Record<string, number>>({});
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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
          return;
        }
        throw new Error(res.error || "Ошибка загрузки");
      }
      setIsEmptyCache(false);
      setServices(res.data || []);
      setPagination(res.pagination);
      if (res.platformCounts) setPlatformCounts(res.platformCounts);
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const totalInCache = pagination.total + (services.filter((s) => s.alreadyImported).length || 0);
    return {
      totalInCache: platformCounts.ALL || pagination.total,
      newServices: pagination.total,
      aiReady: readyServices.length,
      needsAttention: attentionServices.length,
      alreadyImported: (platformCounts.ALL || 0) - pagination.total,
    };
  }, [pagination, readyServices, attentionServices, platformCounts, services]);

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
    try {
      setError(null);
      setSuccess(null);
      const idsArray = Array.from(selectedIds);
      const total = idsArray.length;
      setImportProgress({ current: 0, total });

      const BATCH_SIZE = 50;
      let importedCount = 0;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunk = idsArray.slice(i, i + BATCH_SIZE);
        const chunkMap: Record<string, string> = {};
        chunk.forEach((id) => {
          chunkMap[id] = selectedCategories[id] || targetCategory;
        });
        const percentVal = parseFloat(markup);
        const multiplier = isNaN(percentVal) || percentVal <= 0 ? 0 : 1 + percentVal / 100;
        const res = await importSelectedServices(chunk, targetCategory, multiplier, providerId, chunkMap);
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
        <div className="bg-card border border-border rounded-[12px] p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
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
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-[12px] shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
            <Download className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-lg font-bold mb-2 text-foreground">Каталог провайдера пуст</h3>
          <p className="text-muted-foreground text-sm max-w-md text-center mb-6 px-4 leading-relaxed">
            Загрузите полный каталог услуг от{" "}
            <span className="font-semibold text-foreground">{currentProvider?.name || "провайдера"}</span>{" "}
            для просмотра и импорта. Это займет несколько секунд.
          </p>
          <button
            onClick={handleForceSync}
            disabled={syncing}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-8 py-3 rounded-[10px] shadow-sm disabled:opacity-50 transition-all duration-200 flex items-center gap-2.5 cursor-pointer text-sm"
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const displayServices = activeTab === "ready" ? readyServices : attentionServices;

  return (
    <div className="space-y-5">
      {/* Provider Selector (compact) */}
      {providers.length > 1 && (
        <div className="bg-card border border-border rounded-[12px] p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
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
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-[10px] w-fit">
        <button
          onClick={() => setActiveTab("ready")}
          className={`px-4 py-2 rounded-[8px] text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
            activeTab === "ready"
              ? "bg-card text-foreground shadow-sm border border-border/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ✅ Готовые к импорту
          <span className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${
            activeTab === "ready" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          }`}>
            {readyServices.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("attention")}
          className={`px-4 py-2 rounded-[8px] text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
            activeTab === "attention"
              ? "bg-card text-foreground shadow-sm border border-border/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ⚠️ Требуют настройки
          <span className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${
            activeTab === "attention" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
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

        {/* Search + Filter Toggle */}
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
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.hideImported}
              onChange={(e) => setFilters((prev) => ({ ...prev, hideImported: e.target.checked, page: 1 }))}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
            />
            <span className="text-xs font-medium text-muted-foreground">Скрыть импортированные</span>
          </label>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="bg-muted/30 border border-border rounded-[10px] p-4 grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Категория</label>
              <select
                value={filters.category || "ALL"}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value, page: 1 }))}
                className="w-full text-xs border border-border rounded-[6px] p-2 bg-background"
              >
                <option value="ALL">Все типы</option>
                <option value="SUBSCRIBERS">Подписчики</option>
                <option value="LIKES">Лайки</option>
                <option value="VIEWS">Просмотры</option>
                <option value="COMMENTS">Комментарии</option>
                <option value="REACTIONS">Реакции</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Регион</label>
              <select
                value={filters.geo || "ALL"}
                onChange={(e) => setFilters((prev) => ({ ...prev, geo: e.target.value, page: 1 }))}
                className="w-full text-xs border border-border rounded-[6px] p-2 bg-background"
              >
                <option value="ALL">Весь мир</option>
                <option value="RU">Россия</option>
                <option value="USA">США</option>
                <option value="KZ">Казахстан</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Сортировка</label>
              <select
                value={filters.sortBy || "none"}
                onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value, page: 1 }))}
                className="w-full text-xs border border-border rounded-[6px] p-2 bg-background"
              >
                <option value="none">По умолчанию</option>
                <option value="price_asc">Цена: дешевые</option>
                <option value="price_desc">Цена: дорогие</option>
                <option value="name_asc">Имя: А-Я</option>
                <option value="min_asc">Мин. заказ: ↑</option>
              </select>
            </div>
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.hasRefill}
                  onChange={(e) => setFilters((prev) => ({ ...prev, hasRefill: e.target.checked, page: 1 }))}
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">♻️ С гарантией</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.retailReady}
                  onChange={(e) => setFilters((prev) => ({ ...prev, retailReady: e.target.checked, page: 1 }))}
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">🛍️ Для розницы</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Services Table */}
      <ServicesTable
        services={services}
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
        showCategoryColumn={activeTab === "attention"}
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
