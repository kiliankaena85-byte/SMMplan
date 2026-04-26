'use client';

/**
 * CatalogTable v2
 *
 * Features:
 * - Multi-select with checkboxes (select all / deselect all)
 * - Batch action bar: enable, disable, set markup
 * - Quarantine badge ⚠️ per row
 * - Inline price/markup editing (onBlur → auto-save)
 * - Safety floor visual indicator (red = below cost)
 *
 * Design rules (AGENTS.md):
 * - Semantic color tokens only
 * - transition-all duration-200 on all interactive elements
 * - aria-label on table and all buttons
 * - Max 150 lines → split into sub-components below
 */

import { useState, useTransition } from 'react';
import { Switch } from '@heroui/react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
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
  USD_TO_RUB,
} from '@/lib/financial-constants';

const SAFETY_MULTIPLIER = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

function calcRetailPrice(rate: number, markup: number) {
  return applyBeautifulRounding(rate * markup * USD_TO_RUB);
}

// ─── Sub-component: Batch Action Bar ───────────────────────────────────────
function BatchActionBar({
  selectedIds,
  onClear,
}: {
  selectedIds: string[];
  onClear: () => void;
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
    <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl mb-4">
      <span className="text-sm font-semibold text-primary">{selectedIds.length} выбрано</span>
      <div className="flex-1 h-px bg-border" />
      <button
        onClick={handleEnable} disabled={isPending}
        aria-label="Включить выбранные услуги"
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all duration-200 disabled:opacity-50"
      >✅ Включить</button>
      <button
        onClick={handleDisable} disabled={isPending}
        aria-label="Отключить выбранные услуги"
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/15 text-rose-600 border border-rose-500/30 hover:bg-rose-500/25 transition-all duration-200 disabled:opacity-50"
      >🚫 Отключить</button>
      <div className="flex items-center gap-1">
        <input
          type="number" step="0.1" placeholder={`Маржа (мин ${SAFETY_MULTIPLIER.toFixed(1)})`}
          value={markupInput} onChange={e => setMarkupInput(e.target.value)}
          className="w-36 px-2 py-1.5 text-xs font-mono rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary"
          aria-label="Установить маржу для выбранных"
        />
        <button
          onClick={handleSetMarkup} disabled={isPending}
          aria-label="Применить маржу к выбранным"
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border text-foreground hover:bg-muted transition-all duration-200 disabled:opacity-50"
        >Применить</button>
      </div>
      <button
        onClick={onClear}
        aria-label="Снять выделение"
        className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-all duration-200"
      >✕ Сбросить</button>
    </div>
  );
}

// ─── Sub-component: Inline Price Cell ──────────────────────────────────────
function InlinePriceCell({ service }: { service: CatalogServiceDTO }) {
  const [markup, setMarkup] = useState(service.markup);
  const [isPending, startTransition] = useTransition();

  const retail = calcRetailPrice(service.rate, markup);
  const isBelowSafety = markup < SAFETY_MULTIPLIER;

  function save(newMarkup: number) {
    if (newMarkup === service.markup) return;
    startTransition(async () => {
      const r = await updateServiceMarkupAction(service.id, newMarkup);
      if (!r.success) {
        toast.error(r.error ?? 'Ошибка сохранения');
        setMarkup(service.markup); // revert
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] uppercase text-muted-foreground font-semibold">Розница</span>
        <span className={`text-sm font-mono font-bold tabular-nums ${isBelowSafety ? 'text-rose-600' : 'text-foreground'}`}>
          {retail.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] uppercase text-muted-foreground font-semibold">Маржа</span>
        <input
          type="number" step="0.1" value={markup.toFixed(2)}
          onChange={e => setMarkup(parseFloat(e.target.value) || 1)}
          onBlur={e => save(parseFloat(e.target.value) || markup)}
          onKeyDown={e => e.key === 'Enter' && save(markup)}
          disabled={isPending}
          aria-label={`Редактировать маржу для ${service.name}`}
          className={`w-16 px-2 py-1 text-xs font-mono rounded-lg border outline-none transition-all duration-200 tabular-nums
            ${isBelowSafety
              ? 'border-rose-300 bg-rose-50 text-rose-700 focus:ring-2 focus:ring-rose-500/20'
              : 'border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
            } disabled:opacity-50`}
        />
      </div>
      {isBelowSafety && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 font-semibold whitespace-nowrap">
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
    <Switch
      isSelected={isActive}
      onChange={() => handleToggle(!isActive)}
      isDisabled={isPending}
      size="sm"
      aria-label={`${isActive ? 'Отключить' : 'Включить'} услугу ${service.name}`}
    />
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
      title="Архивировать (soft delete)"
      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 disabled:opacity-40"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function CatalogTable({ services }: { services: CatalogServiceDTO[] }) {
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
    <div>
      {selected.size > 0 && (
        <BatchActionBar selectedIds={selectedIds} onClear={() => setSelected(new Set())} />
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Каталог услуг">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox" checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Выбрать все услуги"
                    className="rounded border-border cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[200px]">Услуга</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right hidden sm:table-cell">Закуп $</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ценообразование</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right hidden lg:table-cell">Лимиты</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right hidden sm:table-cell">Заказы</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Статус</th>
                <th className="py-3 px-4 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.map(s => {
                const isChecked = selected.has(s.id);
                return (
                  <tr
                    key={s.id}
                    className={`transition-all duration-200 ${
                      isChecked
                        ? 'bg-primary/5'
                        : !s.isActive
                        ? 'opacity-50 bg-muted/20'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox" checked={isChecked}
                        onChange={() => toggleOne(s.id)}
                        aria-label={`Выбрать услугу ${s.name}`}
                        className="rounded border-border cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        #{s.numericId}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-[220px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-medium text-xs truncate ${!s.isActive ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {s.name}
                          </span>
                          {s.isQuarantined && (
                            <span
                              title={s.quarantineReason ?? ''}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold whitespace-nowrap border border-amber-200"
                            >
                              ⚠️ КАРАНТИН
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{s.categoryName}</div>
                        {s.externalId && (
                          <div className="text-[10px] text-muted-foreground font-mono">#{s.externalId}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right hidden sm:table-cell">
                      <span className="font-mono text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border">
                        ${s.rate.toFixed(4)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <InlinePriceCell service={s} />
                    </td>
                    <td className="py-3 px-4 text-right hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {s.minQty.toLocaleString('ru-RU')} – {s.maxQty.toLocaleString('ru-RU')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right hidden sm:table-cell">
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">
                        {s.ordersCount.toLocaleString('ru-RU')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <StatusToggle service={s} />
                    </td>
                    <td className="py-3 px-2">
                      <ArchiveButton service={s} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {services.length === 0 && (
          <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
            Нет услуг в этой категории
          </div>
        )}
      </div>
    </div>
  );
}
