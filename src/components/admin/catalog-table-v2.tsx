'use client';

/**
 * CatalogTable v2.1 (Wave 2 & 3 Refined)
 *
 * Features:
 * - Multi-select with checkboxes
 * - Batch action bar (status & markup)
 * - Human-Readable Pricing: Edit final RUB price directly (markup auto-calculates)
 * - Dynamic USD/RUB exchange rate support
 * - Safety floor enforcement with visual cues
 */

import { useState, useTransition } from 'react';
import { Table } from '@heroui/react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Trash2, AlertCircle, ShoppingCart } from 'lucide-react';
import type { CatalogServiceDTO } from '@/types/catalog.dto';
import {
  batchToggleServicesAction,
  batchSetMarkupAction,
  updateServiceMarkupAction,
  toggleServiceActiveAction,
} from '@/actions/admin/catalog/batch';
import { softDeleteServiceAction } from '@/actions/admin/catalog/soft-delete';
import {
  TOTAL_MANDATORY_DEDUCTIONS,
  SAFETY_FLOOR_MARKUP,
  applyBeautifulRounding,
} from '@/lib/financial-constants';
import { PriceHistoryButton } from './price-history-modal';

const SAFETY_MULTIPLIER = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

function calcRetailPrice(rate: number, markup: number, usdToRub: number) {
  return applyBeautifulRounding(rate * markup * usdToRub);
}

// ─── Sub-component: Batch Action Bar ───────────────────────────────────────
function BatchActionBar({
  selectedIds,
  onClear,
  usdToRub,
  canEditFinance,
}: {
  selectedIds: string[];
  onClear: () => void;
  usdToRub: number;
  canEditFinance: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [markupPercentInput, setMarkupPercentInput] = useState('');

  const minPercent = ((SAFETY_MULTIPLIER - 1) * 100).toFixed(0);

  function handleEnable() {
    startTransition(async () => {
      const r = await batchToggleServicesAction(selectedIds, true);
      if (r.success) { toast.success(`✅ Включено ${r.count} услуг`); onClear(); }
      else toast.error(r.error ?? 'Ошибка');
    });
  }

  function handleDisable() {
    startTransition(async () => {
      const r = await batchToggleServicesAction(selectedIds, false);
      if (r.success) { toast.success(`🚫 Отключено ${r.count} услуг`); onClear(); }
      else toast.error(r.error ?? 'Ошибка');
    });
  }

  function handleSetMarkup() {
    const percent = parseFloat(markupPercentInput);
    const m = (percent / 100) + 1;
    if (isNaN(m) || m < SAFETY_MULTIPLIER) {
      toast.error(`Минимальная наценка: +${minPercent}%`);
      return;
    }
    startTransition(async () => {
      const r = await batchSetMarkupAction(selectedIds, m);
      if (r.success) { toast.success(`💰 Наценка +${percent}% для ${r.count} услуг`); onClear(); }
      else toast.error(r.error ?? 'Ошибка');
    });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl mb-4 animate-in slide-in-from-top-2 duration-300">
      <span className="text-sm font-semibold text-primary">{selectedIds.length} выбрано</span>
      <div className="flex-1 h-px bg-border" />
      <button
        onClick={handleEnable} disabled={isPending}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-success border border-emerald-500/30 hover:bg-emerald-500/25 transition-all duration-200 disabled:opacity-50"
      >✅ Включить</button>
      <button
        onClick={handleDisable} disabled={isPending}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/15 text-destructive border border-rose-500/30 hover:bg-rose-500/25 transition-all duration-200 disabled:opacity-50"
      >🚫 Отключить</button>
      {canEditFinance && (
        <div className="flex items-center gap-1 group relative">
          <span className="text-xs font-medium text-muted-foreground">+</span>
          <input
            type="number" step="1" placeholder={`Наценка в % (мин ${minPercent})`}
            value={markupPercentInput} onChange={e => setMarkupPercentInput(e.target.value)}
            className="w-44 px-2 py-1.5 text-xs font-mono rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-xs font-medium text-muted-foreground">%</span>
          
          {/* Preview Tooltip */}
          {parseFloat(markupPercentInput) > 0 && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-foreground text-background text-[10px] px-2 py-1 rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Пример: при закупе 100₽ клиент заплатит {(100 * ((parseFloat(markupPercentInput) / 100) + 1)).toFixed(0)}₽
            </div>
          )}

          <button
            onClick={handleSetMarkup} disabled={isPending}
            className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 disabled:opacity-50"
          >Применить наценку</button>
        </div>
      )}
      <button
        onClick={onClear}
        className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-all duration-200"
      >✕ Сбросить</button>
    </div>
  );
}

