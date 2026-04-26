import { SettingsManager } from "@/lib/settings";

/**
 * Service for fetching and syncing exchange rates from the Central Bank of Russia (CBR).
 */
export class CBRRateService {
  private static readonly CBR_API_URL = "https://www.cbr-xml-daily.ru/daily_json.js";

  /**
   * Fetches the latest USD exchange rate from CBR and updates SystemSettings.
   * If network fails, leaves the old rate.
   * 
   * @returns The updated or existing exchange rate.
   */
  static async syncCBRExchangeRate(): Promise<{ rate: number; updated: boolean }> {
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

      // Update in DB
      await SettingsManager.setExchangeRateUSD(usdRate);

      return { rate: usdRate, updated: true };
    } catch (error: any) {
      console.error("[CBRRateService] CBR sync failed:", error.message);
      // Fallback to existing settings on failure
      const existingRate = await SettingsManager.getExchangeRateUSD();
      return { rate: existingRate, updated: false };
    }
  }
}

export const cbrRateService = new CBRRateService();
