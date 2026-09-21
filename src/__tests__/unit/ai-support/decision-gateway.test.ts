import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DecisionGatewayService } from '@/services/support/ai/decision-gateway.service';

describe('DecisionGatewayService (Tier 0 -> Tier 1 -> Tier 2 Cascade)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Tier 0 Explicit Human Request
  it('instantly escalates on explicit human operator triggers via Tier 0 Regex (<1ms)', async () => {
    const res = await DecisionGatewayService.evaluate('Пожалуйста, позовите живого человека или оператора');

    expect(res.source).toBe('TIER_0_REGEX');
    expect(res.escalation.shouldEscalate).toBe(true);
    expect(res.escalation.reason).toBe('EXPLICIT_HUMAN_REQUEST');
    expect(res.latencyMs).toBeLessThan(10);
  });

  // 2. Tier 0 Legal threats
  it('instantly escalates with HOSTILE sentiment on legal or police threats', async () => {
    const res = await DecisionGatewayService.evaluate('Я напишу заявление в полицию и роспотребнадзор о мошенничестве!');

    expect(res.source).toBe('TIER_0_REGEX');
    expect(res.escalation.shouldEscalate).toBe(true);
    expect(res.sentiment.level).toBe(3);
    expect(res.sentiment.label).toBe('HOSTILE');
  });

  // 3. Tier 0 Profanity / Caps Anger
  it('detects high frustration on aggressive profanity or CAPS lock', async () => {
    const res = await DecisionGatewayService.evaluate('ВЫ МОЙ ЗАКАЗ ВООБЩЕ СОБИРАЕТЕСЬ ДЕЛАТЬ ИЛИ ВЫ КИДАЛОВО');

    expect(res.source).toBe('TIER_0_REGEX');
    expect(res.sentiment.level).toBe(2);
    expect(res.sentiment.label).toBe('ANGRY');
    expect(res.escalation.shouldEscalate).toBe(true);
  });

  // 4. Tier 2 Fallback when Laya is unreachable
  it('gracefully falls back to Tier 2 heuristics when Laya microservice is offline', async () => {
    // Global fetch fails or returns error
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')));

    const res = await DecisionGatewayService.evaluate('У меня отписались 200 подписчиков в ВК, нужна докрутка по гарантии');

    expect(res.source).toBe('TIER_2_FALLBACK');
    expect(res.intent.category).toBe('drop_refill');
    expect(res.sentiment.label).toBe('CALM');
    expect(res.escalation.shouldEscalate).toBe(false);

    vi.unstubAllGlobals();
  });
});