// ─── Sub-component: Inline Price Cell ──────────────────────────────────────
function InlinePriceCell({ service, usdToRub, canEditFinance }: { service: CatalogServiceDTO, usdToRub: number, canEditFinance: boolean }) {
  const [markup, setMarkup] = useState(service.markup);
  // localPrice reflects what the user sees/edits in RUB
  const [localPrice, setLocalPrice] = useState(calcRetailPrice(service.rate, service.markup, usdToRub));
  const [isPending, startTransition] = useTransition();

  const isBelowSafety = markup < SAFETY_MULTIPLIER;
  const providerCostRub = service.rate * usdToRub;

  function handlePriceChange(val: string) {
    const newPrice = parseFloat(val) || 0;
    setLocalPrice(newPrice);
    
    // Auto-calculate markup for internal logic
    if (providerCostRub > 0) {
      const newMarkup = newPrice / providerCostRub;
      setMarkup(newMarkup);
    }
  }

  function handlePercentChange(val: string) {
    const newPercent = parseFloat(val) || 0;
    const newMarkup = (newPercent / 100) + 1;
    setMarkup(newMarkup);
    setLocalPrice(calcRetailPrice(service.rate, newMarkup, usdToRub));
  }

  async function save() {
    // Round for beauty before final calculation
    const roundedPrice = applyBeautifulRounding(localPrice);
    const finalMarkup = roundedPrice / providerCostRub;

    if (roundedPrice === calcRetailPrice(service.rate, service.markup, usdToRub)) return;
    
    // HARD BLOCK: Financial Integrity Guard
    if (finalMarkup < SAFETY_MULTIPLIER) {
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-bold text-destructive flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Ошибка маржинальности</span>
          <span>Цена <b>{roundedPrice} ₽</b> (+{((finalMarkup - 1) * 100).toFixed(0)}%) ниже порога безубыточности <b>+{((SAFETY_MULTIPLIER - 1) * 100).toFixed(0)}%</b>.</span>
        </div>
      );
      // Revert UI
      setMarkup(service.markup);
      setLocalPrice(calcRetailPrice(service.rate, service.markup, usdToRub));
      return;
    }

    startTransition(async () => {
      const r = await updateServiceMarkupAction(service.id, finalMarkup);
      if (!r.success) {
        toast.error(r.error ?? 'Ошибка сохранения');
        setMarkup(service.markup);
        setLocalPrice(calcRetailPrice(service.rate, service.markup, usdToRub));
      } else {
        toast.success(
          <div className="flex flex-col">
            <span className="font-bold">Цена обновлена</span>
            <span className="text-[11px] opacity-80">Установлено: {roundedPrice} ₽ (+{((finalMarkup - 1) * 100).toFixed(0)}%)</span>
          </div>
        );
        setLocalPrice(roundedPrice);
        setMarkup(finalMarkup);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase text-muted-foreground font-bold tracking-tight">Цена (₽)</span>
          <div className="relative group">
            <input
              type="number"
              value={localPrice}
              onChange={e => handlePriceChange(e.target.value)}
              onBlur={save}
              onKeyDown={e => e.key === 'Enter' && save()}
              disabled={isPending || !canEditFinance}
              className={`w-20 px-2 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none transition-all duration-200 tabular-nums
                ${isBelowSafety
                  ? 'border-rose-300 bg-destructive/10 text-rose-700 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
                } disabled:opacity-50 ${!canEditFinance && 'bg-muted border-transparent text-muted-foreground'}`}
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase text-muted-foreground font-bold tracking-tight">Наценка (%)</span>
          <div className="relative group">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">+</span>
            <input
              type="number"
              value={markup > 0 ? ((markup - 1) * 100).toFixed(0) : "0"}
              onChange={e => handlePercentChange(e.target.value)}
              onBlur={save}
              onKeyDown={e => e.key === 'Enter' && save()}
              disabled={isPending || !canEditFinance}
              className={`w-20 pl-5 pr-2 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none transition-all duration-200 tabular-nums
                ${isBelowSafety
                  ? 'border-rose-300 bg-destructive/10 text-rose-700 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
                } disabled:opacity-50 ${!canEditFinance && 'bg-muted border-transparent text-muted-foreground'}`}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">%</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
         <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
           Прибыль: {(localPrice - providerCostRub).toFixed(2)} ₽
         </span>
         {isBelowSafety && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-destructive/20 text-destructive font-bold border border-destructive/30 animate-pulse">
            УБЫТОК
          </span>
        )}
        <PriceHistoryButton serviceId={service.id} />
      </div>
    </div>
  );
}

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

  function handleArchive() {
    if (!confirm(`Архивировать «${service.name}»? Услуга будет скрыта для клиентов.`)) return;
    startTransition(async () => {
      const r = await softDeleteServiceAction(service.id);
      if ('error' in r && r.error) toast.error(r.error);
      else toast.success('Услуга архивирована');
    });
  }

  return (
    <button
      onClick={handleArchive}
      disabled={isPending}
      aria-label={`Архивировать услугу ${service.name}`}
      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 disabled:opacity-40"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function CatalogTable({ 
  services, 
  usdToRub,
  canEdit = true,
  canEditFinance = true,
  canSeeRates = true
}: { 
  services: CatalogServiceDTO[], 
  usdToRub: number,
  canEdit?: boolean,
  canEditFinance?: boolean,
  canSeeRates?: boolean
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allIds = services.map(s => s.id);
  const allSelected = selected.size === allIds.length && allIds.length > 0;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedIds = Array.from(selected);

  return (
    <div className="space-y-4">
      {selected.size > 0 && canEdit && (
        <BatchActionBar selectedIds={selectedIds} onClear={() => setSelected(new Set())} usdToRub={usdToRub} canEditFinance={canEditFinance} />
      )}

      <div className="rounded-xl border border-default-200 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full text-sm text-left">
            <Table.ScrollContainer>
              <Table.Content aria-label="Каталог услуг" className="w-full">
                <Table.Header>
                <Table.Column key="checkbox" className={canEdit ? "w-10 px-4" : "hidden"}>
                  <input
                    type="checkbox" checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-default-300 text-primary focus:ring-primary cursor-pointer"
                    disabled={!canEdit}
                  />
                </Table.Column>
                <Table.Column isRowHeader key="id" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">ID</Table.Column>
                <Table.Column key="name" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider min-w-[250px] w-full">Услуга / Категория</Table.Column>
                <Table.Column key="rate" className={`text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right ${!canSeeRates ? "hidden" : ""}`}>Закуп ($)</Table.Column>
                <Table.Column key="price" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Ценообразование {canEdit ? '(RUB)' : ''}</Table.Column>
                <Table.Column key="orders" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right hidden lg:table-cell">Заказы</Table.Column>
                <Table.Column key="status" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Статус</Table.Column>
                <Table.Column key="actions" className={canEdit ? "w-12" : "hidden"}><span className="sr-only">Actions</span></Table.Column>
            </Table.Header>
            <Table.Body renderEmptyState={() => (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                 <ShoppingCart className="w-8 h-8 opacity-20" />
                 <p className="text-sm">Нет услуг в выбранной категории</p>
              </div>
            )}>
              {services.map((s) => {
                const isChecked = selected.has(s.id);
                const providerCostRub = s.rate * usdToRub;
                return (
                  <Table.Row
                    key={s.id}
                    className={`group transition-all duration-200 ${
                      isChecked
                        ? 'bg-primary/5'
                        : !s.isActive
                        ? 'bg-muted/50 opacity-70'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    <Table.Cell key={`cell-checkbox-${s.id}`} className={canEdit ? "py-4 px-4" : "hidden"}>
                      <input
                        type="checkbox" checked={isChecked}
                        onChange={() => toggleOne(s.id)}
                        className="rounded border-default-300 text-primary focus:ring-primary cursor-pointer"
                        disabled={!canEdit}
                      />
                    </Table.Cell>
                    <Table.Cell key={`cell-id-${s.id}`} className="py-4 px-4">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{s.numericId}
                      </span>
                    </Table.Cell>
                    <Table.Cell key={`cell-name-${s.id}`} className="py-4 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground leading-tight">
                            {s.name}
                          </span>
                          {s.isQuarantined && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-warning font-bold border border-amber-500/20">
                              ⚠️ КАРАНТИН
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1">{s.categoryName}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell key={`cell-rate-${s.id}`} className={`py-4 px-4 text-right ${!canSeeRates ? "hidden" : ""}`}>
                      {canSeeRates ? (
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-xs font-medium text-foreground">
                            ${s.rate.toFixed(4)}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            ≈ {providerCostRub.toFixed(2)} ₽
                          </span>
                        </div>
                      ) : <span className="sr-only">Rate hidden</span>}
                    </Table.Cell>
                    <Table.Cell key={`cell-price-${s.id}`} className="py-4 px-4 w-[280px]">
                      {canEdit ? (
                        <InlinePriceCell service={s} usdToRub={usdToRub} canEditFinance={canEditFinance} />
                      ) : (
                        <div className="text-sm font-mono font-bold text-foreground">
                          {applyBeautifulRounding(s.rate * s.markup * usdToRub).toLocaleString('ru-RU')} ₽
                        </div>
                      )}
                    </Table.Cell>
                    <Table.Cell key={`cell-orders-${s.id}`} className="py-4 px-4 text-right hidden lg:table-cell">
                      <span className="text-xs font-mono font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                        {s.ordersCount.toLocaleString('ru-RU')}
                      </span>
                    </Table.Cell>
                    <Table.Cell key={`cell-status-${s.id}`} className="py-4 px-4 text-center">
                      {canEdit ? <StatusToggle service={s} /> : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.isActive ? 'bg-emerald-500/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {s.isActive ? 'Вкл' : 'Выкл'}
                        </span>
                      )}
                    </Table.Cell>
                    <Table.Cell key={`cell-actions-${s.id}`} className={canEdit ? "py-4 px-2" : "hidden"}>
                      {canEdit ? <ArchiveButton service={s} /> : <span className="sr-only">Actions hidden</span>}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>
      </div>
    </div>
  );
}
