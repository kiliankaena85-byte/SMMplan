import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminPricingIntelligenceService } from '../pricing-intelligence.service';
import { GeminiClient } from '@/services/ai/gemini-client';

describe('AdminPricingIntelligenceService', () => {
  beforeEach(() => {
    vi.spyOn(GeminiClient, 'generateContent').mockResolvedValue(
      'Услуга имеет оптимальный баланс высокой маржинальности (+900%) и надежности поставщика.'
    );
  });

  it('correctly calculates procurement cost, markup multiplier and margin for standard service', async () => {
    const analysis = await AdminPricingIntelligenceService.analyzeServicePricing({
      name: 'Telegram: Подписчики Стандарт (Офферы РФ/СНГ с гарантией 30 дней)',
      retailUnitRub: 0.62,
      rateUsd: 0.65,
      isRefillEnabled: true,
      exchangeRateUSD: 95.0,
    });

    expect(analysis).toBeDefined();
    expect(analysis.procurementCostRub).toBeCloseTo(0.06175, 4);
    expect(analysis.retailUnitRub).toBe(0.62);
    expect(analysis.markupMultiplier).toBeCloseTo(10.0, 1);
    expect(analysis.marginPercent).toBeGreaterThanOrEqual(900);
    expect(analysis.riskScore).toBe(2);
    expect(analysis.riskCategory).toBe('НИЗКИЙ (Высокая стабильность)');
    expect(analysis.costAllocation.refillReservePercent).toBe(15);
    expect(analysis.recommendedBrackets.optimal.multiplier).toBe(10.0);
    expect(analysis.aiRationale).toContain('маржинальности');
  });

  it('correctly handles high-volume micro-services (views/reactions)', async () => {
    const analysis = await AdminPricingIntelligenceService.analyzeServicePricing({
      name: 'Telegram: Просмотры на пост',
      retailUnitRub: 0.02,
      rateUsd: 0.001, // 0.000095 ₽
      isRefillEnabled: false,
      exchangeRateUSD: 95.0,
    });

    expect(analysis.procurementCostRub).toBeLessThan(0.001);
    expect(analysis.marginPercent).toBeGreaterThan(10000);
    expect(analysis.markupMultiplier).toBeGreaterThan(100);
    expect(analysis.recommendedBrackets.optimal.multiplier).toBe(100.0);
  });
});
