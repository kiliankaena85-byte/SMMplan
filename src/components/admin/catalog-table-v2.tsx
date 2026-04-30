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

const SAFETY_MULTIPLIER = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

function calcRetailPrice(rate: number, markup: number, usdToRub: number) {
  return applyBeautifulRounding(rate * markup * usdToRub);
}

// ─── Sub-component: Batch Action Bar ───────────────────────────────────────
function BatchActionBar({
  selectedIds,
  onClear,
  usdToRub,
}: {
  selectedIds: string[];
  onClear: () => void;
  usdToRub: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [markupInput, setMarkupInput] = useState('');

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
    const m = parseFloat(markupInput);
    if (isNaN(m) || m < SAFETY_MULTIPLIER) {
      toast.error(`Минимальная маржа: ${SAFETY_MULTIPLIER.toFixed(2)}x`);
      return;
    }
    startTransition(async () => {
      const r = await batchSetMarkupAction(selectedIds, m);
      if (r.success) { toast.success(`💰 Маржа x${m} для ${r.count} услуг`); onClear(); }
      else toast.error(r.error ?? 'Ошибка');
    });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl mb-4 animate-in slide-in-from-top-2 duration-300">
      <span className="text-sm font-semibold text-primary">{selectedIds.length} выбрано</span>
      <div className="flex-1 h-px bg-border" />
      <button
        onClick={handleEnable} disabled={isPending}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all duration-200 disabled:opacity-50"
      >✅ Включить</button>
      <button
        onClick={handleDisable} disabled={isPending}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/15 text-rose-600 border border-rose-500/30 hover:bg-rose-500/25 transition-all duration-200 disabled:opacity-50"
      >🚫 Отключить</button>
      <div className="flex items-center gap-1">
        <input
          type="number" step="0.1" placeholder={`Множитель (мин ${SAFETY_MULTIPLIER.toFixed(1)})`}
          value={markupInput} onChange={e => setMarkupInput(e.target.value)}
          className="w-40 px-2 py-1.5 text-xs font-mono rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={handleSetMarkup} disabled={isPending}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 disabled:opacity-50"
        >Применить маржу</button>
      </div>
      <button
        onClick={onClear}
        className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-all duration-200"
      >✕ Сбросить</button>
    </div>
  );
}

// ─── Sub-component: Inline Price Cell ──────────────────────────────────────
function InlinePriceCell({ service, usdToRub }: { service: CatalogServiceDTO, usdToRub: number }) {
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

  async function save() {
    // Round for beauty before final calculation
    const roundedPrice = applyBeautifulRounding(localPrice);
    const finalMarkup = roundedPrice / providerCostRub;

    if (roundedPrice === calcRetailPrice(service.rate, service.markup, usdToRub)) return;
    
    // HARD BLOCK: Financial Integrity Guard
    if (finalMarkup < SAFETY_MULTIPLIER) {
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-bold text-rose-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Ошибка маржинальности</span>
          <span>Цена <b>{roundedPrice} ₽</b> (x{finalMarkup.toFixed(2)}) ниже порога безубыточности <b>x{SAFETY_MULTIPLIER.toFixed(2)}</b>.</span>
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
            <span className="text-[11px] opacity-80">Установлено: {roundedPrice} ₽ (x{finalMarkup.toFixed(2)})</span>
          </div>
        );
        setLocalPrice(roundedPrice);
        setMarkup(finalMarkup);
      }
    });
  }

  return (
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
            disabled={isPending}
            className={`w-24 px-2 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none transition-all duration-200 tabular-nums
              ${isBelowSafety
                ? 'border-rose-300 bg-rose-50 text-rose-700 focus:ring-2 focus:ring-rose-500/20'
                : 'border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
              } disabled:opacity-50`}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none group-focus-within:hidden">₽</span>
        </div>
      </div>
      
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] uppercase text-muted-foreground font-bold tracking-tight">Наценка</span>
        <div className={`text-xs font-mono font-medium px-2 py-1.5 rounded-lg border border-transparent bg-muted/40 tabular-nums ${isBelowSafety ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-slate-500'}`}>
          x{markup.toFixed(2)}
        </div>
      </div>

      {isBelowSafety && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 font-bold border border-rose-200 animate-pulse">
          УБЫТОК
        </span>
      )}
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
      className="p-2 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 disabled:opacity-40"
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
  canSeeRates = true
}: { 
  services: CatalogServiceDTO[], 
  usdToRub: number,
  canEdit?: boolean,
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
        <BatchActionBar selectedIds={selectedIds} onClear={() => setSelected(new Set())} usdToRub={usdToRub} />
      )}

      <div className="rounded-xl border border-default-200 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left" aria-label="Каталог услуг">
            <thead>
              <tr className="border-b border-default-100 bg-slate-50/50">
                {canEdit && (
                  <th className="py-4 px-4 w-10">
                    <input
                      type="checkbox" checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-default-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                )}
                <th className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[250px]">Услуга / Категория</th>
                {canSeeRates && <th className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Закуп ($)</th>}
                <th className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ценообразование {canEdit ? '(RUB)' : ''}</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right hidden lg:table-cell">Заказы</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Статус</th>
                {canEdit && <th className="py-4 px-4 w-12" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100">
              {services.map(s => {
                const isChecked = selected.has(s.id);
                const providerCostRub = s.rate * usdToRub;
                return (
                  <tr
                    key={s.id}
                    className={`group transition-all duration-200 ${
                      isChecked
                        ? 'bg-primary/5'
                        : !s.isActive
                        ? 'bg-slate-50/50 opacity-70'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {canEdit && (
                      <td className="py-4 px-4">
                        <input
                          type="checkbox" checked={isChecked}
                          onChange={() => toggleOne(s.id)}
                          className="rounded border-default-300 text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="py-4 px-4">
                      <span className="font-mono text-xs text-slate-400">
                        #{s.numericId}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 leading-tight">
                            {s.name}
                          </span>
                          {s.isQuarantined && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold border border-amber-200">
                              ⚠️ КАРАНТИН
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">{s.categoryName}</span>
                      </div>
                    </td>
                    {canSeeRates && (
                      <td className="py-4 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-xs font-medium text-slate-700">
                            ${s.rate.toFixed(4)}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            ≈ {providerCostRub.toFixed(2)} ₽
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="py-4 px-4">
                      {canEdit ? (
                        <InlinePriceCell service={s} usdToRub={usdToRub} />
                      ) : (
                        <div className="text-sm font-mono font-bold text-slate-700">
                          {applyBeautifulRounding(s.rate * s.markup * usdToRub).toLocaleString('ru-RU')} ₽
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right hidden lg:table-cell">
                      <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                        {s.ordersCount.toLocaleString('ru-RU')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {canEdit ? <StatusToggle service={s} /> : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {s.isActive ? 'Вкл' : 'Выкл'}
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-4 px-2">
                        <ArchiveButton service={s} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {services.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
             <ShoppingCart className="w-8 h-8 opacity-20" />
             <p className="text-sm">Нет услуг в выбранной категории</p>
          </div>
        )}
      </div>
    </div>
  );
}
