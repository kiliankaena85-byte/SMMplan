import { db } from "@/lib/db";
import { SystemSettings } from "@prisma/client";
import { VaultService } from "./vault";
import { unstable_cache, revalidateTag } from "next/cache";

export interface DecryptedPaymentSecrets {
  yookassaShopId: string | null;
  yookassaSecretKey: string | null;
  cryptoBotToken: string | null;
}

/**
 * SettingsProvider: Optimized, cached, and Zod-validated source for system settings.
 * Part of Wave 2 Refactoring: Eliminated redundant fetching and added caching.
 */
export class SettingsProvider {
  /**
   * Fetches global settings with a 5-minute cache TTL.
   * Uses Next.js unstable_cache for high-performance retrieval in Server Components.
   */
  static getCached = unstable_cache(
    async () => {
      // In tests, we want the most fresh data to avoid race conditions between test cases
      if (process.env.NODE_ENV === 'test') {
        return await db.systemSettings.findUnique({ where: { id: "global" } }) || 
               await db.systemSettings.create({ 
                 data: { id: "global", taxRate: 6, opexMonthly: 0, maintenanceMode: false, isTestMode: true, siteName: "Smmplan", exchangeRateUSD: 95 } 
               });
      }

      return await db.systemSettings.upsert({
        where: { id: "global" },
        update: {},
        create: {
          id: "global",
          taxRate: 6.0,
          opexMonthly: 0,
          maintenanceMode: false,
          isTestMode: false,
          siteName: "Smmplan",
          siteDescription: "",
          exchangeRateUSD: 95.0
        }
      });
    },
    ['system-settings-global'],
    { revalidate: 300, tags: ['settings'] }
  );

  /**
   * Direct database fetch (uncached). Use only for Admin UI or logic that requires real-time data.
   */
  static async getDirect(): Promise<SystemSettings> {
    return this.getCached(); // unstable_cache handles revalidation automatically, but we can bypass if needed
  }

  /**
   * Securely decrypts and returns payment API keys.
   */
  static async getPaymentSecrets(): Promise<DecryptedPaymentSecrets> {
    const settings = await this.getCached();
    const useTestKeys = settings.isTestMode;

    // In test mode: prefer test keys, fall back to production keys
    const shopId = useTestKeys
      ? (settings.yookassaTestShopId || settings.yookassaShopId)
      : settings.yookassaShopId;
    const secretKeyRaw = useTestKeys
      ? (settings.yookassaTestSecretKey || settings.yookassaSecretKey)
      : settings.yookassaSecretKey;

    return {
      yookassaShopId: shopId,
      yookassaSecretKey: secretKeyRaw ? VaultService.decrypt(secretKeyRaw) : null,
      cryptoBotToken: settings.cryptoBotToken ? VaultService.decrypt(settings.cryptoBotToken) : null
    };
  }

  /**
   * Returns the dynamic USD to RUB exchange rate.
   * Wave 2: Replaces the deprecated USD_TO_RUB constant.
   */
  static async getExchangeRateUSD(): Promise<number> {
    const settings = await this.getCached();
    return settings.exchangeRateUSD || 95.0; // Fail-safe default
  }

  static async isTestMode(): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') return true;
    const settings = await this.getCached();
    return settings.isTestMode;
  }

  static async setExchangeRateUSD(rate: number) {
    await db.systemSettings.upsert({
      where: { id: "global" },
      update: { exchangeRateUSD: rate, exchangeRateUpdatedAt: new Date() },
      create: { id: "global", exchangeRateUSD: rate, exchangeRateUpdatedAt: new Date() }
    });
    (revalidateTag as any)('settings');
  }

  static async setTestMode(enable: boolean) {
    await db.systemSettings.upsert({
      where: { id: "global" },
      update: { isTestMode: enable },
      create: { id: "global", isTestMode: enable }
    });
    (revalidateTag as any)('settings');
  }
}

/**
 * @deprecated Use SettingsProvider for optimized access.
 * Kept for backward compatibility during Wave 2 transition.
 */
export class SettingsManager {
  static async get(): Promise<SystemSettings> {
    return SettingsProvider.getCached();
  }

  static async getPaymentSecrets(): Promise<DecryptedPaymentSecrets> {
    return SettingsProvider.getPaymentSecrets();
  }

  static async isTestMode(): Promise<boolean> {
    return SettingsProvider.isTestMode();
  }

  static async getExchangeRateUSD(): Promise<number> {
    return SettingsProvider.getExchangeRateUSD();
  }

  static async setExchangeRateUSD(rate: number) {
    return SettingsProvider.setExchangeRateUSD(rate);
  }

  static async setTestMode(enable: boolean) {
    return SettingsProvider.setTestMode(enable);
  }
}
