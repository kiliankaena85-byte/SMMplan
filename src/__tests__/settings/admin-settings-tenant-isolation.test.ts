import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { db } from '@/lib/db';
import { settingsService } from '@/services/admin/settings.service';
import { updateGlobalSettings, disconnectTelegramBotAction, testTelegramBotConnectionAction } from '@/actions/admin/settings';
import { toggleTenantMaintenanceAction } from '@/actions/admin/tenants';
import { generateStorefrontKeyAction, revokeStorefrontKeyAction, listStorefrontKeysAction } from '@/actions/admin/storefront-keys';
import { updateTelegramSecurityAction } from '@/actions/admin/telegram-bot';
import { upsertTemplate, deleteTemplate, getTemplates } from '@/actions/support/template';
import { SettingsProvider } from '@/lib/settings';

// Mock active user session for RBAC testing
let mockUser = {
  id: 'usr_admin_test_1',
  email: 'owner@smmplan.pro',
  role: 'OWNER',
  tenantId: 'smmplan',
};

vi.mock('@/lib/server/rbac', () => ({
  requireStaffPermission: vi.fn(async (section: string, action: string, fn: any) => {
    return fn(mockUser);
  }),
  requireOwnerPermission: vi.fn(async (fn: any) => {
    if (mockUser.role !== 'OWNER') {
      return { success: false, error: 'Доступ разрешен только владельцу' };
    }
    return fn(mockUser);
  }),
  enforceSectionAccess: vi.fn(async () => mockUser),
}));

