import type { LayaDecisionResult, LayaIntent, LayaSentiment, LayaEscalation } from '@/types/ai-support';

export class DecisionGatewayService {
  private static readonly LAYA_ENDPOINT = process.env.LAYA_URL || 'http://localhost:8009/api/v1/decide';
  private static readonly LAYA_TIMEOUT_MS = 50; // 50ms hard limit

  /**
   * Evaluates incoming message through Tier 0 -> Tier 1 -> Tier 2 cascade.
   */
  public static async evaluate(userMessage: string): Promise<LayaDecisionResult> {
    const startMs = Date.now();
    const text = (userMessage || '').trim();
    const lower = text.toLowerCase();

    // =========================================================================
    // TIER 0: Детерминированный быстрый шлюз (Fast Lexical Heuristics, <0.5 ms)
    // =========================================================================

    // 1. Явный запрос оператора / человека
    const humanTriggers = [
      'оператор', 'человек', 'живой', 'менеджер', 'специалист', 'позовите',
      'соедините с оператором', 'переключите на человека', 'хватит бота',
    ];
    if (humanTriggers.some((t) => lower.includes(t))) {
      return {
        intent: { category: 'general_faq', confidence: 0.99 },
        sentiment: { level: 1, label: 'IMPATIENT', confidence: 0.95 },
        escalation: { shouldEscalate: true, probability: 1.0, reason: 'EXPLICIT_HUMAN_REQUEST' },
        source: 'TIER_0_REGEX',
        latencyMs: Date.now() - startMs,
      };
    }

    // 2. Юридические угрозы, полиция, досудебка, чарджбэк
    const legalTriggers = [
      'суд', 'полици', 'прокуратур', 'роспотребнадзор', 'досудебн', 'претензи',
      'чарджбэк', 'chargeback', 'мошенник', 'заявлени', 'статья', '159 ук',
    ];
    if (legalTriggers.some((t) => lower.includes(t))) {
      return {
        intent: { category: 'refund_complaint', confidence: 0.98 },
        sentiment: { level: 3, label: 'HOSTILE', confidence: 0.99 },
        escalation: { shouldEscalate: true, probability: 1.0, reason: 'LEGAL_OR_THREAT_TRIGGER' },
        source: 'TIER_0_REGEX',
        latencyMs: Date.now() - startMs,
      };
    }

    // 3. Жесткий мат и капслок (агрессия)
    const profanityTriggers = ['наеб', 'кидал', 'лохотрон', 'тварь', 'мраз', 'сука', 'пидор', 'нах'];
    const isCaps = text.length > 15 && text.replace(/[^А-ЯЁA-Z]/g, '').length / text.length > 0.6;
    const hasProfanity = profanityTriggers.some((t) => lower.includes(t));

    if (hasProfanity || isCaps) {
      return {
        intent: { category: 'refund_complaint', confidence: 0.95 },
        sentiment: { level: 2, label: 'ANGRY', confidence: 0.95 },
        escalation: { shouldEscalate: true, probability: 0.92, reason: 'ANGER_OR_PROFANITY' },
        source: 'TIER_0_REGEX',
        latencyMs: Date.now() - startMs,
      };
    }

    // 4. Вопрос о причине отмены заказа (почему отмена, заказ отменен, отменился, canceled)
    // Политикой сервиса строго запрещено гадать или упоминать сторонние платформы/поставщиков:
    // задача немедленно направляется оператору на ручную проверку (модерация, приватность, баланс).
    const cancellationTriggers = [
      'почему отмен', 'причин отмен', 'зачем отмен', 'почему отменил', 'статус отменен',
      'заказ отменили', 'заказ отменен', 'почему отмена', 'причина отмены', 'отмена заказа', 'отменился заказ',
    ];
    if (cancellationTriggers.some((t) => lower.includes(t))) {
      return {
        intent: { category: 'order_status', confidence: 0.98 },
        sentiment: { level: 1, label: 'IMPATIENT', confidence: 0.9 },
        escalation: { shouldEscalate: true, probability: 1.0, reason: 'ORDER_CANCELED_OPERATOR_REVIEW' },
        source: 'TIER_0_REGEX',
        latencyMs: Date.now() - startMs,
      };
    }

    // =========================================================================
    // TIER 1: Локальный микросервис Laya ONNX (:8009)
    // =========================================================================
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.LAYA_TIMEOUT_MS);

      const res = await fetch(this.LAYA_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          intent: data.intent,
          sentiment: data.sentiment,
          escalation: data.escalation,
          source: 'TIER_1_LAYA',
          latencyMs: Date.now() - startMs,
        };
      }
    } catch {
      // Игнорируем сетевой сбой Laya и переходим к Tier 2 Fallback
    }

    // =========================================================================
    // TIER 2: Эвристический Fallback (Fail-Safe)
    // =========================================================================
    return this.calculateFallback(lower, Date.now() - startMs);
  }

  private static calculateFallback(lower: string, latencyMs: number): LayaDecisionResult {
    let category: LayaIntent['category'] = 'general_faq';
    let shouldEscalate = false;
    let probability = 0.1;
    let sentimentLevel: LayaSentiment['level'] = 0;
    let sentimentLabel: LayaSentiment['label'] = 'CALM';

    if (lower.includes('списал') || lower.includes('отпис') || lower.includes('дроп') || lower.includes('собачк')) {
      category = 'drop_refill';
    } else if (lower.includes('отмен')) {
      category = 'order_status';
      shouldEscalate = true;
      probability = 1.0;
      sentimentLevel = 1;
      sentimentLabel = 'IMPATIENT';
    } else if (lower.includes('где') || lower.includes('статус') || lower.includes('не нача') || lower.includes('завис')) {
      category = 'order_status';
    } else if (lower.includes('оплат') || lower.includes('пополн') || lower.includes('баланс') || lower.includes('деньг')) {
      category = 'payment_billing';
    } else if (lower.includes('ссылк') || lower.includes('ошибк') || lower.includes('закрыт') || lower.includes('приват')) {
      category = 'link_technical';
    } else if (lower.includes('вернит') || lower.includes('возврат') || lower.includes('обман')) {
      category = 'refund_complaint';
      shouldEscalate = true;
      probability = 0.85;
      sentimentLevel = 2;
      sentimentLabel = 'ANGRY';
    }

    let escalationReason: string | undefined;
    if (shouldEscalate) {
      if (lower.includes('отмен')) {
        escalationReason = 'ORDER_CANCELED_OPERATOR_REVIEW';
      } else {
        escalationReason = 'FALLBACK_REFUND_ESCALATION';
      }
    }

    return {
      intent: { category, confidence: 0.85 },
      sentiment: { level: sentimentLevel, label: sentimentLabel, confidence: 0.85 },
      escalation: { shouldEscalate, probability, reason: escalationReason },
      source: 'TIER_2_FALLBACK',
      latencyMs,
    };
  }
}
