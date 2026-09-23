import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { getClientIp } from '@/utils/ip';
import { SettingsProvider } from '@/lib/settings';

import {
  updateTaxRequisitesAction,
  updateCompanyRequisitesAction,
} from '@/actions/user/settings/requisites.action';
import { updateApiWebhookAction } from '@/actions/user/settings/webhook.action';
import { confirm152FzConsentAction } from '@/actions/user/settings/consent.action';
import {
  generateApiKeyAction,
  resetApiKeyAction,
  revokeApiKeyAction,
} from '@/actions/user/settings/api-key.action';
import {
  getTelegramBindDetailsAction,
  updateTelegramNotificationSettingsAction,
  unbindTelegramAction,
} from '@/actions/user/settings/telegram.action';

// Also test the backward-compatibility facade
import * as settingsExtraFacade from '@/actions/user/settings-extra';

vi.mock('@/lib/session', () => ({
  verifySession: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    apiConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    authToken: {
      create: vi.fn(),
    },
    adminAuditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/utils/ip', () => ({
  getClientIp: vi.fn().mockResolvedValue('127.0.0.1'),
}));

vi.mock('@/lib/settings', () => ({
  SettingsProvider: {
    getTenantId: vi.fn().mockResolvedValue('smmplan'),
    getContactAndLegalSettings: vi.fn().mockResolvedValue({
      TELEGRAM_SUPPORT_BOT: 'smmplan_support_bot',
    }),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Decomposed User Settings Server Actions Unit Suite', () => {
  const mockUserId = 'user-test-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifySession).mockResolvedValue({ userId: mockUserId } as any);
  });

  describe('requisites.action.ts', () => {
    it('rejects unauthenticated requests', async () => {
      vi.mocked(verifySession).mockResolvedValue(null);
      const res = await updateTaxRequisitesAction({ companyName: 'ООО Тест' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Авторизуйтесь');
    });

    it('validates INN length (10 or 12 digits)', async () => {
      const res = await updateTaxRequisitesAction({ inn: '123' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('ИНН');
    });

    it('validates KPP length (9 digits)', async () => {
      const res = await updateTaxRequisitesAction({ kpp: '12345' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('КПП');
    });

    it('validates OGRN length (13 or 15 digits)', async () => {
      const res = await updateTaxRequisitesAction({ ogrn: '12345' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('ОГРН');
    });

    it('updates requisites with valid data and calls db.user.update', async () => {
      vi.mocked(db.user.update).mockResolvedValue({ id: mockUserId } as any);

      const res = await updateTaxRequisitesAction({
        companyName: 'ООО Рога и Копыта',
        inn: '7701234567',
        kpp: '770101001',
        ogrn: '1027700132195',
        legalAddress: 'г. Москва, ул. Ленина, д. 1',
      });

      expect(res.success).toBe(true);
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          companyName: 'ООО Рога и Копыта',
          inn: '7701234567',
          kpp: '770101001',
          ogrn: '1027700132195',
          legalAddress: 'г. Москва, ул. Ленина, д. 1',
        },
      });
    });

    it('delegates updateCompanyRequisitesAction alias to updateTaxRequisitesAction', async () => {
      vi.mocked(db.user.update).mockResolvedValue({ id: mockUserId } as any);
      const res = await updateCompanyRequisitesAction({ companyName: 'ИП Иванов' });
      expect(res.success).toBe(true);
    });
  });

  describe('webhook.action.ts', () => {
    it('rejects unauthenticated requests', async () => {
      vi.mocked(verifySession).mockResolvedValue(null);
      const res = await updateApiWebhookAction({ webhookUrl: 'https://example.com' });
      expect(res.success).toBe(false);
    });

    it('rejects non-HTTPS webhook URLs', async () => {
      const res = await updateApiWebhookAction({ webhookUrl: 'http://insecure.example.com' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('https://');
    });

    it('preserves existing webhookUrl when only isWebhookActive is updated', async () => {
      vi.mocked(db.apiConfig.findUnique).mockResolvedValue({
        userId: mockUserId,
        webhookUrl: 'https://existing.example.com/hook',
        webhookSecret: 'existing_sec_123',
        isWebhookActive: true,
      } as any);

      vi.mocked(db.apiConfig.upsert).mockResolvedValue({
        webhookUrl: 'https://existing.example.com/hook',
        webhookSecret: 'existing_sec_123',
        isWebhookActive: false,
      } as any);

      const res = await updateApiWebhookAction({ isWebhookActive: false });

      expect(res.success).toBe(true);
      expect(db.apiConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            webhookUrl: 'https://existing.example.com/hook',
            isWebhookActive: false,
          }),
        })
      );
    });

    it('regenerates secret when requested', async () => {
      vi.mocked(db.apiConfig.findUnique).mockResolvedValue({
        userId: mockUserId,
        webhookUrl: 'https://existing.example.com/hook',
        webhookSecret: 'old_secret',
        isWebhookActive: true,
      } as any);

      (db.apiConfig.upsert as any).mockImplementation(async (args: any) => ({
        webhookUrl: args.update.webhookUrl,
        webhookSecret: args.update.webhookSecret,
        isWebhookActive: args.update.isWebhookActive,
      }));

      const res = await updateApiWebhookAction({ regenerateSecret: true });

      expect(res.success).toBe(true);
      expect(res.webhookSecret).not.toBe('old_secret');
      expect(typeof res.webhookSecret).toBe('string');
      expect(res.webhookSecret?.length).toBe(48); // 24 bytes hex
    });
  });

  describe('consent.action.ts', () => {
    it('records 152-FZ consent with client IP and timestamp', async () => {
      const fakeDate = new Date('2026-09-20T10:00:00Z');
      vi.mocked(db.user.update).mockResolvedValue({
        tosAcceptedAt: fakeDate,
        tosAcceptedIp: '127.0.0.1',
      } as any);

      const res = await confirm152FzConsentAction();

      expect(res.success).toBe(true);
      expect(res.tosAcceptedIp).toBe('127.0.0.1');
      expect(db.user.update).toHaveBeenCalled();
    });
  });

  describe('api-key.action.ts', () => {
    it('generates a key starting with smm_ and stores SHA-256 hash', async () => {
      vi.mocked(db.user.update).mockResolvedValue({ id: mockUserId } as any);

      const res = await generateApiKeyAction();

      expect(res.success).toBe(true);
      expect(res.apiKey).toMatch(/^smm_[0-9a-f]{64}$/);
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          apiKeyHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        }),
      });
    });

    it('delegates resetApiKeyAction to generateApiKeyAction', async () => {
      vi.mocked(db.user.update).mockResolvedValue({ id: mockUserId } as any);
      const res = await resetApiKeyAction();
      expect(res.success).toBe(true);
      expect(res.apiKey).toMatch(/^smm_/);
    });

    it('revokes API key by clearing apiKeyHash to null', async () => {
      vi.mocked(db.user.update).mockResolvedValue({ id: mockUserId } as any);

      const res = await revokeApiKeyAction();

      expect(res.success).toBe(true);
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { apiKeyHash: null },
      });
    });
  });

  describe('telegram.action.ts', () => {
    it('generates a smart bind deep link with tg_bind_ token', async () => {
      vi.mocked(db.authToken.create).mockResolvedValue({} as any);

      const res = await getTelegramBindDetailsAction();

      expect(res.success).toBe(true);
      expect(res.botUsername).toBe('smmplan_support_bot');
      expect(res.bindToken).toMatch(/^tg_bind_[0-9a-f]{32}$/);
      expect(res.deepLink).toContain('https://t.me/smmplan_support_bot?start=tg_bind_');
      expect(db.authToken.create).toHaveBeenCalled();
    });

    it('updates telegram notification settings', async () => {
      vi.mocked(db.user.update).mockResolvedValue({
        telegramNotifyOrders: true,
        telegramNotifyBalance: false,
        telegramNotifyTickets: true,
      } as any);

      const res = await updateTelegramNotificationSettingsAction({
        notifyOrders: true,
        notifyBalance: false,
        notifyTickets: true,
      });

      expect(res.success).toBe(true);
      expect(res.telegramNotifyOrders).toBe(true);
      expect(res.telegramNotifyBalance).toBe(false);
      expect(res.telegramNotifyTickets).toBe(true);
    });

    it('unbinds telegram account and creates an admin audit log', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        telegramId: '987654321',
        email: 'user@smmplan.pro',
      } as any);
      vi.mocked(db.user.update).mockResolvedValue({} as any);
      vi.mocked(db.adminAuditLog.create).mockResolvedValue({} as any);

      const res = await unbindTelegramAction();

      expect(res.success).toBe(true);
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { telegramId: null },
      });
      expect(db.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_UNBIND_TELEGRAM',
          oldValue: JSON.stringify({ telegramId: '987654321' }),
          newValue: JSON.stringify({ telegramId: null }),
        }),
      });
    });
  });

  describe('settings-extra.ts facade', () => {
    it('exports all 10 actions as functions delegating to sub-modules', () => {
      expect(typeof settingsExtraFacade.updateTaxRequisitesAction).toBe('function');
      expect(typeof settingsExtraFacade.updateCompanyRequisitesAction).toBe('function');
      expect(typeof settingsExtraFacade.updateApiWebhookAction).toBe('function');
      expect(typeof settingsExtraFacade.confirm152FzConsentAction).toBe('function');
      expect(typeof settingsExtraFacade.generateApiKeyAction).toBe('function');
      expect(typeof settingsExtraFacade.resetApiKeyAction).toBe('function');
      expect(typeof settingsExtraFacade.revokeApiKeyAction).toBe('function');
      expect(typeof settingsExtraFacade.getTelegramBindDetailsAction).toBe('function');
      expect(typeof settingsExtraFacade.updateTelegramNotificationSettingsAction).toBe('function');
      expect(typeof settingsExtraFacade.unbindTelegramAction).toBe('function');
    });
  });
});
