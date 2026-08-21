'use client';
// audit-disable STR-002

import { useState, useTransition, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Table } from '@heroui/react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Trash2, ShoppingCart, Pencil, Plus, AlertCircle, Search, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Eye } from 'lucide-react';
import { SocialIcon } from '@/components/ui/SocialIcon';
import type { CatalogServiceDTO } from '@/types/catalog.dto';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import {
  toggleServiceActiveAction,
  updateServiceMarkupAction,
} from '@/actions/admin/catalog/batch';
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

export function formatCleanActivityName(activityName?: string, networkName?: string): string {
  if (!activityName) return '—';
  let clean = activityName.trim();
  if (networkName) {
    const netPattern = new RegExp(`^${networkName.trim()}\\s*[-–—:]?\\s*`, 'i');
    clean = clean.replace(netPattern, '');
  }
  // Strip known network prefixes
  clean = clean.replace(/^(Telegram|ВКонтакте|VK|Instagram|YouTube|TikTok|Rutube|Discord|Facebook|Twitter|Twitch|TenChat|Яндекс|OK|Threads)\s*[-–—:]?\s*/i, '');
  return clean.trim() || activityName;
}

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
function StatusToggle({ service }: { service: CatalogServiceDTO }) {
  const [isActive, setIsActive] = useState(service.isActive);
  const [isPending, startTransition] = useTransition();

  function handleToggle(val: boolean) {
    setIsActive(val);
    startTransition(async () => {
      const { toggleServiceStatusAction } = await import('@/actions/admin/catalog/services');
      const r = await toggleServiceStatusAction(service.id, val);
      if (!r.success) setIsActive(!val);
    });
  }

  return (
    <div className="flex items-center gap-1.5 justify-center">
      <Checkbox
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label={`${isActive ? 'Отключить' : 'Включить'} услугу ${service.name}`}
      />
      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight ${
        isActive 
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
      }`}>
        {isActive ? 'Активна' : 'Деактивирована'}
      </span>
    </div>
  );
}

// ─── Sub-component: Archive / Delete Button ─────────────────────────────────
function ArchiveButton({ service, onDeleted }: { service: CatalogServiceDTO; onDeleted?: (id: string) => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleArchive() {
    setConfirmOpen(true);
  }

  function executeArchive() {
    setConfirmOpen(false);
    startTransition(async () => {
      const { deleteOrArchiveServiceAction } = await import('@/actions/admin/catalog/services');
      const r = await deleteOrArchiveServiceAction(service.id);
      if (r.success) {
        toast.success(r.message);
        if (onDeleted) {
          onDeleted(service.id);
        }
        router.refresh();
      } else {
        toast.error(r.error || 'Ошибка удаления услуги');
      }
    });
  }

  return (
    <>
      <button
        onClick={handleArchive}
        disabled={isPending}
        title="Удалить или архивировать услугу"
        aria-label={`Удалить услугу ${service.name}`}
        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 disabled:opacity-40 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeArchive}
        title="Удаление / Архивация услуги"
        isDanger={true}
        confirmText="Удалить / В архив"
        cancelText="Отмена"
      >
        Удалить услугу «{service.name}»? Если по ней нет заказов, она будет удалена навсегда. Если есть заказы — перенесена в архив.
      </ConfirmModal>
    </>
  );
}

// ─── Sub-component: Create Service Button ───────────────────
export function CreateServiceButton() {
  return (
    <Link
      href="/admin/catalog/new"
      className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-200 cursor-pointer shadow-xs active:scale-95 text-xs"
    >
      <Plus className="w-4 h-4" />
      Создать услугу
    </Link>
  );
}

// ─── Sub-component: Edit Service Modal (Exported for Flux/Plan grids) ────────
export function EditServiceModal({
  service,
  categories,
  providers,
  onSuccess,
  usdToRub,
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
          title="ML Юнит-экономика и параметры"
          aria-label={`Юнит-экономика для ${service.name}`}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-all duration-200 cursor-pointer"
        >
          <Eye className="w-4 h-4" />
        </button>

        <Link
          href={`/admin/catalog/${service.id}`}
          aria-label={`Редактировать услугу ${service.name}`}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
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
  volume,
  onDeleted
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
  onDeleted?: (id: string) => void;
}) {
  const [markup, setMarkup] = useState(s.markup);
  const [localPrice, setLocalPrice] = useState(calcDisplayPrice(s.rate, s.markup, usdToRub, currency, volume));
  const [isPending, startTransition] = useTransition();
  const [openPricingModal, setOpenPricingModal] = useState(false);

  const isBelowSafety = markup < SAFETY_MULTIPLIER;

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
    
    if (currency === 'RUB') {
      const providerCostRub = s.rate * usdToRub;
      const pricePer1kRub = volume === '1K' ? newPrice : newPrice * 1000;
      if (providerCostRub > 0) {
        setMarkup(pricePer1kRub / providerCostRub);
      }
    } else {
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
    } else {
      const pricePer1kUsd = volume === '1K' ? localPrice : localPrice * 1000;
      if (providerCostUsd > 0) {
        finalMarkup = pricePer1kUsd / providerCostUsd;
      }
    }

    const currentDisplayPrice = calcDisplayPrice(s.rate, s.markup, usdToRub, currency, volume);
    if (localPrice === currentDisplayPrice) return;

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
            Цена <b>{localPrice} {curSign} ({unitLabel})</b> ниже порога безубыточности. Мин: <b>{minPrice} {curSign}</b>.
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
  let providerStatusColor = "bg-muted text-muted-foreground border-border/40";
  
  if (s.providerId) {
    if (s.cooldownReason === 'ZOMBIE_ARCHIVED' || s.cooldownReason === 'ZOMBIE_AUTO_DISABLED') {
      providerStatusLabel = "Удалена";
      providerStatusColor = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    } else if (s.isQuarantined) {
      providerStatusLabel = "Карантин";
      providerStatusColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    } else {
      providerStatusLabel = "Активна";
      providerStatusColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    }
  }

  const cleanActivity = formatCleanActivityName(s.categoryName || '', s.networkName || undefined);
  const providerObj = providers.find(p => p.id === s.providerId);

  return (
    <Table.Row
      key={s.id}
      className={`group transition-all duration-200 border-b border-border/60 ${
        isChecked
          ? 'bg-primary/5'
          : !s.isActive
          ? 'bg-muted/40 opacity-75'
          : 'hover:bg-muted/30'
      }`}
    >
      {/* 1. Checkbox */}
      <Table.Cell className={canEdit ? "py-2 px-2" : "hidden"}>
        <input
          type="checkbox" checked={isChecked}
          onChange={() => {}}
          onClick={(e) => onToggle(e)}
          className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
          disabled={!canEdit}
        />
      </Table.Cell>

      {/* 2. ID */}
      <Table.Cell className="py-2 px-2">
        <span className="font-mono text-xs font-bold text-muted-foreground">
          #{s.numericId || s.id.slice(0, 6)}
        </span>
      </Table.Cell>

      {/* 3. НАЗВАНИЕ (ТАРИФ) */}
      <Table.Cell className="py-2 px-2 max-w-[180px]">
        <div className="flex flex-col gap-0.5">
          <span className="font-extrabold text-foreground text-xs leading-tight truncate" title={s.name}>
            {s.name}
          </span>
          {s.qualityTier && (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20 w-fit">
              {s.qualityTier}
            </span>
          )}
        </div>
      </Table.Cell>

      {/* 4. КАТЕГОРИЯ (СОЦИАЛЬНАЯ СЕТЬ) */}
      <Table.Cell className="py-2 px-2">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <SocialIcon slug={s.networkSlug || ''} size={14} />
          <span className="text-xs font-bold text-foreground">
            {s.networkName || '—'}
          </span>
        </div>
      </Table.Cell>

      {/* 5. АКТИВНОСТЬ (ЧИСТОЕ НАЗВАНИЕ) */}
      <Table.Cell className="py-2 px-2">
        <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md border border-border/40 whitespace-nowrap">
          {cleanActivity}
        </span>
      </Table.Cell>

      {/* 6. УСЛУГА ПРОВАЙДЕРА */}
      <Table.Cell className="py-2 px-2 max-w-[160px]">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium text-foreground truncate" title={s.description || s.name}>
            {s.name}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {providerObj ? (
              <span className="font-mono font-bold text-primary/80 truncate">
                {providerObj.name} #{s.externalId || '—'}
              </span>
            ) : (
              <span className="text-muted-foreground/60">Вручную</span>
            )}
          </div>
        </div>
      </Table.Cell>

      {/* 7. СТАТУС */}
      <Table.Cell className="py-2 px-2 text-center">
        {canEdit ? (
          <StatusToggle service={s} />
        ) : (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            s.isActive 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
          }`}>
            {s.isActive ? 'Активна' : 'Деактивирована'}
          </span>
        )}
      </Table.Cell>

      {/* 8. СТАТУС ПРОВАЙДЕРА */}
      <Table.Cell className="py-2 px-2 text-center">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-tight ${providerStatusColor}`}>
          {providerStatusLabel}
        </span>
      </Table.Cell>

      {/* 9. НАЦЕНКА (%) */}
      <Table.Cell className="py-2 px-2 text-center">
        {canEditFinance && s.providerId ? (
          <div className="relative inline-flex items-center justify-center">
            <span className="absolute left-1 text-[10px] text-muted-foreground pointer-events-none font-bold">+</span>
            <input
              type="number"
              value={markup > 0 ? ((markup - 1) * 100).toFixed(0) : "0"}
              onChange={e => handlePercentChange(e.target.value)}
              onBlur={save}
              onKeyDown={e => e.key === 'Enter' && save()}
              disabled={isPending || !canEditFinance}
              className={`w-14 pl-2.5 pr-1 py-0.5 text-xs font-mono font-bold rounded-lg border outline-none transition-all tabular-nums text-center
                ${isBelowSafety
                  ? 'border-rose-400 bg-destructive/10 text-rose-700 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-border/80 bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
                } disabled:opacity-50`}
            />
            <span className="ml-0.5 text-[10px] text-muted-foreground font-black">%</span>
          </div>
        ) : (
          <span className="text-xs font-mono font-bold text-muted-foreground">
            {s.providerId ? `+${((markup - 1) * 100).toFixed(0)}%` : '—'}
          </span>
        )}
      </Table.Cell>

      {/* 10. ЦЕНА */}
      <Table.Cell className="py-2 px-2 text-right">
        {canEdit ? (
          <div className="inline-flex items-center justify-end">
            <input
              type="number"
              step={volume === '1K' ? '1' : '0.0001'}
              value={localPrice}
              onChange={e => handlePriceChange(e.target.value)}
              onBlur={save}
              onKeyDown={e => e.key === 'Enter' && save()}
              disabled={isPending || !canEditFinance}
              className={`w-18 px-1.5 py-0.5 text-xs font-mono font-black rounded-lg border outline-none transition-all tabular-nums text-right
                ${isBelowSafety
                  ? 'border-rose-400 bg-destructive/10 text-rose-700 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-border/80 bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
                } disabled:opacity-50`}
            />
            <span className="ml-0.5 text-xs text-muted-foreground font-bold">{currency === 'RUB' ? '₽' : '$'}</span>
          </div>
        ) : (
          <span className="text-xs font-mono font-black text-foreground tabular-nums">
            {localPrice} {currency === 'RUB' ? '₽' : '$'}
          </span>
        )}
      </Table.Cell>

      {/* 11. ДЕЙСТВИЯ */}
      <Table.Cell className={canEdit ? "py-2 px-2 text-right" : "hidden"}>
        <div className="flex items-center gap-1 justify-end">
          <button
            type="button"
            onClick={() => setOpenPricingModal(true)}
            title="ML Юнит-экономика и параметры"
            aria-label={`Юнит-экономика для ${s.name}`}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <Link
            href={`/admin/catalog/${s.id}`}
            aria-label={`Редактировать услугу ${s.name}`}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
          >
            <Pencil className="w-3 h-3" />
          </Link>

          <ArchiveButton service={s} onDeleted={onDeleted} />
        </div>

        {openPricingModal && (
          <AdminPricingIntelligenceModal
            serviceId={s.id}
            isOpen={openPricingModal}
            onClose={() => setOpenPricingModal(false)}
          />
        )}
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  networks?: any[],
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const visibleServices = services.filter((s) => !deletedIds.has(s.id));

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
    params.delete('cursor');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function renderSortableHeader(field: string, title: string, alignRight: boolean = false) {
    const isActive = currentSortBy === field;
    return (
      <button
        type="button"
        onClick={() => handleSortClick(field)}
        className={`hover:text-primary transition-colors inline-flex items-center gap-1 font-extrabold uppercase min-h-[36px] py-1 cursor-pointer select-none ${
          alignRight ? 'ml-auto justify-end' : ''
        }`}
      >
        <span>{title}</span>
        {isActive ? (
          currentSortOrder === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-primary shrink-0" />
          ) : (
            <ArrowDown className="w-3 h-3 text-primary shrink-0" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100 shrink-0" />
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

  // URL state
  const selectedPlatform = searchParams.get('platform') || 'ALL';
  const currentCategory = searchParams.get('category') || 'all';
  const currentSearch = searchParams.get('q') || '';
  const currentProviderId = searchParams.get('providerId') || 'all';
  const currentIsActive = searchParams.get('isActive') || 'all';
  const currentProviderStatus = searchParams.get('providerStatus') || 'all';
  const currentExternalId = searchParams.get('externalId') || '';

  // Local state for fast typing
  const [localSearch, setLocalSearch] = useState(currentSearch);
  const [localExternalId, setLocalExternalId] = useState(currentExternalId);
  const [localPlatform, setLocalPlatform] = useState(selectedPlatform);
  const [localCategory, setLocalCategory] = useState(currentCategory);
  const [localProviderId, setLocalProviderId] = useState(currentProviderId);
  const [localIsActive, setLocalIsActive] = useState(currentIsActive);
  const [localProviderStatus, setLocalProviderStatus] = useState(currentProviderStatus);

  // Sync with URL when external navigation happens
  const [prevSearch, setPrevSearch] = useState(currentSearch);
  if (currentSearch !== prevSearch) {
    setPrevSearch(currentSearch);
    setLocalSearch(currentSearch);
  }
  const [prevExtId, setPrevExtId] = useState(currentExternalId);
  if (currentExternalId !== prevExtId) {
    setPrevExtId(currentExternalId);
    setLocalExternalId(currentExternalId);
  }

  // Networks list
  const networks = useMemo(() => {
    const map = new Map<string, { slug: string; name: string }>();
    categories.forEach(c => {
      if (c.network?.slug) {
        map.set(c.network.slug, { slug: c.network.slug, name: c.network.name });
      }
    });
    return Array.from(map.values());
  }, [categories]);

  // Dependent (Cascading) activities list:
  // When localPlatform is selected, only show categories/activities of that network!
  const filteredCategories = useMemo(() => {
    let list = categories;
    if (localPlatform !== 'ALL') {
      list = categories.filter(c => c.network?.slug === localPlatform);
    }
    // Sort non-empty first, then by network name and category name
    return [...list].sort((a, b) => {
      const countA = a.serviceCount ?? a._count?.services ?? 0;
      const countB = b.serviceCount ?? b._count?.services ?? 0;
      if ((countA > 0) !== (countB > 0)) {
        return countB - countA;
      }
      const netA = a.network?.name || '';
      const netB = b.network?.name || '';
      if (netA !== netB) return netA.localeCompare(netB);
      return a.name.localeCompare(b.name);
    });
  }, [categories, localPlatform]);

  function handlePlatformChange(plat: string) {
    setLocalPlatform(plat);
    // Reset activity if it doesn't belong to the newly selected platform
    if (plat !== 'ALL') {
      const stillValid = categories.some(c => c.id === localCategory && c.network?.slug === plat);
      if (!stillValid) {
        setLocalCategory('all');
      }
    }
  }

  function applyFilters() {
    const params = new URLSearchParams();
    if (localSearch.trim()) params.set('q', localSearch.trim());
    if (localExternalId.trim()) params.set('externalId', localExternalId.trim());
    if (localPlatform !== 'ALL') params.set('platform', localPlatform);
    if (localCategory !== 'all') params.set('category', localCategory);
    if (localProviderId !== 'all') params.set('providerId', localProviderId);
    if (localIsActive !== 'all') params.set('isActive', localIsActive);
    if (localProviderStatus !== 'all') params.set('providerStatus', localProviderStatus);

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function resetAllFilters() {
    setLocalSearch('');
    setLocalExternalId('');
    setLocalPlatform('ALL');
    setLocalCategory('all');
    setLocalProviderId('all');
    setLocalIsActive('all');
    setLocalProviderStatus('all');
    router.push(pathname, { scroll: false });
  }

  const hasActiveFilters = Boolean(
    localSearch || localExternalId || localPlatform !== 'ALL' || localCategory !== 'all' || 
    localProviderId !== 'all' || localIsActive !== 'all' || localProviderStatus !== 'all'
  );

  return (
    <div className="space-y-3.5 w-full">
      {/* ─── 2-ROW X 4-COLUMN FILTER SECTION (AS IN REFERENCE) ─── */}
      <div className="bg-card/70 backdrop-blur-md border border-border p-3.5 sm:p-4 rounded-xl shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <h3 className="text-[11px] font-black text-foreground uppercase tracking-wider">
            Фильтр
          </h3>
          {hasActiveFilters && (
            <button 
              onClick={resetAllFilters} 
              className="text-[11px] font-bold text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Сбросить
            </button>
          )}
        </div>
        
        {/* ROW 1: ID | Название (Тариф) | Категория (Соцсеть) | Активность */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* 1. ID */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-tight">ID</label>
            <input
              type="text"
              placeholder="ID услуги..."
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              className="w-full h-8.5 px-2.5 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* 2. Услуга (Тариф) */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Услуга / Тариф</label>
            <input
              type="text"
              placeholder="Эконом, Стандарт, Премиум..."
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              className="w-full h-8.5 px-2.5 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* 3. Соцсеть */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Соцсеть</label>
            <Select value={localPlatform} onValueChange={val => handlePlatformChange(val || 'ALL')}>
              <SelectTrigger className="w-full h-8.5 border border-border bg-background text-foreground text-xs rounded-lg cursor-pointer px-2.5">
                <SelectValue placeholder="Все соцсети">
                  {(value: string) => {
                    if (value === 'ALL') return 'Все соцсети';
                    return networks.find(n => n.slug === value)?.name ?? value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" label="Все соцсети" className="text-xs cursor-pointer">
                  Все соцсети
                </SelectItem>
                {networks.map((n: { slug: string; name: string }) => (
                  <SelectItem key={n.slug} value={n.slug} label={n.name} className="text-xs cursor-pointer">
                    <span className="flex items-center gap-2">
                      <SocialIcon slug={n.slug} size={14} />
                      {n.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Категория */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Категория</label>
            <Select value={localCategory} onValueChange={val => setLocalCategory(val || 'all')}>
              <SelectTrigger className="w-full h-8.5 border border-border bg-background text-foreground text-xs rounded-lg cursor-pointer px-2.5">
                <SelectValue placeholder="Все категории">
                  {(value: string) => {
                    if (value === 'all') return 'Все категории';
                    const c = categories.find(cat => cat.id === value);
                    if (!c) return value;
                    const cleanName = formatCleanActivityName(c.name, c.network?.name);
                    return localPlatform === 'ALL' && c.network?.name 
                      ? `${c.network.name} → ${cleanName}` 
                      : cleanName;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[350px]">
                <SelectItem value="all" label="Все категории" className="text-xs cursor-pointer">
                  Все категории ({categories.reduce((acc, cat) => acc + (cat.serviceCount ?? cat._count?.services ?? 0), 0)})
                </SelectItem>
                {filteredCategories.map(c => {
                  const count = c.serviceCount ?? c._count?.services ?? 0;
                  const cleanName = formatCleanActivityName(c.name, c.network?.name);
                  const label = localPlatform === 'ALL' && c.network?.name 
                    ? `${c.network.name} → ${cleanName}` 
                    : cleanName;
                  return (
                    <SelectItem key={c.id} value={c.id} label={`${label} (${count})`} className="text-xs cursor-pointer">
                      <span className="flex items-center justify-between w-full gap-2">
                        <span>{label}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${count > 0 ? 'bg-muted text-muted-foreground' : 'text-muted-foreground/40'}`}>
                          {count}
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ROW 2: Провайдер | Внутренний ID Сервиса | Статус | Статус провайдера */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* 5. Провайдер */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Провайдер</label>
            <Select value={localProviderId} onValueChange={val => setLocalProviderId(val || 'all')}>
              <SelectTrigger className="w-full h-8.5 border border-border bg-background text-foreground text-xs rounded-lg cursor-pointer px-2.5">
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
                <SelectItem value="none" label="Без провайдера (вручную)" className="text-xs cursor-pointer">Без провайдера (вручную)</SelectItem>
                {providers.map(p => (
                  <SelectItem key={p.id} value={p.id} label={p.name} className="text-xs cursor-pointer">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 6. Внутренний ID Сервиса провайдера */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Внутренний ID Сервиса</label>
            <input
              type="text"
              placeholder="Внешний ID провайдера..."
              value={localExternalId}
              onChange={e => setLocalExternalId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              className="w-full h-8.5 px-2.5 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* 7. Статус */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Статус</label>
            <Select value={localIsActive} onValueChange={val => setLocalIsActive(val || 'all')}>
              <SelectTrigger className="w-full h-8.5 border border-border bg-background text-foreground text-xs rounded-lg cursor-pointer px-2.5">
                <SelectValue placeholder="Все статусы">
                  {(value: string) => {
                    if (value === 'all') return 'Все статусы';
                    if (value === 'true') return 'Активна';
                    if (value === 'false') return 'Деактивирована';
                    return value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" label="Все статусы" className="text-xs cursor-pointer">Все статусы</SelectItem>
                <SelectItem value="true" label="Активна" className="text-xs cursor-pointer">Активна</SelectItem>
                <SelectItem value="false" label="Деактивирована" className="text-xs cursor-pointer">Деактивирована</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 8. Статус провайдера */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Статус провайдера</label>
            <Select value={localProviderStatus} onValueChange={val => setLocalProviderStatus(val || 'all')}>
              <SelectTrigger className="w-full h-8.5 border border-border bg-background text-foreground text-xs rounded-lg cursor-pointer px-2.5">
                <SelectValue placeholder="Все статусы провайдера">
                  {(value: string) => {
                    if (value === 'all') return 'Все статусы провайдера';
                    if (value === 'active') return 'Активна';
                    if (value === 'zombie') return 'Удалена';
                    if (value === 'manual') return 'Без провайдера';
                    return value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" label="Все статусы провайдера" className="text-xs cursor-pointer">Все статусы провайдера</SelectItem>
                <SelectItem value="active" label="Активна" className="text-xs cursor-pointer">Активна</SelectItem>
                <SelectItem value="zombie" label="Удалена" className="text-xs cursor-pointer">Удалена</SelectItem>
                <SelectItem value="manual" label="Без провайдера" className="text-xs cursor-pointer">Без провайдера</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter Action Buttons + Currency & Volume Switchers in 1 Clean Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs active:scale-95 text-xs"
            >
              <Search className="w-3.5 h-3.5" />
              Поиск
            </button>
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center justify-center h-8 px-3 rounded-lg font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer text-xs"
            >
              Сбросить
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 bg-background border border-border p-0.5 rounded-lg shadow-xs">
              <span className="text-[9px] font-bold text-muted-foreground uppercase px-1.5">Валюта:</span>
              <button
                onClick={() => setCurrency('RUB')}
                className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer ${currency === 'RUB' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                ₽ (RUB)
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer ${currency === 'USD' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                $ (USD)
              </button>
            </div>

            <div className="flex items-center gap-1 bg-background border border-border p-0.5 rounded-lg shadow-xs">
              <span className="text-[9px] font-bold text-muted-foreground uppercase px-1.5">Объем:</span>
              <button
                onClick={() => setVolume('UNIT')}
                className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer ${volume === 'UNIT' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                за 1 шт
              </button>
              <button
                onClick={() => setVolume('1K')}
                className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer ${volume === '1K' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                за 1000 шт
              </button>
            </div>
          </div>
        </div>
      </div>


      {selectedIds.length > 0 && canEdit && (
        <BatchActionBar selectedIds={selectedIds} onClear={clearSelection} canEditFinance={canEditFinance} categories={categories} />
      )}

      {/* ─── SERVICES TABLE (COLUMNS MATCHING REFERENCE) ─── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <Table className="w-full text-sm text-left">
          <Table.ScrollContainer>
            <Table.Content aria-label="Список сервисов" className="w-full">
              <Table.Header>
                <Table.Column key="checkbox" className={canEdit ? "w-8 px-2 py-2" : "hidden"}>
                  <input
                    type="checkbox" checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                    disabled={!canEdit}
                  />
                </Table.Column>
                <Table.Column key="id" className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-2 py-2 w-12">
                  {renderSortableHeader('numericId', 'ID')}
                </Table.Column>
                <Table.Column key="name" className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-2 py-2 max-w-[180px]">
                  {renderSortableHeader('name', 'УСЛУГА')}
                </Table.Column>
                <Table.Column key="category" className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-2 py-2">
                  СОЦСЕТЬ
                </Table.Column>
                <Table.Column key="activity" className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-2 py-2">
                  КАТЕГОРИЯ
                </Table.Column>
                <Table.Column key="providerService" className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-2 py-2 max-w-[160px]">
                  ПРОВАЙДЕР
                </Table.Column>
                <Table.Column key="status" className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-2 py-2 text-center">
                  СТАТУС
                </Table.Column>
                <Table.Column key="providerStatus" className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-2 py-2 text-center">
                  СТАТУС SP
                </Table.Column>
                <Table.Column key="markup" className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-2 py-2 text-center w-20">
                  {renderSortableHeader('markup', 'НАЦЕНКА')}
                </Table.Column>
                <Table.Column key="price" className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-2 py-2 text-right w-24">
                  {renderSortableHeader('price', 'ЦЕНА', true)}
                </Table.Column>
                <Table.Column key="actions" className={canEdit ? "w-20 px-2 py-2 text-right" : "hidden"}>
                  ДЕЙСТВИЯ
                </Table.Column>
              </Table.Header>
              <Table.Body renderEmptyState={() => (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                   <ShoppingCart className="w-8 h-8 opacity-20" />
                   <p className="text-sm">Нет услуг по заданным критериям фильтра</p>
                </div>
              )}>
                {visibleServices.map((s) => (
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
                    onDeleted={(id) => setDeletedIds((prev) => new Set([...prev, id]))}
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
