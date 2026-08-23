'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, DollarSign, Layers, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateServiceAction } from '@/actions/admin/catalog/services';
import { applyBeautifulRounding, SAFETY_FLOOR_MARKUP } from '@/lib/financial-constants';

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
            className="text-xs"
          >
            Отмена
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="text-xs font-bold gap-1.5"
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

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Категория</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
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
                  min={1}
                  value={minQty}
                  onChange={e => setMinQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Макс. заказ (шт)</label>
                <input
                  type="number"
                  min={1}
                  value={maxQty}
                  onChange={e => setMaxQty(parseInt(e.target.value) || 10000)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono font-bold outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2 border-t border-border/50">
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                Услуга активна на витрине
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRefillEnabled}
                  onChange={e => setIsRefillEnabled(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                Гарантия (Refill)
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCancelEnabled}
                  onChange={e => setIsCancelEnabled(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                Разрешить отмену клиентом
              </label>
            </div>
          </div>
        </div>

        {/* Pricing Sidebar */}
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-2xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" /> Ценообразование
            </h2>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Провайдер API</label>
              <select
                value={providerId}
                onChange={e => setProviderId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-medium outline-none"
              >
                <option value="">Без провайдера</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">ID у провайдера</label>
              <input
                type="text"
                value={externalId}
                onChange={e => setExternalId(e.target.value)}
                placeholder="например, 1420"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono outline-none"
              />
            </div>

            <div className="pt-2 border-t border-border/50">
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Ставка поставщика ($ / 1000 шт)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={rate}
                onChange={e => setRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono font-bold outline-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                ≈ {costPer1000Rub.toFixed(2)} ₽ за 1000 шт (курс {exchangeRateUsd.toFixed(1)} ₽/$)
              </p>
            </div>

            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">Наценка</label>
                <span className="text-xs font-mono font-bold text-primary">+{markupPercent}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                step="5"
                value={markupPercent}
                onChange={e => setMarkupPercent(parseInt(e.target.value) || 50)}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            {/* Calculated Result Box */}
            <div className={`p-3.5 rounded-xl border ${
              isBelowSafety ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-primary/5 border-primary/20 text-foreground'
            }`}>
              <div className="text-[11px] text-muted-foreground font-medium mb-1">Розничная цена на витрине:</div>
              <div className="text-lg font-black font-mono tracking-tight">
                {retailPricePerUnitRub} ₽ <span className="text-xs font-medium text-muted-foreground">/ шт</span>
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                ({retailPricePer1000Rub} ₽ за 1 000 шт)
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
