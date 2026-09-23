'use client';

import React, { useState } from 'react';
import { Plus, X, Layers, Loader2 } from 'lucide-react';
import type { CategoryItem } from '../types';
import { createCategory } from '@/actions/admin/catalog/categories';
import { toast } from 'sonner';

export interface CategoryCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (createdCat: CategoryItem) => void;
  networksList: Array<{ id: string; name: string; slug: string }>;
  suggestedPlatform?: string | null;
  suggestedName?: string | null;
  getNetIcon: (netName?: string) => string;
}

export function CategoryCreateDialog({
  isOpen,
  onClose,
  onCreated,
  networksList,
  suggestedPlatform,
  suggestedName,
  getNetIcon,
}: CategoryCreateDialogProps) {
  const platformSlug = (suggestedPlatform || '').toUpperCase();
  const matchedNet = networksList.find(
    (n) => n.slug.toUpperCase() === platformSlug || n.name.toUpperCase().includes(platformSlug)
  );

  const [newCatName, setNewCatName] = useState(suggestedName || '');
  const [newCatNetworkId, setNewCatNetworkId] = useState(matchedNet?.id || networksList[0]?.id || '');
  const [createLoading, setCreateLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !newCatNetworkId) {
      toast.error('Укажите название категории и выберите соцсеть');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await createCategory({
        name: newCatName.trim(),
        networkId: newCatNetworkId,
        sort: 0,
        tenantId: 'all',
      });

      if (!res.success || !res.categoryId || !res.category) {
        toast.error(res.error || 'Не удалось создать категорию');
        return;
      }

      const createdCat: CategoryItem = {
        id: res.category.id,
        name: res.category.name,
        networkId: res.category.networkId,
        network: networksList.find((n) => n.id === res.category?.networkId) || {
          name: 'Соцсеть',
          slug: 'social',
        },
      };

      onCreated(createdCat);
      onClose();
      toast.success(`Категория «${createdCat.name}» создана и выбрана!`);
    } catch {
      toast.error('Произошла ошибка при создании категории');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-card text-card-foreground border border-border/80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
              <Layers className="w-4 h-4 shrink-0" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Новая категория</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Социальная сеть
            </label>
            <select
              value={newCatNetworkId}
              onChange={(e) => setNewCatNetworkId(e.target.value)}
              className="w-full h-9 px-2 text-xs rounded-lg border border-border bg-background focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
            >
              {networksList.map((net) => (
                <option key={net.id} value={net.id}>
                  {getNetIcon(net.name)} {net.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Название категории
            </label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Например: Опросы / Голоса"
              required
              autoFocus
              className="w-full h-9 px-3 text-xs rounded-lg border border-border bg-background focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={createLoading}
              className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg border border-border bg-background cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={createLoading || !newCatName.trim() || !newCatNetworkId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Создать и выбрать</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
