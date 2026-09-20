'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createNetworkAction,
  updateNetworkAction,
  deleteNetworkAction,
} from '@/actions/admin/catalog/categories';
import { toast } from 'sonner';
import { Globe, Pencil, Trash2, Plus, Loader2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UniversalIcon } from '@/components/ui/UniversalIcon';
import { IconPicker } from '@/components/admin/icon-picker/IconPicker';
import { Table } from '@/components/admin/hero-ui';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface NetworkRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort: number;
  isActive: boolean;
  categoriesCount: number;
}

interface NetworksClientProps {
  networks: NetworkRow[];
}

type FormMode = 'idle' | 'create' | 'edit';

interface FormState {
  name: string;
  slug: string;
  icon: string | null;
  sort: string;
}

const EMPTY_FORM: FormState = { name: '', slug: '', icon: null, sort: '0' };

export function NetworksClient({ networks: initialNetworks }: NetworksClientProps) {
  const router = useRouter();
  const [networks, setNetworks] = useState<NetworkRow[]>(initialNetworks);
  const [mode, setMode] = useState<FormMode>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<NetworkRow | null>(null);

  const resetForm = () => {
    setMode('idle');
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setMode('create');
  };

  const openEdit = (n: NetworkRow) => {
    setMode('edit');
    setEditingId(n.id);
    setForm({ name: n.name, slug: n.slug, icon: n.icon, sort: String(n.sort) });
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError('Название и Slug обязательны');
      return;
    }
    startTransition(async () => {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        sort: parseInt(form.sort, 10) || 0,
        icon: form.icon,
      };
      const res = editingId
        ? await updateNetworkAction(editingId, payload)
        : await createNetworkAction(payload);

      if (res.success) {
        toast.success(editingId ? 'Соцсеть обновлена' : 'Соцсеть создана');
        resetForm();
        router.refresh();
      } else {
        setFormError(res.error || 'Ошибка сохранения');
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startTransition(async () => {
      const res = await deleteNetworkAction(id);
      if (res.success) {
        toast.success('Соцсеть удалена');
        setNetworks((prev) => prev.filter((n) => n.id !== id));
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(res.error || 'Ошибка удаления');
        setDeleteTarget(null);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ─── Toolbar ─── */}
      <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
        <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg border border-border/50">
          {networks.length} соцсетей
        </span>
        <Button intent="primary" size="sm" className="font-bold h-8.5 cursor-pointer" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          Добавить соцсеть
        </Button>
      </div>

      {/* ─── Inline Create/Edit Form ─── */}
      {mode !== 'idle' && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            {mode === 'create' ? 'Новая соцсеть' : `Редактирование: ${form.name}`}
          </h3>
          {formError && (
            <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20 mb-3">
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase">Название *</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Rutube"
                  value={form.name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name: v,
                      slug: editingId ? f.slug : v.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase">Slug (строчные) *</label>
                <input
                  type="text"
                  required
                  placeholder="rutube"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <IconPicker
                label="Логотип / Иконка"
                context="network"
                value={form.icon}
                onChange={(v) => setForm((f) => ({ ...f, icon: v }))}
                suggestName={form.name}
              />
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase">Сортировка</label>
                <input
                  type="number"
                  value={form.sort}
                  onChange={(e) => setForm((f) => ({ ...f, sort: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Отмена
              </button>
              <Button type="submit" intent="primary" size="sm" disabled={isPending} className="cursor-pointer">
                {isPending && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
                {mode === 'create' ? 'Создать' : 'Сохранить'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Networks Table ─── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm w-full">
        <Table aria-label="Социальные сети каталога" className="w-full text-left">
          <Table.ScrollContainer>
            <Table.Content>
              <Table.Header>
                <Table.Column isRowHeader className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-4 py-2.5 w-8">
                  #
                </Table.Column>
                <Table.Column className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-4 py-2.5">
                  Соцсеть
                </Table.Column>
                <Table.Column className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-4 py-2.5">
                  Slug
                </Table.Column>
                <Table.Column className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-3 py-2.5 text-center">
                  Категорий
                </Table.Column>
                <Table.Column className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-3 py-2.5 text-center">
                  Порядок
                </Table.Column>
                <Table.Column className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-3 py-2.5 text-right">
                  Действия
                </Table.Column>
              </Table.Header>
              <Table.Body>
                {networks.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={6}>
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        Соцсети не найдены. Нажмите «Добавить соцсеть», чтобы создать первую.
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  networks.map((n, idx) => (
                    <Table.Row key={n.id} className={editingId === n.id ? 'bg-primary/5' : undefined}>
                      <Table.Cell className="px-4 py-2.5 text-[11px] text-muted-foreground font-mono w-8">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
                      </Table.Cell>
                      <Table.Cell className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <UniversalIcon icon={n.icon || `brand:${n.slug}`} size={18} />
                          <span className="text-xs font-bold text-foreground">{n.name}</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="px-4 py-2.5">
                        <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50">
                          {n.slug}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="px-3 py-2.5 text-center">
                        <span className={`text-xs font-bold ${n.categoriesCount > 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {n.categoriesCount}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="px-3 py-2.5 text-center">
                        <span className="text-[11px] font-mono text-muted-foreground">{n.sort}</span>
                      </Table.Cell>
                      <Table.Cell className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(n)}
                            className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10 transition-colors cursor-pointer"
                            title="Редактировать"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(n)}
                            disabled={n.categoriesCount > 0}
                            className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={n.categoriesCount > 0 ? `Нельзя удалить: ${n.categoriesCount} категорий` : 'Удалить'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>

      {/* ─── Delete Confirm Modal ─── */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Удаление соцсети"
        isDanger
        confirmText="Удалить"
        cancelText="Отмена"
      >
        <span>
          Вы действительно хотите удалить соцсеть «<strong>{deleteTarget?.name}</strong>»? Это действие необратимо.
        </span>
      </ConfirmModal>
    </div>
  );
}
