"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  createCategory, 
  updateCategory, 
  deleteCategory,
  mergeCategoriesAction,
  createNetworkAction,
  updateNetworkAction,
  deleteNetworkAction 
} from "@/actions/admin/catalog/categories";
import { Table } from '@/components/admin/hero-ui';
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

// ─── Sub-component: Category Merge Card ────────────────────────────────────
function CategoryMergeCard({ categories, onSuccess }: { categories: any[]; onSuccess: () => void }) {
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleMerge = () => {
    if (!sourceId || !targetId) {
      toast.error("Выберите обе категории");
      return;
    }
    if (sourceId === targetId) {
      toast.error("Категории не могут совпадать");
      return;
    }
    setConfirmOpen(true);
  };

  const executeMerge = () => {
    setConfirmOpen(false);
    startTransition(async () => {
      const res = await mergeCategoriesAction(sourceId, targetId);
      if (res.success) {
        toast.success("Категории успешно объединены");
        setSourceId("");
        setTargetId("");
        onSuccess();
      } else {
        toast.error(res.error || "Произошла ошибка при объединении");
      }
    });
  };

  const sourceName = categories.find(c => c.id === sourceId)?.name || "";
  const targetName = categories.find(c => c.id === targetId)?.name || "";

  return (
    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
        <span>🔄 Объединение Категорий</span>
      </h3>
      <p className="text-xs text-muted-foreground">
        Перемещение всех услуг из одной категории в другую с последующим удалением пустой категории.
      </p>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-muted-foreground">Категория-источник (будет удалена)</label>
          <Select value={sourceId} onValueChange={(val) => setSourceId(val || '')}>
            <SelectTrigger className="w-full h-10 border border-border bg-background text-foreground cursor-pointer focus:ring-2 focus:ring-primary/20">
              <SelectValue placeholder="-- Выберите источник --">
                {(value: string) => categories.find(c => c.id === value)?.name ?? value}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="w-full">
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id} label={c.name} className="cursor-pointer">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-muted-foreground">Категория-получатель</label>
          <Select value={targetId} onValueChange={(val) => setTargetId(val || '')}>
            <SelectTrigger className="w-full h-10 border border-border bg-background text-foreground cursor-pointer focus:ring-2 focus:ring-primary/20">
              <SelectValue placeholder="-- Выберите получателя --">
                {(value: string) => categories.find(c => c.id === value)?.name ?? value}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="w-full">
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id} label={c.name} className="cursor-pointer">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-warning/10 border border-amber-500/20 rounded-lg p-2.5 text-[11px] text-amber-700 leading-normal flex items-start gap-1.5">
          <span className="shrink-0 text-xs">⚠️</span>
          <span>
            <b>Внимание!</b> Действие необратимо. Услуги перенесутся автоматически, старая категория будет удалена.
          </span>
        </div>

        <Button
          intent="primary"
          size="sm"
          onClick={handleMerge}
          disabled={isPending || !sourceId || !targetId}
          className="w-full cursor-pointer flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-200"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Объединить категории
        </Button>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeMerge}
        title="Объединение категорий"
        isDanger={true}
        confirmText="Объединить"
        cancelText="Отмена"
      >
        Вы действительно хотите перенести все услуги из «{sourceName}» в «{targetName}» и БЕЗВОЗВРАТНО удалить категорию «{sourceName}»?
      </ConfirmModal>
    </div>
  );
}

