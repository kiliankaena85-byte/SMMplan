'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Layers, ShieldCheck, Target, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateServiceAction } from '@/actions/admin/catalog/services';
import { applyBeautifulRounding, SAFETY_FLOOR_MARKUP } from '@/lib/financial-constants';
import {
  TargetTypeEnum,
  inferTargetTypeFromName,
  inferTargetTypeFromCategory,
  isTargetTypeCompatible,
} from '@/utils/target-type';

interface NetworkOption {
  id: string;
  name: string;
  slug: string;
  categories: {
    id: string;
    name: string;
    slug: string;
  }[];
}

interface ProviderOption {
  id: string;
  name: string;
  balanceCurrency: string;
}

export interface InitialServiceData {
  id?: string;
  name: string;
  description: string | null;
  categoryId: string;
  rate: number;
  markup: number;
  minQty: number;
  maxQty: number;
  providerId: string | null;
  externalId: string | null;
  targetType?: string | null;
  isActive: boolean;
  isDripFeedEnabled?: boolean;
  isRefillEnabled?: boolean;
  isCancelEnabled?: boolean;
}

interface ServiceEditFormProps {
  initialData: InitialServiceData;
  networks: NetworkOption[];
  providers: ProviderOption[];
  exchangeRateUsd: number;
}

const TARGET_TYPE_OPTIONS = [
  { value: TargetTypeEnum.POST, label: '📝 Пост / Публикация / Фото' },
  { value: TargetTypeEnum.CHANNEL, label: '📢 Канал / Группа / Подписчики' },
  { value: TargetTypeEnum.PROFILE, label: '👤 Профиль / Аккаунт' },
  { value: TargetTypeEnum.VIDEO, label: '🎬 Видео / Reels / Shorts / Стримы' },
  { value: TargetTypeEnum.STORY, label: '⏱️ Сториз / Истории' },
  { value: TargetTypeEnum.CHANNEL_POSTS, label: '🤖 Авто-посты / Будущие публикации' },
  { value: TargetTypeEnum.POLL, label: '📊 Опросы / Голосования' },
  { value: TargetTypeEnum.COMMENTS, label: '💬 Комментарии / Отзывы' },
  { value: TargetTypeEnum.BOT, label: '🤖 Боты / Рефералы' },
  { value: TargetTypeEnum.CUSTOM, label: '⚙️ Свой / Произвольный' },
];

