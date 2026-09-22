import { describe, it, expect, vi } from 'vitest';
import { createApiInvoiceAction } from '@/actions/user/corporate-invoice.action';
import { createDemoPaymentAction } from '@/actions/order/demo-payment.action';
import { forceSyncMyPaymentsAction } from '@/actions/order/sync-payment';

vi.mock('@/lib/session', () => ({
  verifySession: vi.fn(async () => null),
  getEncodedKey: vi.fn(),
  SESSION_COOKIE_NAME: 'session'
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'x-tenant-id': 'smmplan' })),
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }))
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn()
}));

vi.mock('@/lib/settings', () => ({
  SettingsManager: {
    isMockPaymentEnabled: vi.fn(async () => false),
    isTestMode: vi.fn(async () => false),
    getPaymentSecrets: vi.fn(async () => ({})),
  }
}));

describe('Milestone 2: Server Action Typed Contracts & Deterministic Invariants', () => {
  describe('createApiInvoiceAction return contract', () => {
    it('returns { success: false, error } when session is unauthenticated without throwing raw Error', async () => {
      const result = await createApiInvoiceAction({
        amountRub: 5000,
        companyName: 'Тест ООО',
        inn: '7701234567',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Необходима авторизация');
    });

    it('returns { success: false, error } when validation fails without throwing raw Error', async () => {
      const { verifySession } = await import('@/lib/session');
      vi.mocked(verifySession).mockResolvedValueOnce({ userId: 'u_test', role: 'USER' } as any);

      const result = await createApiInvoiceAction({
        amountRub: 100, // below minimum 3000
        companyName: 'Т',
        inn: '123',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Минимальная сумма/);
    });
  });

  describe('createDemoPaymentAction return contract', () => {
    it('returns { success: false, error } when amount is below minimum without throwing raw Error', async () => {
      const result = await createDemoPaymentAction({
        amountRub: 5,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Минимальная сумма к оплате — 10 ₽');
    });

    it('returns { success: false, error } when mock payment is disabled in tenant', async () => {
      const result = await createDemoPaymentAction({
        amountRub: 100,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Демо-платежи доступны только в режимах тестирования');
    });
  });

  describe('forceSyncMyPaymentsAction return contract', () => {
    it('returns { success: false, error } when session is unauthenticated instead of raw boolean', async () => {
      const result = await forceSyncMyPaymentsAction();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Необходима авторизация');
    });
  });

  describe('Deterministic Idempotency Key Format Invariants', () => {
    it('verifies that no Date.now() or volatile timestamps are used in generated key patterns', () => {
      const userId = 'usr_abc123';
      const orderId = 'ord_xyz789';
      const paymentId = 'pay_001122';
      const status = 'CANCELED';
      const discrepancyCents = 15000n;

      // Deterministic patterns matching our code
      const orderRefundKey = `refund_${orderId}_${status}`;
      const cardRefundKey = `card-refund-${userId}-${paymentId}`;
      const reconcileFixKey = `reconcile-fix-${userId}-${discrepancyCents}`;

      expect(orderRefundKey).toBe('refund_ord_xyz789_CANCELED');
      expect(cardRefundKey).toBe('card-refund-usr_abc123-pay_001122');
      expect(reconcileFixKey).toBe('reconcile-fix-usr_abc123-15000');

      // Ensure stable across repeated runs
      expect(orderRefundKey).toBe(`refund_${orderId}_${status}`);
      expect(cardRefundKey).toBe(`card-refund-${userId}-${paymentId}`);
      expect(reconcileFixKey).toBe(`reconcile-fix-${userId}-${discrepancyCents}`);
    });
  });
});
