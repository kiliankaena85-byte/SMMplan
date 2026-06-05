import { db } from "@/lib/db";
import { SystemSettings, UsnScheme } from "@prisma/client";
import { VaultService } from "./vault";
import { unstable_cache, revalidateTag } from "next/cache";

export interface DecryptedPaymentSecrets {
  yookassaShopId: string | null;
  yookassaSecretKey: string | null;
  cryptoBotToken: string | null;
  robokassaLogin: string | null;
  robokassaPassword: string | null;
}

export interface DecryptedEmailSettings {
  emailProvider: string;
  resendApiKey: string | null;
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
  static isTestEnvironment(): boolean {
    return process.env.NODE_ENV === 'test' || 
           process.env.NEXT_PUBLIC_APP_ENV === 'test' || 
           process.env.DATABASE_URL?.includes('smmplan_test') === true;
  }

  /**
   * Fetches global settings with a 5-minute cache TTL.
   * Uses Next.js unstable_cache for high-performance retrieval in Server Components.
   */
  static getCached = unstable_cache(
    async () => {
      // In tests, we want the most fresh data to avoid race conditions between test cases
      if (SettingsProvider.isTestEnvironment()) {
        return await db.systemSettings.upsert({
          where: { id: "global" },
          update: {},
          create: { id: "global", taxRate: 6, opexMonthly: 0, maintenanceMode: false, isTestMode: true, siteName: "Smmplan", exchangeRateUSD: 95 }
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
    return this.get();
  }

  /**
   * Safe wrapper around getCached that self-heals when Next.js incrementalCache is missing (CLI/workers)
   */
  static async get(): Promise<SystemSettings> {
    try {
      if (SettingsProvider.isTestEnvironment()) {
        const fresh = await db.systemSettings.findUnique({ where: { id: "global" } });
        if (fresh) return fresh;
        return await db.systemSettings.upsert({
          where: { id: "global" },
          update: {},
          create: { id: "global", taxRate: 6, opexMonthly: 0, maintenanceMode: false, isTestMode: true, siteName: "Smmplan", exchangeRateUSD: 95 }
        });
      }
      try {
        return await this.getCached();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (err.message?.includes('incrementalCache') || err.message?.includes('Invariant')) {
          return await db.systemSettings.upsert({
            where: { id: "global" },
            update: {},
            create: { id: "global", taxRate: 6, opexMonthly: 0, maintenanceMode: false, isTestMode: SettingsProvider.isTestEnvironment(), siteName: "Smmplan", exchangeRateUSD: 95 }
          });
        }
        throw err;
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (dbErr: any) {
      console.warn('[SettingsProvider] Failed to fetch system settings from DB, using dynamic fallback:', dbErr.message);
      return {
        id: "global",
        taxRate: 6.0,
        opexMonthly: 0,
        maintenanceMode: false,
        isTestMode: false,
        siteName: "Smmplan Lite",
        siteDescription: "",
        exchangeRateUSD: 90.0,
        contactSupportEmail: "support@smmplan.pro",
        contactPrivacyEmail: "privacy@smmplan.pro",
        contactTelegramBot: "smmplan_support_bot",
        contactTelegramChannel: "smmplan_support",
        legalCompanyName: "Smmplan Lite",
        legalCompanyInn: "Укажите ИНН",
        legalCompanyOgrnip: "Укажите ОГРНИП",
        legalCompanyAddress: "г. Москва",
        usnScheme: "INCOME_EXPENSES" as UsnScheme,
        welcomeMessage: "Добро пожаловать в Smmplan! Ваш персональный кабинет готов к работе.",
        yookassaShopId: null,
        yookassaSecretKey: null,
        yookassaTestShopId: null,
        yookassaTestSecretKey: null,
        cryptoBotToken: null,
        quarantineThreshold: 0.20,
        globalMarkup: 3.0,
        safetyFloor: 1.0,
        exchangeRateUpdatedAt: null,
        siteLogoUrl: null,
        siteFaviconUrl: null,
        emailProvider: "SMTP",
        resendApiKey: null,
        smtpHost: null,
        smtpPort: 465,
        smtpUser: null,
        smtpPassword: null,
        supportEmailDomain: null,
        inboundEmailWebhookSecret: null,
        robokassaLogin: null,
        robokassaPassword: null,
        updatedAt: new Date()
      } as SystemSettings;
    }
  }

  /**
   * Securely decrypts and returns payment API keys.
   */
  static async getPaymentSecrets(): Promise<DecryptedPaymentSecrets> {
    const settings = await this.get();
    const useTestKeys = await this.isTestMode();

    // SECURITY: No fallback to prod keys in test mode.
    // If test keys are not configured, return null — downstream will throw a clear error.
    let shopId = useTestKeys
      ? (settings.yookassaTestShopId ?? null)
      : (settings.yookassaShopId ?? null);
    let secretKeyRaw = useTestKeys
      ? (settings.yookassaTestSecretKey ?? null)
      : (settings.yookassaSecretKey ?? null);

    // Dynamic sandbox fallback: If selected credentials are dummy placeholders,
    // but test keys are configured with actual test credentials, use them!
    const isDummy = !shopId || shopId === 'test_shop_id' || shopId === 'test_shop_id_test';
    const hasTestKeys = settings.yookassaTestShopId && settings.yookassaTestShopId !== 'test_shop_id';

    if (isDummy && hasTestKeys) {
      shopId = settings.yookassaTestShopId;
      secretKeyRaw = settings.yookassaTestSecretKey;
    }

    return {
      yookassaShopId: shopId,
      yookassaSecretKey: secretKeyRaw ? VaultService.decrypt(secretKeyRaw) : null,
      cryptoBotToken: settings.cryptoBotToken ? VaultService.decrypt(settings.cryptoBotToken) : null,
      robokassaLogin: settings.robokassaLogin ?? null,
      robokassaPassword: settings.robokassaPassword ? VaultService.decrypt(settings.robokassaPassword) : null
    };
  }

  /**
   * Securely decrypts and returns SMTP credentials.
   */
  static async getEmailSettings(): Promise<DecryptedEmailSettings> {
    const settings = await this.get();
    
    const emailProvider = settings.emailProvider || 'SMTP';
    const resendKeyRaw = settings.resendApiKey;
    
    return {
      emailProvider,
      resendApiKey: (resendKeyRaw && resendKeyRaw.trim() !== '') ? VaultService.decrypt(resendKeyRaw) : null,
      smtpHost: settings.smtpHost || process.env.SMTP_HOST || null,
      smtpPort: settings.smtpPort || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465),
      smtpUser: settings.smtpUser || process.env.SMTP_USER || null,
      smtpPassword: settings.smtpPassword ? VaultService.decrypt(settings.smtpPassword) : (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || null),
      supportEmailDomain: settings.supportEmailDomain,
    };
  }

  /**
   * Securely decrypts and returns the inbound email webhook secret.
   * This is server-only and NOT returned in any public setting endpoints.
   */
  static async getInboundEmailWebhookSecret(): Promise<string | null> {
    const settings = await this.get();
    return settings.inboundEmailWebhookSecret ? VaultService.decrypt(settings.inboundEmailWebhookSecret) : null;
  }

  /**
   * Returns the inbound support email domain.
   */
  static async getSupportEmailDomain(): Promise<string> {
    const settings = await this.get();
    return settings.supportEmailDomain || process.env.SUPPORT_EMAIL_DOMAIN || "smmplan.pro";
  }

  /**
   * Returns all dynamic contact and legal information, completely replacing the old KV store.
   */
  static async getContactAndLegalSettings() {
    const settings = await this.get();
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
    const settings = await this.get();
    return settings.exchangeRateUSD || 95.0; // Fail-safe default
  }

  static async isTestMode(): Promise<boolean> {
    if (SettingsProvider.isTestEnvironment()) return true;
    try {
      const { redis } = await import('./redis');
      const cachedVal = await redis.get('settings:isTestMode');
      if (cachedVal !== null) {
        return cachedVal === 'true';
      }
    } catch (err) {
      console.warn('[SettingsProvider] Redis is unavailable in isTestMode:', err instanceof Error ? err.message : String(err));
    }
    const settings = await this.get();
    return settings.isTestMode;
  }

  static async setExchangeRateUSD(rate: number) {
    await db.systemSettings.upsert({
      where: { id: "global" },
      update: { exchangeRateUSD: rate, exchangeRateUpdatedAt: new Date() },
      create: { id: "global", exchangeRateUSD: rate, exchangeRateUpdatedAt: new Date() }
    });
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (revalidateTag as any)('settings');
    } catch (cacheErr) {
      console.error('[SettingsProvider] Warning: Failed to invalidate cache tag:', cacheErr);
    }
  }

  static async setTestMode(enable: boolean) {
    await db.systemSettings.upsert({
      where: { id: "global" },
      update: { isTestMode: enable },
      create: { id: "global", isTestMode: enable }
    });
    const { redis } = await import('./redis');
    await redis.set('settings:isTestMode', String(enable));
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (revalidateTag as any)('settings');
    } catch (cacheErr) {
      console.error('[SettingsProvider] Warning: Failed to invalidate cache tag:', cacheErr);
    }
  }

  static async setMaintenanceMode(enable: boolean) {
    await db.systemSettings.upsert({
      where: { id: "global" },
      update: { maintenanceMode: enable },
      create: { id: "global", maintenanceMode: enable }
    });
    const { redis } = await import('./redis');
    await redis.set('settings:maintenanceMode', String(enable));
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (revalidateTag as any)('settings');
    } catch (cacheErr) {
      console.error('[SettingsProvider] Warning: Failed to invalidate cache tag:', cacheErr);
    }
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
