'use client';

import React, { useState, useTransition, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Calculator, 
  Eye, 
  Layers, 
  Sparkles,
  Search,
  Check,
  Bot,
  Link as LinkIcon,
  ShieldCheck,
  Flame,
  Zap,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createServiceAction, updateServiceAction } from '@/actions/admin/catalog/services';
import { searchShadowServicesAction, getLinkSpecificationAction } from '@/actions/admin/providers/search-services';
import type { ShadowServiceSearchResult } from '@/services/admin/smart-provider-matcher';
import { applyBeautifulRounding, SAFETY_FLOOR_MARKUP } from '@/lib/financial-constants';

interface NetworkOption {
  id: string;
  name: string;
  slug: string;
  categories: {
    id: string;
    name: string;
    slug: string;
    activityType?: string | null;
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
  qualityTier?: string;
  customDataType?: string;
  customDataLabel?: string | null;
  isMediaGroupAware?: boolean;
  linkValidatorRegex?: string | null;
  linkPlaceholder?: string | null;
  linkHint?: string | null;
  requiresBotAdmin?: boolean;
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
  { value: 'CHANNEL', label: '📢 Канал / Группа (Подписчики, Просмотры, Бусты)' },
  { value: 'POST', label: '📝 Пост / Публикация (Лайки, Просмотры, Репосты, Альбомы)' },
  { value: 'PROFILE', label: '👤 Личный Профиль / Аккаунт (Друзья, Фолловеры)' },
  { value: 'VIDEO', label: '🎬 Видео / Shorts / Reels (Просмотры, Часы, Лайки)' },
  { value: 'STORY', label: '⏱️ История / Stories (Просмотры)' },
  { value: 'POLL', label: '📊 Опрос / Голосование (Голоса)' },
  { value: 'COMMENT', label: '💬 Комментарии / Отзывы' },
  { value: 'CUSTOM', label: '⚙️ Свой тип / Внешний API' },
];

const QUALITY_TIERS = [
  { value: 'ECONOMY', label: 'Эконом', desc: 'Быстрые боты, базовое качество', icon: Flame, color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' },
  { value: 'STANDARD', label: 'Стандарт', desc: 'Хит продаж, живые офферы, стабильно', icon: Zap, color: 'text-primary bg-primary/10 border-primary/20' },
  { value: 'PREMIUM', label: 'Премиум', desc: 'Высокое качество, РФ/СНГ, с гарантией', icon: ShieldCheck, color: 'text-purple-600 bg-purple-500/10 border-purple-500/20' },
  { value: 'VIP', label: 'VIP / Бизнес', desc: '100% реальные пользователи, без списаний', icon: Crown, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { value: 'AUTO', label: 'Авто-услуга', desc: 'На будущие посты/активности канала', icon: Bot, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
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
  const [qualityTier, setQualityTier] = useState(initialData?.qualityTier || 'STANDARD');

  // Link & Requirement State
  const [linkPlaceholder, setLinkPlaceholder] = useState(initialData?.linkPlaceholder || '');
  const [linkHint, setLinkHint] = useState(initialData?.linkHint || '');
  const [linkValidatorRegex, setLinkValidatorRegex] = useState(initialData?.linkValidatorRegex || '');
  const [requiresBotAdmin, setRequiresBotAdmin] = useState(initialData?.requiresBotAdmin ?? false);
  const [isMediaGroupAware, setIsMediaGroupAware] = useState(initialData?.isMediaGroupAware ?? false);
  const [customDataType, setCustomDataType] = useState(initialData?.customDataType || 'NONE');
  const [customDataLabel, setCustomDataLabel] = useState(initialData?.customDataLabel || '');

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

  // Smart Matcher State
  const [shadowSearchQuery, setShadowSearchQuery] = useState('');
  const [isSearchingShadow, setIsSearchingShadow] = useState(false);
  const [shadowResults, setShadowResults] = useState<ShadowServiceSearchResult[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Debounced Shadow Search
  useEffect(() => {
    if (!shadowSearchQuery.trim()) {
      setShadowResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingShadow(true);
      const res = await searchShadowServicesAction({
        query: shadowSearchQuery.trim(),
        providerId: providerId || undefined,
        limit: 10
      });
      setIsSearchingShadow(false);
      if (res.success && res.items) {
        setShadowResults(res.items);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [shadowSearchQuery, providerId]);

  // Auto-apply link rules on targetType change
  const handleTargetTypeChange = async (newType: string) => {
    setTargetType(newType);
    const specRes = await getLinkSpecificationAction({
      targetType: newType,
      networkSlug: activeNetwork?.slug || 'telegram',
      activityType: activeCategory?.activityType || undefined
    });
    if (specRes.success && specRes.spec) {
      setLinkPlaceholder(specRes.spec.placeholder);
      setLinkHint(specRes.spec.hint);
      if (specRes.spec.regex) setLinkValidatorRegex(specRes.spec.regex);
      setIsMediaGroupAware(specRes.spec.isMediaGroupAware);
      setCustomDataType(specRes.spec.customDataType);
      if (specRes.spec.customDataLabel) setCustomDataLabel(specRes.spec.customDataLabel);
    }
  };

  // Apply Shadow Service preset in 1-click
  const handleApplyShadowService = (item: ShadowServiceSearchResult) => {
    setProviderId(item.providerId);
    setExternalId(item.externalId);
    setRate(String(item.rate));
    setMinQty(String(item.min));
    setMaxQty(String(item.max));
    setIsRefillEnabled(item.refill);
    setIsCancelEnabled(item.cancel);
    setIsDripFeedEnabled(item.dripfeed);

    if (item.targetType) {
      handleTargetTypeChange(item.targetType);
    }
    if (item.isMediaGroupAware) {
      setIsMediaGroupAware(true);
    }
    if (item.customDataType && item.customDataType !== 'NONE') {
      setCustomDataType(item.customDataType);
    }

    if (!name.trim()) {
      setName(item.cleanName || item.name);
    }

    setShadowSearchQuery('');
    setShadowResults([]);
    toast.success(`✅ Параметры услуги #${item.externalId} (${item.providerName}) успешно применены!`);
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
        qualityTier: qualityTier || 'STANDARD',
        customDataType,
        customDataLabel: customDataLabel.trim() || null,
        isMediaGroupAware,
        linkValidatorRegex: linkValidatorRegex.trim() || null,
        linkPlaceholder: linkPlaceholder.trim() || null,
        linkHint: linkHint.trim() || null,
        requiresBotAdmin,
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

          {/* ⚡ SMART PROVIDER MATCHER WIDGET */}
          <div className="bg-gradient-to-br from-primary/5 via-card to-card border-2 border-primary/20 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                  Умный подбор услуги от провайдера (Smart Matcher)
                </h2>
              </div>
              <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                Авто-заполнение в 1 клик
              </span>
            </div>

            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={shadowSearchQuery}
                  onChange={e => setShadowSearchQuery(e.target.value)}
                  placeholder="Введите название услуги или ID у поставщика (например: TG Subscribers или 1042)..."
                  className="w-full h-11 pl-10 pr-10 text-xs font-semibold bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-hidden focus:ring-2 focus:ring-primary/30"
                />
                {isSearchingShadow && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Shadow search results dropdown */}
              {shadowResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-2 bg-card border border-border/80 rounded-2xl shadow-xl overflow-hidden divide-y divide-border/50 max-h-80 overflow-y-auto">
                  {shadowResults.map(item => (
                    <div
                      key={`${item.providerId}-${item.externalId}`}
                      onClick={() => handleApplyShadowService(item)}
                      className="p-3.5 hover:bg-primary/10 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-foreground">
                            #{item.externalId}
                          </span>
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {item.cleanName || item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-bold text-foreground">{item.providerName}</span>
                          <span>•</span>
                          <span>{item.category || item.normalizedCategory || 'Без категории'}</span>
                          <span>•</span>
                          <span>Лимит: {item.min} - {item.max.toLocaleString('ru-RU')}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-success tabular-nums">
                          ${item.rate} / 1к
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          ~{item.rateRub.toFixed(2)} ₽
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 1. Таксономия и 4-уровневое позиционирование */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                1. 4-Уровневая Таксономия и Тариф
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Уровень 1: Соцсеть */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Уровень 1: Социальная сеть <span className="text-destructive">*</span>
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

              {/* Уровень 3: Категория активности */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Уровень 3: Категория активности <span className="text-destructive">*</span>
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

            {/* Уровень 4: Тарифный уровень качества */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-foreground uppercase tracking-wide block">
                Уровень 4: Тарифный уровень (Quality Tier)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {QUALITY_TIERS.map(tier => {
                  const Icon = tier.icon;
                  const isSelected = qualityTier === tier.value;
                  return (
                    <button
                      key={tier.value}
                      type="button"
                      onClick={() => setQualityTier(tier.value)}
                      className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? `${tier.color} ring-2 ring-primary/40 font-bold shadow-xs` 
                          : 'bg-background hover:bg-muted/50 border-border text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Icon className="w-4 h-4" />
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-foreground">{tier.label}</div>
                        <div className="text-[9px] text-muted-foreground leading-tight mt-0.5">{tier.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Название услуги */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Название тарифа в каталоге <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">Формула: [Тип] • [Качество] • [ГЕО / Скорость]</span>
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

          {/* 2. Уровень 2: Правила валидации ссылки и Специфика */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <LinkIcon className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                2. Уровень 2: Правила Валидации Ссылки и Специфика Услуги
              </h2>
            </div>

            {/* Тип объекта (Target Type) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                Тип объекта ссылки (Валидация покупателя)
              </label>
              <select
                value={targetType}
                onChange={e => handleTargetTypeChange(e.target.value)}
                className="w-full h-10 px-3 text-xs font-semibold bg-background border border-border rounded-xl text-foreground outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {TARGET_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Placeholder ссылки */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Пример ссылки (Placeholder в чекауте)
                </label>
                <input
                  type="text"
                  value={linkPlaceholder}
                  onChange={e => setLinkPlaceholder(e.target.value)}
                  placeholder="https://t.me/channel_username"
                  className="w-full h-10 px-3 text-xs font-mono bg-background border border-border rounded-xl text-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Подсказка для клиента */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Текст-подсказка для покупателя
                </label>
                <input
                  type="text"
                  value={linkHint}
                  onChange={e => setLinkHint(e.target.value)}
                  placeholder="Ссылка на публичный или закрытый Telegram канал"
                  className="w-full h-10 px-3 text-xs bg-background border border-border rounded-xl text-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Специфические флаги (Бот-админ, Альбомы, Опросы) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-background cursor-pointer hover:bg-muted/30 transition-colors">
                <input
                  type="checkbox"
                  checked={requiresBotAdmin}
                  onChange={e => setRequiresBotAdmin(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">🤖 Требуется бот-администратор</span>
                  <span className="text-[10px] text-muted-foreground">Для закрытых каналов с инвайт-ссылкой</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-background cursor-pointer hover:bg-muted/30 transition-colors">
                <input
                  type="checkbox"
                  checked={isMediaGroupAware}
                  onChange={e => setIsMediaGroupAware(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">🖼️ Поддержка альбомов (Медиагруппы)</span>
                  <span className="text-[10px] text-muted-foreground">Telegram посты из нескольких фото/видео</span>
                </div>
              </label>
            </div>

            {/* Описание услуги */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Подробное описание для карточки в каталоге
                </label>
                <span className="text-[11px] text-muted-foreground font-mono">{description.length} символов</span>
              </div>
              <textarea
                rows={5}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="⏱️ Старт: от 5 до 30 минут&#10;⚡ Скорость: до 5 000 в сутки&#10;🛡️ Гарантия: 30 дней с авто-докруткой"
                className="w-full p-3.5 text-xs font-mono leading-relaxed bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* 3. Интеграция с API поставщика */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                3. Привязка к Поставщику (Провайдеру)
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
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Calculator className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                Ценообразование и Маржинальность
              </h2>
            </div>

            {/* Поля себестоимости и наценки */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Тариф поставщика (за 1 000 шт) <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">
                    {activeProvider?.balanceCurrency || 'USD'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    value={rate}
                    onChange={e => setRate(e.target.value)}
                    className="w-full h-10 px-3 font-mono text-sm font-bold bg-background border border-border rounded-xl text-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Себестоимость в рублях: <strong className="text-foreground">{costPer1000Rub.toFixed(2)} ₽</strong> / 1k
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Множитель наценки (Markup) <span className="text-destructive">*</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">
                    +{((numericMarkup - 1) * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  required
                  value={markup}
                  onChange={e => setMarkup(e.target.value)}
                  className="w-full h-10 px-3 font-mono text-sm font-bold bg-background border border-border rounded-xl text-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Результаты ценообразования */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold">Розничная цена:</span>
                <span className="text-sm font-extrabold text-foreground tabular-nums">
                  {retailPer1000Rub.toFixed(2)} ₽ <span className="text-[10px] text-muted-foreground font-normal">/ 1к</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold">Цена за 1 шт:</span>
                <span className="text-base font-black text-primary tabular-nums">
                  {retailPerUnitRub} ₽ / шт
                </span>
              </div>
              <div className="border-t border-border/60 pt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold">Маржа с 1 000:</span>
                <span className="text-xs font-bold text-success tabular-nums">
                  +{profitPer1000Rub} ₽ ({marginPercent}%)
                </span>
              </div>
            </div>

            {/* Лимиты количества */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                  Мин. заказ (шт)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={minQty}
                  onChange={e => setMinQty(e.target.value)}
                  className="w-full h-9 px-2.5 font-mono text-xs bg-background border border-border rounded-xl text-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                  Макс. заказ (шт)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={maxQty}
                  onChange={e => setMaxQty(e.target.value)}
                  className="w-full h-9 px-2.5 font-mono text-xs bg-background border border-border rounded-xl text-foreground outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Статус активности */}
            <div className="pt-2">
              <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-background cursor-pointer hover:bg-muted/30 transition-colors">
                <div>
                  <span className="text-xs font-bold text-foreground block">Опубликовать в каталоге</span>
                  <span className="text-[10px] text-muted-foreground">Доступна покупателям на витрине</span>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded text-primary focus:ring-primary cursor-pointer"
                />
              </label>
            </div>
          </div>

        </div>

      </div>

    </form>
  );
}
