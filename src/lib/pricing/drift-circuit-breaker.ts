import { db } from '@/lib/db';
import { UPPER_SANITY_LIMIT_RUB } from '@/lib/financial-constants';

export interface DriftConfig {
  MAX_SINGLE_DRIFT_PCT: number;    // e.g. 200 (3x jump = block)
  MIN_REASONABLE_COST_RUB: number; // 0.01 RUB per 1k = micro-price alarm
  MAX_REASONABLE_COST_RUB: number; // 50,000 RUB per 1k = currency explosion alarm
}

export const DEFAULT_DRIFT_CONFIG: DriftConfig = {
  MAX_SINGLE_DRIFT_PCT: 200,
  MIN_REASONABLE_COST_RUB: 0.01,
  MAX_REASONABLE_COST_RUB: UPPER_SANITY_LIMIT_RUB
};

export class PriceDriftCircuitBreaker {
  /**
   * Validates a new cost against reasonable bounds and historical shadow price.
   * Returns: { ok: true } | { ok: false, reason, severity }
   */
  static async validate(
    providerId: string,
    externalId: string,
    newCostPer1kRub: number,
    config: DriftConfig = DEFAULT_DRIFT_CONFIG
  ): Promise<
    | { ok: true }
    | { ok: false; reason: string; severity: 'WARN' | 'BLOCK'; previousCost?: number }
  > {
    // 1. Hard lower bound check (catches micro-price glitches and 0 RUB errors)
    if (newCostPer1kRub < config.MIN_REASONABLE_COST_RUB) {
      return {
        ok: false,
        reason: `Себестоимость ${newCostPer1kRub} ₽/1k ниже минимально допустимого порога ${config.MIN_REASONABLE_COST_RUB} ₽/1k (аномалия микро-цены или сбой валюты)`,
        severity: 'BLOCK'
      };
    }

    // 2. Hard upper bound check (catches 95x currency explosion bugs)
    if (newCostPer1kRub > config.MAX_REASONABLE_COST_RUB) {
      return {
        ok: false,
        reason: `Себестоимость ${newCostPer1kRub} ₽/1k превышает максимальный лимит ${config.MAX_REASONABLE_COST_RUB} ₽/1k (вероятная ошибка валюты)`,
        severity: 'BLOCK'
      };
    }

    // 3. Drift check vs previous shadow record
    try {
      const historical = await db.shadowService.findFirst({
        where: { providerId, externalId },
        select: { rateRub: true }
      });

      if (historical?.rateRub && historical.rateRub > 0) {
        const driftPct = ((newCostPer1kRub - historical.rateRub) / historical.rateRub) * 100;
        const absDrift = Math.abs(driftPct);

        if (absDrift > config.MAX_SINGLE_DRIFT_PCT) {
          return {
            ok: false,
            reason: `Дрейф цены ${driftPct.toFixed(1)}% превышает допустимый порог (${historical.rateRub} ₽ → ${newCostPer1kRub} ₽)`,
            severity: absDrift > 500 ? 'BLOCK' : 'WARN',
            previousCost: historical.rateRub
          };
        }
      }
    } catch {
      // Non-blocking database check
    }

    return { ok: true };
  }
}
