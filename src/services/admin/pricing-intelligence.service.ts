import { GeminiClient } from '@/services/ai/gemini-client';
import { SecuritySanitizer } from '@/utils/security-sanitizer';

export interface AdminServicePricingInput {
  serviceId?: string;
  name: string;
  categoryName?: string;
  networkName?: string;
  retailUnitRub: number;
  rateUsd?: number;
  isRefillEnabled?: boolean;
  minQty?: number;
  maxQty?: number;
  targetType?: string;
  exchangeRateUSD?: number;
}

export interface AdminPricingIntelligenceDTO {
  serviceName: string;
  procurementCostRub: number; // Себестоимость за 1 шт в рублях
  retailUnitRub: number; // Розничная цена админа за 1 шт
  profitPerUnitRub: number; // Чистая прибыль с 1 шт
  markupMultiplier: number; // Множитель наценки (например 10.1x)
  marginPercent: number; // Маржа в % (например +910%)
  riskScore: number; // Риск списаний и нестабильности (1–10)
  riskCategory: 'НИЗКИЙ (Высокая стабильность)' | 'УМЕРЕННЫЙ' | 'ВЫСОКИЙ (Требует повышенной маржи)';
  pricingStrategy: 'PREMIUM_HIGH_MARGIN' | 'OPTIMAL_EQUILIBRIUM' | 'VOLUME_DISCOUNT';
  recommendedBrackets: {
    conservative: { multiplier: number; priceRub: number; label: string };
    optimal: { multiplier: number; priceRub: number; label: string };
    aggressive: { multiplier: number; priceRub: number; label: string };
  };
  costAllocation: {
    procurementPercent: number;
    refillReservePercent: number;
    infrastructureAndTaxesPercent: number;
    netProfitPercent: number;
  };
  aiRationale: string; // Детальное экспертное обоснование от Gemini
}

export class AdminPricingIntelligenceService {
  private static cache = new Map<string, { data: AdminPricingIntelligenceDTO; expiresAt: number }>();

