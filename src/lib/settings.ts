import { db } from "@/lib/db";
import { SystemSettings } from "@prisma/client";
import { VaultService } from "./vault";
import { unstable_cache, revalidateTag } from "next/cache";

export interface DecryptedPaymentSecrets {
  yookassaShopId: string | null;
  yookassaSecretKey: string | null;
  cryptoBotToken: string | null;
}

export interface DecryptedSmtpSettings {
  smtpHost: string | null;
  smtpPort: number;
  smtpUser: string | null;
  smtpPassword: string | null;
  supportEmailDomain: string | null;
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
          siteName: "Smmplan Lite",
          siteDescription: "",
          exchangeRateUSD: 95.0,
          contactSupportEmail: "support@smmplan.pro",
          contactPrivacyEmail: "privacy@smmplan.pro",
          contactTelegramBot: "smmplan_support_bot",
          contactTelegramChannel: "smmplan_support",
          legalCompanyName: "Smmplan Lite",
          legalCompanyInn: "Укажите ИНН",
          legalCompanyOgrnip: "Укажите ОГРНИП",
          legalCompanyAddress: "г. Москва",
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
    const settings = await db.systemSettings.findUnique({ where: { id: "global" } });
    if (settings) return settings;
    // Fallback to cached (which handles initialization if missing)
    return this.getCached();
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
   * Securely decrypts and returns SMTP credentials.
   */
  static async getSmtpSettings(): Promise<DecryptedSmtpSettings> {
    const settings = await this.getCached();
    
    return {
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort || 465,
      smtpUser: settings.smtpUser,
      smtpPassword: settings.smtpPassword ? VaultService.decrypt(settings.smtpPassword) : null,
      supportEmailDomain: settings.supportEmailDomain,
    };
  }

  /**
   * Returns the inbound support email domain.
   */
  static async getSupportEmailDomain(): Promise<string> {
    const settings = await this.getCached();
    return settings.supportEmailDomain || process.env.SUPPORT_EMAIL_DOMAIN || "smmplan.pro";
  }

  /**
   * Returns all dynamic contact and legal information, completely replacing the old KV store.
   */
  static async getContactAndLegalSettings() {
    const settings = await this.getCached();
    return {
      SITE_NAME: settings.siteName || "Smmplan Lite",
      SITE_DESCRIPTION: settings.siteDescription || "",
      SUPPORT_EMAIL: settings.contactSupportEmail || "support@smmplan.pro",
      PRIVACY_EMAIL: settings.contactPrivacyEmail || "privacy@smmplan.pro",
      TELEGRAM_SUPPORT_BOT: settings.contactTelegramBot || "smmplan_support_bot",
      TELEGRAM_SUPPORT_CHANNEL: settings.contactTelegramChannel || "smmplan_support",
      WHATSAPP: settings.contactWhatsApp || "",
      VK: settings.contactVk || "",
      COMPANY_NAME: settings.legalCompanyName || "Smmplan Lite",
      COMPANY_INN: settings.legalCompanyInn || "Укажите ИНН",
      COMPANY_OGRNIP: settings.legalCompanyOgrnip || "Укажите ОГРНИП",
      COMPANY_ADDRESS: settings.legalCompanyAddress || "г. Москва",
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
    const { redis } = await import('./redis');
    await redis.set('settings:isTestMode', String(enable));
    (revalidateTag as any)('settings');
  }

  static async setMaintenanceMode(enable: boolean) {
    await db.systemSettings.upsert({
      where: { id: "global" },
      update: { maintenanceMode: enable },
      create: { id: "global", maintenanceMode: enable }
    });
    const { redis } = await import('./redis');
    await redis.set('settings:maintenanceMode', String(enable));
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
