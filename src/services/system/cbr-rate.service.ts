import { SettingsManager } from "@/lib/settings";

export interface LiveCrossRates {
  usdToRub: number;
  eurToUsd: number;
  uahToUsd: number;
  kztToUsd: number;
  updatedAt: Date;
}

/**
 * Service for fetching and syncing exchange rates from the Central Bank of Russia (CBR).
 */
export class CBRRateService {
  private static readonly CBR_API_URL = "https://www.cbr-xml-daily.ru/daily_json.js";
  private static readonly SPREAD_MULTIPLIER = 1.03; // +3% Margin Safety Net (PB-003)

  /**
   * Fetches the latest USD, EUR, UAH, KZT exchange rates from CBR, applies a 3% safety spread, 
   * and updates SystemSettings & Redis FX cache. If network fails, leaves the old rate.
   * 
   * @returns The combined payload: nominal rate, system rate (with spread), and update status.
   */
  static async syncCBRExchangeRate(tenantId?: string): Promise<{
    nominalRate: number;
    systemRate: number;
    crossRates: LiveCrossRates;
    updated: boolean;
  }> {
    try {
      let usdRate: number | null = null;
      let eurRate: number | null = null;
      let uahRate: number | null = null;
      let kztRate: number | null = null;

      // 1. Fetch CBR daily JSON mirror
      try {
        const response = await fetch(this.CBR_API_URL, {
          signal: AbortSignal.timeout(6000),
          next: { revalidate: 3600 }
        });
        
        if (response.ok) {
          const data = await response.json();
          usdRate = data?.Valute?.USD?.Value;
          eurRate = data?.Valute?.EUR?.Value;
          const uahNominal = data?.Valute?.UAH?.Nominal || 10;
          const uahVal = data?.Valute?.UAH?.Value;
          if (uahVal) uahRate = uahVal / uahNominal;

          const kztNominal = data?.Valute?.KZT?.Nominal || 100;
          const kztVal = data?.Valute?.KZT?.Value;
          if (kztVal) kztRate = kztVal / kztNominal;
        }
      } catch (err: unknown) {
        console.warn("[CBRRateService] CBR JSON fetch error:", (err instanceof Error ? err.message : String(err)));
      }

      if (typeof usdRate !== 'number' || isNaN(usdRate) || usdRate <= 0) {
        // Fallback to existing settings on failure
        const existingRate = await SettingsManager.getExchangeRateUSD(tenantId);
        const fallbackCrossRates: LiveCrossRates = {
          usdToRub: existingRate || 95.0,
          eurToUsd: 1.08,
          uahToUsd: 0.027,
          kztToUsd: 0.0023,
          updatedAt: new Date()
        };
        return { nominalRate: existingRate, systemRate: existingRate, crossRates: fallbackCrossRates, updated: false };
      }

      // [PB-003] Apply 3% spread to protect CFO margins during RUB volatility
      const systemRate = parseFloat((usdRate * this.SPREAD_MULTIPLIER).toFixed(2));

      // Calculate USD-relative cross rates
      const eurToUsd = (eurRate && usdRate) ? parseFloat((eurRate / usdRate).toFixed(4)) : 1.08;
      const uahToUsd = (uahRate && usdRate) ? parseFloat((uahRate / usdRate).toFixed(6)) : 0.027;
      const kztToUsd = (kztRate && usdRate) ? parseFloat((kztRate / usdRate).toFixed(7)) : 0.0023;

      const crossRates: LiveCrossRates = {
        usdToRub: systemRate,
        eurToUsd,
        uahToUsd,
        kztToUsd,
        updatedAt: new Date()
      };

      // Cache cross-rates in Redis if available
      try {
        const { redis } = await import('@/lib/redis');
        await redis.set('fx:cross_rates', JSON.stringify(crossRates), 'EX', 86400);
      } catch {
        // Non-blocking cache update
      }

      // Update in DB with the spread-adjusted system rate
      await SettingsManager.setExchangeRateUSD(systemRate, tenantId);

      return { nominalRate: usdRate, systemRate, crossRates, updated: true };
    } catch (error: unknown) {
      console.error("[CBRRateService] CBR sync failed:", (error instanceof Error ? error.message : String(error)));
      const existingRate = await SettingsManager.getExchangeRateUSD(tenantId);
      const fallbackCrossRates: LiveCrossRates = {
        usdToRub: existingRate || 95.0,
        eurToUsd: 1.08,
        uahToUsd: 0.027,
        kztToUsd: 0.0023,
        updatedAt: new Date()
      };
      return { nominalRate: existingRate, systemRate: existingRate, crossRates: fallbackCrossRates, updated: false };
    }
  }

  /**
   * Retrieves cached live cross rates or falls back to system settings defaults.
   */
  static async getLiveCrossRates(tenantId?: string): Promise<LiveCrossRates> {
    try {
      const { redis } = await import('@/lib/redis');
      const cached = await redis.get('fx:cross_rates');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.updatedAt = new Date(parsed.updatedAt);
        return parsed;
      }
    } catch {
      // Non-blocking redis read
    }

    const usdRate = await SettingsManager.getExchangeRateUSD(tenantId);
    if (!usdRate || usdRate <= 0 || !Number.isFinite(usdRate)) {
      throw new Error('INVALID_USD_RATE: Exchange rate USD is not configured in SystemSettings');
    }

    return {
      usdToRub: usdRate,
      eurToUsd: 1.08,
      uahToUsd: 0.027,
      kztToUsd: 0.0023,
      updatedAt: new Date()
    };
  }
}

