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
  static async syncCBRExchangeRate(tenantId?: string): Promise<{ nominalRate: number; systemRate: number; updated: boolean }> {
    try {
      let usdRate: number | null = null;

      // 1. Try to contact the official Central Bank of Russia (CBR) API (XML Daily)
      try {
        const response = await fetch("https://www.cbr.ru/scripts/XML_daily.asp", {
          signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
          const xmlText = await response.text();
          // Extract USD Valute block: <Valute ID="R01235">
          const usdMatch = xmlText.match(/<Valute[^>]*ID="R01235"[^>]*>([\s\S]*?)<\/Valute>/i);
          if (usdMatch) {
            const valueMatch = usdMatch[1].match(/<Value>([\d,.]+)<\/Value>/i);
            if (valueMatch) {
              usdRate = parseFloat(valueMatch[1].replace(",", "."));
            }
          }
        }
      } catch (err: unknown) {
        console.warn("[CBRRateService] Official CBR XML API fetch failed, trying mirror:", (err instanceof Error ? err.message : String(err)));
      }

      // 2. Fallback to the CBR daily JSON mirror
      if (usdRate === null || isNaN(usdRate) || usdRate <= 0) {
        const response = await fetch(this.CBR_API_URL, {
          next: { revalidate: 3600 } // Cache for 1 hour to avoid CBR spam
        });
        
        if (!response.ok) {
          throw new Error(`CBR JSON API returned status ${response.status}`);
        }

        const data = await response.json();
        usdRate = data?.Valute?.USD?.Value;
      }

      if (typeof usdRate !== 'number' || isNaN(usdRate) || usdRate <= 0) {
        throw new Error('Invalid USD rate format from CBR APIs');
      }

      // [PB-003] Apply 3% spread to protect CFO margins during RUB volatility
      const systemRate = parseFloat((usdRate * this.SPREAD_MULTIPLIER).toFixed(2));

      // Update in DB with the spread-adjusted system rate
      await SettingsManager.setExchangeRateUSD(systemRate, tenantId);

      return { nominalRate: usdRate, systemRate, updated: true };
    } catch (error: unknown) {
      console.error("[CBRRateService] CBR sync failed:", (error instanceof Error ? error.message : String(error)));
      // Fallback to existing settings on failure
      const existingRate = await SettingsManager.getExchangeRateUSD(tenantId);
      return { nominalRate: existingRate, systemRate: existingRate, updated: false };
    }
  }
}