vi.mock('@/lib/queue-manager', () => ({
  catalogQueue: {
    add: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/lib/notifications', () => ({
  sendAdminAlert: vi.fn().mockResolvedValue(true),
}));

const mockAuditAdminAwaitable = vi.fn().mockResolvedValue(true);
vi.mock('@/lib/admin-audit', () => ({
  auditAdminAwaitable: vi.fn((...args: any[]) => mockAuditAdminAwaitable(...args)),
  auditAdmin: vi.fn((...args: any[]) => mockAuditAdminAwaitable(...args)),
}));

describe('Admin Settings Multi-Tenant Isolation & Validation Suite', () => {
  beforeAll(async () => {
    // 1. Ensure Tenant entities exist
    await db.tenant.upsert({
      where: { id: 'smmplan' },
      update: { name: 'SMMplan', slug: 'smmplan', domain: 'smmplan.pro' },
      create: { id: 'smmplan', name: 'SMMplan', slug: 'smmplan', domain: 'smmplan.pro' },
    });

    await db.tenant.upsert({
      where: { id: 'flux' },
      update: { name: 'SMMflux', slug: 'flux', domain: 'smmflux.ru' },
      create: { id: 'flux', name: 'SMMflux', slug: 'flux', domain: 'smmflux.ru' },
    });
  });

  beforeEach(async () => {
    // Reset mock user to OWNER by default
    mockUser = {
      id: 'usr_admin_test_1',
      email: 'owner@smmplan.pro',
      role: 'OWNER',
      tenantId: 'smmplan',
    };

    // 2. Clean/Reset systemSettings for both tenants
    await db.systemSettings.upsert({
      where: { id: 'smmplan' },
      update: {
        siteName: 'SMMplan Official',
        siteDescription: 'Платформа продвижения SMMplan',
        contactSupportEmail: 'support@smmplan.pro',
        contactPrivacyEmail: 'privacy@smmplan.pro',
        contactTelegramBot: 'smmplan_bot',
        contactTelegramChannel: '@smmplan_news',
        legalCompanyName: 'ООО СММ ПЛАН',
        legalCompanyInn: '7707083893',
        legalCompanyOgrnip: '1027700132195',
        legalCompanyAddress: 'г. Москва, ул. Тверская, д. 1',
        usnScheme: 'INCOME',
        taxRate: 6.0,
        opexMonthly: 5000000, // 50,000 RUB in cents
        globalMarkup: 3.0,
        safetyFloor: 1.2,
        quarantineThreshold: 0.2,
        exchangeRateUSD: 95.0,
        smtpHost: 'smtp.smmplan.pro',
        smtpPort: 465,
        smtpUser: 'robot@smmplan.pro',
        smtpPassword: null,
        resendApiKey: null,
        inboundEmailWebhookSecret: null,
        cryptoBotToken: null,
        yookassaShopId: null,
        yookassaSecretKey: null,
        robokassaLogin: null,
        robokassaPassword: null,
        robokassaWebhookPassword: null,
        alfaBankAccountNumber: null,
        alfaBankApiKey: null,
        alfaBankClientSecret: null,
        alfaBankIsSandbox: true,
        geminiApiKeys: null,
        geminiProxy: null,
        siteLogoUrl: null,
        siteFaviconUrl: null,
        maintenanceMode: false,
      },
      create: {
        id: 'smmplan',
        siteName: 'SMMplan Official',
        siteDescription: 'Платформа продвижения SMMplan',
        contactSupportEmail: 'support@smmplan.pro',
        contactPrivacyEmail: 'privacy@smmplan.pro',
        contactTelegramBot: 'smmplan_bot',
        contactTelegramChannel: '@smmplan_news',
        legalCompanyName: 'ООО СММ ПЛАН',
        legalCompanyInn: '7707083893',
        legalCompanyOgrnip: '1027700132195',
        legalCompanyAddress: 'г. Москва, ул. Тверская, д. 1',
        usnScheme: 'INCOME',
        taxRate: 6.0,
        opexMonthly: 5000000,
        globalMarkup: 3.0,
        safetyFloor: 1.2,
        quarantineThreshold: 0.2,
        exchangeRateUSD: 95.0,
        smtpHost: 'smtp.smmplan.pro',
        smtpPort: 465,
        smtpUser: 'robot@smmplan.pro',
      },
    });

    await db.systemSettings.upsert({
      where: { id: 'flux' },
      update: {
        siteName: 'SMMflux Premium',
        siteDescription: 'Платформа продвижения SMMflux',
        contactSupportEmail: 'support@smmflux.ru',
        contactPrivacyEmail: 'privacy@smmflux.ru',
        contactTelegramBot: 'smmflux_bot',
        contactTelegramChannel: '@smmflux_news',
        legalCompanyName: 'ИП Новиков',
        legalCompanyInn: '500100732259',
        legalCompanyOgrnip: '304500116000157',
        legalCompanyAddress: 'г. Санкт-Петербург, Невский пр., д. 10',
        usnScheme: 'INCOME_EXPENSES',
        taxRate: 15.0,
        opexMonthly: 3000000,
        globalMarkup: 2.2,
        safetyFloor: 1.15,
        quarantineThreshold: 0.15,
        exchangeRateUSD: 92.0,
        smtpHost: 'smtp.smmflux.ru',
        smtpPort: 587,
        smtpUser: 'mailer@smmflux.ru',
        smtpPassword: null,
        resendApiKey: null,
        inboundEmailWebhookSecret: null,
        cryptoBotToken: null,
        yookassaShopId: null,
        yookassaSecretKey: null,
        robokassaLogin: null,
        robokassaPassword: null,
        robokassaWebhookPassword: null,
        alfaBankAccountNumber: null,
        alfaBankApiKey: null,
        alfaBankClientSecret: null,
        alfaBankIsSandbox: true,
        geminiApiKeys: null,
        geminiProxy: null,
        siteLogoUrl: null,
        siteFaviconUrl: null,
        maintenanceMode: false,
      },
      create: {
        id: 'flux',
        siteName: 'SMMflux Premium',
        siteDescription: 'Платформа продвижения SMMflux',
        contactSupportEmail: 'support@smmflux.ru',
        contactPrivacyEmail: 'privacy@smmflux.ru',
        contactTelegramBot: 'smmflux_bot',
        contactTelegramChannel: '@smmflux_news',
        legalCompanyName: 'ИП Новиков',
        legalCompanyInn: '500100732259',
        legalCompanyOgrnip: '304500116000157',
        legalCompanyAddress: 'г. Санкт-Петербург, Невский пр., д. 10',
        usnScheme: 'INCOME_EXPENSES',
        taxRate: 15.0,
        opexMonthly: 3000000,
        globalMarkup: 2.2,
        safetyFloor: 1.15,
        quarantineThreshold: 0.15,
        exchangeRateUSD: 92.0,
        smtpHost: 'smtp.smmflux.ru',
        smtpPort: 587,
        smtpUser: 'mailer@smmflux.ru',
      },
    });

    SettingsProvider.invalidateLocalCache();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Settings Persistence & Tenant Scoping
  // ──────────────────────────────────────────────────────────────────────────
  describe('1. Tenant Settings Persistence', () => {
    it('saves general settings for smmplan when formData has tenantId = smmplan', async () => {
      const formData = new FormData();
      formData.set('tenantId', 'smmplan');
      formData.set('siteName', 'SMMplan Core Edition');
      formData.set('siteDescription', 'Главная панель продвижения в Telegram и VK');
      formData.set('contactSupportEmail', 'help@smmplan.pro');

      const res = await updateGlobalSettings(formData);
      expect(res.success).toBe(true);

      const updated = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      expect(updated?.siteName).toBe('SMMplan Core Edition');
      expect(updated?.siteDescription).toBe('Главная панель продвижения в Telegram и VK');
      expect(updated?.contactSupportEmail).toBe('help@smmplan.pro');
    });

    it('saves general settings for flux when formData has tenantId = flux', async () => {
      const formData = new FormData();
      formData.set('tenantId', 'flux');
      formData.set('siteName', 'SMMflux NextGen');
      formData.set('siteDescription', 'Премиальный сервис SMMflux');
      formData.set('contactSupportEmail', 'care@smmflux.ru');

      const res = await updateGlobalSettings(formData);
      expect(res.success).toBe(true);

      const updated = await db.systemSettings.findUnique({ where: { id: 'flux' } });
      expect(updated?.siteName).toBe('SMMflux NextGen');
      expect(updated?.siteDescription).toBe('Премиальный сервис SMMflux');
      expect(updated?.contactSupportEmail).toBe('care@smmflux.ru');
    });

    it('falls back to default active tenant (smmplan) when formData omits tenantId', async () => {
      const formData = new FormData();
      formData.set('siteDescription', 'Дефолтная платформа без явного тенанта');

      const res = await updateGlobalSettings(formData);
      expect(res.success).toBe(true);

      const planSettings = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      const fluxSettings = await db.systemSettings.findUnique({ where: { id: 'flux' } });

      expect(planSettings?.siteDescription).toBe('Дефолтная платформа без явного тенанта');
      expect(fluxSettings?.siteDescription).toBe('Платформа продвижения SMMflux');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Strict Cross-Tenant Isolation (No Cross-Contamination)
  // ──────────────────────────────────────────────────────────────────────────
  describe('2. Cross-Tenant Isolation Guarantees', () => {
    it('isolates SMTP configuration between tenants', async () => {
      const formData = new FormData();
      formData.set('tenantId', 'smmplan');
      formData.set('smtpHost', 'smtp.yandex.ru');
      formData.set('smtpPort', '465');
      formData.set('smtpUser', 'alerts@smmplan.pro');

      const res = await updateGlobalSettings(formData);
      expect(res.success).toBe(true);

      const planSettings = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      const fluxSettings = await db.systemSettings.findUnique({ where: { id: 'flux' } });

      // smmplan updated
      expect(planSettings?.smtpHost).toBe('smtp.yandex.ru');
      expect(planSettings?.smtpPort).toBe(465);
      expect(planSettings?.smtpUser).toBe('alerts@smmplan.pro');

      // flux remains untouched with original SMTP configuration
      expect(fluxSettings?.smtpHost).toBe('smtp.smmflux.ru');
      expect(fluxSettings?.smtpPort).toBe(587);
      expect(fluxSettings?.smtpUser).toBe('mailer@smmflux.ru');
    });

    it('isolates exchange rate and catalog markup between tenants', async () => {
      const formData = new FormData();
      formData.set('tenantId', 'smmplan');
      formData.set('exchangeRateUSD', '99.5');
      formData.set('globalMarkup', '3.8');

      const res = await updateGlobalSettings(formData);
      expect(res.success).toBe(true);

      const planSettings = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      const fluxSettings = await db.systemSettings.findUnique({ where: { id: 'flux' } });

      expect(planSettings?.exchangeRateUSD).toBe(99.5);
      expect(planSettings?.globalMarkup).toBe(3.8);

      // flux rate & markup untouched
      expect(fluxSettings?.exchangeRateUSD).toBe(92.0);
      expect(fluxSettings?.globalMarkup).toBe(2.2);
    });

    it('isolates legal company credentials and tax scheme between tenants', async () => {
      const formData = new FormData();
      formData.set('tenantId', 'flux');
      formData.set('legalCompanyName', 'ИП Волков В. В.');
      formData.set('legalCompanyInn', '500100732259');
      formData.set('legalCompanyOgrnip', '304500116000157');
      formData.set('legalCompanyAddress', 'г. Екатеринбург, ул. Ленина, д. 25');

      const res = await updateGlobalSettings(formData);
      expect(res.success).toBe(true);

      const fluxSettings = await db.systemSettings.findUnique({ where: { id: 'flux' } });
      const planSettings = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });

      expect(fluxSettings?.legalCompanyName).toBe('ИП Волков В. В.');
      expect(fluxSettings?.legalCompanyAddress).toBe('г. Екатеринбург, ул. Ленина, д. 25');

      // smmplan company requisites unchanged
      expect(planSettings?.legalCompanyName).toBe('ООО СММ ПЛАН');
      expect(planSettings?.legalCompanyInn).toBe('7707083893');
      expect(planSettings?.legalCompanyOgrnip).toBe('1027700132195');
      expect(planSettings?.legalCompanyAddress).toBe('г. Москва, ул. Тверская, д. 1');
    });

    it('isolates payment gateway secrets and tokens between tenants', async () => {
      const formData = new FormData();
      formData.set('tenantId', 'smmplan');
      formData.set('yookassaShopId', '998877');
      formData.set('yookassaSecretKey', 'live_secret_key_1234567890');
      formData.set('cryptoBotToken', '1234:AAFlzAbCdEfGhIjKlMnOpQrStUv');

      const res = await updateGlobalSettings(formData);
      expect(res.success).toBe(true);

      const planSettings = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      const fluxSettings = await db.systemSettings.findUnique({ where: { id: 'flux' } });

      // smmplan has encrypted secrets and shopId
      expect(planSettings?.yookassaShopId).toBe('998877');
      expect(planSettings?.yookassaSecretKey).toBeDefined();
      expect(planSettings?.yookassaSecretKey).not.toBe('live_secret_key_1234567890'); // AES encrypted
      expect(planSettings?.cryptoBotToken).toBeDefined();

      // flux has null payment secrets
      expect(fluxSettings?.yookassaShopId).toBeNull();
      expect(fluxSettings?.yookassaSecretKey).toBeNull();
      expect(fluxSettings?.cryptoBotToken).toBeNull();
    });

    it('isolates Alfa-Bank and Robokassa configurations between tenants', async () => {
      // 1. Configure Alfa-Bank on smmplan
      const formAlfa = new FormData();
      formAlfa.set('tenantId', 'smmplan');
      formAlfa.set('alfaBankAccountNumber', '40702810000000000001');
      formAlfa.set('alfaBankApiKey', 'alfa_live_api_key_test_123');
      formAlfa.set('alfaBankIsSandbox', 'false');

      const resAlfa = await updateGlobalSettings(formAlfa);
      expect(resAlfa.success).toBe(true);

      // 2. Configure Robokassa on flux
      const formRobo = new FormData();
      formRobo.set('tenantId', 'flux');
      formRobo.set('robokassaLogin', 'flux_merchant');
      formRobo.set('robokassaPassword', 'robo_pass_primary_999');
      formRobo.set('robokassaWebhookPassword', 'robo_pass_webhook_888');

      const resRobo = await updateGlobalSettings(formRobo);
      expect(resRobo.success).toBe(true);

      const planSettings = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      const fluxSettings = await db.systemSettings.findUnique({ where: { id: 'flux' } });

      // smmplan has Alfa-Bank configured, but NO Robokassa
      expect(planSettings?.alfaBankAccountNumber).toBe('40702810000000000001');
      expect(planSettings?.alfaBankApiKey).toBeDefined();
      expect(planSettings?.alfaBankApiKey).not.toBe('alfa_live_api_key_test_123'); // encrypted
      expect(planSettings?.alfaBankIsSandbox).toBe(false);
      expect(planSettings?.robokassaLogin).toBeNull();

      // flux has Robokassa configured, but NO Alfa-Bank
      expect(fluxSettings?.robokassaLogin).toBe('flux_merchant');
      expect(fluxSettings?.robokassaPassword).toBeDefined();
      expect(fluxSettings?.robokassaPassword).not.toBe('robo_pass_primary_999'); // encrypted
      expect(fluxSettings?.alfaBankAccountNumber).toBeNull();
      expect(fluxSettings?.alfaBankApiKey).toBeNull();
    });

    it('isolates Gemini AI settings (API keys, proxy) between tenants', async () => {
      const formGemini = new FormData();
      formGemini.set('tenantId', 'smmplan');
      formGemini.set('geminiApiKeys', 'AIzaSyTestApiKeyForSmmplan');
      formGemini.set('geminiProxy', 'https://generativelanguage.googleapis.com');

      const res = await updateGlobalSettings(formGemini);
      expect(res.success).toBe(true);

      const planSettings = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      const fluxSettings = await db.systemSettings.findUnique({ where: { id: 'flux' } });

      expect(planSettings?.geminiApiKeys).toBeDefined();
      expect(planSettings?.geminiApiKeys).not.toBe('AIzaSyTestApiKeyForSmmplan'); // AES encrypted
      expect(planSettings?.geminiProxy).toBe('https://generativelanguage.googleapis.com');

      expect(fluxSettings?.geminiApiKeys).toBeNull();
      expect(fluxSettings?.geminiProxy).toBeNull();
    });

    it('isolates Webhooks and Resend API keys between tenants', async () => {
      // Configure webhook on smmplan
      const formHook = new FormData();
      formHook.set('tenantId', 'smmplan');
      formHook.set('inboundEmailWebhookSecret', 'whsec_smmplan_test_secret_123');

      const resHook = await updateGlobalSettings(formHook);
      expect(resHook.success).toBe(true);

      // Configure Resend on flux
      const formResend = new FormData();
      formResend.set('tenantId', 'flux');
      formResend.set('resendApiKey', 're_flux_live_key_9999');

      const resResend = await updateGlobalSettings(formResend);
      expect(resResend.success).toBe(true);

      const planSettings = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      const fluxSettings = await db.systemSettings.findUnique({ where: { id: 'flux' } });

      expect(planSettings?.inboundEmailWebhookSecret).toBeDefined();
      expect(planSettings?.inboundEmailWebhookSecret).not.toBe('whsec_smmplan_test_secret_123'); // encrypted
      expect(planSettings?.resendApiKey).toBeNull();

      expect(fluxSettings?.resendApiKey).toBeDefined();
      expect(fluxSettings?.resendApiKey).not.toBe('re_flux_live_key_9999'); // encrypted
      expect(fluxSettings?.inboundEmailWebhookSecret).toBeNull();
    });

    it('isolates branding (logos, favicons) between tenants', async () => {
      const formBrand = new FormData();
      formBrand.set('tenantId', 'smmplan');
      formBrand.set('siteLogoUrl', 'https://smmplan.pro/uploads/branding/logo.svg');
      formBrand.set('siteFaviconUrl', 'https://smmplan.pro/uploads/branding/favicon.ico');

      const res = await updateGlobalSettings(formBrand);
      expect(res.success).toBe(true);

      const planSettings = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      const fluxSettings = await db.systemSettings.findUnique({ where: { id: 'flux' } });

      expect(planSettings?.siteLogoUrl).toBe('https://smmplan.pro/uploads/branding/logo.svg');
      expect(planSettings?.siteFaviconUrl).toBe('https://smmplan.pro/uploads/branding/favicon.ico');

      expect(fluxSettings?.siteLogoUrl).toBeNull();
      expect(fluxSettings?.siteFaviconUrl).toBeNull();
    });

    it('isolates maintenance mode toggle between tenants', async () => {
      // Toggle maintenance for smmplan
      const res = await toggleTenantMaintenanceAction('smmplan', true);
      expect(res.success).toBe(true);

      const planSettings = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      const fluxSettings = await db.systemSettings.findUnique({ where: { id: 'flux' } });

      expect(planSettings?.maintenanceMode).toBe(true);
      expect(fluxSettings?.maintenanceMode).toBe(false);

      // Revert maintenance mode
      await toggleTenantMaintenanceAction('smmplan', false);
      const planReverted = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      expect(planReverted?.maintenanceMode).toBe(false);
    });

    it('isolates Telegram bot usernames, channels and handles bot unbinding without affecting other tenants', async () => {
      const formData = new FormData();
      formData.set('tenantId', 'smmplan');
      formData.set('contactTelegramBot', 'smmplan_support_2026_bot');
      formData.set('contactTelegramChannel', '@smmplan_channel_official');

      const res = await updateGlobalSettings(formData);
      expect(res.success).toBe(true);

      const planSettings = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      const fluxSettings = await db.systemSettings.findUnique({ where: { id: 'flux' } });

      expect(planSettings?.contactTelegramBot).toBe('smmplan_support_2026_bot');
      expect(planSettings?.contactTelegramChannel).toBe('@smmplan_channel_official');

      expect(fluxSettings?.contactTelegramBot).toBe('smmflux_bot');
      expect(fluxSettings?.contactTelegramChannel).toBe('@smmflux_news');

      // Now unbind bot from smmplan
      const unbindRes = await disconnectTelegramBotAction('smmplan');
      expect(unbindRes.success).toBe(true);

      const planAfterUnbind = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      const fluxAfterUnbind = await db.systemSettings.findUnique({ where: { id: 'flux' } });

      expect(planAfterUnbind?.contactTelegramBot).toBeNull();
      expect(planAfterUnbind?.telegramBotToken).toBeNull();

      // flux remains untouched
      expect(fluxAfterUnbind?.contactTelegramBot).toBe('smmflux_bot');
    });

    it('isolates Storefront Keys per tenant and prevents cross-tenant revocation', async () => {
      // 1. Create a key on smmplan
      const createRes = await generateStorefrontKeyAction({
        tenantId: 'smmplan',
        type: 'PUBLISHABLE',
        name: 'SMMplan Mobile App',
      });
      expect(createRes.success).toBe(true);
      const keyId = 'data' in createRes ? createRes.data?.key.id : undefined;
      expect(keyId).toBeDefined();

      // 2. List keys on flux - keyId must NOT be visible
      const fluxKeysRes = await listStorefrontKeysAction('flux');
      expect(fluxKeysRes.success).toBe(true);
      const hasKeyInFlux = ('data' in fluxKeysRes && Array.isArray(fluxKeysRes.data))
        ? fluxKeysRes.data.some((k: any) => k.id === keyId)
        : false;
      expect(hasKeyInFlux).toBe(false);

      // 3. Attempting to revoke smmplan's key with tenantId: 'flux' fails
      const revokeFailRes = await revokeStorefrontKeyAction({
        id: keyId!,
        tenantId: 'flux',
      });
      expect(revokeFailRes.success).toBe(false);
      expect(revokeFailRes.error).toBe('Ключ не найден или уже удален');

      // 4. Revoking with the proper tenantId: 'smmplan' succeeds
      const revokeOkRes = await revokeStorefrontKeyAction({
        id: keyId!,
        tenantId: 'smmplan',
      });
      expect(revokeOkRes.success).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Field Validation & Input Guardrails
  // ──────────────────────────────────────────────────────────────────────────
  describe('3. Form Validation & Data Integrity Guardrails', () => {
    it('validates numeric ranges for markup and safety floor', async () => {
      // Markup < 1.05 should fail
      const formLowMarkup = new FormData();
      formLowMarkup.set('tenantId', 'smmplan');
      formLowMarkup.set('globalMarkup', '0.5');

      const resLow = await updateGlobalSettings(formLowMarkup);
      expect(resLow.success).toBe(false);
      const errorsLow = (resLow as any).errors;
      expect(errorsLow?.globalMarkup).toBeDefined();

      // Markup > 100 should fail
      const formHighMarkup = new FormData();
      formHighMarkup.set('tenantId', 'smmplan');
      formHighMarkup.set('globalMarkup', '150');

      const resHigh = await updateGlobalSettings(formHighMarkup);
      expect(resHigh.success).toBe(false);
      const errorsHigh = (resHigh as any).errors;
      expect(errorsHigh?.globalMarkup).toBeDefined();

      // Valid markup (2.5) succeeds
      const formValidMarkup = new FormData();
      formValidMarkup.set('tenantId', 'smmplan');
      formValidMarkup.set('globalMarkup', '2.5');

      const resValid = await updateGlobalSettings(formValidMarkup);
      expect(resValid.success).toBe(true);
    });

    it('validates SMTP ports (1..65535)', async () => {
      // Port 0 is rejected
      const formPortZero = new FormData();
      formPortZero.set('tenantId', 'smmplan');
      formPortZero.set('smtpPort', '0');

      const resZero = await updateGlobalSettings(formPortZero);
      expect(resZero.success).toBe(false);
      const errorsZero = (resZero as any).errors;
      expect(errorsZero?.smtpPort).toBeDefined();

      // Port 70000 is rejected
      const formPortHigh = new FormData();
      formPortHigh.set('tenantId', 'smmplan');
      formPortHigh.set('smtpPort', '70000');

      const resHigh = await updateGlobalSettings(formPortHigh);
      expect(resHigh.success).toBe(false);

      // Port 587 is valid
      const formPortValid = new FormData();
      formPortValid.set('tenantId', 'smmplan');
      formPortValid.set('smtpPort', '587');

      const resValid = await updateGlobalSettings(formPortValid);
      expect(resValid.success).toBe(true);
    });

    it('validates contact email formats', async () => {
      const formBadEmail = new FormData();
      formBadEmail.set('tenantId', 'smmplan');
      formBadEmail.set('contactSupportEmail', 'not-an-email');

      const resBad = await updateGlobalSettings(formBadEmail);
      expect(resBad.success).toBe(false);
      const errorsBad = (resBad as any).errors;
      expect(errorsBad?.contactSupportEmail).toBeDefined();

      const formGoodEmail = new FormData();
      formGoodEmail.set('tenantId', 'smmplan');
      formGoodEmail.set('contactSupportEmail', 'valid.support@smmplan.pro');

      const resGood = await updateGlobalSettings(formGoodEmail);
      expect(resGood.success).toBe(true);
    });

    it('validates Russian INN checksum and digit constraints', async () => {
      // Invalid length (5 digits)
      const formShortInn = new FormData();
      formShortInn.set('tenantId', 'smmplan');
      formShortInn.set('legalCompanyInn', '12345');

      const resShort = await updateGlobalSettings(formShortInn);
      expect(resShort.success).toBe(false);

      // Invalid checksum (10 digits with bad checksum)
      const formBadChecksum = new FormData();
      formBadChecksum.set('tenantId', 'smmplan');
      formBadChecksum.set('legalCompanyInn', '7701234567');

      const resBadCheck = await updateGlobalSettings(formBadChecksum);
      expect(resBadCheck.success).toBe(false);

      // Valid 10-digit INN (Sberbank: 7707083893)
      const formValid10 = new FormData();
      formValid10.set('tenantId', 'smmplan');
      formValid10.set('legalCompanyInn', '7707083893');

      const resValid10 = await updateGlobalSettings(formValid10);
      expect(resValid10.success).toBe(true);

      // Valid 12-digit INN (500100732259)
      const formValid12 = new FormData();
      formValid12.set('tenantId', 'smmplan');
      formValid12.set('legalCompanyInn', '500100732259');

      const resValid12 = await updateGlobalSettings(formValid12);
      expect(resValid12.success).toBe(true);
    });

    it('validates Russian OGRN / OGRNIP checksums', async () => {
      // Invalid OGRN length (10 digits)
      const formShortOgrn = new FormData();
      formShortOgrn.set('tenantId', 'smmplan');
      formShortOgrn.set('legalCompanyOgrnip', '1234567890');

      const resShort = await updateGlobalSettings(formShortOgrn);
      expect(resShort.success).toBe(false);

      // Invalid OGRN checksum
      const formBadOgrn = new FormData();
      formBadOgrn.set('tenantId', 'smmplan');
      formBadOgrn.set('legalCompanyOgrnip', '1234567890123');

      const resBad = await updateGlobalSettings(formBadOgrn);
      expect(resBad.success).toBe(false);

      // Valid 13-digit OGRN (1027700132195)
      const formValid13 = new FormData();
      formValid13.set('tenantId', 'smmplan');
      formValid13.set('legalCompanyOgrnip', '1027700132195');

      const resValid13 = await updateGlobalSettings(formValid13);
      expect(resValid13.success).toBe(true);

      // Valid 15-digit OGRNIP (304500116000157)
      const formValid15 = new FormData();
      formValid15.set('tenantId', 'smmplan');
      formValid15.set('legalCompanyOgrnip', '304500116000157');

      const resValid15 = await updateGlobalSettings(formValid15);
      expect(resValid15.success).toBe(true);
    });

    it('validates Alfa-Bank 20-digit account number', async () => {
      // Account number with letters or wrong length
      const formBadAcc = new FormData();
      formBadAcc.set('tenantId', 'smmplan');
      formBadAcc.set('alfaBankAccountNumber', '40702810ABC');

      const resBad = await updateGlobalSettings(formBadAcc);
      expect(resBad.success).toBe(false);

      // Exactly 20 digits account number
      const formGoodAcc = new FormData();
      formGoodAcc.set('tenantId', 'smmplan');
      formGoodAcc.set('alfaBankAccountNumber', '40702810000000000001');

      const resGood = await updateGlobalSettings(formGoodAcc);
      expect(resGood.success).toBe(true);
    });

    it('validates Gemini Proxy URL format', async () => {
      // Non-URL proxy
      const formBadProxy = new FormData();
      formBadProxy.set('tenantId', 'smmplan');
      formBadProxy.set('geminiProxy', 'not-a-valid-url');

      const resBad = await updateGlobalSettings(formBadProxy);
      expect(resBad.success).toBe(false);
      const errorsBad = (resBad as any).errors;
      expect(errorsBad?.geminiProxy).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Security, SSRF & RBAC Role Ceilings
  // ──────────────────────────────────────────────────────────────────────────
  describe('4. Security & RBAC Ceilings (OWNER vs Staff)', () => {
    it('blocks non-OWNER staff from modifying financial gateways and safety floors', async () => {
      // Switch active user role to SUPPORT
      mockUser.role = 'SUPPORT';

      // Attempt to modify YooKassa shopId
      const formYoo = new FormData();
      formYoo.set('tenantId', 'smmplan');
      formYoo.set('yookassaShopId', '112233');

      const resYoo = await updateGlobalSettings(formYoo);
      expect(resYoo.success).toBe(false);
      const errorsYoo = (resYoo as any).errors;
      expect(errorsYoo?._form?.[0]).toContain('Только Владелец (OWNER) имеет права');

      // Attempt to modify taxRate
      const formTax = new FormData();
      formTax.set('tenantId', 'smmplan');
      formTax.set('taxRate', '10.0');

      const resTax = await updateGlobalSettings(formTax);
      expect(resTax.success).toBe(false);
      const errorsTax = (resTax as any).errors;
      expect(errorsTax?._form?.[0]).toContain('Только Владелец (OWNER) имеет права');

      // Attempt to modify safetyFloor
      const formFloor = new FormData();
      formFloor.set('tenantId', 'smmplan');
      formFloor.set('safetyFloor', '1.5');

      const resFloor = await updateGlobalSettings(formFloor);
      expect(resFloor.success).toBe(false);
      const errorsFloor = (resFloor as any).errors;
      expect(errorsFloor?._form?.[0]).toContain('Только Владелец (OWNER) имеет права');
    });

    it('blocks non-OWNER staff from modifying Telegram bot token, webhook secret, or Alfa-Bank credentials', async () => {
      mockUser.role = 'SUPPORT';

      // 1. Attempt to change Telegram Bot Token
      const formBot = new FormData();
      formBot.set('tenantId', 'smmplan');
      formBot.set('telegramBotToken', '123456789:ABCDEF1234567890abcdef');

      const resBot = await updateGlobalSettings(formBot);
      expect(resBot.success).toBe(false);
      expect((resBot as any).errors?._form?.[0]).toContain('Только Владелец (OWNER) имеет права');

      // 2. Attempt to change Webhook Secret
      const formHook = new FormData();
      formHook.set('tenantId', 'smmplan');
      formHook.set('inboundEmailWebhookSecret', 'malicious_secret_token');

      const resHook = await updateGlobalSettings(formHook);
      expect(resHook.success).toBe(false);
      expect((resHook as any).errors?._form?.[0]).toContain('Только Владелец (OWNER) имеет права');

      // 3. Attempt to change Alfa-Bank API Key
      const formAlfa = new FormData();
      formAlfa.set('tenantId', 'smmplan');
      formAlfa.set('alfaBankApiKey', 'malicious_alfa_key');

      const resAlfa = await updateGlobalSettings(formAlfa);
      expect(resAlfa.success).toBe(false);
      expect((resAlfa as any).errors?._form?.[0]).toContain('Только Владелец (OWNER) имеет права');
    });

    it('allows non-OWNER staff to edit non-financial general settings', async () => {
      mockUser.role = 'SUPPORT';

      const formSupport = new FormData();
      formSupport.set('tenantId', 'smmplan');
      formSupport.set('siteDescription', 'Обновленное описание от службы поддержки');
      formSupport.set('contactSupportEmail', 'support-line2@smmplan.pro');

      const res = await updateGlobalSettings(formSupport);
      expect(res.success).toBe(true);

      const updated = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      expect(updated?.siteDescription).toBe('Обновленное описание от службы поддержки');
      expect(updated?.contactSupportEmail).toBe('support-line2@smmplan.pro');
    });

    it('allows OWNER to modify financial gateways, bot tokens, and thresholds', async () => {
      mockUser.role = 'OWNER';

      const formOwner = new FormData();
      formOwner.set('tenantId', 'smmplan');
      formOwner.set('yookassaShopId', '887766');
      formOwner.set('safetyFloor', '1.25');
      formOwner.set('taxRate', '7.0');
      formOwner.set('telegramBotToken', '123456789:AAFlzAbCdEfGhIjKlMnOpQrStUv');

      const res = await updateGlobalSettings(formOwner);
      expect(res.success).toBe(true);

      const updated = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      expect(updated?.yookassaShopId).toBe('887766');
      expect(updated?.safetyFloor).toBe(1.25);
      expect(updated?.taxRate).toBe(7.0);
      expect(updated?.telegramBotToken).toBeDefined();
    });

    it('enforces SSRF defense on SMTP host (disallows localhost/private IPs)', async () => {
      mockUser.role = 'OWNER';

      const formSsrf = new FormData();
      formSsrf.set('tenantId', 'smmplan');
      formSsrf.set('smtpHost', '127.0.0.1');

      const resSsrf = await updateGlobalSettings(formSsrf);
      expect(resSsrf.success).toBe(false);
      const errorsSsrf = (resSsrf as any).errors;
      expect(errorsSsrf?.smtpHost?.[0]).toContain('локальные и приватные адреса запрещены');
    });

    it('enforces SSRF defense on Gemini Proxy URL (disallows localhost/private IPs)', async () => {
      mockUser.role = 'OWNER';

      const formSsrf = new FormData();
      formSsrf.set('tenantId', 'smmplan');
      formSsrf.set('geminiProxy', 'http://127.0.0.1:8080');

      const resSsrf = await updateGlobalSettings(formSsrf);
      expect(resSsrf.success).toBe(false);
      const errorsSsrf = (resSsrf as any).errors;
      expect(errorsSsrf?.geminiProxy?.[0]).toContain('локальные и приватные адреса запрещены');
    });
  });

  describe('7. React useActionState Invocation & SettingsCard Dual Signature', () => {
    it('successfully processes updateGlobalSettings called with (prevState, formData)', async () => {
      mockUser.role = 'OWNER';

      const formData = new FormData();
      formData.set('tenantId', 'flux');
      formData.set('siteDescription', 'SMMflux updated via useActionState');
      formData.set('contactSupportEmail', 'support-state@smmflux.ru');

      // Simulates React 19 useActionState calling the action with (prevState, formData)
      const prevState = { success: true };
      const res = await updateGlobalSettings(prevState, formData);
      expect(res.success).toBe(true);

      const updated = await db.systemSettings.findUnique({ where: { id: 'flux' } });
      expect(updated?.siteDescription).toBe('SMMflux updated via useActionState');
      expect(updated?.contactSupportEmail).toBe('support-state@smmflux.ru');

      // smmplan is untouched
      const plan = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      expect(plan?.siteDescription).not.toBe('SMMflux updated via useActionState');
    });

    it('rejects invalid or empty invocation with proper error', async () => {
      const resNull = await updateGlobalSettings(null, null);
      expect(resNull.success).toBe(false);
      expect((resNull as any).errors?._form?.[0]).toBe('Некорректные данные формы');
    });
  });

  describe('8. Support Templates Multi-Tenant CRUD Isolation & IDOR Guards', () => {
    beforeEach(async () => {
      // Clean up templates for test repeatability
      await db.supportTemplate.deleteMany({});
    });

    it('creates support templates strictly isolated by tenantId', async () => {
      mockUser.role = 'SUPPORT';
      mockUser.tenantId = 'smmplan';

      const formPlan = new FormData();
      formPlan.set('tenantId', 'smmplan');
      formPlan.set('shortcut', 'hello-plan');
      formPlan.set('label', 'Приветствие SMMplan');
      formPlan.set('text', 'Здравствуйте! Чем помочь на smmplan?');

      const resPlan = await upsertTemplate(formPlan);
      expect(resPlan.success).toBe(true);
      expect((resPlan as any).data?.tenantId).toBe('smmplan');

      // Create template for flux
      mockUser.tenantId = 'flux';
      const formFlux = new FormData();
      formFlux.set('tenantId', 'flux');
      formFlux.set('shortcut', 'hello-flux');
      formFlux.set('label', 'Приветствие SMMflux');
      formFlux.set('text', 'Здравствуйте! Чем помочь на smmflux?');

      const resFlux = await upsertTemplate(formFlux);
      expect(resFlux.success).toBe(true);
      expect((resFlux as any).data?.tenantId).toBe('flux');

      // getTemplates('smmplan') must only return smmplan template
      const planTemplates = await getTemplates('smmplan');
      expect(Array.isArray(planTemplates)).toBe(true);
      if (Array.isArray(planTemplates)) {
        expect(planTemplates.length).toBe(1);
        expect(planTemplates[0].shortcut).toBe('hello-plan');
        expect(planTemplates[0].tenantId).toBe('smmplan');
      }

      // getTemplates('flux') must only return flux template
      const fluxTemplates = await getTemplates('flux');
      expect(Array.isArray(fluxTemplates)).toBe(true);
      if (Array.isArray(fluxTemplates)) {
        expect(fluxTemplates.length).toBe(1);
        expect(fluxTemplates[0].shortcut).toBe('hello-flux');
        expect(fluxTemplates[0].tenantId).toBe('flux');
      }
    });

    it('prevents IDOR: non-OWNER cannot edit or delete template belonging to another brand', async () => {
      // Seed template in smmplan
      const planTemplate = await db.supportTemplate.create({
        data: {
          tenantId: 'smmplan',
          shortcut: 'plan-secret',
          label: 'Секрет Plan',
          text: 'Текст шаблона smmplan',
        }
      });

      // Operator on flux tries to overwrite smmplan template
      mockUser.role = 'SUPPORT';
      mockUser.tenantId = 'flux';

      const attackForm = new FormData();
      attackForm.set('id', planTemplate.id);
      attackForm.set('tenantId', 'flux');
      attackForm.set('shortcut', 'hacked-shortcut');
      attackForm.set('label', 'Взлом шаблона');
      attackForm.set('text', 'Текст переписан');

      const editRes = await upsertTemplate(attackForm);
      expect(editRes.success).toBe(false);
      expect((editRes as any).error).toContain('Запрещено изменять шаблон другого бренда');

      // Verify template was not modified
      const intact = await db.supportTemplate.findUnique({ where: { id: planTemplate.id } });
      expect(intact?.shortcut).toBe('plan-secret');

      // Operator on flux tries to delete smmplan template
      const deleteForm = new FormData();
      deleteForm.set('id', planTemplate.id);
      deleteForm.set('tenantId', 'flux');

      const deleteRes = await deleteTemplate(deleteForm);
      expect(deleteRes.success).toBe(false);
      expect((deleteRes as any).error).toContain('Запрещено удалять шаблон другого бренда');

      // Verify template still exists in DB
      const stillExists = await db.supportTemplate.findUnique({ where: { id: planTemplate.id } });
      expect(stillExists).not.toBeNull();
    });
  });

  describe('9. Telegram Security Isolation (updateTelegramSecurityAction)', () => {
    it('isolates telegram security config per tenant and logs audit with tenantId', async () => {
      mockUser.role = 'OWNER';
      mockAuditAdminAwaitable.mockClear();

      const resFlux = await updateTelegramSecurityAction({
        webhookSecret: 'flux-secret-999_strong_key',
        allowedIps: ['195.201.10.1'],
        rateLimitPerMin: 45,
        maxMessageLength: 2048,
        telegramMaintenanceMode: true,
        telegramLogErrors: true,
        telegramEnableCsat: true,
        telegramEnableSmartBind: false,
      }, 'flux');

      expect(resFlux.success).toBe(true);

      const fluxSettings = await db.systemSettings.findUnique({ where: { id: 'flux' } });
      expect(fluxSettings?.telegramRateLimitPerMin).toBe(45);
      expect(fluxSettings?.telegramMaintenanceMode).toBe(true);

      // smmplan settings MUST remain unchanged
      const planSettings = await db.systemSettings.findUnique({ where: { id: 'smmplan' } });
      expect(planSettings?.telegramRateLimitPerMin).not.toBe(45);
      expect(planSettings?.telegramMaintenanceMode).toBe(false);

      // Verify audit call recorded tenantId: 'flux'
      expect(mockAuditAdminAwaitable).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'flux',
          target: 'security_config_flux',
        })
      );
    });
  });

  describe('10. Telegram Bot Diagnostics & Disconnect Tenant Scoping', () => {
    it('disconnectTelegramBotAction passes tenantId to audit log', async () => {
      mockUser.role = 'OWNER';
      mockAuditAdminAwaitable.mockClear();

      const res = await disconnectTelegramBotAction('flux');
      expect(res.success).toBe(true);

      expect(mockAuditAdminAwaitable).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TELEGRAM_BOT_DISCONNECTED',
          target: 'flux',
          tenantId: 'flux',
        })
      );
    });

    it('testTelegramBotConnectionAction does not use smmplan env token when testing flux', async () => {
      mockUser.role = 'SUPPORT';
      // Ensure flux has no bot token in DB
      await db.systemSettings.update({
        where: { id: 'flux' },
        data: { telegramBotToken: null }
      });

      // Mock process.env.TELEGRAM_BOT_TOKEN
      const origEnv = process.env.TELEGRAM_BOT_TOKEN;
      process.env.TELEGRAM_BOT_TOKEN = '987654321:AABbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqR';

      try {
        const resFlux = await testTelegramBotConnectionAction('flux');
        // Because flux has no token and env fallback is restricted to smmplan,
        // it must report not configured for SMMflux, not attempt to use smmplan's token
        expect(resFlux.success).toBe(false);
        expect((resFlux as any).message).toContain('Токен Telegram-бота для бренда SMMflux не настроен');
      } finally {
        process.env.TELEGRAM_BOT_TOKEN = origEnv;
      }
    });
  });
});

