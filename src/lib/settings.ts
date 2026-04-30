import { db } from "@/lib/db";
import { SystemSettings } from "@prisma/client";
import { VaultService } from "./vault";

export interface DecryptedPaymentSecrets {
  yookassaShopId: string | null;
  yookassaSecretKey: string | null;
  cryptoBotToken: string | null;
}

/**
 * Controller to manage and fetch global System Settings (Singletons).
 */
export class SettingsManager {
  /**
   * Fetches the global settings. If they do not exist, creates the default singleton record.
   */
  static async get(): Promise<SystemSettings> {
    let settings = await db.systemSettings.findUnique({
      where: { id: "global" }
    });

    if (!settings) {
       settings = await db.systemSettings.create({
         data: {
           id: "global",
           taxRate: 6.0,
           opexMonthly: 0,
           maintenanceMode: false,
           isTestMode: false,
           siteName: "Smmplan",
           siteDescription: "",
           exchangeRateUSD: 90.0
         }
       });
    }

    return settings;
  }

  /**
   * Fetches the DB settings and securely decrypts the payment API keys.
   */
  static async getPaymentSecrets(): Promise<DecryptedPaymentSecrets> {
     const settings = await this.get();
     return {
       yookassaShopId: settings.yookassaShopId, // Public ID, unencrypted
       yookassaSecretKey: settings.yookassaSecretKey ? VaultService.decrypt(settings.yookassaSecretKey) : null,
       cryptoBotToken: settings.cryptoBotToken ? VaultService.decrypt(settings.cryptoBotToken) : null
     };
  }

  static async isTestMode(): Promise<boolean> {
     const settings = await this.get();
     return settings.isTestMode;
  }

  static async setTestMode(enabled: boolean): Promise<SystemSettings> {
     return await db.systemSettings.update({
        where: { id: "global" },
        data: { isTestMode: enabled }
     });
  }

  static async getExchangeRateUSD(): Promise<number> {
     const settings = await this.get();
     return settings.exchangeRateUSD || 95.0; // Fallback to 95 if null/0
  }

  static async setExchangeRateUSD(rate: number): Promise<SystemSettings> {
     return await db.systemSettings.update({
        where: { id: "global" },
        data: { 
          exchangeRateUSD: rate,
          exchangeRateUpdatedAt: new Date()
        }
     });
  }
}
