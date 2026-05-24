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
import { useRouter } from 'next/navigation';
import { Table } from '@heroui/react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Trash2, AlertCircle, ShoppingCart, Pencil, Plus, Loader2 } from 'lucide-react';
import type { CatalogServiceDTO } from '@/types/catalog.dto';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import {
  batchToggleServicesAction,
  batchSetMarkupAction,
  updateServiceMarkupAction,
  toggleServiceActiveAction,
  batchReassignServicesCategoryAction,
} from '@/actions/admin/catalog/batch';
import { createServiceAction, updateServiceAction } from '@/actions/admin/catalog/services';
import { softDeleteServiceAction } from '@/actions/admin/catalog/soft-delete';
import {
  TOTAL_MANDATORY_DEDUCTIONS,
  SAFETY_FLOOR_MARKUP,
  applyBeautifulRounding,
} from '@/lib/financial-constants';
import { PriceHistoryButton } from './price-history-modal';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SAFETY_MULTIPLIER = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

function calcRetailPrice(rate: number, markup: number, usdToRub: number) {
  return applyBeautifulRounding(rate * markup * usdToRub);
}

// ─── Sub-component: Reassign Category Modal ────────────────────────────────
function ReassignCategoryModal({
  selectedIds,
  categories,
  onSuccess,
  isPending,
  startTransition,
}: {
  selectedIds: string[];
  categories: any[];
  onSuccess: () => void;
  isPending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleConfirm() {
    if (!targetCategoryId) {
      toast.error("Выберите целевую категорию");
      return;
    }
    startTransition(async () => {
      const res = await batchReassignServicesCategoryAction(selectedIds, targetCategoryId);
      if (res.success) {
        toast.success(`Успешно перенесено ${res.count} услуг`);
        setOpen(false);
        onSuccess();
      } else {
        toast.error(res.error || "Произошла ошибка при переносе");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button
          type="button"
          disabled={isPending}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all duration-200 disabled:opacity-50 cursor-pointer"
        >
          📁 Перенести в категорию
        </button>
      } />
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto w-full p-6 bg-card border border-border rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">Перенос услуг ({selectedIds.length} шт.)</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Выберите категорию, в которую будут перенесены выбранные услуги.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <input
            type="text"
            placeholder="Поиск категории..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          />

          <div className="space-y-1">
            <span className="block text-xs font-semibold text-muted-foreground uppercase">Категория</span>
            <Select value={targetCategoryId} onValueChange={(val) => setTargetCategoryId(val || '')}>
              <SelectTrigger className="w-full h-10 border border-border bg-background text-foreground cursor-pointer focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="-- Выберите категорию --">
                  {(value: string) => filteredCategories.find(c => c.id === value)?.name ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-full">
                {filteredCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id} label={cat.name} className="cursor-pointer">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2 pt-2 border-t border-border/50">
          <DialogClose render={<Button intent="outline" size="sm" type="button">Отмена</Button>} />
          <Button
            intent="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={isPending || !targetCategoryId}
            className="cursor-pointer"
          >
            Подтвердить перенос
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-component: Batch Action Bar ───────────────────────────────────────
function BatchActionBar({
  selectedIds,
  onClear,
  usdToRub,
  canEditFinance,
  categories,
}: {
  selectedIds: string[];
  onClear: () => void;
  usdToRub: number;
  canEditFinance: boolean;
  categories: any[];
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
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-success/15 text-success border border-emerald-500/30 hover:bg-success/25 transition-all duration-200 disabled:opacity-50 cursor-pointer"
      >✅ Включить</button>
      <button
        onClick={handleDisable} disabled={isPending}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/15 text-destructive border border-rose-500/30 hover:bg-destructive/25 transition-all duration-200 disabled:opacity-50 cursor-pointer"
      >🚫 Отключить</button>

      <ReassignCategoryModal
        selectedIds={selectedIds}
        categories={categories}
        onSuccess={onClear}
        isPending={isPending}
        startTransition={startTransition}
      />

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
            className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >Применить наценку</button>
        </div>
      )}
      <button
        onClick={onClear}
        className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
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
         <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-success/10 text-emerald-600 font-bold border border-emerald-500/20">
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
        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 disabled:opacity-40"
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

// ─── Sub-component: Service Form Dialog ──────────────────────────────────
function ServiceFormDialog({
  service,
  categories,
  providers,
  isOpen,
  onOpenChange,
  title,
  onSuccess,
}: {
  service?: CatalogServiceDTO;
  categories: any[];
  providers: any[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  // Form states
  const [name, setName] = useState(service?.name || "");
  const [description, setDescription] = useState(service?.description || "");
  const [categoryId, setCategoryId] = useState(service?.categoryId || categories[0]?.id || "");
  const [providerId, setProviderId] = useState(service?.providerId || "none");
  const [rate, setRate] = useState(service?.rate !== undefined ? String(service.rate) : "0.0");
  const [markup, setMarkup] = useState(service?.markup !== undefined ? String(service.markup) : "3.0");
  const [minQty, setMinQty] = useState(service?.minQty !== undefined ? String(service.minQty) : "10");
  const [maxQty, setMaxQty] = useState(service?.maxQty !== undefined ? String(service.maxQty) : "100000");
  const [externalId, setExternalId] = useState(service?.externalId || "");
  const [targetType, setTargetType] = useState(service?.targetType || "none");
  const [customDataType, setCustomDataType] = useState(service?.customDataType || "NONE");
  
  // Checkbox flags
  const [isMediaGroupAware, setIsMediaGroupAware] = useState(service?.isMediaGroupAware ?? false);
  const [isDripFeedEnabled, setIsDripFeedEnabled] = useState(service?.isDripFeedEnabled ?? true);
  const [isRefillEnabled, setIsRefillEnabled] = useState(service?.isRefillEnabled ?? false);
  const [isCancelEnabled, setIsCancelEnabled] = useState(service?.isCancelEnabled ?? false);
  const [isActive, setIsActive] = useState(service?.isActive ?? true);

  const targetTypeItems = [
    { id: "none", name: "Автоматически по категории" },
    { id: "CHANNEL", name: "CHANNEL (Канал / Профиль)" },
    { id: "POST", name: "POST (Пост / Публикация)" },
    { id: "STORY", name: "STORY (История / Сториз)" },
    { id: "CUSTOM", name: "CUSTOM (Кастомная ссылка)" }
  ];

  const customDataTypeItems = [
    { id: "NONE", name: "NONE (Нет дополнительных полей)" },
    { id: "TEXTAREA", name: "TEXTAREA (Многострочный текст)" },
    { id: "NUMBER", name: "NUMBER (Числовое поле)" }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Название услуги обязательно");
      return;
    }
    if (!categoryId) {
      toast.error("Категория обязательна");
      return;
    }

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        categoryId,
        providerId: providerId === "none" ? null : providerId,
        rate: parseFloat(rate) || 0,
        markup: parseFloat(markup) || 3.0,
        minQty: parseInt(minQty, 10) || 10,
        maxQty: parseInt(maxQty, 10) || 100000,
        externalId: externalId.trim() || null,
        targetType: targetType === "none" ? null : targetType,
        customDataType,
        isMediaGroupAware,
        isDripFeedEnabled,
        isRefillEnabled,
        isCancelEnabled,
        isActive
      };

      const res = service?.id
        ? await updateServiceAction(service.id, payload)
        : await createServiceAction(payload);

      if (res.success) {
        toast.success(service?.id ? "Услуга успешно обновлена" : "Услуга успешно создана");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res.error || "Произошла ошибка при сохранении");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto w-full p-6 bg-card border border-border shadow-2xl rounded-xl animate-in duration-200">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Заполните все необходимые параметры услуги.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Основные данные */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider border-b border-border/50 pb-1">
              Основная информация
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground">Название услуги</label>
                <input
                  type="text"
                  required
                  placeholder="Например: INSTAGRAM | Лайки (Быстрые)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground">Категория</label>
                <Select value={categoryId} onValueChange={(val) => setCategoryId(val || '')}>
                  <SelectTrigger className="w-full h-10 border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 transition-all duration-200 cursor-pointer">
                    <SelectValue placeholder="-- Выберите категорию --">
                      {(value: string) => categories.find(c => c.id === value)?.name ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id} label={c.name} className="cursor-pointer">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-muted-foreground">Описание услуги</label>
              <textarea
                placeholder="Укажите подробности выполнения услуги для клиентов..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>
          </div>

          {/* Section 2: Провайдер */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider border-b border-border/50 pb-1">
              Связь с SMM-провайдером
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground">Провайдер</label>
                <Select value={providerId} onValueChange={(val) => setProviderId(val || '')}>
                  <SelectTrigger className="w-full h-10 border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 transition-all duration-200 cursor-pointer">
                    <SelectValue placeholder="Без провайдера (вручную)">
                      {(value: string) => {
                        if (!value || value === "none") return "Без провайдера (вручную)";
                        return providers.find(p => p.id === value)?.name ?? value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectItem value="none" label="Без провайдера (вручную)" className="cursor-pointer text-muted-foreground">
                      Без провайдера (вручную)
                    </SelectItem>
                    {providers.map(p => (
                      <SelectItem key={p.id} value={p.id} label={p.name} className="cursor-pointer">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground">Внешний ID (External ID)</label>
                <input
                  type="text"
                  placeholder="Опционально (например: 1422)"
                  value={externalId}
                  onChange={e => setExternalId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Финансы и Количества */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider border-b border-border/50 pb-1">
              Параметры и Финансы
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground">Закупка ($ / 1k)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  required
                  placeholder="0.00"
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground">Множитель наценки</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  required
                  placeholder="3.0"
                  value={markup}
                  onChange={e => setMarkup(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground">Мин. кол-во</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="10"
                  value={minQty}
                  onChange={e => setMinQty(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground">Макс. кол-во</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="100000"
                  value={maxQty}
                  onChange={e => setMaxQty(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Настройки ссылки */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider border-b border-border/50 pb-1">
              Ссылка и кастомные данные
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground">Тип ожидаемой ссылки</label>
                <Select value={targetType} onValueChange={(val) => setTargetType(val || '')}>
                  <SelectTrigger className="w-full h-10 border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 transition-all duration-200 cursor-pointer">
                    <SelectValue placeholder="Автоматически по категории">
                      {(value: string) => {
                        if (!value || value === "none") return "Автоматически по категории";
                        return targetTypeItems.find(t => t.id === value)?.name ?? value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    {targetTypeItems.map(t => (
                      <SelectItem key={t.id} value={t.id} label={t.name} className="cursor-pointer">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground">Дополнительные поля</label>
                <Select value={customDataType} onValueChange={(val) => setCustomDataType(val || '')}>
                  <SelectTrigger className="w-full h-10 border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 transition-all duration-200 cursor-pointer">
                    <SelectValue placeholder="NONE (Нет дополнительных полей)">
                      {(value: string) => {
                        if (!value) return "NONE (Нет дополнительных полей)";
                        return customDataTypeItems.find(c => c.id === value)?.name ?? value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    {customDataTypeItems.map(c => (
                      <SelectItem key={c.id} value={c.id} label={c.name} className="cursor-pointer">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 5: Флаги */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider border-b border-border/50 pb-1">
              Опции и Флаги
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                <Checkbox checked={isActive} onCheckedChange={(val) => setIsActive(!!val)} />
                <span className="text-xs font-medium text-foreground select-none">Активна на сайте</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                <Checkbox checked={isMediaGroupAware} onCheckedChange={(val) => setIsMediaGroupAware(!!val)} />
                <span className="text-xs font-medium text-foreground select-none">Медиагруппы (VK/TG)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                <Checkbox checked={isDripFeedEnabled} onCheckedChange={(val) => setIsDripFeedEnabled(!!val)} />
                <span className="text-xs font-medium text-foreground select-none">Поддержка Drip-Feed</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                <Checkbox checked={isRefillEnabled} onCheckedChange={(val) => setIsRefillEnabled(!!val)} />
                <span className="text-xs font-medium text-foreground select-none">Возможен долив (Refill)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                <Checkbox checked={isCancelEnabled} onCheckedChange={(val) => setIsCancelEnabled(!!val)} />
                <span className="text-xs font-medium text-foreground select-none">Возможна отмена (Cancel)</span>
              </label>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
            <DialogClose render={<Button intent="outline" size="sm" type="button">Отмена</Button>} />
            <Button
              type="submit"
              intent="primary"
              size="sm"
              disabled={isPending}
              className="flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-200 cursor-pointer"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Сохранить услугу
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateServiceModal({
  categories,
  providers,
  onSuccess,
}: {
  categories: any[];
  providers: any[];
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        intent="primary"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-200 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Создать услугу
      </Button>
      {open && (
        <ServiceFormDialog
          categories={categories}
          providers={providers}
          isOpen={open}
          onOpenChange={setOpen}
          title="Создание новой услуги"
          onSuccess={onSuccess}
        />
      )}
    </>
  );
}

export function EditServiceModal({
  service,
  categories,
  providers,
  onSuccess,
}: {
  service: CatalogServiceDTO;
  categories: any[];
  providers: any[];
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Редактировать услугу ${service.name}`}
        className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 cursor-pointer"
      >
        <Pencil className="w-4 h-4" />
      </button>
      {open && (
        <ServiceFormDialog
          service={service}
          categories={categories}
          providers={providers}
          isOpen={open}
          onOpenChange={setOpen}
          title={`Редактирование услуги #${service.numericId}`}
          onSuccess={onSuccess}
        />
      )}
    </>
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
  categories?: any[],
  providers?: any[],
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allIds = services.map(s => s.id);
  const allSelected = selected.size === allIds.length && allIds.length > 0;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedIds = Array.from(selected);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4 py-1">
        <div className="text-sm text-muted-foreground">
          Показано услуг: <span className="font-semibold text-foreground">{services.length}</span>
        </div>
        {canEdit && (
          <CreateServiceModal categories={categories} providers={providers} onSuccess={() => router.refresh()} />
        )}
      </div>

      {selected.size > 0 && canEdit && (
        <BatchActionBar selectedIds={selectedIds} onClear={() => setSelected(new Set())} usdToRub={usdToRub} canEditFinance={canEditFinance} categories={categories} />
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
                <Table.Column key="name" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider min-w-[250px] w-full">Классификация и Название</Table.Column>
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
                      <div className="flex flex-col text-[12px] leading-relaxed text-foreground py-1 min-w-[250px]">
                        <div className="flex gap-2">
                          <span className="text-muted-foreground w-[70px] shrink-0">Соцсеть:</span>
                          <span className="font-medium text-foreground truncate" title={s.networkName || '—'}>{s.networkName || '—'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground w-[70px] shrink-0">Категория:</span>
                          <span className="font-medium text-foreground truncate" title={s.categoryName}>{s.categoryName}</span>
                        </div>
                        <div className="flex gap-2 items-start mt-0.5">
                          <span className="text-muted-foreground w-[70px] shrink-0">Услуга:</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground leading-tight" title={s.name}>
                              {s.name}
                            </span>
                            {s.isQuarantined && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/15 text-warning font-bold border border-amber-500/20 whitespace-nowrap">
                                ⚠️ КАРАНТИН
                              </span>
                            )}
                          </div>
                        </div>
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.isActive ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {s.isActive ? 'Вкл' : 'Выкл'}
                        </span>
                      )}
                    </Table.Cell>
                    <Table.Cell key={`cell-actions-${s.id}`} className={canEdit ? "py-4 px-2" : "hidden"}>
                      {canEdit ? (
                        <div className="flex items-center gap-1 justify-end">
                          <EditServiceModal service={s} categories={categories} providers={providers} onSuccess={() => router.refresh()} />
                          <ArchiveButton service={s} />
                        </div>
                      ) : <span className="sr-only">Actions hidden</span>}
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
