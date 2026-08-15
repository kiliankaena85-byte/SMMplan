import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarketIntelligenceService } from '../market-intelligence.service';
import { GeminiClient } from '@/services/ai/gemini-client';

describe('MarketIntelligenceService', () => {
  beforeEach(() => {
    vi.spyOn(GeminiClient, 'generateContent').mockResolvedValue(
      'Анализ рынка подтверждает сильное преимущество над PrimeLike.'
    );
  });

  it('correctly compares service price with PrimeLike and calculates market metrics', async () => {
    const comparison = await MarketIntelligenceService.compareServiceWithMarket(
      'Telegram: Подписчики Стандарт (Офферы РФ/СНГ с гарантией 30 дней)',
      0.62
    );

    expect(comparison).toBeDefined();
    expect(comparison.ourPriceRub).toBe(0.62);
    expect(comparison.primeLikePriceRub).toBe(0.75); // PrimeLike benchmark
    expect(comparison.primeLikeDeltaPercent).toBeLessThan(0); // We are cheaper than PrimeLike
    expect(comparison.marketAverageRub).toBeGreaterThan(0.60);
    expect(comparison.competitors.length).toBeGreaterThanOrEqual(3);
    
    const primeLikeComp = comparison.competitors.find((c) => c.name === 'PrimeLike');
    expect(primeLikeComp).toBeDefined();
    expect(primeLikeComp?.priceRub).toBe(0.75);
  });

  it('allows adding and removing custom competitors dynamically', () => {
    const custom = MarketIntelligenceService.addCustomCompetitor({
      name: 'CustomPanelX',
      slug: 'custompanelx',
      url: 'https://custompanel.ru',
      isActive: true,
      pricingMatrix: {
        'tg_subscribers_standard': 0.80,
      },
    });

    expect(custom.id).toContain('custom_');
    const all = MarketIntelligenceService.getAllCompetitors();
    expect(all.some((c) => c.name === 'CustomPanelX')).toBe(true);

    const removed = MarketIntelligenceService.removeCustomCompetitor(custom.id);
    expect(removed).toBe(true);
    expect(MarketIntelligenceService.getAllCompetitors().some((c) => c.id === custom.id)).toBe(false);
  });
});
