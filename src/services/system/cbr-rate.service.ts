import { SettingsManager } from "@/lib/settings";

/**
 * Service for fetching and syncing exchange rates from the Central Bank of Russia (CBR).
 */
export class CBRRateService {
  private static readonly CBR_API_URL = "https://www.cbr-xml-daily.ru/daily_json.js";
  private static readonly SPREAD_MULTIPLIER = 1.03; // +3% Margin Safety Net (PB-003)

  /**
   * Fetches the latest USD exchange rate from CBR, applies a 3% safety spread, 
   * and updates SystemSettings. If network fails, leaves the old rate.
   * 
   * @returns The combined payload: nominal rate, system rate (with spread), and update status.
   */
  static async syncCBRExchangeRate(): Promise<{ nominalRate: number; systemRate: number; updated: boolean }> {
    try {
      const response = await fetch(this.CBR_API_URL, {
        next: { revalidate: 3600 } // Cache for 1 hour to avoid CBR spam
      });
      
      if (!response.ok) {
        throw new Error(`CBR API returned status ${response.status}`);
      }

      const data = await response.json();
      const usdRate = data?.Valute?.USD?.Value;

      if (typeof usdRate !== 'number' || usdRate <= 0) {
        throw new Error('Invalid USD rate format from CBR');
      }

      // [PB-003] Apply 3% spread to protect CFO margins during RUB volatility
      const systemRate = parseFloat((usdRate * this.SPREAD_MULTIPLIER).toFixed(2));

      // Update in DB with the spread-adjusted system rate
      await SettingsManager.setExchangeRateUSD(systemRate);

      return { nominalRate: usdRate, systemRate, updated: true };
    } catch (error: any) {
      console.error("[CBRRateService] CBR sync failed:", error.message);
      // Fallback to existing settings on failure
      const existingRate = await SettingsManager.getExchangeRateUSD();
      return { nominalRate: existingRate, systemRate: existingRate, updated: false };
    }
  }
}

export const cbrRateService = new CBRRateService();
