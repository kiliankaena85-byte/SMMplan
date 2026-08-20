'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Calculator, 
  Eye, 
  Layers, 
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createServiceAction, updateServiceAction } from '@/actions/admin/catalog/services';
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
  networkId?: string;
  rate: number;
  markup: number;
  minQty: number;
  maxQty: number;
  providerId: string | null;
  externalId: string | null;
  targetType: string | null;
  isActive: boolean;
  isDripFeedEnabled: boolean;
  isRefillEnabled: boolean;
  isCancelEnabled: boolean;
  customRequirements?: string | null;
}

interface ServiceStudioFormProps {
  initialData?: InitialServiceData;
  networks: NetworkOption[];
  providers: ProviderOption[];
  exchangeRateUsd: number;
  isEditMode?: boolean;
}

const TARGET_TYPES = [
  { value: 'CHANNEL', label: 'Канал / Группа (Подписчики, Бусты)' },
  { value: 'POST', label: 'Пост / Публикация (Просмотры, Лайки)' },
  { value: 'PROFILE', label: 'Личный Профиль / Аккаунт (Друзья)' },
  { value: 'VIDEO', label: 'Видео / Shorts / Reels (Просмотры, Часы)' },
  { value: 'STORY', label: 'История / Stories (Просмотры)' },
  { value: 'POLL', label: 'Опрос / Голосование (Голоса)' },
  { value: 'CUSTOM', label: 'Свой тип / Внешний API' },
];

