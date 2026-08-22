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
import { Loader2, Plus, Globe, GitMerge, Pencil, Trash2, Search, EyeOff, Layers } from "lucide-react";
import { Button } from '@/components/ui/button';
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SocialIcon } from '@/components/ui/SocialIcon';
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

const PREDEFINED_TAGS = [
  { id: 'post', label: 'Пост / Публикация' },
  { id: 'channel', label: 'Канал / Группа' },
  { id: 'profile', label: 'Профиль / Аккаунт' },
  { id: 'video', label: 'Видео' },
  { id: 'reel', label: 'Reels / Shorts / Клипы' },
  { id: 'story', label: 'Истории (Stories)' },
  { id: 'bot', label: 'Бот' },
  { id: 'chat', label: 'Чат / Беседа' },
  { id: 'comment', label: 'Комментарии' },
  { id: 'poll', label: 'Опрос / Голосование' }
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
  requireWarning?: boolean;
  warningMessage?: string | null;
  analyzerTags?: string | null;
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
  const [netSort, setNetSort] = useState("0");
  const [netError, setNetError] = useState<string | null>(null);
  const [isNetPending, startNetTransition] = useTransition();

  // Merge State
  const [sourceCatId, setSourceCatId] = useState("");
  const [targetCatId, setTargetCatId] = useState("");
  const [isMergePending, startMergeTransition] = useTransition();

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
    setCatNetworkId(selectedNetworkFilter !== "ALL" ? selectedNetworkFilter : (networks[0]?.id || ""));
    setCatSort("0");
    setCatRequireWarning(false);
    setCatWarningMessage("");
    setCatAnalyzerTags("");
    setCatError(null);
    setCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCatName(cat.name);
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
        analyzerTags: catAnalyzerTags.trim() || null
      };

      if (editingCategory) {
        const res = await updateCategory(editingCategory.id, payload);
        if (!res.success) throw new Error(res.error);
        toast.success("Активность успешно обновлена");
      } else {
        const res = await createCategory(payload);
        if (!res.success) throw new Error(res.error);
        toast.success("Активность успешно создана");
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
        sort: parseInt(netSort, 10) || 0
      };

      const res = editingNetworkId 
        ? await updateNetworkAction(editingNetworkId, payload)
        : await createNetworkAction(payload);

      if (res.success) {
        toast.success(editingNetworkId ? "Соцсеть обновлена" : "Соцсеть создана");
        setEditingNetworkId(null);
        setNetName("");
        setNetSlug("");
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
      toast.error("Выберите обе активности");
      return;
    }
    if (sourceCatId === targetCatId) {
      toast.error("Активности не могут совпадать");
      return;
    }

    startMergeTransition(async () => {
      const res = await mergeCategoriesAction(sourceCatId, targetCatId);
      if (res.success) {
        toast.success("Активности успешно объединены");
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
              Соцсети & Активности
            </h1>
            <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/50">
              {networks.length} соцсетей · {categories.length} активностей
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
            Добавить активность
          </Button>
        </div>
      </div>

      {/* ─── Filter & Search Bar ─── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по активности или соцсети..."
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
                      {netCategories.length} {netCategories.length === 1 ? 'активность' : netCategories.length < 5 ? 'активности' : 'активностей'}
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
                      Добавить
                    </button>
                  </div>
                </div>

                {netCategories.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    В этой соцсети пока нет активностей. Нажмите «Добавить», чтобы создать первую.
                  </div>
                ) : (
                  <Table aria-label={`Активности ${net.name}`} className="w-full text-left">
                    <Table.ScrollContainer>
                      <Table.Content>
                        <Table.Header>
                          <Table.Column isRowHeader className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-4 py-2.5">НАЗВАНИЕ АКТИВНОСТИ</Table.Column>
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
                                <div className="flex flex-col">
                                  <span className="font-bold text-foreground text-xs">{c.name}</span>
                                  {c.requireWarning && (
                                    <span className="text-[10px] text-amber-500 font-medium truncate max-w-xs" title={c.warningMessage || ''}>
                                      ⚠️ {c.warningMessage}
                                    </span>
                                  )}
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
                                      title="Скрыть все услуги этой активности с витрины"
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

      {/* ─── Modal 1: Create / Edit Category (Activity) ─── */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-lg p-6 rounded-2xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editingCategory ? "📝 Редактировать активность" : "➕ Новая активность"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Настройте название активности, привязку к соцсети и теги автоматического анализатора ссылок.
            </DialogDescription>
          </DialogHeader>

          {catError && (
            <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-xl border border-destructive/20">
              {catError}
            </div>
          )}

          <form onSubmit={handleSaveCategory} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-muted-foreground">Название активности</label>
              <input
                type="text"
                required
                value={catName}
                onChange={e => setCatName(e.target.value)}
                placeholder="Например: Подписчики"
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-muted-foreground">Соцсеть (Network)</label>
                <Select value={catNetworkId} onValueChange={val => setCatNetworkId(val || '')}>
                  <SelectTrigger className="w-full h-9 border border-border bg-background text-foreground text-xs rounded-xl cursor-pointer px-3">
                    <SelectValue placeholder="-- Выберите сеть --">
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

            {/* Analyzer Tags */}
            <div className="space-y-2 border-t border-border/40 pt-3">
              <label className="block text-xs font-bold text-muted-foreground">
                Теги анализатора ссылок (Автовыбор при вводе ссылки)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PREDEFINED_TAGS.map(tag => {
                  const isActive = catAnalyzerTags.split(',').map(t => t.trim()).filter(Boolean).includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
                      }`}
                    >
                      {tag.label}
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
              Управление Соцсетями (Networks)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Добавляйте и редактируйте поддерживаемые платформы каталога.
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
                  onClick={() => { setEditingNetworkId(null); setNetName(""); setNetSlug(""); setNetSort("0"); }}
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
                  <SocialIcon slug={n.slug} size={16} />
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
                      setNetSort(String(n.sort));
                    }}
                    className="p-1 text-muted-foreground hover:text-primary cursor-pointer"
                    aria-label={`Редактировать сеть ${n.name}`}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteNetwork(n.id)}
                    className="p-1 text-muted-foreground hover:text-destructive cursor-pointer"
                    aria-label={`Удалить сеть ${n.name}`}
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
              Объединение Активностей
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Перемещение всех услуг из одной активности в другую с последующим удалением источника.
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
                  {categories.filter(c => c.id !== sourceCatId).map(c => (
                    <SelectItem key={c.id} value={c.id} label={`${c.network?.name || ''}: ${c.name}`} className="text-xs cursor-pointer">
                      {c.network?.name}: {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
              <Button type="button" intent="outline" size="sm" onClick={() => setMergeModalOpen(false)} className="cursor-pointer">
                Отмена
              </Button>
              <Button type="button" intent="primary" size="sm" disabled={isMergePending || !sourceCatId || !targetCatId} onClick={executeMerge} className="cursor-pointer">
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
        title="Удаление активности"
        isDanger={true}
        confirmText="Удалить"
        cancelText="Отмена"
      >
        Вы действительно хотите удалить активность «{categoryToDelete?.name}»? Все услуги этой активности должны быть предварительно удалены или перенесены.
      </ConfirmModal>

    </div>
  );
}
