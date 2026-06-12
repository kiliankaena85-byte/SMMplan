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
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Table } from '@heroui/react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Trash2, ShoppingCart, Pencil, Plus, Loader2, AlertCircle } from 'lucide-react';
import type { CatalogServiceDTO } from '@/types/catalog.dto';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import {
  toggleServiceActiveAction,
  updateServiceMarkupAction,
} from '@/actions/admin/catalog/batch';
import { createServiceAction, updateServiceAction } from '@/actions/admin/catalog/services';
import { softDeleteServiceAction } from '@/actions/admin/catalog/soft-delete';
import {
  applyBeautifulRounding,
  SAFETY_FLOOR_MARKUP,
  TOTAL_MANDATORY_DEDUCTIONS,
} from '@/lib/financial-constants';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

import { BatchActionBar } from './catalog/batch-action-bar';
import { InlinePriceCell } from './catalog/inline-price-cell';

const SAFETY_MULTIPLIER = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

function calcRetailPrice(rate: number, markup: number, usdToRub: number) {
  return applyBeautifulRounding(rate * markup * usdToRub);
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const [customDataLabel, setCustomDataLabel] = useState(service?.customDataLabel || "");
  
  // Checkbox flags
  const [isMediaGroupAware, setIsMediaGroupAware] = useState(service?.isMediaGroupAware ?? false);
  const [isDripFeedEnabled, setIsDripFeedEnabled] = useState(service?.isDripFeedEnabled ?? true);
  const [isRefillEnabled, setIsRefillEnabled] = useState(service?.isRefillEnabled ?? false);
  const [isCancelEnabled, setIsCancelEnabled] = useState(service?.isCancelEnabled ?? false);
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [requireWarning, setRequireWarning] = useState(service?.requireWarning ?? false);
  const [warningMessage, setWarningMessage] = useState(service?.warningMessage || "");

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
    if (requireWarning && !warningMessage.trim()) {
      toast.error("Текст предупреждения обязателен к заполнению");
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
        customDataLabel: customDataType !== "NONE" ? customDataLabel.trim() || null : null,
        isMediaGroupAware,
        isDripFeedEnabled,
        isRefillEnabled,
        isCancelEnabled,
        isActive,
        requireWarning,
        warningMessage: requireWarning ? warningMessage.trim() : null
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

            {customDataType !== "NONE" && (
              <div className="space-y-1 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-semibold text-muted-foreground">
                  Кастомная подсказка для поля (Опционально)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  placeholder={
                    customDataType === "TEXTAREA" 
                      ? "Например: Ваши комментарии (по одному в строке)" 
                      : "Например: Номер варианта ответа"
                  }
                  value={customDataLabel}
                  onChange={e => setCustomDataLabel(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
                <p className="text-[10px] text-muted-foreground">
                  Свой заголовок-подсказка, который увидит пользователь при заполнении заказа (макс. 100 символов).
                </p>
              </div>
            )}
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

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                <Checkbox checked={requireWarning} onCheckedChange={(val) => setRequireWarning(!!val)} />
                <span className="text-xs font-medium text-foreground select-none">Показывать предупреждение</span>
              </label>
            </div>

            {requireWarning && (
              <div className="space-y-1 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-semibold text-muted-foreground">
                  Текст интерактивного предупреждения
                </label>
                <input
                  type="text"
                  required={requireWarning}
                  placeholder="Например: В посте несколько фото, просмотры будут идти только на последнее..."
                  value={warningMessage}
                  onChange={e => setWarningMessage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
              </div>
            )}
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        className="h-10 w-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 cursor-pointer"
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
  router
}: {
  service: CatalogServiceDTO;
  usdToRub: number;
  canEdit?: boolean;
  canEditFinance?: boolean;
  canSeeRates?: boolean;
  isChecked: boolean;
  onToggle: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providers: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any;
}) {
  const [markup, setMarkup] = useState(s.markup);
  const [localPrice, setLocalPrice] = useState(calcRetailPrice(s.rate, s.markup, usdToRub));
  const [isPending, startTransition] = useTransition();

  const isBelowSafety = markup < SAFETY_MULTIPLIER;
  const providerCostRub = s.rate * usdToRub;

  // Sync state if service rate or markup changed from parent / bulk update
  const [prevService, setPrevService] = useState(s);
  if (s.markup !== prevService.markup || s.rate !== prevService.rate) {
    setPrevService(s);
    setMarkup(s.markup);
    setLocalPrice(calcRetailPrice(s.rate, s.markup, usdToRub));
  }

  function handlePriceChange(val: string) {
    const newPrice = parseFloat(val) || 0;
    setLocalPrice(newPrice);
    if (providerCostRub > 0) {
      setMarkup(newPrice / providerCostRub);
    }
  }

  function handlePercentChange(val: string) {
    const newPercent = parseFloat(val) || 0;
    const newMarkup = (newPercent / 100) + 1;
    setMarkup(newMarkup);
    setLocalPrice(calcRetailPrice(s.rate, newMarkup, usdToRub));
  }

  async function save() {
    const roundedPrice = applyBeautifulRounding(localPrice);
    const finalMarkup = roundedPrice / providerCostRub;

    if (roundedPrice === calcRetailPrice(s.rate, s.markup, usdToRub)) return;
    
    // HARD BLOCK: Financial Integrity Guard
    if (finalMarkup < SAFETY_MULTIPLIER) {
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-bold text-destructive flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Ошибка маржинальности</span>
          <span>Цена <b>{roundedPrice} ₽</b> (+{((finalMarkup - 1) * 100).toFixed(0)}%) ниже порога безубыточности <b>+{((SAFETY_MULTIPLIER - 1) * 100).toFixed(0)}%</b>.</span>
        </div>
      );
      setMarkup(s.markup);
      setLocalPrice(calcRetailPrice(s.rate, s.markup, usdToRub));
      return;
    }

    startTransition(async () => {
      const r = await updateServiceMarkupAction(s.id, finalMarkup);
      if (!r.success) {
        toast.error(r.error ?? 'Ошибка сохранения');
        setMarkup(s.markup);
        setLocalPrice(calcRetailPrice(s.rate, s.markup, usdToRub));
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
      className={`group transition-all duration-200 ${
        isChecked
          ? 'bg-primary/5'
          : !s.isActive
          ? 'bg-muted/50 opacity-70'
          : 'hover:bg-muted/30'
      }`}
    >
      <Table.Cell className={canEdit ? "py-4 px-4" : "hidden"}>
        <input
          type="checkbox" checked={isChecked}
          onChange={onToggle}
          className="rounded border-default-300 text-primary focus:ring-primary cursor-pointer"
          disabled={!canEdit}
        />
      </Table.Cell>
      <Table.Cell className="py-4 px-4">
        <span className="font-mono text-xs text-muted-foreground">
          #{s.numericId}
        </span>
      </Table.Cell>
      <Table.Cell className="py-4 px-4">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getNetworkBadgeClass(s.networkSlug)}`}>
          {s.networkName || '—'}
        </span>
      </Table.Cell>
      <Table.Cell className="py-4 px-4 text-xs font-semibold text-foreground max-w-[200px] truncate">
        <span title={s.categoryName || ''}>{s.categoryName}</span>
      </Table.Cell>
      <Table.Cell className="py-4 px-4">
        <div className="flex flex-col py-1 space-y-1 max-w-[280px]">
          <span className="font-bold text-foreground text-xs leading-tight" title={s.name}>
            {s.name}
          </span>
          {s.isQuarantined && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/15 text-warning-text font-bold border border-warning/20 whitespace-nowrap self-start">
              ⚠️ КАРАНТИН
            </span>
          )}
          {s.providerId && s.externalId && (
            <span className="text-[10px] text-muted-foreground font-mono">
              Ext: #{s.externalId} ({providers.find(p => p.id === s.providerId)?.name || 'API'})
            </span>
          )}
        </div>
      </Table.Cell>
      <Table.Cell className={`py-4 px-4 text-right ${!canSeeRates ? "hidden" : ""}`}>
        {canSeeRates ? (
          <div className="flex flex-col items-end">
            <span className="font-mono text-xs font-semibold text-foreground">
              ${s.rate.toFixed(4)}
            </span>
            <span className="text-[10px] text-muted-foreground/80 font-medium font-mono">
              ≈ {providerCostRub.toFixed(2)} ₽
            </span>
          </div>
        ) : <span className="sr-only">Rate hidden</span>}
      </Table.Cell>
      
      {/* Наценка в процентах (%) */}
      <Table.Cell className="py-4 px-4">
        {canEditFinance && s.providerId ? (
          <div className="relative flex items-center justify-center w-28">
            <span className="absolute left-2 text-[10px] text-muted-foreground pointer-events-none">+</span>
            <input
              type="number"
              value={markup > 0 ? ((markup - 1) * 100).toFixed(0) : "0"}
              onChange={e => handlePercentChange(e.target.value)}
              onBlur={save}
              onKeyDown={e => e.key === 'Enter' && save()}
              disabled={isPending || !canEditFinance}
              className={`w-20 pl-4 pr-1 py-1.5 text-xs font-mono rounded-lg border outline-none transition-all duration-200 tabular-nums text-center
                ${isBelowSafety
                  ? 'border-rose-300 bg-destructive/10 text-rose-700 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
                } disabled:opacity-50`}
            />
            <span className="ml-1 text-[10px] text-muted-foreground font-semibold">%</span>
          </div>
        ) : (
          <div className="text-xs font-mono text-center text-muted-foreground w-28 py-1.5">
            {s.providerId ? `+${((markup - 1) * 100).toFixed(0)}%` : '—'}
          </div>
        )}
      </Table.Cell>

      {/* Розничная цена (₽) */}
      <Table.Cell className="py-4 px-4">
        {canEdit ? (
          <div className="flex items-center w-28">
            <input
              type="number"
              value={localPrice}
              onChange={e => handlePriceChange(e.target.value)}
              onBlur={save}
              onKeyDown={e => e.key === 'Enter' && save()}
              disabled={isPending || !canEditFinance}
              className={`w-20 px-2 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none transition-all duration-200 tabular-nums text-right
                ${isBelowSafety
                  ? 'border-rose-300 bg-destructive/10 text-rose-700 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
                } disabled:opacity-50`}
            />
            <span className="ml-1 text-xs text-muted-foreground font-semibold">₽</span>
          </div>
        ) : (
          <div className="text-xs font-mono font-bold text-foreground bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/40 inline-block tabular-nums w-24 text-right">
            {applyBeautifulRounding(s.rate * s.markup * usdToRub).toLocaleString('ru-RU')} ₽
          </div>
        )}
      </Table.Cell>
      
      <Table.Cell className="py-4 px-4 text-right hidden lg:table-cell">
        <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg border border-border/30">
          {s.ordersCount.toLocaleString('ru-RU')}
        </span>
      </Table.Cell>
      <Table.Cell className="py-4 px-4 text-center">
        {canEdit ? <StatusToggle service={s} /> : (
          <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${s.isActive ? 'bg-success/15 text-success border border-emerald-500/10' : 'bg-muted text-muted-foreground border border-border/30'}`}>
            {s.isActive ? 'Вкл' : 'Выкл'}
          </span>
        )}
      </Table.Cell>
      <Table.Cell className="py-4 px-4 text-center">
        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${providerStatusColor}`}>
          {providerStatusLabel}
        </span>
      </Table.Cell>
      <Table.Cell className={canEdit ? "py-4 px-4" : "hidden"}>
        {canEdit ? (
          <div className="flex items-center gap-1.5 justify-end">
            <EditServiceModal service={s} categories={categories} providers={providers} onSuccess={() => router.refresh()} />
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

  // Selected items state
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
    const params = new URLSearchParams();
    if (currentCategory) {
      params.set('category', currentCategory);
    }
    setSearchVal('');
    setExtIdVal('');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      {/* Redesigned Premium Filters Bar */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Фильтры каталога</h3>
          {(currentSearch || currentExternalId || currentProviderId !== 'all' || currentIsActive !== 'all' || currentProviderStatus !== 'all') && (
            <button 
              onClick={resetFilters} 
              className="text-[11px] font-bold text-destructive hover:underline transition-all duration-200 cursor-pointer"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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

          {/* Выбор статуса активности */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Статус на сайте</label>
            <Select value={currentIsActive} onValueChange={val => updateFilter('isActive', val)}>
              <SelectTrigger className="w-full h-8 border border-border bg-background text-foreground text-xs rounded-xl cursor-pointer">
                <SelectValue placeholder="Все">
                  {(value: string) => {
                    if (value === 'all') return 'Все статусы';
                    if (value === 'true') return 'Активна';
                    if (value === 'false') return 'Выключена';
                    return value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" label="Все статусы" className="text-xs cursor-pointer">Все статусы</SelectItem>
                <SelectItem value="true" label="Активна" className="text-xs cursor-pointer">Активна</SelectItem>
                <SelectItem value="false" label="Выключена" className="text-xs cursor-pointer">Выключена</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Выбор статуса у провайдера */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Статус провайдера</label>
            <Select value={currentProviderStatus} onValueChange={val => updateFilter('providerStatus', val)}>
              <SelectTrigger className="w-full h-8 border border-border bg-background text-foreground text-xs rounded-xl cursor-pointer">
                <SelectValue placeholder="Все">
                  {(value: string) => {
                    if (value === 'all') return 'Все статусы';
                    if (value === 'active') return 'Активна у провайдера';
                    if (value === 'zombie') return 'Удалена у провайдера';
                    if (value === 'manual') return 'Вручную (без API)';
                    return value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" label="Все статусы" className="text-xs cursor-pointer">Все статусы</SelectItem>
                <SelectItem value="active" label="Активна у провайдера" className="text-xs cursor-pointer">Активна у провайдера</SelectItem>
                <SelectItem value="zombie" label="Удалена у провайдера" className="text-xs cursor-pointer">Удалена у провайдера</SelectItem>
                <SelectItem value="manual" label="Вручную (без API)" className="text-xs cursor-pointer">Вручную (без API)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center gap-4 py-1">
        <div className="text-sm text-muted-foreground">
          Показано услуг: <span className="font-semibold text-foreground">{services.length}</span>
        </div>
        {canEdit && (
          <CreateServiceModal categories={categories} providers={providers} onSuccess={() => router.refresh()} />
        )}
      </div>

      {selected.size > 0 && canEdit && (
        <BatchActionBar selectedIds={selectedIds} onClear={() => setSelected(new Set())} canEditFinance={canEditFinance} categories={categories} />
      )}

      <div className="rounded-xl border border-default-200 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full text-sm text-left">
            <Table.ScrollContainer>
              <Table.Content aria-label="Каталог услуг" className="w-full">
                <Table.Header>
                  <Table.Column key="checkbox" className={canEdit ? "w-10 px-4 py-3" : "hidden"}>
                    <input
                      type="checkbox" checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-default-300 text-primary focus:ring-primary cursor-pointer"
                      disabled={!canEdit}
                    />
                  </Table.Column>
                  <Table.Column isRowHeader key="id" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">ID</Table.Column>
                  <Table.Column key="network" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Сеть</Table.Column>
                  <Table.Column key="category" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Категория</Table.Column>
                  <Table.Column key="name" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider min-w-[200px] w-full px-4 py-3">Название услуги</Table.Column>
                  <Table.Column key="rate" className={`text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right px-4 py-3 ${!canSeeRates ? "hidden" : ""}`}>Закуп ($)</Table.Column>
                  <Table.Column key="markup" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 text-center">Наценка (%)</Table.Column>
                  <Table.Column key="price" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Цена (₽)</Table.Column>
                  <Table.Column key="orders" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right hidden lg:table-cell px-4 py-3">Заказы</Table.Column>
                  <Table.Column key="status" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center px-4 py-3">Сайт</Table.Column>
                  <Table.Column key="providerStatus" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center px-4 py-3">Провайдер</Table.Column>
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
                      isChecked={selected.has(s.id)}
                      onToggle={() => toggleOne(s.id)}
                      categories={categories}
                      providers={providers}
                      router={router}
                    />
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>
      </div>
    </div>
  );
}
