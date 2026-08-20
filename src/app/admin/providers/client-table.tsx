'use client';

import React, { useState, useTransition, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  SlidersHorizontal,
  Power,
  Sparkles,
  LifeBuoy,
} from 'lucide-react';
import type { ProviderListDTO } from '@/services/admin/provider.service';
import { ProviderBalanceCell } from './components/provider-balance-cell';
import { SyncProviderButton } from './components/sync-provider-button';
import {
  toggleProviderActiveAction,
  resetProviderErrorsAction,
  createMockProviderPresetAction,
} from '@/actions/admin/providers/crud';

export function ProvidersTable({ providers }: { providers: ProviderListDTO[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'error' | 'disabled'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [isPresetPending, startPresetTransition] = useTransition();

  // Filtered providers
  const filtered = useMemo(() => {
    return providers.filter((p) => {
      const matchesSearch =
        search.trim() === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.apiUrl.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'active') return p.isActive && p.errorCount5m === 0;
      if (statusFilter === 'error') return p.isActive && p.errorCount5m > 0;
      if (statusFilter === 'disabled') return !p.isActive;
      return true;
    });
  }, [providers, search, statusFilter]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: providers.length,
      active: providers.filter((p) => p.isActive && p.errorCount5m === 0).length,
      error: providers.filter((p) => p.isActive && p.errorCount5m > 0).length,
      disabled: providers.filter((p) => !p.isActive).length,
    };
  }, [providers]);

  // Copy API URL helper
  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('API URL скопирован в буфер обмена');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Quick Toggle Active State
  const handleToggleActive = async (provider: ProviderListDTO) => {
    const nextState = !provider.isActive;
    setPendingIds((prev) => new Set(prev).add(provider.id));

    try {
      const res = await toggleProviderActiveAction(provider.id, nextState);
      if (res.success) {
        toast.success(
          nextState
            ? `Шлюз "${provider.name}" активирован`
            : `Шлюз "${provider.name}" отключён`
        );
        router.refresh();
      } else {
        toast.error('Не удалось изменить статус провайдера', { description: res.error });
      }
    } catch {
      toast.error('Ошибка сервера при переключении статуса');
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(provider.id);
        return next;
      });
    }
  };

  // Reset Errors
  const handleResetErrors = async (provider: ProviderListDTO) => {
    setPendingIds((prev) => new Set(prev).add(provider.id));
    try {
      const res = await resetProviderErrorsAction(provider.id);
      if (res.success) {
        toast.success(`Счётчик ошибок для "${provider.name}" сброшен`);
        router.refresh();
      } else {
        toast.error('Не удалось сбросить ошибки', { description: res.error });
      }
    } catch {
      toast.error('Ошибка сервера при сбросе ошибок');
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(provider.id);
        return next;
      });
    }
  };

  // 1-Click Mock Preset Creation
  const handleCreateMockPreset = () => {
    startPresetTransition(async () => {
      const res = await createMockProviderPresetAction();
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error('Не удалось подключить Mock Sandbox', { description: res.error });
      }
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* ── Toolbar: Search & Filter Tabs ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/40 p-2 rounded-2xl border border-border/40 backdrop-blur-sm">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              statusFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Все
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/20 tabular-nums">
              {counts.all}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              statusFilter === 'active'
                ? 'bg-success text-success-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Активные
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/20 tabular-nums">
              {counts.active}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('error')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              statusFilter === 'error'
                ? 'bg-destructive text-destructive-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Сбои API
            {counts.error > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-destructive-foreground/20 text-destructive-foreground font-bold tabular-nums">
                {counts.error}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('disabled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              statusFilter === 'disabled'
                ? 'bg-muted text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Отключенные
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/20 tabular-nums">
              {counts.disabled}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] sm:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию / URL..."
            className="pl-8 pr-3 h-8.5 text-xs bg-background/80"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground p-0.5"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-[24px] shadow-sm ring-1 ring-border/5 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[980px] text-left" aria-label="Список SMM-провайдеров">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[26%] min-w-[220px] bg-muted/50 py-3.5 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Название / API
                </TableHead>
                <TableHead className="w-[9%] min-w-[80px] bg-muted/50 py-3.5 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Услуги
                </TableHead>
                <TableHead className="w-[18%] min-w-[150px] bg-muted/50 py-3.5 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Баланс (Sync)
                </TableHead>
                <TableHead className="w-[15%] min-w-[130px] bg-muted/50 py-3.5 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  SLA & Связь
                </TableHead>
                <TableHead className="w-[14%] min-w-[120px] bg-muted/50 py-3.5 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Статус
                </TableHead>
                <TableHead className="w-[18%] min-w-[180px] bg-muted/50 py-3.5 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">
                  Действия
                </TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 px-6">
                  <div className="py-10 text-center space-y-4 max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <SlidersHorizontal className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">
                        {providers.length === 0
                          ? 'Нет добавленных провайдеров'
                          : 'Провайдеры по запросу не найдены'}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {providers.length === 0
                          ? 'Подключите вашу первую SMM-панель или используйте песочницу для безопасных тестов.'
                          : 'Попробуйте сбросить фильтры или строку поиска.'}
                      </p>
                    </div>

                    {providers.length === 0 ? (
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <Button
                          onClick={handleCreateMockPreset}
                          disabled={isPresetPending}
                          intent="outline"
                          size="sm"
                          className="text-xs font-bold"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-primary mr-1.5" />
                          {isPresetPending ? 'Подключение...' : 'Подключить Mock Sandbox'}
                        </Button>
                        <Link
                          href="/admin/providers/new"
                          className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-primary-foreground bg-primary rounded-xl hover:opacity-90 transition-all duration-200"
                        >
                          + Добавить панель
                        </Link>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          setSearch('');
                          setStatusFilter('all');
                        }}
                        intent="outline"
                        size="sm"
                        className="text-xs"
                      >
                        Сбросить фильтры
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((provider) => {
                const isPending = pendingIds.has(provider.id);
                return (
                  <TableRow
                    key={provider.id}
                    className="hover:bg-muted/50 transition-all duration-200 group"
                  >
                    {/* 1. Name & URL + Copy */}
                    <TableCell className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 text-sm">
                          {provider.name}
                        </div>
                        {provider.ticketUrl && (
                          <a
                            href={provider.ticketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Открыть тикеты поддержки у провайдера"
                            className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                          >
                            <LifeBuoy className="w-3 h-3 text-primary" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="text-muted-foreground/70 font-mono text-[10px] truncate max-w-[200px]"
                          title={provider.apiUrl}
                        >
                          {provider.apiUrl}
                        </span>
                        <button
                          onClick={() => handleCopyUrl(provider.id, provider.apiUrl)}
                          title="Скопировать URL шлюза"
                          className="text-muted-foreground/50 hover:text-foreground transition-colors p-0.5 cursor-pointer"
                        >
                          {copiedId === provider.id ? (
                            <Check className="w-3 h-3 text-success" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </TableCell>

                    {/* 2. Service count */}
                    <TableCell className="py-3.5 px-4">
                      <div className="font-bold text-foreground tabular-nums text-sm">
                        {provider.serviceCount.toLocaleString('ru-RU')}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        услуг
                      </div>
                    </TableCell>

                    {/* 3. Balance & Health */}
                    <TableCell className="py-3.5 px-4">
                      {provider.isActive ? (
                        <ProviderBalanceCell providerId={provider.id} />
                      ) : (
                        <span className="text-[11px] font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                          ОТКЛЮЧЁН
                        </span>
                      )}
                    </TableCell>

                    {/* 4. SLA & Ping */}
                    <TableCell className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground/70">
                            Ping:
                          </span>
                          <span
                            className={`text-xs font-mono font-bold ${
                              provider.avgResponseMs > 2000
                                ? 'text-destructive'
                                : provider.avgResponseMs > 500
                                ? 'text-warning'
                                : 'text-success'
                            }`}
                          >
                            {provider.avgResponseMs}ms
                          </span>
                        </div>

                        {provider.errorCount5m > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-destructive">
                              ⚠️ {provider.errorCount5m} errs
                            </span>
                            <button
                              onClick={() => handleResetErrors(provider)}
                              disabled={isPending}
                              title="Сбросить счётчик ошибок"
                              className="text-[9px] text-muted-foreground hover:text-foreground underline transition-colors cursor-pointer disabled:opacity-50"
                            >
                              сброс
                            </button>
                          </div>
                        ) : provider.lastSuccessAt ? (
                          <div className="text-[9px] text-muted-foreground/70 font-medium">
                            Sync: {new Date(provider.lastSuccessAt).toLocaleTimeString('ru-RU')}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>

                    {/* 5. Status & Quick Toggle */}
                    <TableCell className="py-3.5 px-4">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {/* Quick Toggle Switch */}
                        <button
                          onClick={() => handleToggleActive(provider)}
                          disabled={isPending}
                          title={provider.isActive ? 'Отключить шлюз' : 'Включить шлюз'}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                            provider.isActive ? 'bg-success' : 'bg-muted-foreground/30'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                              provider.isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        <Badge
                          intent={
                            !provider.isActive
                              ? 'secondary'
                              : provider.errorCount5m > 0
                              ? 'destructive'
                              : 'primary'
                          }
                          className={`font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 whitespace-nowrap ${
                            !provider.isActive
                              ? 'bg-muted text-muted-foreground border-border'
                              : provider.errorCount5m > 0
                              ? 'bg-destructive/20 text-destructive border-destructive/30'
                              : 'bg-success/20 text-success border-success/30'
                          }`}
                        >
                          {!provider.isActive
                            ? 'ВЫКЛ'
                            : provider.errorCount5m > 0
                            ? 'СБОЙ'
                            : 'ВКЛ'}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* 6. Actions */}
                    <TableCell className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <SyncProviderButton providerId={provider.id} />
                        <Link
                          href={`/admin/providers/${provider.id}`}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl border border-border/60 bg-background/50 backdrop-blur-sm text-foreground hover:bg-muted/80 transition-all duration-200 shadow-sm inline-block active:scale-95 whitespace-nowrap"
                        >
                          Настроить
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
