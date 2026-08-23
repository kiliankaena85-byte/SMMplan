'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Layers,
  DollarSign,
  Sliders,
  FileText,
  Eye,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TargetTypeSelector } from './target-type-selector';
import { getTargetTypeMeta } from '../lib/target-type-config';
import { formatPricePerUnit } from '@/utils/format-price';
import type { ExternalServiceItem, CategoryItem } from '../types';

export interface ServiceOverride {
  cleanName?: string;
  categoryId?: string;
  targetType?: string;
  customMarkup?: number;
  minQty?: number;
  maxQty?: number;
  description?: string;
}

interface ServiceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ExternalServiceItem | null;
  categories: CategoryItem[];
  defaultMarkup: number;
  initialOverride?: ServiceOverride;
  onSaveOverride: (serviceId: string, override: ServiceOverride) => void;
  targetTenant?: 'smmplan' | 'flux' | 'both';
}

export function ServiceEditModal({
  isOpen,
  onClose,
  service,
  categories,
  defaultMarkup,
  initialOverride,
  onSaveOverride,
  targetTenant = 'smmplan',
}: ServiceEditModalProps) {
  if (!isOpen || !service) return null;

  const serviceId = String(service.service);
  const procurementPriceRub = service.pricePerUnitProcurementRub || 0;

  // Local form state
  const [cleanName, setCleanName] = useState<string>(
    initialOverride?.cleanName ?? service.cleanName ?? service.name
  );
  const [categoryId, setCategoryId] = useState<string>(
    initialOverride?.categoryId ?? ''
  );
  const [targetType, setTargetType] = useState<string>(
    initialOverride?.targetType ?? (service.metrics?.targetType as string) ?? 'POST'
  );
  const [customMarkup, setCustomMarkup] = useState<string>(
    initialOverride?.customMarkup !== undefined
      ? String(initialOverride.customMarkup)
      : String(defaultMarkup)
  );
  const [minQty, setMinQty] = useState<string>(
    initialOverride?.minQty !== undefined
      ? String(initialOverride.minQty)
      : String(service.min || 10)
  );
  const [maxQty, setMaxQty] = useState<string>(
    initialOverride?.maxQty !== undefined
      ? String(initialOverride.maxQty)
      : String(service.max || 10000)
  );
  const [description, setDescription] = useState<string>(
    initialOverride?.description ?? (service.desc as string) ?? ''
  );

  const [activeTab, setActiveTab] = useState<'main' | 'limits' | 'preview'>('main');

  // Compute live prices
  const markupNum = parseFloat(customMarkup) || 0;
  const retailPricePerUnit = procurementPriceRub * (1 + markupNum / 100);
  const retailPricePer1000 = retailPricePerUnit * 1000;

  const targetMeta = getTargetTypeMeta(targetType);
  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleSave = () => {
    onSaveOverride(serviceId, {
      cleanName: cleanName.trim() || service.name,
      categoryId: categoryId || undefined,
      targetType,
      customMarkup: markupNum,
      minQty: parseInt(minQty, 10) || 10,
      maxQty: parseInt(maxQty, 10) || 10000,
      description: description.trim() || undefined,
    });
    onClose();
  };

  const handleResetToAI = () => {
    if (service.cleanName) setCleanName(service.cleanName);
  };

  const handleResetToOriginal = () => {
    setCleanName(service.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-border/10">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              ✏️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                  Настройка услуги перед импортом
                </h3>
                <span className="font-mono text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  #{service.service}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 max-w-md" title={service.name}>
                {service.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs Navigation */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 border-b border-border bg-background">
          <button
            type="button"
            onClick={() => setActiveTab('main')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'main'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Основное и Тип ссылки</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('limits')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'limits'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Цены, Наценка и Лимиты</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'preview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Превью карточки на сайте</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'main' && (
            <div className="space-y-5">
              {/* Clean Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    Название для покупателей (Витрина магазина)
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {service.cleanName && (
                      <button
                        type="button"
                        onClick={handleResetToAI}
                        className="text-primary hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Sparkles className="w-3 h-3" />
                        AI-вариант
                      </button>
                    )}
                    <span className="text-muted-foreground">•</span>
                    <button
                      type="button"
                      onClick={handleResetToOriginal}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Оригинал поставщика
                    </button>
                  </div>
                </div>
                <Input
                  value={cleanName}
                  onChange={(e) => setCleanName(e.target.value)}
                  placeholder="Введите понятное название услуги..."
                  className="text-sm font-semibold h-10"
                />
              </div>

              {/* Category Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Категория в каталоге SMMpanel</span>
                </label>
                <Select value={categoryId} onValueChange={(val) => setCategoryId(val || '')}>
                  <SelectTrigger className="h-10 text-xs font-semibold bg-background">
                    <SelectValue placeholder="Выберите категорию каталога...">
                      {(val: string) => {
                        const cat = categories.find((c) => c.id === val);
                        return cat
                          ? `${cat.network?.name ? `${cat.network.name} — ` : ''}${cat.name}`
                          : 'Выберите категорию...';
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs font-medium py-2">
                        {c.network?.name ? `${c.network.name} — ` : ''}
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Type Selector with Visual Cards */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div>
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span>{targetMeta.icon}</span>
                    <span>Тип ссылки (Какую ссылку будет вводить клиент)</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Выберите правильный тип объекта, чтобы клиент вводил корректную ссылку, а валидатор проверял её формат.
                  </p>
                </div>
                <TargetTypeSelector
                  value={targetType}
                  onChange={setTargetType}
                  compact={false}
                />
              </div>
            </div>
          )}

          {activeTab === 'limits' && (
            <div className="space-y-5">
              {/* Price Calculation Box */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Калькулятор розничной цены (₽ / шт)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-background rounded-xl border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Закупка у провайдера
                    </span>
                    <div className="text-base font-bold font-mono text-foreground mt-1 tabular-nums">
                      {formatPricePerUnit(procurementPriceRub)} ₽
                      <span className="text-xs font-normal text-muted-foreground ml-1">/ шт</span>
                    </div>
                  </div>

                  <div className="p-3 bg-background rounded-xl border border-border">
                    <span className="text-[10px] font-bold text-primary uppercase">
                      Наценка (%)
                    </span>
                    <div className="mt-1">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={customMarkup}
                        onChange={(e) => setCustomMarkup(e.target.value)}
                        className="h-8 text-sm font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                    <span className="text-[10px] font-bold text-primary uppercase">
                      Итоговая цена для клиента
                    </span>
                    <div className="text-base font-extrabold font-mono text-primary mt-1 tabular-nums">
                      {formatPricePerUnit(retailPricePerUnit)} ₽
                      <span className="text-xs font-normal text-muted-foreground ml-1">/ шт</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      ({formatPricePerUnit(retailPricePer1000)} ₽ за 1 000 шт)
                    </div>
                  </div>
                </div>
              </div>

              {/* Min / Max Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Минимальный заказ (шт)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value)}
                    className="h-10 text-sm font-mono font-bold"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Поставщик: от {service.min || 10} шт
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Максимальный заказ (шт)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={maxQty}
                    onChange={(e) => setMaxQty(e.target.value)}
                    className="h-10 text-sm font-mono font-bold"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Поставщик: до {service.max || 10000} шт
                  </p>
                </div>
              </div>

              {/* Description Markdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Описание услуги (отображается клиенту на сайте)</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Добавьте подробное описание, условия гарантии или инструкцию для покупателя..."
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-xs leading-relaxed outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-xl border border-border text-xs text-muted-foreground flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary shrink-0" />
                <span>
                  Так карточка услуги будет выглядеть в пользовательском мастере заказа на сайте{' '}
                  <strong>{targetTenant === 'flux' ? 'SMMflux.ru' : 'SMMplan.pro'}</strong>.
                </span>
              </div>

              {/* Card Preview */}
              <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4 max-w-lg mx-auto">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${targetMeta.badgeBg} ${targetMeta.badgeText} ${targetMeta.badgeBorder}`}>
                        {targetMeta.icon} {targetMeta.shortLabel}
                      </span>
                      {selectedCategory && (
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {selectedCategory.name}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-foreground leading-snug">
                      {cleanName || 'Название услуги'}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-extrabold font-mono text-primary">
                      {formatPricePerUnit(retailPricePerUnit)} ₽
                    </div>
                    <div className="text-[10px] text-muted-foreground">за 1 шт</div>
                  </div>
                </div>

                {description && (
                  <div className="text-xs text-muted-foreground/90 bg-muted/40 p-3 rounded-xl border border-border/50 text-[11px] leading-relaxed">
                    {description}
                  </div>
                )}

                <div className="p-3 rounded-xl border border-dashed border-border bg-background space-y-1.5">
                  <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                    <span>🔗 Ссылка на {targetMeta.shortLabel.toLowerCase()}:</span>
                  </label>
                  <div className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border/40 truncate">
                    {targetMeta.exampleUrl}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                  <span>Минимум: <b>{minQty} шт</b></span>
                  <span>Максимум: <b>{maxQty} шт</b></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <Button
            intent="primary"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Применить настройки
          </Button>
        </div>
      </div>
    </div>
  );
}
