'use client';

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  createCategory, 
  updateCategory, 
  deleteCategory,
  hideCategoryAndServicesAction,
  mergeCategoriesAction,
  createNetworkAction,
  updateNetworkAction,
  deleteNetworkAction 
} from "@/actions/admin/catalog/categories";
import { Table } from '@/components/admin/hero-ui';
import { toast } from "sonner";
import { Loader2, Plus, Globe, GitMerge, Pencil, Trash2, Search, EyeOff, Layers, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from '@/components/ui/button';
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SocialIcon } from '@/components/ui/SocialIcon';
import { UniversalIcon } from '@/components/ui/UniversalIcon';
import { IconPicker } from '@/components/admin/icon-picker/IconPicker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

// Reusable analyzer tags with network affinity
const PREDEFINED_TAGS: { id: string; label: string; networks?: string[] }[] = [
  { id: 'channel', label: 'Канал / Группа', networks: ['telegram', 'tg', 'vk', 'vkontakte', 'youtube', 'yt', 'rutube'] },
  { id: 'post', label: 'Пост / Публикация', networks: ['telegram', 'tg', 'vk', 'vkontakte', 'instagram', 'in', 'threads', 'twitter', 'x', 'facebook', 'dzen'] },
  { id: 'profile', label: 'Профиль / Аккаунт', networks: ['instagram', 'in', 'tiktok', 'tt', 'vk', 'vkontakte', 'threads', 'twitter', 'x', 'facebook'] },
  { id: 'video', label: 'Видео', networks: ['youtube', 'yt', 'rutube', 'vk', 'vkontakte', 'tiktok', 'tt', 'twitch'] },
  { id: 'reel', label: 'Reels / Shorts / Клипы', networks: ['instagram', 'in', 'youtube', 'yt', 'tiktok', 'tt', 'vk', 'vkontakte'] },
  { id: 'story', label: 'Истории (Stories)', networks: ['instagram', 'in', 'telegram', 'tg', 'vk', 'vkontakte'] },
  { id: 'poll', label: 'Опрос / Голосование', networks: ['telegram', 'tg', 'vk', 'vkontakte', 'twitter', 'x'] },
  { id: 'comment', label: 'Комментарии', networks: ['telegram', 'tg', 'vk', 'vkontakte', 'instagram', 'in', 'youtube', 'yt', 'tiktok', 'tt'] },
  { id: 'bot', label: 'Бот / MiniApp', networks: ['telegram', 'tg'] },
  { id: 'chat', label: 'Чат / Беседа', networks: ['telegram', 'tg', 'vk', 'vkontakte'] }
];

interface NetworkItem {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  sort: number;
  isActive?: boolean;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  networkId?: string | null;
  sort: number;
  tenantId?: string | null;
  activityType?: string | null;
  requireWarning?: boolean;
  warningMessage?: string | null;
  analyzerTags?: string | null;
  icon?: string | null;
  network?: NetworkItem | null;
  _count: { services: number };
}