export function ServiceStudioForm({
  initialData,
  networks,
  providers,
  exchangeRateUsd,
  isEditMode = false
}: ServiceStudioFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Find initial network based on categoryId
  const initialCategory = useMemo(() => {
    if (!initialData?.categoryId) return networks[0]?.categories[0] || null;
    for (const net of networks) {
      const found = net.categories.find(c => c.id === initialData.categoryId);
      if (found) return found;
    }
    return networks[0]?.categories[0] || null;
  }, [networks, initialData?.categoryId]);

  const initialNetwork = useMemo(() => {
    if (!initialData?.categoryId) return networks[0] || null;
    for (const net of networks) {
      const found = net.categories.find(c => c.id === initialData.categoryId);
      if (found) return net;
    }
    return networks[0] || null;
  }, [networks, initialData?.categoryId]);

  // Form State
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>(initialNetwork?.id || networks[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialData?.categoryId || initialCategory?.id || '');
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [targetType, setTargetType] = useState(initialData?.targetType || 'CHANNEL');

  // Finance State
  const [rate, setRate] = useState<string>(initialData?.rate !== undefined ? String(initialData.rate) : '0.10');
  const [markup, setMarkup] = useState<string>(initialData?.markup !== undefined ? String(initialData.markup) : '3.0');
  const [minQty, setMinQty] = useState<string>(initialData?.minQty !== undefined ? String(initialData.minQty) : '10');
  const [maxQty, setMaxQty] = useState<string>(initialData?.maxQty !== undefined ? String(initialData.maxQty) : '50000');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  // Provider State
  const [providerId, setProviderId] = useState<string>(initialData?.providerId || '');
  const [externalId, setExternalId] = useState<string>(initialData?.externalId || '');
  const [isRefillEnabled, setIsRefillEnabled] = useState(initialData?.isRefillEnabled ?? false);
  const [isCancelEnabled, setIsCancelEnabled] = useState(initialData?.isCancelEnabled ?? false);
  const [isDripFeedEnabled, setIsDripFeedEnabled] = useState(initialData?.isDripFeedEnabled ?? false);

  // Active Network and its Categories
  const activeNetwork = useMemo(() => {
    return networks.find(n => n.id === selectedNetworkId) || networks[0] || null;
  }, [networks, selectedNetworkId]);

  const activeCategory = useMemo(() => {
    return activeNetwork?.categories.find(c => c.id === selectedCategoryId) || activeNetwork?.categories[0] || null;
  }, [activeNetwork, selectedCategoryId]);

  const activeProvider = useMemo(() => {
    return providers.find(p => p.id === providerId) || null;
  }, [providers, providerId]);

  // Pricing Calculations (Real-Time)
  const numericRate = parseFloat(rate) || 0;
  const numericMarkup = parseFloat(markup) || 1.0;
  const isRubProvider = activeProvider?.balanceCurrency === 'RUB';
  const effectiveExchangeRate = isRubProvider ? 1.0 : exchangeRateUsd;

  const costPer1000Rub = numericRate * effectiveExchangeRate;
  const retailPer1000Rub = applyBeautifulRounding(costPer1000Rub * numericMarkup);
  const retailPerUnitRub = (retailPer1000Rub / 1000).toFixed(4);
  const profitPer1000Rub = (retailPer1000Rub - costPer1000Rub).toFixed(2);
  const marginPercent = costPer1000Rub > 0 ? (((retailPer1000Rub - costPer1000Rub) / costPer1000Rub) * 100).toFixed(0) : '0';

  // Handle Network Change
  const handleNetworkChange = (netId: string) => {
    setSelectedNetworkId(netId);
    const targetNet = networks.find(n => n.id === netId);
    if (targetNet && targetNet.categories.length > 0) {
      setSelectedCategoryId(targetNet.categories[0].id);
    } else {
      setSelectedCategoryId('');
    }
  };

  // Quick Preset Name Tags
  const applyNamePreset = (tag: string) => {
    if (!name.includes(tag)) {
      setName(prev => prev ? `${prev} • ${tag}` : tag);
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Укажите название услуги');
      return;
    }
    if (!selectedCategoryId) {
      toast.error('Выберите категорию для услуги');
      return;
    }
    if (numericRate <= 0) {
      toast.error('Себестоимость должна быть больше нуля');
      return;
    }
    if (numericMarkup < SAFETY_FLOOR_MARKUP) {
      toast.warning(`Внимание: наценка меньше минимального стандарта (+35% / ${SAFETY_FLOOR_MARKUP}x)`);
    }

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        categoryId: selectedCategoryId,
        rate: numericRate,
        markup: numericMarkup,
        minQty: parseInt(minQty, 10) || 10,
        maxQty: parseInt(maxQty, 10) || 50000,
        providerId: providerId || null,
        externalId: externalId.trim() || null,
        targetType: targetType || null,
        isActive,
        isDripFeedEnabled,
        isRefillEnabled,
        isCancelEnabled,
      };

      if (isEditMode && initialData?.id) {
        const res = await updateServiceAction(initialData.id, payload);
        if (res.success) {
          toast.success(`✅ Услуга «${name.trim()}» успешно обновлена!`);
          router.push('/admin/catalog');
          router.refresh();
        } else {
          toast.error(res.error || 'Ошибка при обновлении услуги');
        }
      } else {
        const res = await createServiceAction(payload);
        if (res.success) {
          toast.success(`✅ Услуга «${name.trim()}» успешно создана!`);
          router.push('/admin/catalog');
          router.refresh();
        } else {
          toast.error(res.error || 'Ошибка при создании услуги');
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      
      {/* ── Top Header & Navigation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/catalog"
              className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад в каталог
            </Link>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs font-mono font-semibold text-primary">
              {isEditMode ? `Редактирование #${initialData?.id?.slice(0, 8)}` : 'Новый тариф'}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            {isEditMode ? `Настройка услуги: ${initialData?.name}` : 'Создание новой услуги'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            intent="secondary"
            onClick={() => router.push('/admin/catalog')}
            className="cursor-pointer"
          >
            Отмена
          </Button>
          <Button
            type="submit"
            intent="primary"
            disabled={isPending}
            className="font-bold cursor-pointer shadow-xs"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {isEditMode ? 'Сохранить изменения' : 'Создать услугу'}
          </Button>
        </div>
      </div>

      {/* ── 2-Column Studio Grid (8 + 4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ══════════ LEFT COLUMN (8 cols / Main Workspace) ══════════ */}
        <div className="lg:col-span-8 space-y-6">

          {/* 1. Таксономия и Название */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                1. Таксономия и Позиционирование
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Соцсеть */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Социальная сеть <span className="text-destructive">*</span>
                </label>
                <select
                  value={selectedNetworkId}
                  onChange={e => handleNetworkChange(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-semibold bg-background border border-border rounded-xl text-foreground outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  {networks.map(n => (
                    <option key={n.id} value={n.id}>🌐 {n.name}</option>
                  ))}
                </select>
              </div>

              {/* Категория */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Категория услуг <span className="text-destructive">*</span>
                </label>
                {activeNetwork && activeNetwork.categories.length > 0 ? (
                  <select
                    value={selectedCategoryId}
                    onChange={e => setSelectedCategoryId(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-semibold bg-background border border-border rounded-xl text-foreground outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    {activeNetwork.categories.map(c => (
                      <option key={c.id} value={c.id}>📁 {c.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-warning bg-warning/10 p-2.5 rounded-xl border border-warning/20">
                    У этой соцсети еще нет категорий.{' '}
                    <Link href="/admin/catalog/categories" className="underline font-bold">
                      Создать категорию
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Название услуги */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Название тарифа <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">Формула: [Тип] • [Качество] • [ГЕО / Гарантия]</span>
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Например: Подписчики РФ • Живые активные • Гарантия 30 дней"
                className="w-full h-11 px-3.5 text-sm font-semibold bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
              />

              {/* Quick Tags */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-muted-foreground font-medium mr-1">Быстрые теги:</span>
                {['Живые РФ', 'Реальные', 'HQ', 'Без списаний', 'Гарантия 30 дней', 'Мгновенный старт', 'Плавный наплыв'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => applyNamePreset(tag)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-colors cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Описание и Требования к ссылке */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Eye className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                2. Описание тарифа и Инструкция по ссылкам
              </h2>
            </div>

            {/* Тип цели (Target Type) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                Тип объекта ссылки (Валидация клиента)
              </label>
              <select
                value={targetType}
                onChange={e => setTargetType(e.target.value)}
                className="w-full h-10 px-3 text-xs font-semibold bg-background border border-border rounded-xl text-foreground outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {TARGET_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Автоматический валидатор проверит ссылку покупателя на соответствие этому типу перед оплатой.
              </p>
            </div>

            {/* Описание услуги */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Подробное описание для карточки
                </label>
                <span className="text-[11px] text-muted-foreground font-mono">{description.length} символов</span>
              </div>
              <textarea
                rows={6}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="⏱️ Старт: от 5 до 30 минут&#10;⚡ Скорость: до 5 000 в сутки&#10;🛡️ Гарантия: 30 дней с авто-докруткой&#10;&#10;🔗 Ссылка на открытый канал вида https://t.me/username"
                className="w-full p-3.5 text-xs font-mono leading-relaxed bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* 3. Интеграция с API поставщика */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                3. Интеграция с API Провайдера
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Выбор провайдера */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Шлюз поставщика API
                </label>
                <select
                  value={providerId}
                  onChange={e => setProviderId(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-semibold bg-background border border-border rounded-xl text-foreground outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="">Без провайдера (Ручная обработка)</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>🔌 {p.name} ({p.balanceCurrency})</option>
                  ))}
                </select>
              </div>

              {/* ID у провайдера */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  ID услуги у поставщика (externalId)
                </label>
                <input
                  type="text"
                  value={externalId}
                  onChange={e => setExternalId(e.target.value)}
                  placeholder="Например: 1045"
                  className="w-full h-10 px-3 text-xs font-mono bg-background border border-border rounded-xl text-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Флаги провайдера */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-background cursor-pointer hover:bg-muted/30 transition-colors">
                <input
                  type="checkbox"
                  checked={isRefillEnabled}
                  onChange={e => setIsRefillEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">♻️ Докрутка (Refill)</span>
                  <span className="text-[10px] text-muted-foreground">Кнопка авто-восстановления</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-background cursor-pointer hover:bg-muted/30 transition-colors">
                <input
                  type="checkbox"
                  checked={isCancelEnabled}
                  onChange={e => setIsCancelEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">🚫 Отмена заказа</span>
                  <span className="text-[10px] text-muted-foreground">Разрешена отмена клиентом</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-background cursor-pointer hover:bg-muted/30 transition-colors">
                <input
                  type="checkbox"
                  checked={isDripFeedEnabled}
                  onChange={e => setIsDripFeedEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">💧 Drip-Feed</span>
                  <span className="text-[10px] text-muted-foreground">Постепенная подача частями</span>
                </div>
              </label>
            </div>
          </div>

        </div>

        {/* ══════════ RIGHT COLUMN (4 cols / Sticky Finance & Preview) ══════════ */}
        <div className="lg:col-span-4 space-y-6 sticky top-6">

          {/* 1. Живой калькулятор цен и наценки */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                  Калькулятор цены
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                Курс USD: {exchangeRateUsd.toFixed(2)} ₽
              </span>
            </div>

            {/* Закупка */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                  Закупка ({isRubProvider ? '₽' : '$'}) / 1k
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  required
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono font-bold bg-background border border-border rounded-lg text-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Множитель наценки */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                  Наценка (Множитель)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="50.0"
                  required
                  value={markup}
                  onChange={e => setMarkup(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono font-bold bg-background border border-border rounded-lg text-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Quick Markup Presets */}
            <div className="flex items-center gap-1 pt-1">
              {[2.0, 2.5, 3.0, 4.0, 5.0].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMarkup(String(m))}
                  className={`px-2 py-1 text-[11px] font-mono font-bold rounded-md border transition-colors cursor-pointer ${
                    numericMarkup === m 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/40'
                  }`}
                >
                  {m}x
                </button>
              ))}
            </div>

            {/* Итоговая розница (High-Visibility Block) */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-sans font-semibold">Цена для клиента:</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {retailPerUnitRub} ₽ / шт
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                <span className="text-muted-foreground font-sans font-semibold">Розничная за 1000 шт:</span>
                <span className="font-bold text-foreground">{retailPer1000Rub.toFixed(2)} ₽</span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                <span className="text-muted-foreground font-sans font-semibold">Чистая маржа с 1000 шт:</span>
                <span className="font-bold text-primary">+{profitPer1000Rub} ₽ ({marginPercent}%)</span>
              </div>
            </div>

            {/* Лимиты заказа */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Мин. заказ</label>
                <input
                  type="number"
                  required
                  value={minQty}
                  onChange={e => setMinQty(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs font-mono bg-background border border-border rounded-lg text-foreground outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Макс. заказ</label>
                <input
                  type="number"
                  required
                  value={maxQty}
                  onChange={e => setMaxQty(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs font-mono bg-background border border-border rounded-lg text-foreground outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* 2. Live Storefront Preview Card */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-sky-500" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                  Превью на витрине
                </h3>
              </div>
              <span className="text-[10px] text-muted-foreground">Вид для покупателя</span>
            </div>

            {/* Mock Client Card */}
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    <span>🌐 {activeNetwork?.name || 'Соцсеть'}</span>
                    <span>•</span>
                    <span>{activeCategory?.name || 'Категория'}</span>
                  </div>
                  <h4 className="text-xs font-extrabold text-foreground mt-1 line-clamp-2">
                    {name || 'Название вашей услуги появится здесь...'}
                  </h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                  {targetType}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-mono">Цена за 1 действие</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {retailPerUnitRub} ₽ / шт
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block font-mono">Минимум</span>
                  <span className="text-xs font-bold text-foreground font-mono">{minQty} шт</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Статус активности и Кнопка сохранения */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-background cursor-pointer hover:bg-muted/30 transition-colors">
              <div>
                <span className="text-xs font-bold text-foreground block">Статус тарифа</span>
                <span className="text-[11px] text-muted-foreground">
                  {isActive ? '🟢 Активен и доступен для заказа' : '⚪ Отключен (скрыт с витрины)'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="w-5 h-5 rounded text-primary focus:ring-primary cursor-pointer"
              />
            </label>

            <Button
              type="submit"
              intent="primary"
              disabled={isPending}
              className="w-full h-11 text-sm font-black cursor-pointer shadow-xs"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isEditMode ? 'Сохранить изменения' : 'Создать услугу'}
            </Button>
          </div>

        </div>

      </div>
    </form>
  );
}
