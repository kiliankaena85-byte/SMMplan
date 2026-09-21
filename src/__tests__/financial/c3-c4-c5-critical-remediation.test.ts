import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { RefundPolicyService } from '@/services/financial/refund-policy.service';
import { RetryCheckoutService } from '@/services/orders/retry-checkout.service';
import * as notifications from '@/lib/notifications';
import { SettingsManager } from '@/lib/settings';
import * as ssrfGuard from '@/lib/security/ssrf-guard';
import { reconcileStalePayments } from '@/workers/payment-reconciliation';

describe('Round 2 Critical Remediations (C-3, C-4, C-5)', () => {
  describe('C-3: YooKassa Payment Reconciliation Security & Mock Auth Elimination', () => {
    let testUserId: string;

    beforeEach(async () => {
      vi.restoreAllMocks();
      const user = await db.user.upsert({
        where: { email_tenantId: { email: 'c3_recon@smmplan.local', tenantId: 'smmplan' } },
        create: { email: 'c3_recon@smmplan.local', tenantId: 'smmplan' },
        update: {},
      });
      testUserId = user.id;
    });

    it('triggers CRITICAL alert and skips remote call in production when credentials are empty', async () => {
      const payment = await db.payment.create({
        data: {
          userId: testUserId,
          amount: BigInt(25000),
          status: 'PENDING',
          gateway: 'yookassa',
          gatewayId: `yoo-cred-missing-${Date.now()}`,
          createdAt: new Date(Date.now() - 30 * 60 * 1000),
          tenantId: 'smmplan',
        },
      });

      // Mock production env and missing secrets
      vi.stubEnv('NODE_ENV', 'production');
      vi.spyOn(SettingsManager, 'getPaymentSecrets').mockResolvedValue({} as any);
      vi.spyOn(SettingsManager, 'isTestMode').mockResolvedValue(false);
      const alertSpy = vi.spyOn(notifications, 'sendAdminAlert').mockImplementation(() => {});
      const fetchSpy = vi.spyOn(ssrfGuard, 'safeFetch');

      try {
        const report = await reconcileStalePayments();
        expect(report.errors).toBeGreaterThanOrEqual(1);
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('CRITICAL: YooKassa Reconciliation Credentials Missing'),
          'CRITICAL',
          'smmplan'
        );
        // Ensure safeFetch was NOT called with fake mock_auth
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it('triggers CRITICAL alert when YooKassa returns 401 Unauthorized', async () => {
      const payment = await db.payment.create({
        data: {
          userId: testUserId,
          amount: BigInt(15000),
          status: 'PENDING',
          gateway: 'yookassa',
          gatewayId: `yoo-401-${Date.now()}`,
          createdAt: new Date(Date.now() - 25 * 60 * 1000),
          tenantId: 'smmplan',
        },
      });

      vi.spyOn(SettingsManager, 'getPaymentSecrets').mockResolvedValue({
        yookassaShopId: '123456',
        yookassaSecretKey: 'live_invalid_secret',
      } as any);
      vi.spyOn(SettingsManager, 'isTestMode').mockResolvedValue(false);
      const alertSpy = vi.spyOn(notifications, 'sendAdminAlert').mockImplementation(() => {});
      vi.spyOn(ssrfGuard, 'safeFetch').mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

      const report = await reconcileStalePayments();
      expect(report.errors).toBeGreaterThanOrEqual(1);
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL: YooKassa Auth Failed during Reconciliation'),
        'CRITICAL',
        'smmplan'
      );
    });
  });

  describe('C-4: Retry Checkout Deterministic Idempotency Key', () => {
    it('generates a stable deterministic idempotency key without Date.now() timestamp', async () => {
      const user = await db.user.create({
        data: {
          email: `retry-idemp-${Date.now()}@smmplan.local`,
          balance: 100000,
          tenantId: 'smmplan',
        },
      });
      const category = await db.category.create({ data: { name: `Cat-${Date.now()}` } });
      const service = await db.service.create({
        data: { name: `Svc-${Date.now()}`, rate: 10, minQty: 10, maxQty: 100, categoryId: category.id },
      });

      const order = await db.order.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          link: 'https://t.me/channel',
          quantity: 100,
          charge: 5000,
          providerCost: 100,
          status: 'AWAITING_PAYMENT',
          tenantId: 'smmplan',
        },
      });

      const input = {
        orderId: order.id,
        gateway: 'balance',
        sessionUserId: user.id,
        currentTenantId: 'smmplan',
        consentIp: '127.0.0.1',
        consentUserAgent: 'vitest',
        reqHeaders: { get: () => 'localhost:3000' },
      };

      // First retry execution
      await RetryCheckoutService.execute(input);

      // Verify the ledger entry was created with deterministic key
      const entries = await db.ledgerEntry.findMany({
        where: { userId: user.id },
      });
      const retryEntry = entries.find(e => e.idempotencyKey?.startsWith('retry-balance-'));
      expect(retryEntry).toBeDefined();
      expect(retryEntry?.idempotencyKey).toBe(`retry-balance-${order.id}`);
      expect(retryEntry?.idempotencyKey).not.toContain('undefined');
      expect(retryEntry?.idempotencyKey).not.toMatch(/\d{13}$/); // No Date.now() timestamp suffix
    });
  });

  describe('C-5: Refund Policy Cumulative Ledger Tracking & Status Idempotency', () => {
    it('prevents double full refund on transition from PARTIAL to CANCELED', async () => {
      const user = await db.user.create({
        data: {
          email: `refund-user-${Date.now()}@smmplan.local`,
          balance: 0,
          totalSpent: 10000,
          tenantId: 'smmplan',
        },
      });

      const order = {
        id: `ord-partial-cancel-${Date.now()}`,
        userId: user.id,
        charge: 10000, // 100.00 RUB
        quantity: 1000,
        remains: 400,  // 40% unperformed
        status: 'PARTIAL',
        tenantId: 'smmplan',
      };

      // 1. Initial partial refund: 40% of 10000 = 4000 cents
      const partResult = await RefundPolicyService.processRefund(order);
      expect(partResult).toBeDefined();

      const userAfterPart = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(userAfterPart.balance).toBe(BigInt(4000));

      // 2. Order transitions to CANCELED
      order.status = 'CANCELED';
      order.remains = 1000;
      const cancelResult = await RefundPolicyService.processRefund(order, 'Provider canceled remaining');
      expect(cancelResult).toBeDefined();

      const userAfterCancel = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      // Total balance must be exactly 10000 (4000 partial + 6000 remainder), NOT 14000!
      expect(userAfterCancel.balance).toBe(BigInt(10000));

      // 3. Repeated CANCELED call must return null (zero duplicate refund)
      const repeatCancelResult = await RefundPolicyService.processRefund(order);
      expect(repeatCancelResult).toBeNull();

      const userFinal = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(userFinal.balance).toBe(BigInt(10000));
    });

    it('returns null on repeated PARTIAL call with unchanged remains', async () => {
      const user = await db.user.create({
        data: {
          email: `refund-repeat-${Date.now()}@smmplan.local`,
          balance: 0,
          totalSpent: 5000,
          tenantId: 'smmplan',
        },
      });

      const order = {
        id: `ord-repeat-part-${Date.now()}`,
        userId: user.id,
        charge: 5000,
        quantity: 100,
        remains: 50, // 50% = 2500 cents
        status: 'PARTIAL',
        tenantId: 'smmplan',
      };

      // First partial refund
      const res1 = await RefundPolicyService.processRefund(order);
      expect(res1).toBeDefined();

      // Second identical partial refund poll
      const res2 = await RefundPolicyService.processRefund(order);
      expect(res2).toBeNull();

      const userFinal = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(userFinal.balance).toBe(BigInt(2500));
    });
  });
});