// ─── Main Component ────────────────────────────────────────────────────────
export function CategoryManager({ 
  categories, 
  networks 
}: { 
  categories: CategoryItem[]; 
  networks: NetworkItem[]; 
}) {
  const router = useRouter();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNetworkFilter, setSelectedNetworkFilter] = useState("ALL");

  // Modals state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);

  // Category Edit State
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState<string | null>(null);
  const [catNetworkId, setCatNetworkId] = useState(networks[0]?.id || "");
  const [catSort, setCatSort] = useState("0");
  const [catRequireWarning, setCatRequireWarning] = useState(false);
  const [catWarningMessage, setCatWarningMessage] = useState("");
  const [catAnalyzerTags, setCatAnalyzerTags] = useState("");
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  // Delete Category State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);

  // Network CRUD in modal State
  const [editingNetworkId, setEditingNetworkId] = useState<string | null>(null);
  const [netName, setNetName] = useState("");
  const [netSlug, setNetSlug] = useState("");
  const [netIcon, setNetIcon] = useState<string | null>(null);
  const [netSort, setNetSort] = useState("0");
  const [netError, setNetError] = useState<string | null>(null);
  const [isNetPending, startNetTransition] = useTransition();

  // Merge State
  const [sourceCatId, setSourceCatId] = useState("");
  const [targetCatId, setTargetCatId] = useState("");
  const [isMergePending, startMergeTransition] = useTransition();

  const sourceCat = useMemo(() => categories.find(c => c.id === sourceCatId), [categories, sourceCatId]);
  const targetCat = useMemo(() => categories.find(c => c.id === targetCatId), [categories, targetCatId]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter(c => {
      const matchNetwork = selectedNetworkFilter === "ALL" || c.networkId === selectedNetworkFilter;
      const matchQuery = !searchQuery.trim() || 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.network?.name && c.network.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchNetwork && matchQuery;
    });
  }, [categories, selectedNetworkFilter, searchQuery]);

  // Handlers for Category
  const openNewCategoryModal = () => {
    setEditingCategory(null);
    setCatName("");
    setCatIcon(null);
    setCatNetworkId(selectedNetworkFilter !== "ALL" ? selectedNetworkFilter : (networks[0]?.id || ""));
    setCatSort("0");
    setCatRequireWarning(false);
    setCatWarningMessage("");
    setCatAnalyzerTags("");
    setCatError(null);
    setCategoryModalOpen(true);
  };

  // Realtime check for duplicate category name within the same network
  const duplicateCategoryWarning = useMemo(() => {
    if (!catName.trim() || !catNetworkId) return null;
    const cleanInput = catName.trim().toLowerCase();
    const existing = categories.find(c => 
      c.networkId === catNetworkId && 
      c.name.trim().toLowerCase() === cleanInput &&
      (!editingCategory || c.id !== editingCategory.id)
    );
    if (!existing) return null;
    const netName = networks.find(n => n.id === catNetworkId)?.name || 'этой соцсети';
    return `Внимание: в ${netName} уже существует категория «${existing.name}» (${existing._count?.services || 0} услуг).`;
  }, [catName, catNetworkId, categories, editingCategory, networks]);

  // Network slug for tag recommendations
  const selectedNetworkSlug = useMemo(() => {
    return networks.find(n => n.id === catNetworkId)?.slug?.toLowerCase() || '';
  }, [catNetworkId, networks]);

  const openEditCategoryModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatIcon(cat.icon || null);
    setCatNetworkId(cat.networkId || networks[0]?.id || "");
    setCatSort(String(cat.sort));
    setCatRequireWarning(cat.requireWarning ?? false);
    setCatWarningMessage(cat.warningMessage || "");
    setCatAnalyzerTags(cat.analyzerTags || "");
    setCatError(null);
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || !catNetworkId) {
      setCatError("Заполните все обязательные поля");
      return;
    }
    if (catRequireWarning && !catWarningMessage.trim()) {
      setCatError("Текст предупреждения обязателен при включенной опции");
      return;
    }

    try {
      setCatLoading(true);
      setCatError(null);
      const payload = {
        name: catName.trim(),
        networkId: catNetworkId,
        sort: parseInt(catSort, 10) || 0,
        requireWarning: catRequireWarning,
        warningMessage: catRequireWarning ? catWarningMessage.trim() : null,
        analyzerTags: catAnalyzerTags.trim() || null,
        icon: catIcon
      };

      if (editingCategory) {
        const res = await updateCategory(editingCategory.id, payload);
        if (!res.success) throw new Error(res.error);
        toast.success("Категория успешно обновлена");
      } else {
        const res = await createCategory(payload);
        if (!res.success) throw new Error(res.error);
        toast.success("Категория успешно создана");
      }

      setCategoryModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Произошла ошибка";
      setCatError(msg);
    } finally {
      setCatLoading(false);
    }
  };

  const confirmDeleteCategory = (cat: CategoryItem) => {
    setCategoryToDelete(cat);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      setCatLoading(true);
      const res = await deleteCategory(categoryToDelete.id);
      if (!res.success) throw new Error(res.error);
      toast.success("Категория успешно удалена");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка удаления";
      toast.error(msg);
    } finally {
      setCatLoading(false);
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
    }
  };

  // Handlers for Network
  const handleSaveNetwork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!netName.trim() || !netSlug.trim()) {
      setNetError("Название и Slug обязательны");
      return;
    }

    startNetTransition(async () => {
      const payload = {
        name: netName.trim(),
        slug: netSlug.trim().toLowerCase(),
        sort: parseInt(netSort, 10) || 0,
        icon: netIcon
      };

      const res = editingNetworkId 
        ? await updateNetworkAction(editingNetworkId, payload)
        : await createNetworkAction(payload);

      if (res.success) {
        toast.success(editingNetworkId ? "Соцсеть обновлена" : "Соцсеть создана");
        setEditingNetworkId(null);
        setNetName("");
        setNetSlug("");
        setNetIcon(null);
        setNetSort("0");
        setNetError(null);
        router.refresh();
      } else {
        setNetError(res.error || "Ошибка сохранения");
      }
    });
  };

  const handleDeleteNetwork = (netId: string) => {
    startNetTransition(async () => {
      const res = await deleteNetworkAction(netId);
      if (res.success) {
        toast.success("Соцсеть удалена");
        router.refresh();
      } else {
        toast.error(res.error || "Ошибка удаления");
      }
    });
  };

  // Handlers for Merge
  const executeMerge = () => {
    if (!sourceCatId || !targetCatId) {
      toast.error("Выберите обе категории");
      return;
    }
    if (sourceCatId === targetCatId) {
      toast.error("Категории не могут совпадать");
      return;
    }

    startMergeTransition(async () => {
      const res = await mergeCategoriesAction(sourceCatId, targetCatId);
      if (res.success) {
        toast.success("Категории успешно объединены");
        setMergeModalOpen(false);
        setSourceCatId("");
        setTargetCatId("");
        router.refresh();
      } else {
        toast.error(res.error || "Ошибка при объединении");
      }
    });
  };

  const toggleTag = (tagId: string) => {
    const currentTags = catAnalyzerTags.split(',').map(t => t.trim()).filter(Boolean);
    if (currentTags.includes(tagId)) {
      setCatAnalyzerTags(currentTags.filter(t => t !== tagId).join(', '));
    } else {
      setCatAnalyzerTags([...currentTags, tagId].join(', '));
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      
      {/* ─── Top Clean Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Соцсети & Категории
            </h1>
            <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/50">
              {networks.length} соцсетей · {categories.length} категорий
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Управление структурой каталога, привязками к соцсетям и правилами анализатора ссылок.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            intent="outline"
            size="sm"
            onClick={() => setMergeModalOpen(true)}
            className="font-bold h-9 bg-background text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <GitMerge className="w-3.5 h-3.5 mr-1.5" />
            Объединить
          </Button>

          <Button
            intent="outline"
            size="sm"
            onClick={() => {
              setEditingNetworkId(null);
              setNetName("");
              setNetSlug("");
              setNetSort("0");
              setNetError(null);
              setNetworkModalOpen(true);
            }}
            className="font-bold h-9 bg-background text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 mr-1.5" />
            Соцсети ({networks.length})
          </Button>

          <Button
            intent="primary"
            size="sm"
            onClick={openNewCategoryModal}
            className="font-bold h-9 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Добавить категорию
          </Button>
        </div>
      </div>

      {/* ─── Filter & Search Bar ─── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по категории или соцсети..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="w-full sm:w-60">
          <Select value={selectedNetworkFilter} onValueChange={val => setSelectedNetworkFilter(val || 'ALL')}>
            <SelectTrigger className="w-full h-9 border border-border bg-background text-foreground text-xs rounded-xl cursor-pointer px-3">
              <SelectValue placeholder="Все соцсети">
                {(value: string) => {
                  if (value === 'ALL') return 'Все соцсети';
                  return networks.find(n => n.id === value)?.name ?? value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" label="Все соцсети" className="text-xs cursor-pointer">Все соцсети</SelectItem>
              {networks.map(n => (
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

        {(searchQuery || selectedNetworkFilter !== "ALL") && (
          <button
            onClick={() => { setSearchQuery(""); setSelectedNetworkFilter("ALL"); }}
            className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 cursor-pointer transition-colors"
          >
            Сбросить фильтры
          </button>
        )}
      </div>

      {/* ─── Full-Width Grouped Tables by Social Network ─── */}
      <div className="space-y-4">
        {networks
          .filter(net => selectedNetworkFilter === "ALL" || net.id === selectedNetworkFilter)
          .map(net => {
            const netCategories = filteredCategories.filter(c => c.networkId === net.id);
            if (netCategories.length === 0 && (searchQuery || selectedNetworkFilter !== "ALL")) return null;

            return (
              <div key={net.id} className="bg-card shadow-sm border border-border rounded-2xl overflow-hidden w-full transition-all">
                {/* Network Section Header */}
                <div className="p-3.5 px-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <SocialIcon slug={net.slug} size={18} />
                    <span className="text-xs font-black text-foreground uppercase tracking-wide">
                      {net.name}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-border/50">
                      {netCategories.length} {netCategories.length === 1 ? 'категория' : netCategories.length < 5 ? 'категории' : 'категорий'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground font-mono font-bold">
                      Всего услуг: {netCategories.reduce((acc, cat) => acc + (cat._count?.services || 0), 0)}
                    </span>
                    <button
                      onClick={() => {
                        setEditingCategory(null);
                        setCatName("");
                        setCatNetworkId(net.id);
                        setCatSort("0");
                        setCatRequireWarning(false);
                        setCatWarningMessage("");
                        setCatAnalyzerTags("");
                        setCatError(null);
                        setCategoryModalOpen(true);
                      }}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Добавить категорию
                    </button>
                  </div>
                </div>

                {netCategories.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    В этой соцсети пока нет категорий. Нажмите «Добавить категорию», чтобы создать первую.
                  </div>
                ) : (
                  <Table aria-label={`Категории ${net.name}`} className="w-full text-left">
                    <Table.ScrollContainer>
                      <Table.Content>
                        <Table.Header>
                          <Table.Column isRowHeader className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-4 py-2.5">НАЗВАНИЕ КАТЕГОРИИ</Table.Column>
                          <Table.Column className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider py-2.5">SLUG</Table.Column>
                          <Table.Column className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider py-2.5 text-center">СОРТИРОВКА</Table.Column>
                          <Table.Column className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider py-2.5 text-center">АКТИВНЫХ УСЛУГ</Table.Column>
                          <Table.Column className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider py-2.5">ТЕГИ АНАЛИЗАТОРА</Table.Column>
                          <Table.Column className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider text-right px-4 py-2.5">ДЕЙСТВИЯ</Table.Column>
                        </Table.Header>
                        <Table.Body>
                          {netCategories.map((c) => (
                            <Table.Row key={c.id} className="hover:bg-muted/30 transition-colors duration-150 border-b border-border/40">
                              <Table.Cell className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center shrink-0 text-foreground">
                                    <UniversalIcon icon={c.icon || c.network?.icon || `brand:${net.slug}`} size={16} />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-foreground text-xs truncate">{c.name}</span>
                                    {c.requireWarning && (
                                      <span className="text-[10px] text-amber-500 font-medium truncate max-w-xs" title={c.warningMessage || ''}>
                                        ⚠️ {c.warningMessage}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </Table.Cell>
                              <Table.Cell className="py-3">
                                <span className="text-muted-foreground text-xs font-mono bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
                                  {c.slug}
                                </span>
                              </Table.Cell>
                              <Table.Cell className="py-3 text-center">
                                <span className="text-muted-foreground text-xs font-mono font-bold">{c.sort}</span>
                              </Table.Cell>
                              <Table.Cell className="py-3 text-center">
                                <span className="text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">
                                  {c._count.services}
                                </span>
                              </Table.Cell>
                              <Table.Cell className="py-3">
                                {c.analyzerTags ? (
                                  <div className="flex flex-wrap gap-1">
                                    {c.analyzerTags.split(',').map(tag => (
                                      <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                                        {tag.trim()}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">—</span>
                                )}
                              </Table.Cell>
                              <Table.Cell className="text-right px-4 py-3">
                                <div className="flex justify-end items-center gap-1.5">
                                  {c._count.services > 0 && (
                                    <button 
                                      onClick={() => router.push(`/admin/catalog?category=${c.id}`)}
                                      className="p-1.5 rounded-lg text-primary hover:bg-primary/10 cursor-pointer transition-colors"
                                      title={`Перейти к тарифам (${c._count.services} шт.) в каталоге`}
                                      aria-label={`Перейти к тарифам для ${c.name}`}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {c._count.services > 0 && (
                                    <button 
                                      onClick={async () => {
                                        const res = await hideCategoryAndServicesAction(c.id);
                                        if (res.success) {
                                          toast.success(res.message);
                                          router.refresh();
                                        } else {
                                          toast.error(res.error || 'Ошибка скрытия услуг');
                                        }
                                      }} 
                                      className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 cursor-pointer transition-colors"
                                      title="Скрыть все услуги этой категории с витрины"
                                      aria-label={`Скрыть все услуги для ${c.name}`}
                                    >
                                      <EyeOff className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => openEditCategoryModal(c)} 
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer transition-colors"
                                    title="Редактировать"
                                    aria-label={`Редактировать ${c.name}`}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => confirmDeleteCategory(c)} 
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                                    title="Удалить"
                                    aria-label={`Удалить ${c.name}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Content>
                    </Table.ScrollContainer>
                  </Table>
                )}
              </div>
            );
          })}
      </div>

      {/* ─── Modal 1: Create / Edit Category ─── */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-lg p-6 rounded-2xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editingCategory ? "📝 Редактировать категорию" : "➕ Новая категория"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Настройте название категории, привязку к соцсети и теги автоматического анализатора ссылок.
            </DialogDescription>
          </DialogHeader>

          {catError && (
            <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-xl border border-destructive/20">
              {catError}
            </div>
          )}

          <form onSubmit={handleSaveCategory} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-muted-foreground">Название категории</label>
              <input
                type="text"
                required
                value={catName}
                onChange={e => setCatName(e.target.value)}
                placeholder="Например: Подписчики"
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {duplicateCategoryWarning && (
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-warning/10 border border-warning/20 text-warning text-[11px] font-semibold mt-1.5 animate-in fade-in duration-200">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{duplicateCategoryWarning}</span>
                </div>
              )}
            </div>

            {/* Visual Icon Picker */}
            <div className="pt-1 pb-1">
              <IconPicker
                label="Визуальная иконка категории"
                context="category"
                value={catIcon}
                onChange={setCatIcon}
                suggestName={catName}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-muted-foreground">Соцсеть</label>
                <Select value={catNetworkId} onValueChange={val => setCatNetworkId(val || '')}>
                  <SelectTrigger className="w-full h-9 border border-border bg-background text-foreground text-xs rounded-xl cursor-pointer px-3">
                    <SelectValue placeholder="-- Выберите соцсеть --">
                      {(value: string) => networks.find(n => n.id === value)?.name ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {networks.map(n => (
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

              <div className="space-y-1">
                <label className="block text-xs font-bold text-muted-foreground">Сортировка</label>
                <input
                  type="number"
                  required
                  value={catSort}
                  onChange={e => setCatSort(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Warning toggle */}
            <div className="space-y-2 border-t border-border/40 pt-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={catRequireWarning}
                  onChange={e => setCatRequireWarning(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs font-bold text-foreground">Показывать предупреждение клиенту</span>
              </label>

              {catRequireWarning && (
                <input
                  type="text"
                  required={catRequireWarning}
                  value={catWarningMessage}
                  onChange={e => setCatWarningMessage(e.target.value)}
                  placeholder="Предупреждение: Просмотры идут только на 1-е фото..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              )}
            </div>

            {/* Analyzer Tags with Network Presets */}
            <div className="space-y-2 border-t border-border/40 pt-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-muted-foreground">
                  Теги анализатора ссылок (Автовыбор при вводе ссылки)
                </label>
                {selectedNetworkSlug && (
                  <span className="text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">
                    ⭐ Рекомендовано для сети
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PREDEFINED_TAGS
                  .slice()
                  .sort((a, b) => {
                    const aRec = a.networks?.some(s => selectedNetworkSlug.includes(s)) ? 1 : 0;
                    const bRec = b.networks?.some(s => selectedNetworkSlug.includes(s)) ? 1 : 0;
                    return bRec - aRec;
                  })
                  .map(tag => {
                    const isActive = catAnalyzerTags.split(',').map(t => t.trim()).filter(Boolean).includes(tag.id);
                    const isRecommended = selectedNetworkSlug && tag.networks?.some(s => selectedNetworkSlug.includes(s));
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all border cursor-pointer flex items-center gap-1 ${
                          isActive
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : isRecommended
                            ? 'bg-primary/5 text-primary border-primary/30 hover:bg-primary/10'
                            : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
                        }`}
                      >
                        {isRecommended && !isActive && <span className="text-[9px]">⭐</span>}
                        <span>{tag.label}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
              <Button
                type="button"
                intent="outline"
                size="sm"
                onClick={() => setCategoryModalOpen(false)}
                className="cursor-pointer"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                intent="primary"
                size="sm"
                disabled={catLoading}
                className="cursor-pointer"
              >
                {catLoading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                {editingCategory ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 2: Manage Networks ─── */}
      <Dialog open={networkModalOpen} onOpenChange={setNetworkModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Управление соцсетями
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Добавляйте и редактируйте поддерживаемые соцсети каталога.
            </DialogDescription>
          </DialogHeader>

          {netError && (
            <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-xl border border-destructive/20">
              {netError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSaveNetwork} className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border/50">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-muted-foreground uppercase">Название соцсети</label>
              <input
                type="text"
                required
                placeholder="Например: Rutube"
                value={netName}
                onChange={e => {
                  setNetName(e.target.value);
                  if (!editingNetworkId) {
                    setNetSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Network Icon Picker */}
            <div className="pt-0.5 pb-0.5">
              <IconPicker
                label="Логотип / Иконка соцсети"
                context="network"
                value={netIcon}
                onChange={setNetIcon}
                suggestName={netName}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase">Slug (строчные)</label>
                <input
                  type="text"
                  required
                  placeholder="rutube"
                  value={netSlug}
                  onChange={e => setNetSlug(e.target.value.toLowerCase())}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase">Сортировка</label>
                <input
                  type="number"
                  required
                  value={netSort}
                  onChange={e => setNetSort(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              {editingNetworkId && (
                <button
                  type="button"
                  onClick={() => { setEditingNetworkId(null); setNetName(""); setNetSlug(""); setNetIcon(null); setNetSort("0"); }}
                  className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Отмена
                </button>
              )}
              <Button type="submit" intent="primary" size="sm" disabled={isNetPending} className="cursor-pointer">
                {isNetPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                {editingNetworkId ? "Сохранить" : "Добавить"}
              </Button>
            </div>
          </form>

          {/* List of current networks */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {networks.map(n => (
              <div key={n.id} className="flex items-center justify-between p-2 rounded-xl bg-background border border-border/60 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2">
                  <UniversalIcon icon={n.icon || `brand:${n.slug}`} size={16} />
                  <span className="text-xs font-bold text-foreground">{n.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {n.slug}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingNetworkId(n.id);
                      setNetName(n.name);
                      setNetSlug(n.slug);
                      setNetIcon(n.icon || null);
                      setNetSort(String(n.sort));
                    }}
                    className="p-1 text-muted-foreground hover:text-primary cursor-pointer"
                    aria-label={`Редактировать соцсеть ${n.name}`}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteNetwork(n.id)}
                    className="p-1 text-muted-foreground hover:text-destructive cursor-pointer"
                    aria-label={`Удалить соцсеть ${n.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 3: Merge Categories ─── */}
      <Dialog open={mergeModalOpen} onOpenChange={setMergeModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-primary" />
              Объединение категорий
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Перемещение всех услуг из одной категории в другую с последующим удалением источника.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-muted-foreground">Категория-источник (будет удалена)</label>
              <Select value={sourceCatId} onValueChange={val => setSourceCatId(val || '')}>
                <SelectTrigger className="w-full h-9 border border-border bg-background text-foreground text-xs rounded-xl cursor-pointer px-3">
                  <SelectValue placeholder="-- Выберите источник --">
                    {(value: string) => categories.find(c => c.id === value)?.name ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id} label={`${c.network?.name || ''}: ${c.name}`} className="text-xs cursor-pointer">
                      {c.network?.name}: {c.name} ({c._count.services} услуг)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-muted-foreground">Категория-приёмник (куда перенести услуги)</label>
              <Select value={targetCatId} onValueChange={val => setTargetCatId(val || '')}>
                <SelectTrigger className="w-full h-9 border border-border bg-background text-foreground text-xs rounded-xl cursor-pointer px-3">
                  <SelectValue placeholder="-- Выберите приёмник --">
                    {(value: string) => categories.find(c => c.id === value)?.name ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c.id !== sourceCatId).map(c => {
                    const isSameNetwork = sourceCat ? c.networkId === sourceCat.networkId : true;
                    return (
                      <SelectItem key={c.id} value={c.id} label={`${c.network?.name || ''}: ${c.name}`} className="text-xs cursor-pointer">
                        <span className="flex items-center justify-between w-full gap-2">
                          <span>{c.network?.name}: {c.name}</span>
                          {!isSameNetwork && (
                            <span className="text-[10px] text-destructive font-bold bg-destructive/10 px-1 py-0.5 rounded">Другая соцсеть</span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Brand-Safe Merge Summary */}
            {sourceCat && targetCat && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-muted-foreground">Перенос услуг:</span>
                  <span className="font-mono font-bold text-primary">{sourceCat._count?.services || 0} тарифов</span>
                </div>
                {sourceCat.networkId !== targetCat.networkId ? (
                  <div className="flex items-center gap-1.5 text-destructive text-[11px] font-bold bg-destructive/10 p-2 rounded-lg border border-destructive/20">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Ошибка: нельзя объединять категории разных соцсетей ({sourceCat.network?.name} → {targetCat.network?.name})</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground">
                    Все тарифы из «{sourceCat.name}» будут безопасно перенесены в «{targetCat.name}». Категория «{sourceCat.name}» будет удалена.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
              <Button type="button" intent="outline" size="sm" onClick={() => setMergeModalOpen(false)} className="cursor-pointer">
                Отмена
              </Button>
              <Button 
                type="button" 
                intent="primary" 
                size="sm" 
                disabled={isMergePending || !sourceCatId || !targetCatId || (sourceCat && targetCat && sourceCat.networkId !== targetCat.networkId)} 
                onClick={executeMerge} 
                className="cursor-pointer"
              >
                {isMergePending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Объединить услуги
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirm Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={executeDeleteCategory}
        title="Удаление категории"
        isDanger={true}
        confirmText="Удалить"
        cancelText="Отмена"
      >
        Вы действительно хотите удалить категорию «{categoryToDelete?.name}»? Все услуги этой категории должны быть предварительно удалены или перенесены.
      </ConfirmModal>

    </div>
  );
}
