'use client';
// audit-disable STR-002

import { useState, useTransition, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Table } from '@heroui/react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Trash2, ShoppingCart, Pencil, Plus, Loader2, AlertCircle, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SocialIcon } from '@/components/ui/SocialIcon';
import type { CatalogServiceDTO } from '@/types/catalog.dto';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import {
  toggleServiceActiveAction,
  updateServiceMarkupAction,
} from '@/actions/admin/catalog/batch';
import { softDeleteServiceAction } from '@/actions/admin/catalog/soft-delete';
import {
  applyBeautifulRounding,
  SAFETY_FLOOR_MARKUP,
  TOTAL_MANDATORY_DEDUCTIONS,
} from '@/lib/financial-constants';
import { useRangeSelection } from '@/hooks/use-range-selection';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BatchActionBar } from './catalog/batch-action-bar';
import { AdminPricingIntelligenceModal } from './catalog/AdminPricingIntelligenceModal';
const SAFETY_MULTIPLIER = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

function calcDisplayPrice(rate: number, markup: number, usdToRub: number, curr: 'RUB' | 'USD', vol: 'UNIT' | '1K') {
  if (vol === '1K') {
    const rawPrice = curr === 'USD' ? rate * markup : rate * markup * usdToRub;
    return curr === 'RUB' ? applyBeautifulRounding(rawPrice) : parseFloat(rawPrice.toFixed(4));
  } else {
    const rawPrice = curr === 'USD' ? (rate * markup) / 1000 : (rate * markup * usdToRub) / 1000;
    return curr === 'RUB' 
      ? applyBeautifulRounding(rawPrice * 1000) / 1000 
      : parseFloat(rawPrice.toFixed(6));
  }
}

function calcDisplayCost(rate: number, usdToRub: number, curr: 'RUB' | 'USD', vol: 'UNIT' | '1K') {
  if (vol === '1K') {
    return curr === 'USD' ? rate : rate * usdToRub;
  } else {
    return curr === 'USD' ? rate / 1000 : (rate * usdToRub) / 1000;
  }
}

function getNetworkBadgeClass(slug: string | null) {
  if (!slug) return 'bg-default-100 text-default-600 border-default-200/20';
  const s = slug.toLowerCase();
  if (s.includes('tg') || s.includes('telegr')) {
    return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
  }
  if (s.includes('vk') || s.includes('vkont')) {
    return 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-600/20';
  }
  if (s.includes('inst') || s.includes('ig')) {
    return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20';
  }
  if (s.includes('yt') || s.includes('youtub')) {
    return 'bg-rose-600/10 text-rose-600 dark:text-rose-400 border-rose-600/20';
  }
  if (s.includes('tt') || s.includes('tiktok')) {
    return 'bg-zinc-900/10 text-zinc-900 dark:bg-zinc-100/10 dark:text-zinc-100 border-zinc-900/20';
  }
  return 'bg-primary/10 text-primary border-primary/20';
}

// ─── Sub-component: Status Toggle ──────────────────────────────────────────
// ─── Sub-component: Status Toggle ──────────────────────────────────────────
function StatusToggle({ service }: { service: CatalogServiceDTO }) {
  const [isActive, setIsActive] = useState(service.isActive);
  const [isPending, startTransition] = useTransition();

  function handleToggle(val: boolean) {
    setIsActive(val);
    startTransition(async () => {
      const r = await toggleServiceActiveAction(service.id, val);
      if (!r.success) setIsActive(!val); // revert on error
    });
  }

  return (
    <div className="flex justify-center">
      <Checkbox
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label={`${isActive ? 'Отключить' : 'Включить'} услугу ${service.name}`}
      />
    </div>
  );
}

// ─── Sub-component: Archive Button ──────────────────────────────────────────
function ArchiveButton({ service }: { service: CatalogServiceDTO }) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleArchive() {
    setConfirmOpen(true);
  }

  function executeArchive() {
    setConfirmOpen(false);
    startTransition(async () => {
      const r = await softDeleteServiceAction(service.id);
      if ('error' in r && r.error) toast.error(r.error);
      else toast.success('Услуга архивирована');
    });
  }

  return (
    <>
      <button
        onClick={handleArchive}
        disabled={isPending}
        aria-label={`Архивировать услугу ${service.name}`}
        className="h-10 w-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 disabled:opacity-40 cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeArchive}
        title="Архивация услуги"
        isDanger={true}
        confirmText="Архивировать"
        cancelText="Отмена"
      >
        Архивировать «{service.name}»? Услуга будет скрыта для клиентов.
      </ConfirmModal>
    </>
  );
}

