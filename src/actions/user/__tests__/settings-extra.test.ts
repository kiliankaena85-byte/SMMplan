import { describe, it, expect, vi, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import {
  updateCompanyRequisitesAction,
  updateB2bWebhookAction,
  confirm152FzConsentAction,
} from '../settings-extra';

vi.mock('@/lib/session', () => ({
  verifySession: vi.fn(),
}));

vi.mock('@/utils/ip', () => ({
  getClientIp: vi.fn().mockResolvedValue('185.220.100.5'),
}));

async function createTestUser() {
  const uniqueEmail = `settings_test_${Date.now()}_${Math.random().toString(36).substring(7)}@smmplan.local`;
  return await db.user.create({
    data: {
      email: uniqueEmail,
      role: 'USER',
      isActive: true,
    },
  });
}

describe('Settings Extra Server Actions', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
  });

  describe('updateCompanyRequisitesAction', () => {
    it('should return error if unauthenticated', async () => {
      vi.mocked(verifySession).mockResolvedValue(null);
      const res = await updateCompanyRequisitesAction({ companyName: 'ООО Рога' });
      expect(res.success).toBe(false);
      expect(res.error).toBe('Авторизуйтесь для выполнения этого действия');
    });

    it('should reject invalid INN format', async () => {
      const user = await createTestUser();
      vi.mocked(verifySession).mockResolvedValue({ userId: user.id });
      const res = await updateCompanyRequisitesAction({ inn: '12345' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('ИНН должен содержать ровно 10 цифр');
    });

    it('should reject invalid KPP format', async () => {
      const user = await createTestUser();
      vi.mocked(verifySession).mockResolvedValue({ userId: user.id });
      const res = await updateCompanyRequisitesAction({ inn: '7701234567', kpp: '123' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('КПП должен содержать ровно 9 цифр');
    });

    it('should update requisites successfully with 10-digit INN and 9-digit KPP', async () => {
      const user = await createTestUser();
      vi.mocked(verifySession).mockResolvedValue({ userId: user.id });
      const res = await updateCompanyRequisitesAction({
        companyName: 'ООО Рога и Копыта',
        inn: '7701234567',
        kpp: '770101001',
        legalAddress: 'г. Москва, ул. Пушкина, д. 10',
      });
      expect(res.success).toBe(true);

      const updated = await db.user.findUnique({ where: { id: user.id } });
      expect(updated?.companyName).toBe('ООО Рога и Копыта');
      expect(updated?.inn).toBe('7701234567');
      expect(updated?.kpp).toBe('770101001');
      expect(updated?.legalAddress).toBe('г. Москва, ул. Пушкина, д. 10');
    });

    it('should accept 12-digit INN for IP / sole traders', async () => {
      const user = await createTestUser();
      vi.mocked(verifySession).mockResolvedValue({ userId: user.id });
      const res = await updateCompanyRequisitesAction({
        companyName: 'ИП Иванов И.И.',
        inn: '770123456789',
      });
      expect(res.success).toBe(true);

      const updated = await db.user.findUnique({ where: { id: user.id } });
      expect(updated?.inn).toBe('770123456789');
    });
  });

  describe('updateB2bWebhookAction', () => {
    it('should return error if unauthenticated', async () => {
      vi.mocked(verifySession).mockResolvedValue(null);
      const res = await updateB2bWebhookAction({ webhookUrl: 'https://example.com/webhook' });
      expect(res.success).toBe(false);
    });

    it('should reject non-HTTPS URLs', async () => {
      const user = await createTestUser();
      vi.mocked(verifySession).mockResolvedValue({ userId: user.id });
      const res = await updateB2bWebhookAction({ webhookUrl: 'http://insecure.com/webhook' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('https://');
    });

    it('should create b2bConfig and generate secret for valid HTTPS URL', async () => {
      const user = await createTestUser();
      vi.mocked(verifySession).mockResolvedValue({ userId: user.id });
      const res = await updateB2bWebhookAction({ webhookUrl: 'https://example.com/webhook' });
      expect(res.success).toBe(true);
      expect(res.webhookUrl).toBe('https://example.com/webhook');
      expect(res.webhookSecret).toBeDefined();
      expect(typeof res.webhookSecret).toBe('string');
      expect(res.webhookSecret?.length).toBeGreaterThan(10);
    });

    it('should regenerate secret when requested', async () => {
      const user = await createTestUser();
      vi.mocked(verifySession).mockResolvedValue({ userId: user.id });
      const res1 = await updateB2bWebhookAction({ webhookUrl: 'https://example.com/webhook' });
      const secret1 = res1.webhookSecret;

      const res2 = await updateB2bWebhookAction({
        webhookUrl: 'https://example.com/webhook',
        regenerateSecret: true,
      });
      const secret2 = res2.webhookSecret;

      expect(secret1).not.toBe(secret2);
    });
  });

  describe('confirm152FzConsentAction', () => {
    it('should return error if unauthenticated', async () => {
      vi.mocked(verifySession).mockResolvedValue(null);
      const res = await confirm152FzConsentAction();
      expect(res.success).toBe(false);
    });

    it('should record tosAcceptedAt and tosAcceptedIp', async () => {
      const user = await createTestUser();
      vi.mocked(verifySession).mockResolvedValue({ userId: user.id });
      const res = await confirm152FzConsentAction();
      expect(res.success).toBe(true);
      expect(res.tosAcceptedAt).toBeDefined();
      expect(res.tosAcceptedIp).toBe('185.220.100.5');

      const updated = await db.user.findUnique({ where: { id: user.id } });
      expect(updated?.tosAcceptedAt).not.toBeNull();
      expect(updated?.tosAcceptedIp).toBe('185.220.100.5');
    });
  });
});
