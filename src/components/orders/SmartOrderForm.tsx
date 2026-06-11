'use client';

import React from 'react';
import { Clock, CheckCircle2, Info, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useOrderEngine } from '@/hooks/useOrderEngine';
import { IntelligencePlatform } from '@/services/analyzer/link-rules';

// Subcomponents import
import { NetworkSelector } from './sub/NetworkSelector';
import { CategorySelector } from './sub/CategorySelector';
import { LinkInputField } from './sub/LinkInputField';
import { OrderSummaryCard } from './sub/OrderSummaryCard';

function formatPricePerUnit(price: number): string {
  if (price === 0) return '0.00';
  let formatted: string;
  if (price < 0.01) {
    formatted = price.toFixed(6);
  } else if (price < 0.1) {
    formatted = price.toFixed(4);
  } else {
    formatted = price.toFixed(2);
  }
  
  if (formatted.includes('.')) {
    while (formatted.endsWith('0') && formatted.split('.')[1].length > 2) {
      formatted = formatted.slice(0, -1);
    }
  }
  return formatted;
}

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
  } = engine;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePlatformSelect = (pId: string, pName: any) => {
    engine.setNetworkId(pId);
    engine.setManualPlatform(pName);
    const netObj = unfilteredCatalog.find(n => n.id === pId);
    if (netObj && netObj.categories.length > 0) {
      engine.setCategoryId(netObj.categories[0].id);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Platform pills Selection ── */}
      <NetworkSelector
        platform={platform}
        manualPlatform={manualPlatform}
        networkId={engine.networkId}
        unfilteredCatalog={unfilteredCatalog}
        onSelect={handlePlatformSelect}
      />

      {/* ── Category tabs / mobile dropdown ── */}
      <CategorySelector
        categoryId={categoryId}
        setCategoryId={setCategoryId}
        availableCategories={engine.availableCategories}
      />

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left column: Link input and service selectors */}
        <div className="space-y-4">
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
          />

          {/* Desktop Service Selector */}
          <div className="hidden md:block space-y-2" role="listbox" aria-label="Список тарифов">
            {services.length === 0 && !isLoading && (
              categoryId ? (
                <div className="p-6 rounded-2xl border border-dashed border-border bg-card text-center space-y-3">
                  <div className="text-xl">📦</div>
                  <h4 className="font-bold text-sm text-foreground text-center">Синхронизация тарифов</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed text-center">
                    Наш ИИ-ассистент в данный момент обновляет тарифные сетки с провайдерами. Это займет около 2 минут.
                  </p>
                  <div className="flex justify-center">
                    <button 
                      onClick={() => engine.setCategoryId(categoryId)}
                      aria-label="Обновить сетку тарифов"
                      className="h-11 px-4 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg transition-all cursor-pointer"
                    >
                      Обновить сетку
                    </button>
                  </div>
                </div>
              ) : (
                <OrderGuideWidget />
              )
            )}
            {services.map(srv => {
              const isQuarantined = srv.cooldownUntil && new Date(srv.cooldownUntil) > new Date();
              return (
              <button
                key={srv.id}
                type="button"
                role="option"
                disabled={!!isQuarantined}
                aria-selected={selectedService?.id === srv.id}
                onClick={() => !isQuarantined && setSelectedService(selectedService?.id === srv.id ? null : srv)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                  selectedService?.id === srv.id
                    ? 'ring-2 ring-primary bg-primary/5 shadow-sm'
                    : 'ring-1 ring-border bg-card hover:ring-primary/50 hover:bg-muted hover:shadow-md hover:-translate-y-0.5 shadow-sm'
                } ${isQuarantined ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      {selectedService?.id === srv.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                      <span className="font-semibold text-foreground text-sm line-clamp-2">
                        {srv.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {srv.badge && (
                        <span className="text-[10px] bg-warning/10 text-warning-text px-1.5 py-0.5 rounded font-bold uppercase">
                          {srv.badge}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {srv.speed}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-foreground tracking-tight tabular-nums font-mono text-base">
                      {formatPricePerUnit(srv.pricePerUnitRub)} ₽
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground tracking-wider">/ шт</div>
                  </div>
                  {isQuarantined && (
                    <div className="mt-2 text-[10px] font-semibold text-warning-text bg-warning/10 border border-warning/20 rounded-lg px-2 py-1 w-max">
                      ⏳ Временно недоступен
                    </div>
                  )}
                </div>
              </button>
            )})}
          </div>

          {/* Mobile Service Selector */}
          <div className="block md:hidden space-y-3">
            <label htmlFor="service-select" className="block text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
              Тариф
            </label>
            {services.length === 0 && !isLoading ? (
              categoryId ? (
                <div className="p-6 rounded-2xl border border-dashed border-border bg-card text-center space-y-3">
                  <div className="text-xl">📦</div>
                  <h4 className="font-bold text-sm text-foreground text-center">Синхронизация тарифов</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed text-center">
                    Наш ИИ-ассистент в данный момент обновляет тарифные сетки с провайдерами. Это займет около 2 минут.
                  </p>
                  <div className="flex justify-center">
                    <button 
                      onClick={() => engine.setCategoryId(categoryId)}
                      aria-label="Обновить сетку тарифов"
                      className="h-11 px-4 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg transition-all cursor-pointer"
                    >
                      Обновить сетку
                    </button>
                  </div>
                </div>
              ) : (
                <OrderGuideWidget />
              )
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <select
                    id="service-select"
                    value={selectedService?.id || ''}
                    onChange={e => {
                      const srv = services.find(s => s.id === e.target.value);
                      setSelectedService(srv || null);
                    }}
                    className="w-full h-12 pl-4 pr-10 rounded-xl border border-border bg-card text-sm font-semibold text-foreground outline-none transition-all duration-200 appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="" className="text-muted-foreground bg-card">-- Выберите тариф --</option>
                    {services.map(srv => (
                      <option key={srv.id} value={srv.id} className="text-foreground bg-card">
                        {srv.name} — {formatPricePerUnit(srv.pricePerUnitRub)} ₽ / шт
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>

                {/* Mobile selected service preview */}
                {selectedService && (
                  <div className="p-4 rounded-xl ring-2 ring-primary bg-primary/5 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-bold text-foreground text-sm leading-tight">
                            {selectedService.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {selectedService.badge && (
                            <span className="text-[10px] bg-warning/10 text-warning-text px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                              {selectedService.badge}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 shrink-0">
                            <Clock className="w-3.5 h-3.5" /> {selectedService.speed}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-foreground tracking-tight tabular-nums font-mono text-base">
                          {formatPricePerUnit(selectedService.pricePerUnitRub)} ₽
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground tracking-wider">/ шт</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Checkout Summary Card */}
        <OrderSummaryCard
          userBalanceCents={userBalanceCents}
          engine={engine}
        />
      </div>
    </div>
  );
}

function OrderGuideWidget() {
  return (
    <div className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group">
      {/* Subtle Sky Blue Accent bar */}
      <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
      
      <div className="pl-2 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-foreground text-sm leading-tight flex items-center gap-1.5">
              Сначала вставьте ссылку
              <span className="inline-flex h-2 w-2 rounded-full bg-success animate-pulse" />
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Наш ИИ-анализатор автоматически определит платформу и адаптирует тарифную сетку под ваш заказ. Это убережет вас от сбоев и сэкономит бюджет!
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