// ─── Sub-component: Create Service Button (Full Page Link) ───────────────────
export function CreateServiceButton() {
  return (
    <Link
      href="/admin/catalog/new"
      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-200 cursor-pointer shadow-xs active:scale-95 text-xs"
    >
      <Plus className="w-4 h-4" />
      Создать услугу
    </Link>
  );
}

// ─── Sub-component: Edit Service Actions (Full Page Link) ─────────────────────
export function EditServiceModal({
  service,
}: {
  service: CatalogServiceDTO;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providers?: any[];
  onSuccess?: () => void;
  usdToRub?: number;
}) {
  const [openPricingModal, setOpenPricingModal] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpenPricingModal(true)}
          title="ML Обоснование наценки и юнит-экономика"
          aria-label={`ML Обоснование наценки для ${service.name}`}
          className="h-10 w-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-all duration-200 cursor-pointer"
        >
          <span className="text-base">🧠</span>
        </button>

        <Link
          href={`/admin/catalog/${service.id}`}
          aria-label={`Редактировать услугу ${service.name}`}
          className="h-10 w-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 cursor-pointer"
        >
          <Pencil className="w-4 h-4" />
        </Link>
      </div>

      {openPricingModal && (
        <AdminPricingIntelligenceModal
          serviceId={service.id}
          isOpen={openPricingModal}
          onClose={() => setOpenPricingModal(false)}
        />
      )}
    </>
  );
}