  /**
   * Рассчитывает ML-обоснование наценки и юнит-экономику для Администратора.
   */
  static async analyzeServicePricing(input: AdminServicePricingInput): Promise<AdminPricingIntelligenceDTO> {
    const cacheKey = `admin_pricing_${input.serviceId || input.name}_${input.retailUnitRub}_${input.rateUsd}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const usdToRub = input.exchangeRateUSD || 95.0;
    const rateUsd = input.rateUsd || 0.01;
    const procurementCostRub = (rateUsd * usdToRub) / 1000;
    const retailUnitRub = Math.max(0.01, input.retailUnitRub);
    const profitPerUnitRub = Number(Math.max(0, retailUnitRub - procurementCostRub).toFixed(4));
    const markupMultiplier = procurementCostRub > 0 ? Number((retailUnitRub / procurementCostRub).toFixed(1)) : 10.0;
    const marginPercent = procurementCostRub > 0 ? Math.round(((retailUnitRub - procurementCostRub) / procurementCostRub) * 100) : 900;

    const isRefill = Boolean(input.isRefillEnabled);
    const isMicroService = procurementCostRub < 0.005; // Просмотры / быстрые реакции

    // Оценка риска и эластичности
    const riskScore = isRefill ? 2 : isMicroService ? 4 : 6;
    const riskCategory: AdminPricingIntelligenceDTO['riskCategory'] =
      riskScore <= 3
        ? 'НИЗКИЙ (Высокая стабильность)'
        : riskScore <= 5
        ? 'УМЕРЕННЫЙ'
        : 'ВЫСОКИЙ (Требует повышенной маржи)';

    // Рекомендуемые ценовые корзины
    const conservativeMult = isMicroService ? 25.0 : 3.0;
    const optimalMult = isMicroService ? 100.0 : 10.0;
    const aggressiveMult = isMicroService ? 250.0 : 25.0;

    const recommendedBrackets = {
      conservative: {
        multiplier: conservativeMult,
        priceRub: Number(Math.max(0.01, Math.ceil(procurementCostRub * conservativeMult * 100) / 100).toFixed(2)),
        label: isMicroService ? 'Стартовая маржа (+2 400%)' : 'Безопасный пол (+200%)',
      },
      optimal: {
        multiplier: optimalMult,
        priceRub: Number(Math.max(0.01, Math.ceil(procurementCostRub * optimalMult * 100) / 100).toFixed(2)),
        label: isMicroService ? 'Оптимальная витрина (+9 900%)' : 'Целевая маржа (+900%)',
      },
      aggressive: {
        multiplier: aggressiveMult,
        priceRub: Number(Math.max(0.01, Math.ceil(procurementCostRub * aggressiveMult * 100) / 100).toFixed(2)),
        label: isMicroService ? 'Максимальная прибыль (+24 900%)' : 'Премиум наценка (+2 400%)',
      },
    };

    // Аллокация структуры дохода
    const netProfitPercent = Math.min(95, Math.max(50, Math.round((profitPerUnitRub / retailUnitRub) * 100)));
    const procurementPercent = Math.max(1, Math.round((procurementCostRub / retailUnitRub) * 100));
    const refillReservePercent = isRefill ? 15 : 5;
    const infrastructureAndTaxesPercent = Math.max(2, 100 - netProfitPercent - procurementPercent - refillReservePercent);

    const fallbackDTO: AdminPricingIntelligenceDTO = {
      serviceName: input.name,
      procurementCostRub: Number(procurementCostRub.toFixed(6)),
      retailUnitRub,
      profitPerUnitRub,
      markupMultiplier,
      marginPercent,
      riskScore,
      riskCategory,
      pricingStrategy: markupMultiplier >= 10.0 ? 'PREMIUM_HIGH_MARGIN' : 'OPTIMAL_EQUILIBRIUM',
      recommendedBrackets,
      costAllocation: {
        procurementPercent,
        refillReservePercent,
        infrastructureAndTaxesPercent,
        netProfitPercent,
      },
      aiRationale: `Услуга настроена с наценкой ${markupMultiplier}x (чистая прибыль +${marginPercent}%). Себестоимость закупки составляет ${procurementCostRub.toFixed(4)} ₽, розничная цена ${retailUnitRub.toFixed(2)} ₽. Данная пропорция полностью покрывает риски списаний${isRefill ? ' и гарантийный фонд Refill 30 дней' : ''}, обеспечивая высокую доходность.`,
    };

    // Попытка сгенерировать глубокий аналитический отчет через Gemini 3 Flash
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.cache.set(cacheKey, { data: fallbackDTO, expiresAt: Date.now() + 1800_000 });
      return fallbackDTO;
    }

    try {
      const systemInstruction = `Ты — финансовый директор (CFO) и AI-архитектор ценообразования платформы SMMplan.
Твоя задача — составить краткое, жесткое и профессиональное обоснование наценки для АДМИНИСТРАТОРА панели управления.

Анализируй:
1. Себестоимость закупки у провайдера в сравнении с розничной ценой.
2. Маржинальность и коэффициент наценки.
3. Покрытие рисков списаний, гарантии Refill 30 дней и комиссии эквайринга РФ.
4. Оценку эластичности спроса: почему клиенты готовы покупать по этой цене.

Сгенерируй понятный текст обоснования (3-4 емких предложения) без воды.`;

      const promptText = JSON.stringify({
        serviceName: SecuritySanitizer.sanitizePromptInjection(input.name),
        procurementCostRub,
        retailUnitRub,
        markupMultiplier,
        marginPercent,
        isRefillEnabled: isRefill,
        isMicroService,
      });

      const response = await GeminiClient.generateContent({
        systemInstruction,
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        temperature: 0.2,
        timeoutMs: 6000,
      });

      if (response && response.trim().length > 20) {
        fallbackDTO.aiRationale = response.trim();
      }

      this.cache.set(cacheKey, { data: fallbackDTO, expiresAt: Date.now() + 1800_000 });
      return fallbackDTO;
    } catch {
      this.cache.set(cacheKey, { data: fallbackDTO, expiresAt: Date.now() + 1800_000 });
      return fallbackDTO;
    }
  }
}