export function ServiceEditForm({
  initialData,
  networks,
  providers,
  exchangeRateUsd,
}: ServiceEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description || '');
  const [categoryId, setCategoryId] = useState(initialData.categoryId);
  const [targetType, setTargetType] = useState<string>(
    initialData.targetType || inferTargetTypeFromName(initialData.name)
  );
  const [providerId, setProviderId] = useState(initialData.providerId || '');
  const [externalId, setExternalId] = useState(initialData.externalId || '');
  const [rate, setRate] = useState(initialData.rate || 0.01);
  const [markupPercent, setMarkupPercent] = useState(
    initialData.markup > 0 ? Math.round((initialData.markup - 1) * 100) : 50
  );
  const [minQty, setMinQty] = useState(initialData.minQty || 10);
  const [maxQty, setMaxQty] = useState(initialData.maxQty || 10000);
  const [isActive, setIsActive] = useState(initialData.isActive);
  const [isRefillEnabled, setIsRefillEnabled] = useState(Boolean(initialData.isRefillEnabled));
  const [isCancelEnabled, setIsCancelEnabled] = useState(Boolean(initialData.isCancelEnabled));

  // Find active category
  const selectedCat = useMemo(() => {
    return networks.flatMap(n => n.categories).find(c => c.id === categoryId);
  }, [networks, categoryId]);

  // Check category compatibility
  const isTypeCompatible = useMemo(() => {
    if (!selectedCat) return true;
    const catType = inferTargetTypeFromCategory(selectedCat.name);
    return isTargetTypeCompatible(targetType, catType);
  }, [selectedCat, targetType]);

  // Calculations
  const markupMultiplier = 1 + markupPercent / 100;
  const costPer1000Rub = rate * exchangeRateUsd;
  const rawPricePer1000Rub = costPer1000Rub * markupMultiplier;
  const retailPricePer1000Rub = applyBeautifulRounding(rawPricePer1000Rub);
  const retailPricePerUnitRub = Number((retailPricePer1000Rub / 1000).toFixed(4));
  const isBelowSafety = markupMultiplier < 1 + SAFETY_FLOOR_MARKUP;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialData.id) return;

    startTransition(async () => {
      try {
        const res = await updateServiceAction(initialData.id!, {
          name,
          description: description || null,
          categoryId,
          targetType,
          providerId: providerId || null,
          externalId: externalId || null,
          rate,
          markup: markupMultiplier,
          minQty,
          maxQty,
          isActive,
          isRefillEnabled,
          isCancelEnabled,
          isDripFeedEnabled: true,
          qualityTier: 'STANDARD',
        });

        if (res.success) {
          toast.success('Услуга успешно обновлена');
          router.push('/admin/catalog');
          router.refresh();
        } else {
          toast.error(res.error || 'Ошибка при сохранении');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Сетевая ошибка');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/catalog"
            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Редактирование услуги</h1>
            <p className="text-xs text-muted-foreground">ID: #{initialData.id?.slice(-6)} • Изменение параметров и наценки</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => router.push('/admin/catalog')}
            disabled={isPending}
            className="text-xs bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Отмена
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="text-xs font-bold gap-1.5 cursor-pointer"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Сохранить изменения
          </Button>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-5">
          {/* Basic Info */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-2xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Основные параметры
            </h2>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Название на витрине</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Категория</label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                >
                  {networks.map(net => (
                    <optgroup key={net.id} label={net.name}>
                      {net.categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {net.name} → {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  Тип цели (Target Type)
                </label>
                <select
                  value={targetType}
                  onChange={e => setTargetType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                >
                  {TARGET_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Compatibility Warning */}
            {!isTypeCompatible && selectedCat && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Внимание:</strong> Выбранный тип цели (<code>{targetType}</code>) может не соответствовать категории «{selectedCat.name}». Рекомендуется проверить совместимость.
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Описание для покупателя</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Краткое описание скорости, гарантии и правил..."
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs leading-relaxed focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Limits & Options */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-2xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Лимиты и опции
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Мин. заказ (шт)</label>
                <input
                  type="number"
                  value={minQty}
                  onChange={e => setMinQty(Number(e.target.value))}
                  min={1}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Макс. заказ (шт)</label>
                <input
                  type="number"
                  value={maxQty}
                  onChange={e => setMaxQty(Number(e.target.value))}
                  min={1}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-xs font-semibold text-foreground">Активна</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  checked={isRefillEnabled}
                  onChange={e => setIsRefillEnabled(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-xs font-semibold text-foreground">Гарантия (Refill)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  checked={isCancelEnabled}
                  onChange={e => setIsCancelEnabled(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-xs font-semibold text-foreground">Отмена (Cancel)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Pricing Sidebar */}
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-2xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>💰</span> Ценообразование
            </h2>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Тариф провайдера ($ за 1000)</label>
              <input
                type="number"
                step="0.0001"
                value={rate}
                onChange={e => setRate(Number(e.target.value))}
                min={0}
                required
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                Себестоимость: {costPer1000Rub.toFixed(2)} ₽ / 1000 шт
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">Наценка (%)</label>
                <span className="text-xs font-bold text-primary font-mono">{markupPercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={500}
                step={5}
                value={markupPercent}
                onChange={e => setMarkupPercent(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              {isBelowSafety && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  ⚠️ Наценка ниже безопасного минимума ({Math.round(SAFETY_FLOOR_MARKUP * 100)}%)
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Розница за 1000:</span>
                <span className="font-bold text-foreground font-mono">{retailPricePer1000Rub.toFixed(2)} ₽</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Прибыль (с 1000 шт):</span>
                <span className="font-bold text-green-600 dark:text-green-400 font-mono">
                  +{(retailPricePer1000Rub - costPer1000Rub).toFixed(2)} ₽
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                <span className="font-semibold text-foreground">Розница за 1 шт:</span>
                <span className="font-extrabold text-primary font-mono text-sm">{retailPricePerUnitRub} ₽</span>
              </div>
            </div>
          </div>

          {/* Provider Binding */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-2xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>🔌</span> Провайдер API
            </h2>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Провайдер</label>
              <select
                value={providerId}
                onChange={e => setProviderId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              >
                <option value="">Без провайдера</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">ID услуги у провайдера</label>
              <input
                type="text"
                value={externalId}
                onChange={e => setExternalId(e.target.value)}
                placeholder="Например: 1234"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