function CatalogTableRow({ 
  service: s, 
  usdToRub, 
  canEdit = true, 
  canEditFinance = true, 
  canSeeRates = true, 
  isChecked, 
  onToggle, 
  categories, 
  providers,
  router,
  currency,
  volume
}: {
  service: CatalogServiceDTO;
  usdToRub: number;
  canEdit?: boolean;
  canEditFinance?: boolean;
  canSeeRates?: boolean;
  isChecked: boolean;
  onToggle: (e?: React.MouseEvent | React.ChangeEvent) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providers: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any;
  currency: 'RUB' | 'USD';
  volume: 'UNIT' | '1K';
}) {
  const [markup, setMarkup] = useState(s.markup);
  const [localPrice, setLocalPrice] = useState(calcDisplayPrice(s.rate, s.markup, usdToRub, currency, volume));
  const [isPending, startTransition] = useTransition();

  const isBelowSafety = markup < SAFETY_MULTIPLIER;

  // Sync state if service rate or markup changed from parent / bulk update, or currency / volume changed
  const [prevService, setPrevService] = useState(s);
  const [prevCurrency, setPrevCurrency] = useState(currency);
  const [prevVolume, setPrevVolume] = useState(volume);

  if (s.markup !== prevService.markup || s.rate !== prevService.rate || currency !== prevCurrency || volume !== prevVolume) {
    setPrevService(s);
    setPrevCurrency(currency);
    setPrevVolume(volume);
    setMarkup(s.markup);
    setLocalPrice(calcDisplayPrice(s.rate, s.markup, usdToRub, currency, volume));
  }

  function handlePriceChange(val: string) {
    const newPrice = parseFloat(val) || 0;
    setLocalPrice(newPrice);
    
    // Auto-recalculate markup in memory
    if (currency === 'RUB') {
      const providerCostRub = s.rate * usdToRub;
      const pricePer1kRub = volume === '1K' ? newPrice : newPrice * 1000;
      if (providerCostRub > 0) {
        setMarkup(pricePer1kRub / providerCostRub);
      }
    } else { // USD
      const providerCostUsd = s.rate;
      const pricePer1kUsd = volume === '1K' ? newPrice : newPrice * 1000;
      if (providerCostUsd > 0) {
        setMarkup(pricePer1kUsd / providerCostUsd);
      }
    }
  }

  function handlePercentChange(val: string) {
    const newPercent = parseFloat(val) || 0;
    const newMarkup = (newPercent / 100) + 1;
    setMarkup(newMarkup);
    setLocalPrice(calcDisplayPrice(s.rate, newMarkup, usdToRub, currency, volume));
  }

  async function save() {
    const providerCostRub = s.rate * usdToRub;
    const providerCostUsd = s.rate;

    let finalMarkup = s.markup;

    if (currency === 'RUB') {
      const pricePer1kRub = volume === '1K' ? localPrice : localPrice * 1000;
      const roundedPricePer1kRub = applyBeautifulRounding(pricePer1kRub);
      if (providerCostRub > 0) {
        finalMarkup = roundedPricePer1kRub / providerCostRub;
      }
    } else { // USD
      const pricePer1kUsd = volume === '1K' ? localPrice : localPrice * 1000;
      if (providerCostUsd > 0) {
        finalMarkup = pricePer1kUsd / providerCostUsd;
      }
    }

    // Check if markup actually changed
    const currentDisplayPrice = calcDisplayPrice(s.rate, s.markup, usdToRub, currency, volume);
    if (localPrice === currentDisplayPrice) return;

    // HARD BLOCK: Financial Integrity Guard
    if (finalMarkup < SAFETY_MULTIPLIER) {
      const minPrice = calcDisplayPrice(s.rate, SAFETY_MULTIPLIER, usdToRub, currency, volume);
      const unitLabel = volume === '1K' ? 'за 1000 шт' : 'за 1 шт';
      const curSign = currency === 'RUB' ? '₽' : '$';
      toast.error(
        <div className="flex flex-col gap-1 text-xs">
          <span className="font-bold text-destructive flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> Ошибка маржинальности
          </span>
          <span>
            Цена <b>{localPrice} {curSign} ({unitLabel})</b> ниже порога безубыточности. Минимальная цена: <b>{minPrice} {curSign}</b>.
          </span>
        </div>
      );
      setMarkup(s.markup);
      setLocalPrice(calcDisplayPrice(s.rate, s.markup, usdToRub, currency, volume));
      return;
    }

    startTransition(async () => {
      const r = await updateServiceMarkupAction(s.id, finalMarkup);
      if (!r.success) {
        toast.error(r.error ?? 'Ошибка сохранения');
        setMarkup(s.markup);
        setLocalPrice(calcDisplayPrice(s.rate, s.markup, usdToRub, currency, volume));
      } else {
        const displayNewPrice = calcDisplayPrice(s.rate, finalMarkup, usdToRub, currency, volume);
        const curSign = currency === 'RUB' ? '₽' : '$';
        const unitLabel = volume === '1K' ? 'за 1000 шт' : 'за 1 шт';
        toast.success(
          <div className="flex flex-col text-xs">
            <span className="font-bold">Цена обновлена</span>
            <span className="opacity-80">Установлено: {displayNewPrice} {curSign} ({unitLabel}) (+{((finalMarkup - 1) * 100).toFixed(0)}%)</span>
          </div>
        );
        setLocalPrice(displayNewPrice);
        setMarkup(finalMarkup);
      }
    });
  }

  // Определение статуса провайдера
  let providerStatusLabel = "Вручную";
  let providerStatusColor = "bg-default-100 text-default-600 border-default-200/30";
  
  if (s.providerId) {
    if (s.cooldownReason === 'ZOMBIE_ARCHIVED' || s.cooldownReason === 'ZOMBIE_AUTO_DISABLED') {
      providerStatusLabel = "Удалена";
      providerStatusColor = "bg-danger-50 text-danger border-danger-200/30";
    } else {
      providerStatusLabel = "Активна";
      providerStatusColor = "bg-success-50 text-success border-success-200/30";
    }
  }

  return (
    <Table.Row
      key={s.id}
      className={`group transition-all duration-200 border-b border-border/80 ${
        isChecked
          ? 'bg-primary/5'
          : !s.isActive
          ? 'bg-muted/50 opacity-70'
          : 'hover:bg-muted/30'
      }`}
    >
      {/* 1. Checkbox */}
      <Table.Cell className={canEdit ? "py-4 px-4" : "hidden"}>
        <input
          type="checkbox" checked={isChecked}
          onChange={() => {}}
          onClick={(e) => onToggle(e)}
          className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
          disabled={!canEdit}
        />
      </Table.Cell>

      {/* 2. Услуга / Сеть */}
      <Table.Cell className="py-4 px-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-1.5 items-start shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${getNetworkBadgeClass(s.networkSlug)}`}>
              {s.networkName || '—'}
            </span>
            <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/30">
              #{s.numericId}
            </span>
          </div>
          <div className="flex flex-col space-y-1 max-w-[340px]">
            <span className="font-black text-foreground text-xs leading-tight flex flex-wrap items-center gap-1.5">
              {s.name}
              {s.isQuarantined && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-black border border-warning/20 whitespace-nowrap animate-pulse">
                  ⚠️ КАРАНТИН
                </span>
              )}
            </span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-muted-foreground leading-normal">
              {s.categoryName && (
                <span className="bg-muted text-muted-foreground border border-border/50 px-1.5 py-0.5 rounded text-[9px] font-semibold">
                  {s.categoryName}
                </span>
              )}
              {s.providerId && s.externalId && (
                <span className="font-mono">
                  API: #{s.externalId} ({providers.find(p => p.id === s.providerId)?.name || 'API'})
                </span>
              )}
              <span className="text-primary uppercase tracking-tight">
                [{s.networkName || 'Тариф'}]
              </span>
            </div>
          </div>
        </div>
      </Table.Cell>

      {/* 4. Закупка */}
      <Table.Cell className={`py-4 px-4 text-right ${!canSeeRates ? "hidden" : ""}`}>
        {canSeeRates ? (
          <div className="flex flex-col items-end">
            <span className="font-mono text-xs font-black text-foreground tabular-nums tracking-tight">
              {currency === 'USD' ? '$' : ''}
              {calcDisplayCost(s.rate, usdToRub, currency, volume).toFixed(currency === 'USD' ? (volume === '1K' ? 4 : 6) : (volume === '1K' ? 2 : 4))}
              {currency === 'RUB' ? ' ₽' : ''}
            </span>
            <span className="text-[9px] text-muted-foreground/60 font-bold font-mono uppercase tracking-tighter mt-0.5">
              {volume === '1K' ? 'за 1к шт' : 'за 1 шт'}
            </span>
          </div>
        ) : <span className="sr-only">Rate hidden</span>}
      </Table.Cell>
      
      {/* 5. Наценка (%) */}
      <Table.Cell className="py-4 px-4">
        {canEditFinance && s.providerId ? (
          <div className="relative flex items-center justify-center w-28 mx-auto">
            <span className="absolute left-2 text-[10px] text-muted-foreground pointer-events-none font-bold">+</span>
            <input
              type="number"
              value={markup > 0 ? ((markup - 1) * 100).toFixed(0) : "0"}
              onChange={e => handlePercentChange(e.target.value)}
              onBlur={save}
              onKeyDown={e => e.key === 'Enter' && save()}
              disabled={isPending || !canEditFinance}
              className={`w-20 pl-4 pr-1.5 py-1 text-xs font-mono font-bold rounded-lg border outline-none transition-all duration-200 tabular-nums text-center
                ${isBelowSafety
                  ? 'border-rose-400 bg-destructive/10 text-rose-700 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-border/80 bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
                } disabled:opacity-50`}
            />
            <span className="ml-1 text-[10px] text-muted-foreground font-black">%</span>
          </div>
        ) : (
          <div className="text-xs font-mono font-bold text-center text-muted-foreground w-28 mx-auto py-1">
            {s.providerId ? `+${((markup - 1) * 100).toFixed(0)}%` : '—'}
          </div>
        )}
      </Table.Cell>

      {/* 6. Розничная цена */}
      <Table.Cell className="py-4 px-4">
        {canEdit ? (
          <div className="flex items-center justify-end w-28 ml-auto">
            <input
              type="number"
              step={volume === '1K' ? '1' : '0.0001'}
              value={localPrice}
              onChange={e => handlePriceChange(e.target.value)}
              onBlur={save}
              onKeyDown={e => e.key === 'Enter' && save()}
              disabled={isPending || !canEditFinance}
              className={`w-20 px-2 py-1 text-xs font-mono font-black rounded-lg border outline-none transition-all duration-200 tabular-nums text-right
                ${isBelowSafety
                  ? 'border-rose-400 bg-destructive/10 text-rose-700 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-border/80 bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
                } disabled:opacity-50`}
            />
            <span className="ml-1 text-xs text-muted-foreground font-bold">{currency === 'RUB' ? '₽' : '$'}</span>
          </div>
        ) : (
          <div className="text-xs font-mono font-black text-foreground bg-muted/30 px-2.5 py-1 rounded-lg border border-border/40 inline-block tabular-nums w-24 text-right">
            {localPrice} {currency === 'RUB' ? '₽' : '$'}
          </div>
        )}
      </Table.Cell>
      
      {/* 7. Статус / Доступность */}
      <Table.Cell className="py-4 px-4 text-center">
        <div className="flex flex-col items-center gap-1.5 justify-center">
          {canEdit ? <StatusToggle service={s} /> : (
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${s.isActive ? 'bg-success/15 text-success border border-emerald-500/10' : 'bg-muted text-muted-foreground border border-border/30'}`}>
              {s.isActive ? 'Вкл' : 'Выкл'}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider ${providerStatusColor}`}>
            {providerStatusLabel}
          </span>
        </div>
      </Table.Cell>

      {/* 8. Действия */}
      <Table.Cell className={canEdit ? "py-4 px-4 text-right" : "hidden"}>
        {canEdit ? (
          <div className="flex items-center gap-1.5 justify-end">
            <EditServiceModal service={s} categories={categories} providers={providers} onSuccess={() => router.refresh()} usdToRub={usdToRub} />
            <ArchiveButton service={s} />
          </div>
        ) : <span className="sr-only">Actions hidden</span>}
      </Table.Cell>
    </Table.Row>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function CatalogTable({ 
  services, 
  usdToRub,
  canEdit = true,
  canEditFinance = true,
  canSeeRates = true,
  categories = [],
  providers = [],
}: { 
  services: CatalogServiceDTO[], 
  usdToRub: number,
  canEdit?: boolean,
  canEditFinance?: boolean,
  canSeeRates?: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories?: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providers?: any[],
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSortBy = searchParams.get('sortBy') || '';
  const currentSortOrder = searchParams.get('sortOrder') || '';

  function handleSortClick(field: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (currentSortBy === field) {
      if (currentSortOrder === 'asc') {
        params.set('sortOrder', 'desc');
      } else {
        params.delete('sortBy');
        params.delete('sortOrder');
      }
    } else {
      params.set('sortBy', field);
      params.set('sortOrder', 'asc');
    }
    params.delete('cursor'); // Reset pagination
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function renderSortableHeader(field: string, title: string, alignRight: boolean = false) {
    const isActive = currentSortBy === field;
    return (
      <button
        type="button"
        onClick={() => handleSortClick(field)}
        className={`hover:text-primary transition-colors inline-flex items-center gap-1 font-extrabold uppercase min-h-[44px] py-1 cursor-pointer select-none ${
          alignRight ? 'ml-auto justify-end' : ''
        }`}
      >
        <span>{title}</span>
        {isActive ? (
          currentSortOrder === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-primary shrink-0" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-primary shrink-0" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100 shrink-0" />
        )}
      </button>
    );
  }

  const {
    selectedIds,
    selectedSet,
    isAllSelected,
    toggleRow,
    toggleSelectAll,
    clearSelection,
  } = useRangeSelection({ items: services });

  const [currency, setCurrency] = useState<'RUB' | 'USD'>('RUB');
  const [volume, setVolume] = useState<'UNIT' | '1K'>('1K');

  const selectedPlatform = searchParams.get('platform') || 'ALL';

  const networks = useMemo(() => {
    const map = new Map<string, { slug: string; name: string }>();
    categories.forEach(c => {
      if (c.network?.slug) {
        map.set(c.network.slug, { slug: c.network.slug, name: c.network.name });
      }
    });
    return Array.from(map.values());
  }, [categories]);

  function handlePlatformClick(platformSlug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (platformSlug === 'ALL') {
      params.delete('platform');
    } else {
      params.set('platform', platformSlug);
    }
    params.delete('category'); // Always reset category when changing platform
    params.delete('cursor'); // Reset pagination
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // Filters State synced with URL
  const currentSearch = searchParams.get('q') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentProviderId = searchParams.get('providerId') || 'all';
  const currentIsActive = searchParams.get('isActive') || 'all';
  const currentProviderStatus = searchParams.get('providerStatus') || 'all';
  const currentExternalId = searchParams.get('externalId') || '';

  // Local input states to avoid laggy keystrokes
  const [searchVal, setSearchVal] = useState(currentSearch);
  const [extIdVal, setExtIdVal] = useState(currentExternalId);

  // Sync inputs with URL changes (e.g. on reset)
  const [prevSearch, setPrevSearch] = useState(currentSearch);
  if (currentSearch !== prevSearch) {
    setPrevSearch(currentSearch);
    setSearchVal(currentSearch);
  }
  const [prevExtId, setPrevExtId] = useState(currentExternalId);
  if (currentExternalId !== prevExtId) {
    setPrevExtId(currentExternalId);
    setExtIdVal(currentExternalId);
  }

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('cursor'); // Reset pagination
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function resetFilters() {
    setSearchVal('');
    setExtIdVal('');
    router.push(pathname, { scroll: false });
  }

  return (
    <div className="space-y-6">
      {/* Redesigned Premium Filters Bar */}
      <div className="bg-card/60 backdrop-blur-md border border-border/50 p-5 rounded-2xl shadow-sm ring-1 ring-border/5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Фильтры каталога</h3>
          {(currentSearch || currentExternalId || currentCategory || selectedPlatform !== 'ALL' || currentProviderId !== 'all' || currentIsActive !== 'all' || currentProviderStatus !== 'all') && (
            <button 
              onClick={resetFilters} 
              className="text-[11px] min-h-[36px] px-2 flex items-center font-bold text-destructive hover:underline transition-all duration-200 cursor-pointer active:scale-95"
            >
              Сбросить фильтры
            </button>
          )}
        </div>

        {/* Platform Horizontal Pills Bar */}
        <div className="flex flex-wrap gap-2 pb-1 border-b border-border/40">
          <button
            onClick={() => handlePlatformClick('ALL')}
            className={`px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-xl transition-all cursor-pointer border flex items-center justify-center ${
              selectedPlatform === 'ALL'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background hover:bg-muted text-muted-foreground border-border/80'
            }`}
          >
            Все сети
          </button>
          {networks.map((p: { slug: string; name: string }) => (
            <button
              key={p.slug}
              onClick={() => handlePlatformClick(p.slug)}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-xl transition-all cursor-pointer border flex items-center gap-1.5 justify-center ${
                selectedPlatform === p.slug
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background hover:bg-muted text-muted-foreground border-border/80'
              }`}
            >
              <SocialIcon slug={p.slug} size={14} />
              {p.name}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Category Select Dropdown */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Категория</label>
            <Select value={currentCategory || 'all'} onValueChange={val => updateFilter('category', val)}>
              <SelectTrigger className="w-full h-8 border border-border bg-background text-foreground text-xs rounded-xl cursor-pointer">
                <SelectValue placeholder="Все категории">
                  {(value: string) => {
                    if (value === 'all') return 'Все категории';
                    return categories.find(c => c.id === value)?.name ?? value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" label="Все категории" className="text-xs cursor-pointer">Все категории</SelectItem>
                {categories
                  .filter(c => selectedPlatform === 'ALL' || c.network?.slug === selectedPlatform)
                  .map(c => (
                    <SelectItem key={c.id} value={c.id} label={c.name} className="text-xs cursor-pointer">
                      {c.name} ({c._count?.services || 0})
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
          {/* Текстовый поиск */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Поиск по названию / ID</label>
            <input
              type="text"
              placeholder="Название или ID..."
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && updateFilter('q', searchVal)}
              onBlur={() => updateFilter('q', searchVal)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            />
          </div>

          {/* Внешний ID услуги */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-tight">External ID провайдера</label>
            <input
              type="text"
              placeholder="Внешний ID..."
              value={extIdVal}
              onChange={e => setExtIdVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && updateFilter('externalId', extIdVal)}
              onBlur={() => updateFilter('externalId', extIdVal)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            />
          </div>

          {/* Выбор провайдера */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Провайдер</label>
            <Select value={currentProviderId} onValueChange={val => updateFilter('providerId', val)}>
              <SelectTrigger className="w-full h-8 border border-border bg-background text-foreground text-xs rounded-xl cursor-pointer">
                <SelectValue placeholder="Все провайдеры">
                  {(value: string) => {
                    if (value === 'all') return 'Все провайдеры';
                    if (value === 'none') return 'Без провайдера (вручную)';
                    return providers.find(p => p.id === value)?.name ?? value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" label="Все провайдеры" className="text-xs cursor-pointer">Все провайдеры</SelectItem>
                <SelectItem value="none" label="Без провайдера" className="text-xs cursor-pointer">Без провайдера (вручную)</SelectItem>
                {providers.map(p => (
                  <SelectItem key={p.id} value={p.id} label={p.name} className="text-xs cursor-pointer">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/30 border border-border/80 rounded-2xl shadow-sm">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">
          Показано услуг: <span className="font-black text-foreground text-sm tabular-nums">{services.length}</span>
        </div>

        {/* Price display controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-background border border-border/80 p-1 rounded-xl shadow-sm">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tight px-2">Валюта:</span>
            <button
              onClick={() => setCurrency('RUB')}
              className={`px-3 py-1 min-h-[36px] flex items-center justify-center text-xs font-extrabold rounded-lg transition-all cursor-pointer ${currency === 'RUB' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              ₽ (RUB)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1 min-h-[36px] flex items-center justify-center text-xs font-extrabold rounded-lg transition-all cursor-pointer ${currency === 'USD' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              $ (USD)
            </button>
          </div>

          <div className="flex items-center gap-2 bg-background border border-border/80 p-1 rounded-xl shadow-sm">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tight px-2">Объем:</span>
            <button
              onClick={() => setVolume('UNIT')}
              className={`px-3 py-1 min-h-[36px] flex items-center justify-center text-xs font-extrabold rounded-lg transition-all cursor-pointer ${volume === 'UNIT' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              за 1 шт
            </button>
            <button
              onClick={() => setVolume('1K')}
              className={`px-3 py-1 min-h-[36px] flex items-center justify-center text-xs font-extrabold rounded-lg transition-all cursor-pointer ${volume === '1K' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              за 1000 шт
            </button>
          </div>
        </div>

        <div className="shrink-0">
          {canEdit && (
            <CreateServiceButton />
          )}
        </div>
      </div>

      {selectedIds.length > 0 && canEdit && (
        <BatchActionBar selectedIds={selectedIds} onClear={clearSelection} canEditFinance={canEditFinance} categories={categories} />
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table className="w-full text-sm text-left">
          <Table.ScrollContainer>
            <Table.Content aria-label="Каталог услуг" className="w-full">
              <Table.Header>
                <Table.Column key="checkbox" className={canEdit ? "w-10 px-4 py-3" : "hidden"}>
                  <input
                    type="checkbox" checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                    disabled={!canEdit}
                  />
                </Table.Column>
                <Table.Column key="serviceNetwork" isRowHeader className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-4 py-3 min-w-[240px]">
                  {renderSortableHeader('name', 'Услуга / Сеть')}
                </Table.Column>
                <Table.Column key="rate" className={`text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-4 py-3 text-right ${!canSeeRates ? "hidden" : ""}`}>
                  {renderSortableHeader('rate', 'Закупка', true)}
                </Table.Column>
                <Table.Column key="markup" className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-4 py-3 text-center">
                  <div className="flex justify-center">
                    {renderSortableHeader('markup', 'Наценка (%)')}
                  </div>
                </Table.Column>
                <Table.Column key="price" className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-4 py-3 text-right">
                  {renderSortableHeader('price', 'Розничная цена', true)}
                </Table.Column>
                <Table.Column key="status" className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider text-center px-4 py-3">Статус</Table.Column>
                <Table.Column key="actions" className={canEdit ? "w-12 px-4 py-3 text-right" : "hidden"}><span className="sr-only">Actions</span></Table.Column>
              </Table.Header>
                <Table.Body renderEmptyState={() => (
                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                     <ShoppingCart className="w-8 h-8 opacity-20" />
                     <p className="text-sm">Нет услуг в выбранной категории</p>
                  </div>
                )}>
                  {services.map((s) => (
                    <CatalogTableRow 
                      key={s.id}
                      service={s} 
                      usdToRub={usdToRub} 
                      canEdit={canEdit}
                      canEditFinance={canEditFinance}
                      canSeeRates={canSeeRates}
                      isChecked={selectedSet.has(s.id)}
                      onToggle={(e) => toggleRow(s.id, e)}
                      categories={categories}
                      providers={providers}
                      router={router}
                      currency={currency}
                      volume={volume}
                    />
                  ))}
                </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>
    </div>
  );
}
