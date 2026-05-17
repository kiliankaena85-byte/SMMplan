import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsProvider } from '../../src/lib/settings';
import { db } from '../../src/lib/db';

// Mock the Prisma DB client
vi.mock('../../src/lib/db', () => ({
  db: {
    systemSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
    }
  }
}));

describe('SettingsProvider (Dynamic Branding)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Invalidate cached settings
    // @ts-ignore - access private/protected property for testing purposes
    SettingsProvider.cachedSettings = null;
    // @ts-ignore
    SettingsProvider.lastFetch = 0;
  });

  it('should throw if DB is inaccessible', async () => {
    // Simulate DB failure
    (db.systemSettings.findUnique as any).mockRejectedValue(new Error('DB Error'));

    await expect(SettingsProvider.getContactAndLegalSettings()).rejects.toThrow('DB Error');
  });

  it('should return default values from create if DB is empty but accessible', async () => {
    (db.systemSettings.findUnique as any).mockResolvedValue(null);
    (db.systemSettings.create as any).mockResolvedValue({
      siteName: 'Smmplan Lite',
      contactSupportEmail: 'support@smmplan.pro',
      legalCompanyName: 'Smmplan Lite'
    });

    const settings = await SettingsProvider.getContactAndLegalSettings();

    expect(settings.SITE_NAME).toBe('Smmplan Lite');
    expect(settings.SUPPORT_EMAIL).toBe('support@smmplan.pro');
  });

  it('should map custom DB fields correctly to constants', async () => {
    (db.systemSettings.findUnique as any).mockResolvedValue({
      siteName: 'Custom Brand',
      contactSupportEmail: 'hello@custombrand.com',
      contactPrivacyEmail: 'privacy@custombrand.com',
      contactTelegramBot: 'custom_bot',
      contactTelegramChannel: 'custom_channel',
      legalCompanyName: 'LLC Custom Brand'
    });

    const settings = await SettingsProvider.getContactAndLegalSettings();

    expect(settings.SITE_NAME).toBe('Custom Brand');
    expect(settings.SUPPORT_EMAIL).toBe('hello@custombrand.com');
    expect(settings.PRIVACY_EMAIL).toBe('privacy@custombrand.com');
    expect(settings.TELEGRAM_SUPPORT_BOT).toBe('custom_bot');
    expect(settings.TELEGRAM_SUPPORT_CHANNEL).toBe('custom_channel');
    expect(settings.COMPANY_NAME).toBe('LLC Custom Brand');
  });

});
