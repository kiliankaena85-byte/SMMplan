'use client';
// audit-disable STR-002

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Info, ArrowRight, Loader2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useOrderEngine } from '@/hooks/useOrderEngine';
import { sanitizeServiceDescription } from '@/lib/sanitize';
import { IntelligencePlatform } from '@/services/analyzer/link-rules';

// Subcomponents import
import { NetworkSelector } from './sub/NetworkSelector';
import { CategorySelector } from './sub/CategorySelector';
import { LinkInputField } from './sub/LinkInputField';
import { OrderSummaryCard } from './sub/OrderSummaryCard';
import { formatPricePerUnit } from '@/utils/format-price';

export function SmartOrderForm({ userBalanceCents = 0, userEmail = "" }: { userBalanceCents?: number; userEmail?: string }) {
  const engine = useOrderEngine([], userEmail);
  const {
    url, setUrl,
    categoryId, setCategoryId,
    selectedService, setSelectedService,
    services,
    isLoading,
    validationErrors,
    manualPlatform,
    platform,
    urlMutatedTrigger,
    unfilteredCatalog,
    isLinkOverridden,
    setIsLinkOverridden,
  } = engine;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  // Filter & Sort State
  const [sortType, setSortType] = useState<'default' | 'price_asc' | 'price_desc'>('default');
  const [filterWarranty, setFilterWarranty] = useState(false);

  // Processed services (Filtered & Sorted)
  const processedServices = React.useMemo(() => {
    let result = [...services];
    
    // Filter by warranty
    if (filterWarranty) {
            result = result.filter((s) => 
        s.badge === 'ГАРАНТИЯ' || 
        s.name.toLowerCase().includes('гарант') || 
        (s.description && s.description.toLowerCase().includes('гарант'))
      );
    }
    
    // Sort
    if (sortType === 'price_asc') {
      result.sort((a, b) => a.pricePerUnitRub - b.pricePerUnitRub);
    } else if (sortType === 'price_desc') {
      result.sort((a, b) => b.pricePerUnitRub - a.pricePerUnitRub);
    }
    
    return result;
  }, [services, filterWarranty, sortType]);

  // Auto-advance logic for Step 1 -> Step 2
  useEffect(() => {
    if (currentStep === 1 && url && url.length > 5 && !isLoading && !validationErrors.url && engine.networkId && categoryId) {
      // Small delay for smooth UX so the user can see the link was accepted
      const timer = setTimeout(() => {
        setCurrentStep(2);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentStep, url, isLoading, validationErrors.url, engine.networkId, categoryId]);

  // Keep expanded service in sync with selected service if navigating back
  useEffect(() => {
    if (currentStep === 2 && selectedService) {
      setExpandedServiceId(selectedService.id);
    }
  }, [currentStep, selectedService]);

  if (!unfilteredCatalog || unfilteredCatalog.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-border bg-card/50 rounded-3xl p-8 text-center space-y-4 animate-pulse">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-black text-foreground uppercase tracking-wider">Синхронизация каталога</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Получаем актуальные тарифы, проверяем доступность услуг и синхронизируем розничные цены с провайдерами в реальном времени...
          </p>
        </div>
      </div>
    );
  }

  // Platform catalog mapper
  const availablePlatforms = (unfilteredCatalog || []).map(net => {
    let platformEnum = IntelligencePlatform.OTHER;
    const slugUpper = net.slug.toUpperCase();
    if (slugUpper.includes('TELEGRAM')) platformEnum = IntelligencePlatform.TELEGRAM;
    else if (slugUpper.includes('YOUTUBE')) platformEnum = IntelligencePlatform.YOUTUBE;
    else if (slugUpper.includes('INSTAGRAM')) platformEnum = IntelligencePlatform.INSTAGRAM;
    else if (slugUpper.includes('TIKTOK')) platformEnum = IntelligencePlatform.TIKTOK;
    else if (slugUpper.includes('VK')) platformEnum = IntelligencePlatform.VK;
    else if (slugUpper.includes('TWITCH')) platformEnum = IntelligencePlatform.TWITCH;
    else if (slugUpper.includes('TWITTER') || slugUpper === 'X') platformEnum = IntelligencePlatform.TWITTER;
    else if (slugUpper.includes('LIKEE')) platformEnum = IntelligencePlatform.LIKEE;
    
    return {
      id: net.id,
      name: platformEnum,
      labelName: net.name
    };
  }).filter(p => p.name !== IntelligencePlatform.OTHER);

  // Platform select handler
    const handlePlatformSelect = (pId: string, pName: IntelligencePlatform) => {
    engine.setNetworkId(pId);
    engine.setManualPlatform(pName);
    const netObj = unfilteredCatalog.find(n => n.id === pId);
    if (netObj && netObj.categories.length > 0) {
      engine.setCategoryId(netObj.categories[0].id);
    }
  };

  const steps = [
    { num: 1, title: 'Укажите ссылку' },
    { num: 2, title: 'Выберите тариф' },
    { num: 3, title: 'Параметры заказа' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Wizard Stepper Header ── */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-border -z-10" />
        {steps.map(step => {
          const isActive = currentStep === step.num;
          const isCompleted = currentStep > step.num;
          return (
            <div key={step.num} className="flex flex-col items-center gap-2 bg-background px-2">
              <button
                type="button"
                onClick={() => {
                  if (isCompleted || (step.num === 2 && currentStep === 3)) {
                    setCurrentStep(step.num as 1 | 2 | 3);
                  }
                }}
                disabled={!isCompleted && step.num > currentStep}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 ${
                  isActive
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110'
                    : isCompleted
                    ? 'bg-success text-success-foreground cursor-pointer hover:bg-success/80'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.num}
              </button>
              <span className={`text-[11px] font-bold uppercase tracking-wider hidden sm:block ${
                isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Link & Platform ── */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
          <NetworkSelector
            platform={platform}
            manualPlatform={manualPlatform}
            networkId={engine.networkId}
            unfilteredCatalog={unfilteredCatalog}
            onSelect={handlePlatformSelect}
          />

          <CategorySelector
            categoryId={categoryId}
            setCategoryId={setCategoryId}
            availableCategories={engine.availableCategories}
          />

          <LinkInputField
            url={url}
            setUrl={setUrl}
            isLoading={isLoading}
            platform={platform}
            networkId={engine.networkId}
            manualPlatform={manualPlatform}
            setManualPlatform={engine.setManualPlatform}
            validationErrors={validationErrors}
            urlMutatedTrigger={urlMutatedTrigger}
            availablePlatforms={availablePlatforms}
            onBlur={() => engine.validate(true)}
            isLinkOverridden={isLinkOverridden}
            setIsLinkOverridden={setIsLinkOverridden}
          />

          <div className="flex justify-end pt-4">
            <button
              type="button"
              disabled={!url || !!validationErrors.url || !engine.networkId}
              onClick={() => setCurrentStep(2)}
              className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100 flex items-center gap-2"
            >
              Далее к выбору тарифа <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <OrderGuideWidget />
        </div>
      )}

      {/* ── Step 2: Service Selection ── */}
      {currentStep === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          {services.length === 0 && !isLoading && (
            <div className="p-6 rounded-2xl border border-dashed border-border bg-card text-center space-y-3">
              <div className="text-xl">📦</div>
              <h4 className="font-bold text-sm text-foreground text-center">Нет доступных тарифов</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed text-center">
                Для выбранной платформы и категории сейчас нет доступных тарифов. Попробуйте выбрать другую категорию.
              </p>
              <button
                onClick={() => setCurrentStep(1)}
                className="mt-4 h-11 px-4 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg transition-all"
              >
                Вернуться назад
              </button>
            </div>
          )}

          <div className="space-y-3" role="listbox" aria-label="Список тарифов">
            {services.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 bg-muted/30 p-2.5 rounded-2xl border border-border/50 mb-4 animate-in fade-in duration-300">
                <div className="flex-1">
                  <select
                    value={sortType}
                                        onChange={(e) => setSortType(e.target.value as "default" | "price_asc" | "price_desc")}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer"
                  >
                    <option value="default">Сортировка по умолчанию</option>
                    <option value="price_asc">Сначала дешевые</option>
                    <option value="price_desc">Сначала дорогие</option>
                  </select>
                </div>
                <label className={`flex-1 sm:flex-none cursor-pointer flex items-center justify-center gap-2 h-10 px-4 rounded-xl border transition-all select-none ${filterWarranty ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-background border-border text-foreground hover:bg-muted'}`}>
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={filterWarranty}
                    onChange={(e) => setFilterWarranty(e.target.checked)}
                  />
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-sm font-semibold">С гарантией</span>
                </label>
              </div>
            )}

            {processedServices.length === 0 && services.length > 0 && (
              <div className="p-6 rounded-2xl border border-dashed border-border bg-card text-center space-y-3">
                <div className="text-xl">🔍</div>
                <h4 className="font-bold text-sm text-foreground text-center">Ничего не найдено</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed text-center">
                  По вашим фильтрам нет подходящих тарифов. Попробуйте отключить фильтр "С гарантией".
                </p>
                <button
                  onClick={() => setFilterWarranty(false)}
                  className="mt-4 h-11 px-4 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold rounded-lg transition-all"
                >
                  Сбросить фильтры
                </button>
              </div>
            )}

            {processedServices.map(srv => {
              const isQuarantined = srv.cooldownUntil && new Date(srv.cooldownUntil) > new Date();
              const isExpanded = expandedServiceId === srv.id;
              const isSelected = selectedService?.id === srv.id;

              return (
                <div
                  key={srv.id}
                  className={`rounded-xl transition-all duration-200 border ${
                    isSelected
                      ? 'border-primary ring-1 ring-primary/50 bg-primary/5 shadow-sm'
                      : isExpanded
                      ? 'border-border bg-card shadow-md'
                      : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
                  } ${isQuarantined ? 'opacity-50 grayscale' : ''}`}
                >
                  <button
                    type="button"
                    role="option"
                    disabled={!!isQuarantined}
                    aria-selected={isSelected}
                    onClick={() => {
                      if (!isQuarantined) {
                        setExpandedServiceId(isExpanded ? null : srv.id);
                      }
                    }}
                    className={`w-full text-left p-4 flex items-center justify-between gap-3 ${isQuarantined ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        )}
                        <span className="font-bold text-foreground text-sm line-clamp-2">
                          {srv.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {srv.badge && (
                          <span className="text-[10px] bg-warning/10 text-warning-text px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                            {srv.badge}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 shrink-0">
                          <Clock className="w-3.5 h-3.5" /> {srv.speed}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <div>
                        <div className="font-black text-foreground tracking-tight tabular-nums font-mono text-base leading-none">
                          {formatPricePerUnit(srv.pricePerUnitRub)} ₽
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground tracking-wider mt-0.5">/ шт</div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && !isQuarantined && (
                    <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="pt-4 border-t border-border/50 space-y-4">
                        <div className="text-xs text-muted-foreground leading-relaxed prose prose-sm prose-invert max-w-none">
                          {srv.description ? (
                            <div dangerouslySetInnerHTML={{ __html: sanitizeServiceDescription(srv.description) }} />
                          ) : (
                            <p className="italic opacity-70">Детальное описание услуги отсутствует.</p>
                          )}
                        </div>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedService(srv);
                            setCurrentStep(3);
                          }}
                          className="w-full h-12 bg-primary text-primary-foreground font-black text-sm rounded-xl hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          Выбрать этот тариф <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {isQuarantined && (
                    <div className="px-4 pb-4">
                      <div className="text-[10px] font-semibold text-warning-text bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
                        ⏳ Временно недоступен (Колдаун)
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Step 3: Checkout Configuration ── */}
      {currentStep === 3 && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <OrderSummaryCard
            userBalanceCents={userBalanceCents}
            engine={engine}
          />
        </div>
      )}
    </div>
  );
}

function OrderGuideWidget() {
  return (
    <div className="mt-8 p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group">
      {/* Subtle Sky Blue Accent bar */}
      <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
      
      <div className="pl-2 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-foreground text-sm leading-tight flex items-center gap-1.5">
              Умный алгоритм SMMplan
              <span className="inline-flex h-2 w-2 rounded-full bg-success animate-pulse" />
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Наш ИИ-анализатор автоматически определит платформу по ссылке и предложит только совместимые и безопасные тарифы.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-border/60">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Гайд по ссылкам</span>
              <p className="text-xs text-foreground font-semibold">Какую ссылку указывать для тарифов?</p>
            </div>
            
            <Link
              href="/knowledge/how-to-order"
              className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-sm hover:shadow active:scale-95 whitespace-nowrap"
            >
              <span>Читать гайд</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