// ─── Sub-component: Network Manager Card ───────────────────────────────────
function NetworkManagerCard({ networks, onSuccess }: { networks: any[]; onSuccess: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [editingNetworkId, setEditingNetworkId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sort, setSort] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [netToDelete, setNetToDelete] = useState<any>(null);

  const resetForm = () => {
    setEditingNetworkId(null);
    setName("");
    setSlug("");
    setSort("0");
    setError(null);
  };

  const handleEdit = (net: any) => {
    setEditingNetworkId(net.id);
    setName(net.name);
    setSlug(net.slug);
    setSort(String(net.sort));
    setError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Название сети обязательно");
      return;
    }
    if (!slug.trim()) {
      setError("Slug обязателен");
      return;
    }

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        sort: parseInt(sort, 10) || 0
      };

      const res = editingNetworkId
        ? await updateNetworkAction(editingNetworkId, payload)
        : await createNetworkAction(payload);

      if (res.success) {
        toast.success(editingNetworkId ? "Соцсеть успешно обновлена" : "Соцсеть успешно создана");
        resetForm();
        onSuccess();
      } else {
        setError(res.error || "Произошла ошибка при сохранении");
      }
    });
  };

  const handleDelete = (id: string) => {
    const net = networks.find(n => n.id === id);
    if (!net) return;
    setNetToDelete(net);
    setDeleteConfirmOpen(true);
  };

  const executeDelete = () => {
    if (!netToDelete) return;
    const netId = netToDelete.id;
    setDeleteConfirmOpen(false);
    setNetToDelete(null);
    startTransition(async () => {
      const res = await deleteNetworkAction(netId);
      if (res.success) {
        toast.success("Соцсеть успешно удалена");
        onSuccess();
      } else {
        toast.error(res.error || "Произошла ошибка при удалении");
      }
    });
  };

  return (
    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-foreground">
        🌐 Управление Соцсетями (Networks)
      </h3>

      {/* Network Form */}
      <form onSubmit={handleSave} className="space-y-3 p-3 bg-muted/40 rounded-lg border border-border/50">
        <h4 className="text-[11px] font-extrabold text-foreground uppercase tracking-wider">
          {editingNetworkId ? "Редактировать соцсеть" : "Добавить новую соцсеть"}
        </h4>

        {error && (
          <div className="text-[11px] text-destructive bg-destructive/10 p-2 rounded-lg border border-destructive/20 leading-normal">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Название</label>
            <input
              type="text"
              required
              placeholder="Например: Telegram"
              value={name}
              onChange={e => {
                setName(e.target.value);
                // Auto slugify if creating
                if (!editingNetworkId) {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
                }
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Slug (строчные)</label>
              <input
                type="text"
                required
                placeholder="например: telegram"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase())}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 font-mono"
              />
            </div>

            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Сортировка</label>
              <input
                type="number"
                required
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1 justify-end">
          {editingNetworkId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
            >
              Отмена
            </button>
          )}
          <Button
            type="submit"
            intent="primary"
            size="sm"
            disabled={isPending}
            className="cursor-pointer"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            {editingNetworkId ? "Сохранить" : "Добавить"}
          </Button>
        </div>
      </form>

      {/* Network List */}
      <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Список соцсетей ({networks.length})</h4>
        {networks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Соцсети не созданы</p>
        ) : (
          networks.map(n => (
            <div key={n.id} className="flex justify-between items-center p-2 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors duration-150">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">{n.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">slug: {n.slug} (сорт: {n.sort})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(n)}
                  className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                >
                  Изменить
                </button>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="text-[11px] font-medium text-destructive hover:underline cursor-pointer"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Удаление соцсети"
        isDanger={true}
        confirmText="Удалить"
        cancelText="Отмена"
      >
        Вы действительно хотите удалить соцсеть «{netToDelete?.name}»?
      </ConfirmModal>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function CategoryManager({ categories, networks }: { categories: any[], networks: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Category deletion states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDeleteId, setCategoryToDeleteId] = useState<string | null>(null);

  // Category Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [networkId, setNetworkId] = useState(networks[0]?.id || "");
  const [sort, setSort] = useState("0");

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setNetworkId(networks[0]?.id || "");
    setSort("0");
    setError(null);
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setName(cat.name);
    setNetworkId(cat.networkId);
    setSort(String(cat.sort));
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !networkId) return setError("Заполните все поля");
    
    try {
      setLoading(true);
      setError(null);
      const payload = { name, networkId, sort: parseInt(sort, 10) || 0 };
      
      if (editingId) {
        const res = await updateCategory(editingId, payload);
        if (!res.success) throw new Error(res.error);
        toast.success("Категория успешно обновлена");
      } else {
        const res = await createCategory(payload);
        if (!res.success) throw new Error(res.error);
        toast.success("Категория успешно создана");
      }
      
      resetForm();
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setCategoryToDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!categoryToDeleteId) return;
    try {
      setLoading(true);
      const res = await deleteCategory(categoryToDeleteId);
      if (!res.success) throw new Error(res.error);
      toast.success("Категория успешно удалена");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Ошибка удаления");
    } finally {
      setLoading(false);
      setDeleteConfirmOpen(false);
      setCategoryToDeleteId(null);
    }
  };

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full animate-in fade-in duration-300">
      
      {/* LEFT & CENTER: Category CRUD (takes 2 cols) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Editor Form */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-foreground">
            {editingId ? "📝 Редактировать категорию" : "➕ Добавить новую категорию"}
          </h2>
          
          {error && (
            <div className="text-[11px] text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20 leading-normal">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-muted-foreground">Название (с префиксом платформы)</label>
              <input 
                type="text" 
                required
                value={name} 
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                placeholder="Например: INSTAGRAM | Лайки"
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-muted-foreground">Соцсеть (Network)</label>
              <Select value={networkId} onValueChange={(val) => setNetworkId(val || '')}>
                <SelectTrigger className="w-full h-10 border border-border bg-background text-foreground cursor-pointer focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="-- Выберите сеть --">
                    {(value: string) => networks.find(n => n.id === value)?.name?.toUpperCase() ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-full">
                  {networks.map(n => (
                    <SelectItem key={n.id} value={n.id} label={n.name} className="cursor-pointer">
                      {n.name.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-muted-foreground">Сортировка</label>
              <input 
                type="number" 
                required
                value={sort} 
                onChange={e => setSort(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 font-mono"
              />
            </div>

            <div className="md:col-span-4 flex justify-end gap-2 pt-2 border-t border-border/50">
              {editingId && (
                <button 
                  type="button" 
                  onClick={resetForm} 
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
                >
                  Отмена
                </button>
              )}
              <Button 
                type="submit" 
                disabled={loading}
                intent="primary"
                size="sm"
                className="cursor-pointer"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingId ? "Сохранить изменения" : "Создать категорию"}
              </Button>
            </div>
          </form>
        </div>

        {/* List display */}
        <div className="bg-card shadow-sm border border-border rounded-xl overflow-hidden w-full">
          <div className="p-4 border-b border-border/60 bg-muted/10">
            <h3 className="text-xs font-bold text-foreground">Список категорий ({categories.length})</h3>
          </div>
          <Table aria-label="Менеджер категорий">
            <Table.ScrollContainer>
              <Table.Content>
                <Table.Header>
                  <Table.Column isRowHeader className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-4">НАЗВАНИЕ</Table.Column>
                  <Table.Column className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">ПЛАТФОРМА</Table.Column>
                  <Table.Column className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">СОРТИРОВКА</Table.Column>
                  <Table.Column className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">УСЛУГ</Table.Column>
                  <Table.Column className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right px-4">ДЕЙСТВИЯ</Table.Column>
                </Table.Header>
                <Table.Body>
                  {categories.map((c) => (
                    <Table.Row key={c.id} className="hover:bg-muted/30 transition-colors duration-150">
                      <Table.Cell className="px-4">
                        <span className="font-semibold text-foreground text-xs">{c.name}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-muted-foreground text-xs font-mono bg-muted/60 px-2 py-0.5 rounded border border-border/30">{c.network?.slug?.toUpperCase() || '-'}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-muted-foreground text-xs font-mono">{c.sort}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-muted-foreground text-xs font-mono bg-primary/5 text-primary border border-primary/20 px-2 py-0.5 rounded">{c._count.services}</span>
                      </Table.Cell>
                      <Table.Cell className="text-right px-4">
                        <div className="flex justify-end gap-3 font-semibold text-xs">
                          <button onClick={() => handleEdit(c)} className="text-primary hover:underline cursor-pointer">Изменить</button>
                          <button onClick={() => handleDelete(c.id)} className="text-destructive hover:underline cursor-pointer">Удалить</button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>
      </div>

      {/* RIGHT: Merge Categories and Network CRUD */}
      <div className="space-y-6">
        <CategoryMergeCard categories={categories} onSuccess={handleRefresh} />
        <NetworkManagerCard networks={networks} onSuccess={handleRefresh} />
      </div>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Удаление категории"
        isDanger={true}
        confirmText="Удалить"
        cancelText="Отмена"
      >
        Вы действительно хотите удалить категорию «{categories.find(c => c.id === categoryToDeleteId)?.name}»? Данное действие необратимо.
      </ConfirmModal>

    </div>
  );
}
