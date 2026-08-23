'use client';

import { useState, useTransition, useMemo } from "react";
import { 
  Network as NetworkIcon, 
  FolderTree, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Trash2, 
  Edit3, 
  Power, 
  Zap, 
  Search, 
  Check, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Layers,
  Sparkles,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { 
  toggleServiceStatusAction, 
  bulkUpdateCategoryMarkupAction, 
  toggleCategoryServicesAction,
  quickUpdateServiceAction,
  deleteServiceTreeAction
} from "@/actions/admin/catalog/tree";
import { createServiceAction } from "@/actions/admin/catalog/services";
import { createCategory, createNetworkAction } from "@/actions/admin/catalog/categories";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { formatPricePerUnit, formatRubles } from "@/utils/format-price";

export interface TreeService {
  id: string;
  numericId: number;
  name: string;
  rate: number;
  markup: number;
  pricePer1000Cents: number;
  minQty: number;
  maxQty: number;
  externalId: string | null;
  targetType: string | null;
  isActive: boolean;
  isQuarantined: boolean;
  provider: { id: string; name: string; balanceCurrency: string } | null;
}

export interface TreeCategory {
  id: string;
  name: string;
  slug: string;
  sort: number;
  requireWarning: boolean;
  warningMessage: string | null;
  analyzerTags: string | null;
  networkId: string | null;
  services: TreeService[];
}

export interface TreeNetwork {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort: number;
  categories: TreeCategory[];
}

interface ProviderOption {
  id: string;
  name: string;
  balanceCurrency: string;
}

export function CatalogTreeExplorer({ 
  networks: initialNetworks,
  providers 
}: { 
  networks: TreeNetwork[];
  providers: ProviderOption[];
}) {
  const [networks, setNetworks] = useState<TreeNetwork[]>(initialNetworks);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNetworks, setExpandedNetworks] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    initialNetworks.forEach(n => { init[n.id] = true; });
    return init;
  });

  // Selected state: can be a category or a network
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>(initialNetworks[0]?.id || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialNetworks[0]?.categories[0]?.id || ""
  );

  const [isPending, startTransition] = useTransition();

  // Modals state
  const [addServiceModalOpen, setAddServiceModalOpen] = useState(false);
  const [addNetworkModalOpen, setAddNetworkModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<TreeService | null>(null);
  const [bulkMarkupInput, setBulkMarkupInput] = useState<string>("3.0");
  const [deleteConfirmService, setDeleteConfirmService] = useState<TreeService | null>(null);

  // Quick category creation
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Find active node
  const activeNetwork = useMemo(() => {
    return networks.find(n => n.id === selectedNetworkId) || networks[0];
  }, [networks, selectedNetworkId]);

  const activeCategory = useMemo(() => {
    if (!activeNetwork) return null;
    return activeNetwork.categories.find(c => c.id === selectedCategoryId) || activeNetwork.categories[0] || null;
  }, [activeNetwork, selectedCategoryId]);

  const toggleNetworkExpand = (id: string) => {
    setExpandedNetworks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectCategory = (networkId: string, categoryId: string) => {
    setSelectedNetworkId(networkId);
    setSelectedCategoryId(categoryId);
  };

  // Toggle single service
  const handleToggleService = (service: TreeService) => {
    const nextState = !service.isActive;
    // Optimistic update
    setNetworks(prev => prev.map(net => ({
      ...net,
      categories: net.categories.map(cat => ({
        ...cat,
        services: cat.services.map(srv => 
          srv.id === service.id ? { ...srv, isActive: nextState } : srv
        )
      }))
    })));

    startTransition(async () => {
      const res = await toggleServiceStatusAction(service.id, nextState);
      if (res.success) {
        toast.success(`Услуга ${nextState ? 'включена' : 'отключена'}`);
      } else {
        toast.error(res.error || 'Ошибка изменения статуса');
      }
    });
  };

  // Bulk category markup
  const handleBulkMarkup = () => {
    if (!activeCategory) return;
    const markupVal = parseFloat(bulkMarkupInput);
    if (isNaN(markupVal) || markupVal < 1.0) {
      toast.error("Введите корректную наценку (например, 3.0 = 300%)");
      return;
    }

    startTransition(async () => {
      const res = await bulkUpdateCategoryMarkupAction(activeCategory.id, markupVal);
      if (res.success) {
        toast.success(`Наценка ${markupVal}x применена ко всем ${res.count} услугам`);
        // Update local state
        setNetworks(prev => prev.map(net => ({
          ...net,
          categories: net.categories.map(cat => 
            cat.id === activeCategory.id ? {
              ...cat,
              services: cat.services.map(s => ({
                ...s,
                markup: markupVal,
                pricePer1000Cents: Math.round(s.rate * markupVal * 10000)
              }))
            } : cat
          )
        })));
      } else {
        toast.error(res.error || 'Ошибка применения наценки');
      }
    });
  };

  // Toggle all services in category
  const handleToggleAllCategory = (enable: boolean) => {
    if (!activeCategory) return;
    startTransition(async () => {
      const res = await toggleCategoryServicesAction(activeCategory.id, enable);
      if (res.success) {
        toast.success(`Все услуги категории ${enable ? 'включены' : 'выключены'}`);
        setNetworks(prev => prev.map(net => ({
          ...net,
          categories: net.categories.map(cat => 
            cat.id === activeCategory.id ? {
              ...cat,
              services: cat.services.map(s => ({ ...s, isActive: enable }))
            } : cat
          )
        })));
      } else {
        toast.error(res.error || 'Ошибка переключения');
      }
    });
  };

  // Delete service
  const executeDeleteService = () => {
    if (!deleteConfirmService) return;
    const serviceId = deleteConfirmService.id;
    setDeleteConfirmService(null);

    startTransition(async () => {
      const res = await deleteServiceTreeAction(serviceId);
      if (res.success) {
        toast.success('Услуга удалена');
        setNetworks(prev => prev.map(net => ({
          ...net,
          categories: net.categories.map(cat => ({
            ...cat,
            services: cat.services.filter(s => s.id !== serviceId)
          }))
        })));
      } else {
        toast.error(res.error || 'Ошибка удаления');
      }
    });
  };

  // Quick category creation
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !activeNetwork) return;

    startTransition(async () => {
      const res = await createCategory({
        name: newCategoryName.trim(),
        networkId: activeNetwork.id,
        sort: (activeNetwork.categories.length + 1) * 10
      });

      if (res.success && res.categoryId) {
        toast.success(`Категория «${newCategoryName}» создана в ${activeNetwork.name}`);
        setNewCategoryName("");
        setIsCreatingCategory(false);
        const newCatId = res.categoryId;
        // Add to state
        setNetworks(prev => prev.map(net => 
          net.id === activeNetwork.id ? {
            ...net,
            categories: [...net.categories, {
              id: newCatId,
              name: newCategoryName.trim(),
              slug: `${activeNetwork.slug}-${newCategoryName.trim().toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-')}`,
              sort: (activeNetwork.categories.length + 1) * 10,
              requireWarning: false,
              warningMessage: null,
              analyzerTags: null,
              networkId: activeNetwork.id,
              services: []
            }]
          } : net
        ));
        setSelectedCategoryId(newCatId);
      } else {
        toast.error(res.error || 'Ошибка создания категории');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      
      {/* ── LEFT PANE: Master Tree Explorer (4 cols) ── */}
      <div className="lg:col-span-4 bg-card border border-border rounded-2xl shadow-xs overflow-hidden sticky top-6">
        <div className="p-4 border-b border-border bg-muted/20 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-primary" />
              Дерево Каталога
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAddNetworkModalOpen(true)}
                className="px-2 py-0.5 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-md border border-primary/20 transition-all cursor-pointer"
                title="Добавить новую социальную сеть"
              >
                + Соцсеть
              </button>
              <span className="text-[11px] font-mono text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-border">
                {networks.reduce((acc, n) => acc + n.categories.reduce((ca, c) => ca + c.services.length, 0), 0)} услуг
              </span>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по соцсетям и категориям..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Tree Nodes */}
        <div className="p-2 space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto">
          {networks.map(net => {
            const isExpanded = expandedNetworks[net.id] ?? true;
            const isNetActive = selectedNetworkId === net.id;
            const filteredCategories = net.categories.filter(c => 
              c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              net.name.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (searchQuery && filteredCategories.length === 0 && !net.name.toLowerCase().includes(searchQuery.toLowerCase())) {
              return null;
            }

            return (
              <div key={net.id} className="rounded-xl border border-border/50 bg-background/50 overflow-hidden">
                {/* Network Header Item */}
                <div 
                  onClick={() => {
                    setSelectedNetworkId(net.id);
                    if (net.categories[0]) {
                      setSelectedCategoryId(net.categories[0].id);
                    }
                  }}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors duration-150 ${
                    isNetActive ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/40 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleNetworkExpand(net.id); }}
                      className="p-1 hover:bg-muted/60 rounded text-muted-foreground"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-xs font-bold uppercase tracking-wide">🌐 {net.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded border border-border/30">
                    {net.categories.length} кат.
                  </span>
                </div>

                {/* Categories inside Network */}
                {isExpanded && (
                  <div className="pl-6 pr-2 py-1 space-y-1 bg-muted/10 border-t border-border/30">
                    {filteredCategories.map(cat => {
                      const isCatActive = selectedCategoryId === cat.id;
                      const activeCount = cat.services.filter(s => s.isActive).length;
                      return (
                        <div
                          key={cat.id}
                          onClick={() => handleSelectCategory(net.id, cat.id)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-all duration-150 ${
                            isCatActive 
                              ? 'bg-primary text-primary-foreground font-semibold shadow-xs' 
                              : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span>📁</span>
                            <span className="truncate">{cat.name}</span>
                          </div>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                            isCatActive 
                              ? 'bg-primary-foreground/20 text-primary-foreground' 
                              : 'bg-muted text-muted-foreground border border-border/30'
                          }`}>
                            {activeCount}/{cat.services.length}
                          </span>
                        </div>
                      );
                    })}

                    {/* Quick Add Category in this network */}
                    {isCreatingCategory && selectedNetworkId === net.id ? (
                      <form onSubmit={handleCreateCategory} className="pt-1 pb-1 flex gap-1.5">
                        <input
                          type="text"
                          required
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                          placeholder="Название категории..."
                          className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded-md text-foreground outline-hidden focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="submit"
                          disabled={isPending}
                          className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-md font-bold"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCreatingCategory(false)}
                          className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md"
                        >
                          ✕
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNetworkId(net.id);
                          setIsCreatingCategory(true);
                        }}
                        className="w-full text-left py-1 text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer pl-1"
                      >
                        <Plus className="w-3 h-3" />
                        Добавить категорию в {net.name}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT PANE: Active Category Workspace (8 cols) ── */}
      <div className="lg:col-span-8 space-y-6">
        
        {activeCategory ? (
          <>
            {/* Category Breadcrumbs & Meta Cockpit */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span>🌐 {activeNetwork.name}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-foreground font-bold">📁 {activeCategory.name}</span>
                  </div>
                  <h1 className="text-xl font-bold text-foreground tracking-tight">
                    {activeNetwork.name} — {activeCategory.name}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setAddServiceModalOpen(true)}
                    intent="primary"
                    size="sm"
                    className="cursor-pointer font-bold gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить услугу
                  </Button>
                </div>
              </div>

              {/* Category Settings Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-border/60">
                <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Тип ссылки (targetType)</span>
                  <p className="text-xs font-mono font-bold text-foreground">
                    {activeCategory.slug.includes('sub') || activeCategory.slug.includes('fol') ? 'PROFILE / CHANNEL' : 'POST / VIDEO'}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Всего услуг в категории</span>
                  <p className="text-xs font-mono font-bold text-foreground">
                    {activeCategory.services.length} позиций ({activeCategory.services.filter(s => s.isActive).length} активны)
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Действия с категорией</span>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      onClick={() => handleToggleAllCategory(true)}
                      className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Включить все
                    </button>
                    <span className="text-muted-foreground">•</span>
                    <button
                      onClick={() => handleToggleAllCategory(false)}
                      className="text-[11px] font-semibold text-destructive hover:underline cursor-pointer"
                    >
                      Выключить все
                    </button>
                  </div>
                </div>
              </div>

              {/* Bulk Markup Quick Bar */}
              <div className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border border-border/50 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-warning" />
                  <span className="text-xs font-bold text-foreground">Массовая наценка категории:</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="50.0"
                    value={bulkMarkupInput}
                    onChange={e => setBulkMarkupInput(e.target.value)}
                    className="w-20 h-8 px-2 text-xs font-mono bg-background border border-border rounded-lg text-foreground text-center"
                  />
                  <span className="text-xs font-mono text-muted-foreground">x</span>
                  <Button
                    onClick={handleBulkMarkup}
                    disabled={isPending}
                    size="sm"
                    className="h-8 text-xs font-bold cursor-pointer"
                  >
                    {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    Применить ко всем
                  </Button>
                </div>
              </div>
            </div>

            {/* Services List Cards */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Список услуг ({activeCategory.services.length})</span>
                <span className="text-[11px] font-normal normal-case">Розничная цена = Закупка × Наценка</span>
              </h3>

              {activeCategory.services.length === 0 ? (
                <div className="p-8 text-center bg-card border border-border rounded-2xl space-y-3">
                  <Layers className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-sm font-semibold text-foreground">В этой категории пока нет услуг</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Добавьте первую услугу для {activeNetwork.name} или импортируйте тарифы от поставщика.
                  </p>
                  <Button
                    onClick={() => setAddServiceModalOpen(true)}
                    intent="primary"
                    size="sm"
                    className="cursor-pointer"
                  >
                    + Добавить услугу
                  </Button>
                </div>
              ) : (
                activeCategory.services.map(srv => {
                  const retailPerUnit = formatPricePerUnit(srv.pricePer1000Cents / 100000);
                  const retailPer1000 = formatPricePerUnit(srv.pricePer1000Cents / 100);

                  return (
                    <div 
                      key={srv.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 bg-card ${
                        srv.isActive 
                          ? 'border-border shadow-xs hover:border-primary/40' 
                          : 'border-border/40 opacity-60 bg-muted/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        
                        {/* Left: Info */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-muted-foreground">#{srv.numericId}</span>
                            <h4 className="text-sm font-bold text-foreground truncate">{srv.name}</h4>
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-muted text-muted-foreground border border-border/30">
                              {srv.targetType || 'POST'}
                            </span>
                            {srv.provider && (
                              <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                                🔌 {srv.provider.name} {srv.externalId ? `(#${srv.externalId})` : ''}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1 font-mono">
                            <div>
                              Закупка: <span className="font-bold text-foreground">${formatPricePerUnit(srv.rate)}</span>
                            </div>
                            <div>•</div>
                            <div>
                              Наценка: <span className="font-bold text-foreground">{srv.markup}x</span>
                            </div>
                            <div>•</div>
                            <div>
                              Розница: <span className="font-bold text-success">{retailPerUnit} ₽ / шт</span> ({retailPer1000} ₽/1000)
                            </div>
                            <div>•</div>
                            <div>
                              Лимиты: {srv.minQty} – {srv.maxQty.toLocaleString('ru-RU')} шт.
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Toggle Active Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleService(srv)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                              srv.isActive
                                ? 'bg-success/10 text-success border border-success/20 hover:bg-success/20'
                                : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                            {srv.isActive ? 'ВКЛ' : 'ВЫКЛ'}
                          </button>

                          {/* Quick Edit */}
                          <button
                            type="button"
                            onClick={() => setEditingService(srv)}
                            className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Редактировать услугу"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmService(srv)}
                            className="p-1.5 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                            title="Удалить услугу"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="p-12 text-center bg-card border border-border rounded-2xl space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">Выберите категорию слева для управления услугами</p>
          </div>
        )}

      </div>

      {/* ── MODAL: Create New Service ── */}
      {addServiceModalOpen && activeCategory && (
        <CreateServiceModal
          network={activeNetwork}
          category={activeCategory}
          providers={providers}
          onClose={() => setAddServiceModalOpen(false)}
          onCreated={(newService) => {
            setAddServiceModalOpen(false);
            setNetworks(prev => prev.map(net => 
              net.id === activeNetwork.id ? {
                ...net,
                categories: net.categories.map(cat => 
                  cat.id === activeCategory.id ? {
                    ...cat,
                    services: [...cat.services, newService]
                  } : cat
                )
              } : net
            ));
          }}
        />
      )}

      {/* ── MODAL: Edit Service ── */}
      {editingService && (
        <EditServiceModal
          service={editingService}
          providers={providers}
          onClose={() => setEditingService(null)}
          onUpdated={(updated) => {
            setEditingService(null);
            setNetworks(prev => prev.map(net => ({
              ...net,
              categories: net.categories.map(cat => ({
                ...cat,
                services: cat.services.map(s => s.id === updated.id ? { ...s, ...updated } : s)
              }))
            })));
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmService)}
        onClose={() => setDeleteConfirmService(null)}
        onConfirm={executeDeleteService}
        title="Удаление услуги"
        isDanger={true}
        confirmText="Удалить"
        cancelText="Отмена"
      >
        Вы действительно хотите удалить услугу «{deleteConfirmService?.name}»? Если по услуге уже были заказы, она будет безопасно отключена для сохранения финансовой истории.
      </ConfirmModal>

      {/* Add Network Modal */}
      {addNetworkModalOpen && (
        <AddNetworkModal
          onClose={() => setAddNetworkModalOpen(false)}
          onCreated={(newNet) => {
            setNetworks(prev => [...prev, newNet]);
            setSelectedNetworkId(newNet.id);
            setAddNetworkModalOpen(false);
          }}
        />
      )}

    </div>
  );
}

// ─── Sub-Component: Create Service Modal ──────────────────────────────────────
function CreateServiceModal({
  network,
  category,
  providers,
  onClose,
  onCreated
}: {
  network: TreeNetwork;
  category: TreeCategory;
  providers: ProviderOption[];
  onClose: () => void;
  onCreated: (service: TreeService) => void;
}) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("0.10");
  const [markup, setMarkup] = useState("3.0");
  const [minQty, setMinQty] = useState("50");
  const [maxQty, setMaxQty] = useState("50000");
  const [providerId, setProviderId] = useState(providers[0]?.id || "");
  const [externalId, setExternalId] = useState("");
  const [targetType, setTargetType] = useState(
    category.slug.includes('sub') || category.slug.includes('fol') ? 'PROFILE' : 'POST'
  );
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Название услуги обязательно");
      return;
    }

    startTransition(async () => {
      const res = await createServiceAction({
        name: name.trim(),
        categoryId: category.id,
        rate: parseFloat(rate) || 0.1,
        markup: parseFloat(markup) || 3.0,
        minQty: parseInt(minQty, 10) || 10,
        maxQty: parseInt(maxQty, 10) || 50000,
        providerId: providerId || null,
        externalId: externalId.trim() || null,
        targetType,
        tenantId: 'smmplan',
        isActive: true
      });

      if (res.success && res.serviceId) {
        toast.success("Услуга успешно создана");
        // Fetch the created service to add to the tree
        const newService: TreeService = {
          id: res.serviceId,
          numericId: Date.now(),
          name: name.trim(),
          rate: parseFloat(rate) || 0.1,
          markup: parseFloat(markup) || 3.0,
          pricePer1000Cents: Math.round((parseFloat(rate) || 0.1) * (parseFloat(markup) || 3.0) * 10000),
          minQty: parseInt(minQty, 10) || 10,
          maxQty: parseInt(maxQty, 10) || 50000,
          externalId: externalId.trim() || null,
          targetType,
          isActive: true,
          isQuarantined: false,
          provider: providers.find(p => p.id === providerId) || null
        };
        onCreated(newService);
      } else {
        toast.error((res as { error?: string }).error || "Ошибка создания услуги");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">Добавить услугу в каталог</h3>
            <p className="text-xs text-muted-foreground font-semibold">
              🌐 {network.name} ➔ 📁 {category.name}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer text-sm">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Название тарифа / услуги</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={`Например: ${network.name} ${category.name} (Быстрый старт)`}
              className="w-full h-9 px-3 text-xs bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Закупка ($ за 1000)</label>
              <input
                type="number"
                step="0.001"
                required
                value={rate}
                onChange={e => setRate(e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono bg-background border border-border rounded-lg text-foreground outline-hidden"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Наценка (множитель)</label>
              <input
                type="number"
                step="0.1"
                required
                value={markup}
                onChange={e => setMarkup(e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono bg-background border border-border rounded-lg text-foreground outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Мин. заказ (шт.)</label>
              <input
                type="number"
                required
                value={minQty}
                onChange={e => setMinQty(e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono bg-background border border-border rounded-lg text-foreground outline-hidden"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Макс. заказ (шт.)</label>
              <input
                type="number"
                required
                value={maxQty}
                onChange={e => setMaxQty(e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono bg-background border border-border rounded-lg text-foreground outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Провайдер API</label>
              <select
                value={providerId}
                onChange={e => setProviderId(e.target.value)}
                className="w-full h-9 px-2.5 text-xs bg-background border border-border rounded-lg text-foreground outline-hidden cursor-pointer"
              >
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">ID у провайдера</label>
              <input
                type="text"
                value={externalId}
                onChange={e => setExternalId(e.target.value)}
                placeholder="например: 1042"
                className="w-full h-9 px-3 text-xs font-mono bg-background border border-border rounded-lg text-foreground outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" onClick={onClose} intent="secondary" size="sm" className="cursor-pointer">
              Отмена
            </Button>
            <Button type="submit" disabled={isPending} intent="primary" size="sm" className="cursor-pointer font-bold">
              {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Создать услугу
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sub-Component: Edit Service Modal ────────────────────────────────────────
function EditServiceModal({
  service,
  providers,
  onClose,
  onUpdated
}: {
  service: TreeService;
  providers: ProviderOption[];
  onClose: () => void;
  onUpdated: (service: Partial<TreeService>) => void;
}) {
  const [name, setName] = useState(service.name);
  const [rate, setRate] = useState(String(service.rate));
  const [markup, setMarkup] = useState(String(service.markup));
  const [minQty, setMinQty] = useState(String(service.minQty));
  const [maxQty, setMaxQty] = useState(String(service.maxQty));
  const [providerId, setProviderId] = useState(service.provider?.id || "");
  const [externalId, setExternalId] = useState(service.externalId || "");
  const [targetType, setTargetType] = useState(service.targetType || "POST");
  const [isPending, startTransition] = useTransition();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        name: name.trim(),
        rate: parseFloat(rate) || service.rate,
        markup: parseFloat(markup) || service.markup,
        minQty: parseInt(minQty, 10) || service.minQty,
        maxQty: parseInt(maxQty, 10) || service.maxQty,
        providerId: providerId || undefined,
        externalId: externalId.trim() || undefined,
        targetType
      };

      const res = await quickUpdateServiceAction(service.id, payload);
      if (res.success) {
        toast.success("Услуга обновлена");
        onUpdated({
          id: service.id,
          ...payload,
          pricePer1000Cents: Math.round((payload.rate || service.rate) * (payload.markup || service.markup) * 10000)
        });
      } else {
        toast.error(res.error || "Ошибка сохранения");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">Редактировать услугу #{service.numericId}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer text-sm">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Название услуги</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-background border border-border rounded-lg text-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Закупка ($ за 1000)</label>
              <input
                type="number"
                step="0.001"
                required
                value={rate}
                onChange={e => setRate(e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono bg-background border border-border rounded-lg text-foreground outline-hidden"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Наценка (множитель)</label>
              <input
                type="number"
                step="0.1"
                required
                value={markup}
                onChange={e => setMarkup(e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono bg-background border border-border rounded-lg text-foreground outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Мин. заказ</label>
              <input
                type="number"
                required
                value={minQty}
                onChange={e => setMinQty(e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono bg-background border border-border rounded-lg text-foreground outline-hidden"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Макс. заказ</label>
              <input
                type="number"
                required
                value={maxQty}
                onChange={e => setMaxQty(e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono bg-background border border-border rounded-lg text-foreground outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Провайдер</label>
              <select
                value={providerId}
                onChange={e => setProviderId(e.target.value)}
                className="w-full h-9 px-2.5 text-xs bg-background border border-border rounded-lg text-foreground outline-hidden cursor-pointer"
              >
                <option value="">Без провайдера (ручная)</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">ID у провайдера</label>
              <input
                type="text"
                value={externalId}
                onChange={e => setExternalId(e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono bg-background border border-border rounded-lg text-foreground outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" onClick={onClose} intent="secondary" size="sm" className="cursor-pointer">
              Отмена
            </Button>
            <Button type="submit" disabled={isPending} intent="primary" size="sm" className="cursor-pointer font-bold">
              {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Сохранить
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sub-Component: Add Network Modal ─────────────────────────────────────────
function AddNetworkModal({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: (network: TreeNetwork) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sort, setSort] = useState("10");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Название социальной сети обязательно");
      return;
    }
    const finalSlug = slug.trim() || name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    startTransition(async () => {
      const res = await createNetworkAction({
        name: name.trim(),
        slug: finalSlug,
        sort: parseInt(sort, 10) || 10
      });

      if (res.success && res.networkId) {
        toast.success(`Соцсеть «${name.trim()}» успешно добавлена!`);
        onCreated({
          id: res.networkId,
          name: name.trim(),
          slug: finalSlug,
          icon: null,
          sort: parseInt(sort, 10) || 10,
          categories: []
        });
      } else {
        toast.error(res.error || "Ошибка создания социальной сети");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>🌐 Новая Социальная Сеть</span>
          </h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Название соцсети</label>
            <input
              type="text"
              required
              placeholder="Например: Discord, Twitch, Rutube"
              value={name}
              onChange={e => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
              }}
              className="w-full h-9 px-3 text-xs bg-background border border-border rounded-lg text-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Slug (URL код)</label>
              <input
                type="text"
                required
                placeholder="discord"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono bg-background border border-border rounded-lg text-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Порядок сортировки</label>
              <input
                type="number"
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono bg-background border border-border rounded-lg text-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" onClick={onClose} intent="secondary" size="sm" className="cursor-pointer">
              Отмена
            </Button>
            <Button type="submit" disabled={isPending} intent="primary" size="sm" className="cursor-pointer font-bold">
              {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Создать соцсеть
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
