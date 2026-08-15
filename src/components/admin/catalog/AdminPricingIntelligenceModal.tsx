'use client';

import React, { useState, useEffect } from 'react';
import { getAdminServicePricingIntelligence } from '@/actions/admin/pricing-intelligence';
import type { AdminPricingIntelligenceDTO } from '@/services/admin/pricing-intelligence.service';
import { Button } from '@/components/ui/button';

interface AdminPricingIntelligenceModalProps {
  serviceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminPricingIntelligenceModal({
  serviceId,
  isOpen,
  onClose,
}: AdminPricingIntelligenceModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdminPricingIntelligenceDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && serviceId) {
      setLoading(true);
      setError(null);
      getAdminServicePricingIntelligence(serviceId)
        .then((res) => {
          setData(res);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки ML-аналитики');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, serviceId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
              🧠
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">ML Обоснование Наценки</h2>
              <p className="text-xs text-muted-foreground">Финансовый аудит и юнит-экономика услуги</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground animate-pulse">Анализ финансовых потоков и рисков...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {!loading && data && (
            <>
              {/* Service Title */}
              <div>
                <h3 className="font-semibold text-foreground text-base">{data.serviceName}</h3>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50">
                  <span className="text-xs text-muted-foreground block">Закупка ($ $\to$ ₽)</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {data.procurementCostRub.toFixed(4)} ₽
                  </span>
                  <span className="text-[10px] text-muted-foreground/80">за 1 единицу</span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50">
                  <span className="text-xs text-muted-foreground block">Розничная цена</span>
                  <span className="text-sm font-bold text-primary mt-0.5 block">
                    {data.retailUnitRub.toFixed(2)} ₽
                  </span>
                  <span className="text-[10px] text-muted-foreground/80">на витрине</span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50">
                  <span className="text-xs text-muted-foreground block">Множитель</span>
                  <span className="text-sm font-bold text-emerald-500 mt-0.5 block">
                    {data.markupMultiplier}x
                  </span>
                  <span className="text-[10px] text-emerald-600/80">наценка на себестоимость</span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50">
                  <span className="text-xs text-muted-foreground block">Чистая маржа</span>
                  <span className="text-sm font-bold text-emerald-500 mt-0.5 block">
                    +{data.marginPercent.toLocaleString('ru-RU')}%
                  </span>
                  <span className="text-[10px] text-emerald-600/80">Gross Margin</span>
                </div>
              </div>

              {/* Income Allocation Breakdown */}
              <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>Структура распределения выручки:</span>
                  <span className="text-emerald-500 font-bold">Чистая прибыль: {data.costAllocation.netProfitPercent}%</span>
                </div>
                
                {/* Progress bar */}
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${data.costAllocation.netProfitPercent}%` }}
                    className="bg-emerald-500"
                    title={`Чистая прибыль: ${data.costAllocation.netProfitPercent}%`}
                  />
                  <div
                    style={{ width: `${data.costAllocation.refillReservePercent}%` }}
                    className="bg-sky-500"
                    title={`Резерв Refill: ${data.costAllocation.refillReservePercent}%`}
                  />
                  <div
                    style={{ width: `${data.costAllocation.infrastructureAndTaxesPercent}%` }}
                    className="bg-amber-500"
                    title={`Инфраструктура/Налоги: ${data.costAllocation.infrastructureAndTaxesPercent}%`}
                  />
                  <div
                    style={{ width: `${data.costAllocation.procurementPercent}%` }}
                    className="bg-rose-500"
                    title={`Закупка: ${data.costAllocation.procurementPercent}%`}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Прибыль: {data.costAllocation.netProfitPercent}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                    <span>Refill фонд: {data.costAllocation.refillReservePercent}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span>54-ФЗ / Серверы: {data.costAllocation.infrastructureAndTaxesPercent}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    <span>Закупка: {data.costAllocation.procurementPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Recommended Pricing Brackets */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Рекомендуемые ценовые корзины ML:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl border border-border/80 bg-card/60">
                    <span className="text-[11px] text-muted-foreground block">{data.recommendedBrackets.conservative.label}</span>
                    <span className="text-sm font-bold text-foreground">{data.recommendedBrackets.conservative.priceRub.toFixed(2)} ₽</span>
                    <span className="text-[10px] text-muted-foreground block">({data.recommendedBrackets.conservative.multiplier}x закупка)</span>
                  </div>

                  <div className="p-3 rounded-xl border border-primary/40 bg-primary/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-primary font-medium">{data.recommendedBrackets.optimal.label}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">Оптимум</span>
                    </div>
                    <span className="text-sm font-bold text-primary block mt-0.5">{data.recommendedBrackets.optimal.priceRub.toFixed(2)} ₽</span>
                    <span className="text-[10px] text-muted-foreground block">({data.recommendedBrackets.optimal.multiplier}x закупка)</span>
                  </div>

                  <div className="p-3 rounded-xl border border-border/80 bg-card/60">
                    <span className="text-[11px] text-muted-foreground block">{data.recommendedBrackets.aggressive.label}</span>
                    <span className="text-sm font-bold text-foreground">{data.recommendedBrackets.aggressive.priceRub.toFixed(2)} ₽</span>
                    <span className="text-[10px] text-muted-foreground block">({data.recommendedBrackets.aggressive.multiplier}x закупка)</span>
                  </div>
                </div>
              </div>

              {/* AI Strategic Rationale */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-primary text-sm font-bold">✨ ML/AI Финансовое Заключение</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Риск: {data.riskCategory}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-foreground/90">
                  {data.aiRationale}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border flex justify-end">
          <Button intent="outline" size="sm" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}
