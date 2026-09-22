'use client';

import React, { useState, useTransition, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ProviderListDTO } from '@/services/admin/provider.service';
import {
  toggleProviderActiveAction, resetProviderErrorsAction,
  createMockProviderPresetAction, deleteProviderAction, getProviderDeleteInfoAction,
} from '@/actions/admin/providers/crud';
import { normalizeSearchQuery } from '@/utils/search-normalizer';
import { ProvidersTableToolbar, ProviderStatusFilter } from './components/table/providers-table-toolbar';
import { ProvidersTableDesktop } from './components/table/providers-table-desktop';
import { ProvidersTableMobileCard } from './components/table/providers-table-mobile-card';
import { ProvidersTableEmpty } from './components/table/providers-table-empty';
import { ProviderDeleteDialog, ProviderDeleteInfo } from './components/table/provider-delete-dialog';

export function ProvidersTable({ providers }: { providers: ProviderListDTO[] }) {
  const router = useRouter();
  const [localProviders, setLocalProviders] = useState<ProviderListDTO[]>(providers);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProviderStatusFilter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [isPresetPending, startPresetTransition] = useTransition();
  const [deleteInfo, setDeleteInfo] = useState<ProviderDeleteInfo | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const pendingIdsRef = useRef<Set<string>>(pendingIds);
  pendingIdsRef.current = pendingIds;

  useEffect(() => {
    setLocalProviders((prev) => (pendingIdsRef.current.size === 0 ? providers : providers.map((p) => {
      if (!pendingIdsRef.current.has(p.id)) return p;
      const cur = prev.find((lp) => lp.id === p.id);
      return cur ? { ...p, isActive: cur.isActive, errorCount5m: cur.errorCount5m } : p;
    })));
  }, [providers]);

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 30000);
    const onFocus = () => router.refresh();
    const onProvidersChanged = () => router.refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener('providers:changed', onProvidersChanged);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); window.removeEventListener('providers:changed', onProvidersChanged); };
  }, [router]);

  const handleDeleteRequest = async (providerId: string) => {
    setDeleteLoading(true);
    try {
      const res = await getProviderDeleteInfoAction(providerId);
      if (res.success && res.provider && res.counts) setDeleteInfo({ provider: res.provider, counts: res.counts });
      else toast.error('Не удалось подготовить удаление', { description: res.error });
    } catch { toast.error('Не удалось подготовить удаление провайдера'); }
    finally { setDeleteLoading(false); }
  };

  const handleConfirmDelete = () => {
    if (!deleteInfo) return;
    const { id, name } = deleteInfo.provider;
    const providerToRestore = localProviders.find((p) => p.id === id);
    setLocalProviders((prev) => prev.filter((p) => p.id !== id));
    startDeleteTransition(async () => {
      const res = await deleteProviderAction(id);
      if (res.success) {
        toast.success(`Провайдер «${res.deletedName || name}» удалён`, { description: 'Услуги и заказы сохранены. Теневой каталог очищен.' });
        setDeleteInfo(null);
        router.refresh();
        window.dispatchEvent(new CustomEvent('providers:changed'));
      } else {
        if (providerToRestore) setLocalProviders((prev) => (prev.some((p) => p.id === id) ? prev : [...prev, providerToRestore]));
        toast.error('Не удалось удалить провайдера', { description: res.error });
      }
    });
  };

  const filtered = useMemo(() => {
    const query = normalizeSearchQuery(search);
    return localProviders.filter((p) => {
      const match = query === '' || p.name.toLowerCase().includes(query) || p.apiUrl.toLowerCase().includes(query) || p.id.toLowerCase().includes(query);
      if (!match) return false;
      if (statusFilter === 'active') return p.isActive && p.errorCount5m === 0;
      if (statusFilter === 'error') return p.isActive && p.errorCount5m > 0;
      if (statusFilter === 'disabled') return !p.isActive;
      return true;
    });
  }, [localProviders, search, statusFilter]);

  const counts = useMemo(() => ({
    all: localProviders.length,
    active: localProviders.filter((p) => p.isActive && p.errorCount5m === 0).length,
    error: localProviders.filter((p) => p.isActive && p.errorCount5m > 0).length,
    disabled: localProviders.filter((p) => !p.isActive).length,
  }), [localProviders]);

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url); setCopiedId(id); toast.success('API URL скопирован в буфер обмена');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = async (provider: ProviderListDTO) => {
    const nextState = !provider.isActive;
    setPendingIds((prev) => new Set(prev).add(provider.id));
    setLocalProviders((prev) => prev.map((p) => (p.id === provider.id ? { ...p, isActive: nextState } : p)));
    try {
      const res = await toggleProviderActiveAction(provider.id, nextState);
      if (res.success) {
        toast.success(nextState ? `Шлюз "${provider.name}" активирован` : `Шлюз "${provider.name}" выключен`);
        router.refresh();
        window.dispatchEvent(new CustomEvent('providers:changed'));
      } else {
        setLocalProviders((prev) => prev.map((p) => (p.id === provider.id ? { ...p, isActive: !nextState } : p)));
        toast.error('Не удалось изменить статус провайдера', { description: res.error });
      }
    } catch {
      setLocalProviders((prev) => prev.map((p) => (p.id === provider.id ? { ...p, isActive: !nextState } : p)));
      toast.error('Сетевая ошибка при переключении статуса');
    } finally {
      setPendingIds((prev) => { const next = new Set(prev); next.delete(provider.id); return next; });
    }
  };

  const handleResetErrors = async (provider: ProviderListDTO) => {
    setPendingIds((prev) => new Set(prev).add(provider.id));
    setLocalProviders((prev) => prev.map((p) => (p.id === provider.id ? { ...p, errorCount5m: 0 } : p)));
    try {
      const res = await resetProviderErrorsAction(provider.id);
      if (res.success) {
        toast.success(`Счётчик ошибок для "${provider.name}" сброшен`);
        router.refresh();
        window.dispatchEvent(new CustomEvent('providers:changed'));
      } else {
        setLocalProviders((prev) => prev.map((p) => (p.id === provider.id ? { ...p, errorCount5m: provider.errorCount5m } : p)));
        toast.error('Не удалось сбросить ошибки', { description: res.error });
      }
    } catch {
      setLocalProviders((prev) => prev.map((p) => (p.id === provider.id ? { ...p, errorCount5m: provider.errorCount5m } : p)));
      toast.error('Сетевая ошибка при сбросе ошибок');
    } finally {
      setPendingIds((prev) => { const next = new Set(prev); next.delete(provider.id); return next; });
    }
  };

  const handleCreateMockPreset = () => {
    startPresetTransition(async () => {
      const res = await createMockProviderPresetAction();
      if (res.success) {
        toast.success(res.message);
        router.refresh();
        window.dispatchEvent(new CustomEvent('providers:changed'));
      } else toast.error('Не удалось развернуть Mock Sandbox', { description: res.error });
    });
  };

  return (
    <div className="w-full space-y-4">
      <ProvidersTableToolbar
        search={search} onSearchChange={setSearch} statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter} counts={counts}
        onCreateMockPreset={handleCreateMockPreset} isPresetPending={isPresetPending}
      />

      <div className="bg-card/60 backdrop-blur-xs border border-border/70 rounded-lg shadow-xs overflow-hidden p-0">
        {filtered.length === 0 ? (
          <ProvidersTableEmpty
            totalProviders={localProviders.length} isPresetPending={isPresetPending}
            onCreateMockPreset={handleCreateMockPreset}
            onResetFilters={() => { setSearch(''); setStatusFilter('all'); }}
          />
        ) : (
          <>
            <ProvidersTableDesktop
              providers={filtered} pendingIds={pendingIds} copiedId={copiedId}
              onCopyUrl={handleCopyUrl} onToggleActive={handleToggleActive}
              onResetErrors={handleResetErrors} onDeleteRequest={handleDeleteRequest}
              deleteDisabled={deleteLoading || isDeleting}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 lg:hidden">
              {filtered.map((p) => (
                <ProvidersTableMobileCard
                  key={p.id} provider={p} isPending={pendingIds.has(p.id)} copiedId={copiedId}
                  onCopyUrl={handleCopyUrl} onToggleActive={handleToggleActive}
                  onResetErrors={handleResetErrors} onDeleteRequest={handleDeleteRequest}
                  deleteDisabled={deleteLoading || isDeleting}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <ProviderDeleteDialog deleteInfo={deleteInfo} isDeleting={isDeleting} onClose={() => setDeleteInfo(null)} onConfirm={handleConfirmDelete} />
    </div>
  );
}
