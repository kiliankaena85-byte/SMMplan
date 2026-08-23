'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Table } from '@heroui/react';
import { toast } from 'sonner';
import { Trash2, Pencil, AlertCircle, Eye } from 'lucide-react';
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
import { AdminPricingIntelligenceModal } from './AdminPricingIntelligenceModal';
import { formatCleanActivityName, type FilterCategoryItem, type FilterProviderItem } from './catalog-filters';

const SAFETY_MULTIPLIER = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

export function calcDisplayPrice(rate: number, markup: number, usdToRub: number, curr: 'RUB' | 'USD', vol: 'UNIT' | '1K') {
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

export function calcDisplayCost(rate: number, usdToRub: number, curr: 'RUB' | 'USD', vol: 'UNIT' | '1K') {
  if (vol === '1K') {
    return curr === 'USD' ? rate : rate * usdToRub;
  } else {
    return curr === 'USD' ? rate / 1000 : (rate * usdToRub) / 1000;
  }
}

// ─── Archive / Delete Button with Optimistic UI & Rollback ───────────────────
export function ArchiveButton({
  service,
  onDeleted,
}: {
  service: CatalogServiceDTO;
  onDeleted?: (id: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleArchive() {
    setConfirmOpen(true);
  }

  function executeArchive() {
    setConfirmOpen(false);
    
    // ⚡ Optimistic UI: Notify parent to hide row immediately
    if (onDeleted) {
      onDeleted(service.id);
    }

    startTransition(async () => {
      try {
        const { deleteOrArchiveServiceAction } = await import('@/actions/admin/catalog/services');
        const r = await deleteOrArchiveServiceAction(service.id);
        if (r.success) {
          toast.success(r.message);
          router.refresh();
        } else {
          toast.error(r.error || 'Ошибка удаления услуги');
          router.refresh(); // Refresh on failure to restore state
        }
      } catch (err) {
        toast.error('Сетевой сбой при удалении');
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleArchive}
        disabled={isPending}
        title="Удалить или архивировать услугу"
        aria-label={`Удалить услугу ${service.name}`}
        className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 disabled:opacity-40 cursor-pointer"
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

// ─── Table Row Component ───────────────────────────────────────────────────
export function CatalogTableRow({
  service: s,
  usdToRub,
  canEdit,
  canEditFinance,
  canSeeRates,
  isChecked,
  onToggle,
  categories,
  providers,
  currency,
  volume,
  onDeleted,
}: {
  service: CatalogServiceDTO;
  usdToRub: number;
  canEdit: boolean;
  canEditFinance: boolean;
  canSeeRates: boolean;
  isChecked: boolean;
  onToggle: (e: React.MouseEvent | React.ChangeEvent) => void;
  categories: FilterCategoryItem[];
  providers: FilterProviderItem[];
  currency: 'RUB' | 'USD';
  volume: 'UNIT' | '1K';
  onDeleted?: (id: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [markup, setMarkup] = useState<number>(s.markup);
  const [isActive, setIsActive] = useState<boolean>(s.isActive);
  const [localPrice, setLocalPrice] = useState<string>(() =>
    String(calcDisplayPrice(s.rate, s.markup, usdToRub, currency, volume))
  );
  const [openPricingModal, setOpenPricingModal] = useState(false);

  // Sync display price when currency/volume changes
  useMemo(() => {
    setLocalPrice(String(calcDisplayPrice(s.rate, markup, usdToRub, currency, volume)));
  }, [s.rate, markup, usdToRub, currency, volume]);

  const categoryObj = categories.find(c => c.id === s.categoryId);
  const networkName = categoryObj?.network?.name || s.networkName;
  const networkSlug = categoryObj?.network?.slug || s.networkSlug || 'telegram';
  const cleanActivityName = formatCleanActivityName(categoryObj?.name || s.categoryName, networkName || undefined);
  const providerObj = providers.find(p => p.id === s.providerId);
  const providerName = providerObj?.name || (s.providerId ? 'Провайдер' : '—');

  const isBelowSafety = markup < SAFETY_MULTIPLIER;
  const isZombie = Boolean(s.cooldownReason && s.cooldownReason.includes('ZOMBIE'));

  function handleToggleActive() {
    const next = !isActive;
    setIsActive(next);
    startTransition(async () => {
      const res = await toggleServiceActiveAction(s.id, next);
      if (!res.success) {
        setIsActive(!next);
        toast.error(res.error || 'Ошибка смены статуса');
      } else {
        toast.success('Статус услуги обновлен');
      }
    });
  }

  function handlePercentChange(val: string) {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const newMultiplier = 1 + num / 100;
      setMarkup(newMultiplier);
      setLocalPrice(String(calcDisplayPrice(s.rate, newMultiplier, usdToRub, currency, volume)));
    }
  }

  function handlePriceChange(val: string) {
    setLocalPrice(val);
    const p = parseFloat(val);
    if (!isNaN(p) && p > 0 && s.rate > 0) {
      let targetRate = s.rate;
      if (currency === 'RUB') targetRate = s.rate * usdToRub;
      if (volume === 'UNIT') targetRate = targetRate / 1000;
      const newMarkup = p / targetRate;
      setMarkup(newMarkup);
    }
  }

  function save() {
    if (markup === s.markup) return;
    startTransition(async () => {
      const res = await updateServiceMarkupAction(s.id, markup);
      if (res.success) {
        toast.success('Наценка обновлена');
        router.refresh();
      } else {
        setMarkup(s.markup);
        toast.error(res.error || 'Ошибка обновления наценки');
      }
    });
  }

  return (
    <Table.Row
      id={s.id}
      className={`border-b border-border/40 hover:bg-muted/40 transition-colors ${
        isChecked ? 'bg-primary/5' : ''
      } ${!isActive ? 'opacity-60' : ''}`}
    >
      {/* 1. CHECKBOX */}
      <Table.Cell className={canEdit ? "py-2 px-2 text-center" : "hidden"}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={onToggle}
          aria-label={`Выбрать ${s.name}`}
          className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
        />
      </Table.Cell>

      {/* 2. ID */}
      <Table.Cell className="py-2 px-2 font-mono text-xs font-bold text-muted-foreground tabular-nums">
        #{s.numericId || s.id.slice(-4)}
      </Table.Cell>

      {/* 3. НАЗВАНИЕ */}
      <Table.Cell className="py-2 px-2 max-w-[180px]">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-xs text-foreground truncate block" title={s.name}>
            {s.name}
          </span>
          <div className="flex items-center gap-1">
            {s.qualityTier && (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground font-bold">
                {s.qualityTier}
              </span>
            )}
            {s.ordersCount > 0 && (
              <span className="text-[9px] font-mono text-muted-foreground">
                {s.ordersCount} зак.
              </span>
            )}
          </div>
        </div>
      </Table.Cell>

      {/* 4. СОЦСЕТЬ */}
      <Table.Cell className="py-2 px-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          {networkSlug && <SocialIcon slug={networkSlug} size={14} />}
          <span className="truncate max-w-[80px]">{networkName || '—'}</span>
        </div>
      </Table.Cell>

      {/* 5. КАТЕГОРИЯ */}
      <Table.Cell className="py-2 px-2">
        <span className="text-xs text-muted-foreground font-medium truncate max-w-[120px] block" title={cleanActivityName}>
          {cleanActivityName}
        </span>
      </Table.Cell>

      {/* 6. ПРОВАЙДЕР */}
      <Table.Cell className="py-2 px-2 max-w-[160px]">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-foreground truncate" title={providerName}>
            {providerName}
          </span>
          {s.externalId && (
            <span className="text-[10px] font-mono text-muted-foreground">
              ID: {s.externalId}
            </span>
          )}
        </div>
      </Table.Cell>

      {/* 7. СТАТУС УСЛУГИ */}
      <Table.Cell className="py-2 px-2 text-center">
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={!canEdit || isPending}
          className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-all cursor-pointer ${
            isActive 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
          }`}
        >
          {isActive ? 'Активна' : 'Откл.'}
        </button>
      </Table.Cell>

      {/* 8. СТАТУС ПРОВАЙДЕРА */}
      <Table.Cell className="py-2 px-2 text-center">
        {isZombie ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20" title="Удалена у провайдера">
            <AlertCircle className="w-2.5 h-2.5" /> Zombie
          </span>
        ) : s.providerId ? (
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            Active
          </span>
        ) : (
          <span className="text-[10px] font-bold text-muted-foreground">
            Manual
          </span>
        )}
      </Table.Cell>

      {/* 9. НАЦЕНКА */}
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
              className={`w-14 pl-2.5 pr-1 py-0.5 text-xs font-mono font-bold rounded-lg border outline-none transition-all tabular-nums text-center ${
                isBelowSafety
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
              className={`w-18 px-1.5 py-0.5 text-xs font-mono font-black rounded-lg border outline-none transition-all tabular-nums text-right ${
                isBelowSafety
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
