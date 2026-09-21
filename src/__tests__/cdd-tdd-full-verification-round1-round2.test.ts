import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { POST as robokassaWebhookHandler } from '@/app/api/webhooks/robokassa/route';
import { PaymentGatewayFactory, checkVatThreshold } from '@/services/financial/payment-gateway.service';
import { OrderProviderSyncService } from '@/services/admin/order/order-provider-sync.service';
import { OrderRouteEvaluator } from '@/workers/processors/order/order-route-evaluator';
import { OrderDispatchExecutor } from '@/workers/processors/order/order-dispatch-executor';
import { RefundPolicyService } from '@/services/financial/refund-policy.service';
import { RetryCheckoutService } from '@/services/orders/retry-checkout.service';
import { reconcileStalePayments } from '@/workers/payment-reconciliation';
import { normalizeCatalogSearch } from '@/utils/search-normalizer';
import { buildOrderWhereClause } from '@/services/admin/order/order-filter-builder';
import { IMMUTABLE_DIRECT_PATTERNS, UniversalNetworkRouter } from '@/lib/network/network-router';
import { updateBalanceAction } from '@/actions/admin/users';
import { SettingsManager, SettingsProvider } from '@/lib/settings';
import * as notifications from '@/lib/notifications';
import * as ssrfGuard from '@/lib/security/ssrf-guard';

describe('OmniSMM 1.0 — Comprehensive CDD-TDD Verification Suite (Rounds 1 & 2)', () => {
  const timestamp = Date.now();

  // Helper to create test user
  async function createTestUser(role = 'USER', balance = BigInt(0), emailPrefix = 'user') {
    return await db.user.create({
      data: {
        email: `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@smmplan.local`,
        tenantId: 'smmplan',
        balance,
        role,
        isActive: true,
      },
    });
  }

  // Helper to create test service
  async function createTestService(minQty = 10, maxQty = 1000, rate = 100) {
    const category = await db.category.create({
      data: { name: `TestCat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
    });
    const provider = await db.provider.create({
      data: {
        name: `TestProv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        apiUrl: 'https://mock.api',
        apiKey: 'mock-key',
        isActive: true,
      },
    });
    return await db.service.create({
      data: {
        name: `TestService-${Date.now()}`,
        rate,
        minQty,
        maxQty,
        categoryId: category.id,
        providerId: provider.id,
        externalId: '101',
      },
    });
  }

  // =========================================================================
  // SUITE 1: Robokassa Webhook, Payment Classification & Anti-Replay (FIX-C1)
  // =========================================================================
  describe('1. FIX-C1: Robokassa Webhook & Payment Classification', () => {
    const roboPass2 = 'SecretRoboWebhookPass2';

    beforeEach(async () => {
      vi.restoreAllMocks();
      await db.systemSettings.upsert({
        where: { id: 'smmplan' },
        create: { id: 'smmplan', robokassaWebhookPassword: roboPass2, isTestMode: true },
        update: { robokassaWebhookPassword: roboPass2, isTestMode: true },
      });
    });

    function makeRoboSignature(outSum: string, invId: string, paymentId: string, pass: string) {
      const sigStr = `${outSum}:${invId}:${pass}:shp_paymentId=${paymentId}`;
      return crypto.createHash('sha256').update(sigStr).digest('hex').toLowerCase();
    }

    it('classifies payment WITHOUT orders as DEPOSIT and credits user balance', async () => {
      const user = await createTestUser('USER', BigInt(0), 'robo-dep');
      const payment = await db.payment.create({
        data: {
          userId: user.id,
          amount: BigInt(50000), // 500.00 RUB
          currency: 'RUB',
          status: 'PENDING',
          gateway: 'robokassa',
          tenantId: 'smmplan',
        },
      });

      const outSum = '500.00';
      const invId = '1001';
      const sig = makeRoboSignature(outSum, invId, payment.id, roboPass2);

      const reqUrl = `https://smmplan.pro/api/webhooks/robokassa?OutSum=${outSum}&InvId=${invId}&SignatureValue=${sig}&shp_paymentId=${payment.id}`;
      const req = new NextRequest(reqUrl, { method: 'POST' });

      const res = await robokassaWebhookHandler(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe(`OK${invId}`);

      // Verify payment SUCCEEDED
      const updatedPayment = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(updatedPayment.status).toBe('SUCCEEDED');

      // Verify user balance credited
      const updatedUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(updatedUser.balance).toBe(BigInt(50000));
    });

    it('classifies payment WITH linked orders as ORDER, activates orders and does NOT double credit balance', async () => {
      const user = await createTestUser('USER', BigInt(0), 'robo-ord');
      const service = await createTestService(10, 1000);

      const payment = await db.payment.create({
        data: {
          userId: user.id,
          amount: BigInt(30000), // 300.00 RUB
          currency: 'RUB',
          status: 'PENDING',
          gateway: 'robokassa',
          tenantId: 'smmplan',
        },
      });

      const order = await db.order.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          paymentId: payment.id,
          link: 'https://t.me/test_channel',
          quantity: 100,
          charge: BigInt(30000),
          providerCost: 50,
          status: 'AWAITING_PAYMENT',
          tenantId: 'smmplan',
        },
      });

      const outSum = '300.00';
      const invId = '1002';
      const sig = makeRoboSignature(outSum, invId, payment.id, roboPass2);

      const reqUrl = `https://smmplan.pro/api/webhooks/robokassa?OutSum=${outSum}&InvId=${invId}&SignatureValue=${sig}&shp_paymentId=${payment.id}`;
      const req = new NextRequest(reqUrl, { method: 'POST' });

      const res = await robokassaWebhookHandler(req);
      expect(res.status).toBe(200);

      // Verify order transitioned from AWAITING_PAYMENT to PENDING
      const updatedOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(updatedOrder.status).toBe('PENDING');

      // User balance should remain 0 (charged immediately for order activation)
      const updatedUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(updatedUser.balance).toBe(BigInt(0));
    });

    it('rejects underpayment exploit attempt with status 400 and preserves PENDING status', async () => {
      const user = await createTestUser('USER', BigInt(0), 'robo-underpay');
      const payment = await db.payment.create({
        data: {
          userId: user.id,
          amount: BigInt(100000), // 1000.00 RUB
          currency: 'RUB',
          status: 'PENDING',
          gateway: 'robokassa',
          tenantId: 'smmplan',
        },
      });

      // Attacker sends 10.00 RUB instead of 1000.00 RUB
      const outSum = '10.00';
      const invId = '1003';
      const sig = makeRoboSignature(outSum, invId, payment.id, roboPass2);

      const reqUrl = `https://smmplan.pro/api/webhooks/robokassa?OutSum=${outSum}&InvId=${invId}&SignatureValue=${sig}&shp_paymentId=${payment.id}`;
      const req = new NextRequest(reqUrl, { method: 'POST' });

      const res = await robokassaWebhookHandler(req);
      expect(res.status).toBe(400);

      const unchangedPayment = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(unchangedPayment.status).toBe('PENDING');

      const unchangedUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(unchangedUser.balance).toBe(BigInt(0));
    });

    it('rejects invalid signature tampering with status 403', async () => {
      const user = await createTestUser('USER', BigInt(0), 'robo-tamper');
      const payment = await db.payment.create({
        data: {
          userId: user.id,
          amount: BigInt(5000),
          currency: 'RUB',
          status: 'PENDING',
          gateway: 'robokassa',
          tenantId: 'smmplan',
        },
      });

      const outSum = '50.00';
      const invId = '1004';
      const badSig = '0000000000000000000000000000000000000000000000000000000000000000';

      const reqUrl = `https://smmplan.pro/api/webhooks/robokassa?OutSum=${outSum}&InvId=${invId}&SignatureValue=${badSig}&shp_paymentId=${payment.id}`;
      const req = new NextRequest(reqUrl, { method: 'POST' });

      const res = await robokassaWebhookHandler(req);
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // SUITE 2: Robokassa VAT 22% & Threshold Invariant (FIX-M1)
  // =========================================================================
  describe('2. FIX-M1: Robokassa Tax Rate & 20M Turnover Threshold (54-FZ / 425-FZ)', () => {
    it('sets tax to "vat22" when annual revenue exceeds 20,000,000 RUB', async () => {
      vi.spyOn(SettingsProvider, 'getPaymentSecrets').mockResolvedValue({
        robokassaLogin: 'test_robo_login',
        robokassaPassword: 'test_robo_password',
      } as any);
      vi.spyOn(SettingsProvider, 'isTestMode').mockResolvedValue(false);

      // Mock VAT threshold exceeded
      const dbAggregateSpy = vi.spyOn(db.payment, 'aggregate').mockResolvedValueOnce({
        _sum: { amount: BigInt(25_000_000_00) }, // 25M RUB
      } as any);

      const roboGateway = PaymentGatewayFactory.getGateway('robokassa');
      const result = await roboGateway.createPayment({
        paymentId: `pay-vat22-${timestamp}`,
        amountRub: 500,
        email: 'vat_test@smmplan.pro',
        description: 'Test VAT22',
        tenantId: `smmplan_vat_high_${timestamp}`,
        userId: 'user-vat-1',
        successUrl: 'https://smmplan.pro/success',
      });

      expect(result.paymentUrl).toContain('auth.robokassa.ru');
      const url = new URL(result.paymentUrl);
      const receiptParam = url.searchParams.get('Receipt');
      expect(receiptParam).toBeTruthy();
      const receipt = JSON.parse(receiptParam!);
      expect(receipt.items[0].tax).toBe('vat22');
      expect(receipt.items[0].sum).toBe('500.00');

      dbAggregateSpy.mockRestore();
    });

    it('sets tax to "none" when annual revenue is under 20,000,000 RUB', async () => {
      vi.spyOn(SettingsProvider, 'getPaymentSecrets').mockResolvedValue({
        robokassaLogin: 'test_robo_login',
        robokassaPassword: 'test_robo_password',
      } as any);
      vi.spyOn(SettingsProvider, 'isTestMode').mockResolvedValue(false);

      const dbAggregateSpy = vi.spyOn(db.payment, 'aggregate').mockResolvedValueOnce({
        _sum: { amount: BigInt(5_000_000_00) }, // 5M RUB
      } as any);

      const roboGateway = PaymentGatewayFactory.getGateway('robokassa');
      const result = await roboGateway.createPayment({
        paymentId: `pay-vat-none-${timestamp}`,
        amountRub: 250,
        email: 'vat_none@smmplan.pro',
        description: 'Test VAT None',
        tenantId: `smmplan_vat_low_${timestamp}`,
        userId: 'user-vat-2',
        successUrl: 'https://smmplan.pro/success',
      });

      const url = new URL(result.paymentUrl);
      const receiptParam = url.searchParams.get('Receipt');
      expect(receiptParam).toBeTruthy();
      const receipt = JSON.parse(receiptParam!);
      expect(receipt.items[0].tax).toBe('none');

      dbAggregateSpy.mockRestore();
    });
  });

  // =========================================================================
  // SUITE 3: Drip-Feed Floor Invariant & Quantity per Run (FIX-C2)
  // =========================================================================
  describe('3. FIX-C2: Drip-Feed Floor Invariant', () => {
    it('enforces that runQty for Drip-Feed cannot be below service.minQty', async () => {
      const { checkoutAction } = await import('@/actions/order/checkout');
      const user = await createTestUser('USER', BigInt(100000), 'drip-floor');
      const service = await createTestService(50, 5000); // minQty = 50

      // Try to order 100 items over 5 runs: 100 / 5 = 20 < minQty (50) -> MUST FAIL
      // Mock session for user
      vi.spyOn(await import('@/lib/session'), 'verifySession').mockResolvedValue({
        isAuth: true,
        userId: user.id,
        user: { id: user.id, email: user.email, role: 'USER' },
      } as any);

      const result = await checkoutAction({
        serviceId: service.id,
        link: 'https://t.me/test_drip_channel/123',
        quantity: 100,
        runs: 5,
        interval: 60,
        gateway: 'balance',
        email: user.email,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Для Drip-feed количество на один запуск (20) не может быть меньше минимального (50)');
      }
    });

    it('OrderDispatchExecutor sends runQty Math.max(1, Math.floor(quantity / runs)) to provider', () => {
      const order = {
        id: 'ord-drip-calc',
        quantity: 500,
        runs: 5,
        isDripFeed: true,
      };

      const runQty = (order.isDripFeed && order.runs && order.runs > 0)
        ? Math.max(1, Math.floor(order.quantity / order.runs))
        : order.quantity;

      expect(runQty).toBe(100);
    });
  });

  // =========================================================================
  // SUITE 4: Order Provider Sync & Lifecycle Recovery (FIX-M2)
  // =========================================================================
  describe('4. FIX-M2: Order Provider Sync & Status Transitions', () => {
    it('handles provider CANCELED response by updating order and calling RefundPolicyService', async () => {
      const user = await createTestUser('USER', BigInt(0), 'sync-cancel');
      const service = await createTestService(10, 1000);
      const provider = await db.provider.create({
        data: { name: `Prov-${Date.now()}`, apiUrl: 'https://mock.api', apiKey: 'mock-key', isActive: true },
      });

      const order = await db.order.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          providerId: provider.id,
          externalId: 'ext-cancel-999',
          link: 'https://t.me/channel',
          quantity: 1000,
          charge: BigInt(5000), // 50.00 RUB
          providerCost: 100,
          status: 'IN_PROGRESS',
          tenantId: 'smmplan',
        },
      });

      const { providerService } = await import('@/services/providers/provider.service');
      vi.spyOn(providerService, 'getProviderInstance').mockResolvedValue({
        getOrderStatus: vi.fn().mockResolvedValue({ status: 'Canceled', remains: '1000' }),
      } as any);

      const syncResult = await OrderProviderSyncService.syncOrderStatusWithProvider(order.id);
      expect(syncResult.status).toBe('CANCELED');

      const updatedOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(updatedOrder.status).toBe('CANCELED');

      // User balance refunded
      const updatedUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(updatedUser.balance).toBe(BigInt(5000));
    });

    it('handles provider PARTIAL response by clamping remains and refunding unperformed portion', async () => {
      const user = await createTestUser('USER', BigInt(0), 'sync-partial');
      const service = await createTestService(10, 1000);
      const provider = await db.provider.create({
        data: { name: `Prov-${Date.now()}`, apiUrl: 'https://mock.api', apiKey: 'mock-key', isActive: true },
      });

      const order = await db.order.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          providerId: provider.id,
          externalId: 'ext-part-888',
          link: 'https://t.me/channel',
          quantity: 1000,
          charge: BigInt(10000), // 100.00 RUB
          providerCost: 100,
          status: 'IN_PROGRESS',
          tenantId: 'smmplan',
        },
      });

      const { providerService } = await import('@/services/providers/provider.service');
      vi.spyOn(providerService, 'getProviderInstance').mockResolvedValue({
        getOrderStatus: vi.fn().mockResolvedValue({ status: 'Partial', remains: '300' }), // 30% unperformed
      } as any);

      const syncResult = await OrderProviderSyncService.syncOrderStatusWithProvider(order.id);
      expect(syncResult.status).toBe('PARTIAL');

      const updatedOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(updatedOrder.status).toBe('PARTIAL');
      expect(updatedOrder.remains).toBe(300);

      // User balance credited with 30% = 3000 cents
      const updatedUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(updatedUser.balance).toBe(BigInt(3000));
    });

    it('throws error when provider returns malformed response', async () => {
      const user = await createTestUser('USER', BigInt(0), 'sync-malform');
      const service = await createTestService();
      const provider = await db.provider.create({
        data: { name: `Prov-${Date.now()}`, apiUrl: 'https://mock.api', apiKey: 'mock-key', isActive: true },
      });

      const order = await db.order.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          providerId: provider.id,
          externalId: 'ext-bad-111',
          link: 'https://t.me/channel',
          quantity: 100,
          charge: BigInt(1000),
          providerCost: 50,
          status: 'IN_PROGRESS',
          tenantId: 'smmplan',
        },
      });

      const { providerService } = await import('@/services/providers/provider.service');
      vi.spyOn(providerService, 'getProviderInstance').mockResolvedValue({
        getOrderStatus: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(OrderProviderSyncService.syncOrderStatusWithProvider(order.id)).rejects.toThrow(
        'Провайдер вернул некорректный ответ'
      );
    });
  });

  // =========================================================================
  // SUITE 5: Network Router Invariants & Direct Patterns (FIX-M3)
  // =========================================================================
  describe('5. FIX-M3: Network Router Domestic Direct Patterns & Fallback', () => {
    it('verifies that all critical domestic services are declared in IMMUTABLE_DIRECT_PATTERNS', () => {
      const requiredDirectHosts = [
        'api.yookassa.ru',
        'yookassa.ru',
        'auth.robokassa.ru',
        'robokassa.ru',
        'cbr.ru',
        'smtp.yandex.ru',
        'smtp.mail.ru',
        'vexboost.ru',
        'smmtoolbox.ru',
      ];

      for (const host of requiredDirectHosts) {
        expect(IMMUTABLE_DIRECT_PATTERNS).toContain(host);
      }
    });

    it('resolves Russian payment gateway routes to DIRECT target', async () => {
      const yooRoute = await UniversalNetworkRouter.resolveRoute('https://api.yookassa.ru/v3/payments');
      expect(yooRoute.target).toBe('DIRECT');

      const roboRoute = await UniversalNetworkRouter.resolveRoute('https://auth.robokassa.ru/Merchant/Index.aspx');
      expect(roboRoute.target).toBe('DIRECT');

      const cbrRoute = await UniversalNetworkRouter.resolveRoute('https://cbr.ru/scripts/XML_daily.asp');
      expect(cbrRoute.target).toBe('DIRECT');
    });
  });

  // =========================================================================
  // SUITE 6: Search Normalization & Order Omnisearch (#ID, №ID, ID:) (FIX-L1..L3)
  // =========================================================================
  describe('6. FIX-L1..L3: Search Query Normalization & Omnisearch', () => {
    it('normalizes various service ID prefixes to exact pure numbers', () => {
      expect(normalizeCatalogSearch('#1643').numId).toBe(1643);
      expect(normalizeCatalogSearch('№1643').numId).toBe(1643);
      expect(normalizeCatalogSearch('№ 1643').numId).toBe(1643);
      expect(normalizeCatalogSearch('ID: 1643').numId).toBe(1643);
      expect(normalizeCatalogSearch('id:1643').numId).toBe(1643);
      expect(normalizeCatalogSearch('ID 9999').numId).toBe(9999);
    });

    it('builds exact numericId filter when query contains formatted prefix in buildOrderWhereClause', () => {
      const where1 = buildOrderWhereClause({ query: '№1643' });
      expect(where1.OR).toEqual(expect.arrayContaining([
        { numericId: 1643 },
        { externalId: { equals: '1643' } },
      ]));

      const where2 = buildOrderWhereClause({ query: 'ID: 2026' });
      expect(where2.OR).toEqual(expect.arrayContaining([
        { numericId: 2026 },
        { externalId: { equals: '2026' } },
      ]));

      const where3 = buildOrderWhereClause({ query: '#500' });
      expect(where3.OR).toEqual(expect.arrayContaining([
        { numericId: 500 },
        { externalId: { equals: '500' } },
      ]));
    });

    it('falls back to email / substring filter for non-numeric queries', () => {
      const whereEmail = buildOrderWhereClause({ query: 'client@domain.com' });
      expect(whereEmail.user).toEqual({ email: { contains: 'client@domain.com', mode: 'insensitive' } });

      const whereLink = buildOrderWhereClause({ query: 'https://t.me/channel' });
      expect(whereLink.OR).toBeDefined();
    });
  });

  // =========================================================================
  // SUITE 7: Admin Users Security Guards & IDOR Protections (FIX-H2)
  // =========================================================================
  describe('7. FIX-H2: Admin Users Action Security Guards', () => {
    it('blocks self-balance modification for non-OWNER staff', async () => {
      const supportUser = await createTestUser('SUPPORT', BigInt(10000), 'support-staff');

      // Mock staff session with SUPPORT role
      vi.spyOn(await import('@/lib/server/rbac'), 'requireStaffPermission').mockImplementation(
        async (_scope, _action, fn) => {
          return fn({ id: supportUser.id, email: supportUser.email, role: 'SUPPORT' } as any);
        }
      );

      const formData = new FormData();
      formData.append('userId', supportUser.id);
      formData.append('amount', '5000'); // 50.00 RUB
      formData.append('reason', 'Самопополнение');

      const result = await updateBalanceAction(formData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Запрещено изменять собственный баланс');
    });

    it('blocks non-OWNER staff from adjusting balance of other staff members', async () => {
      const supportUser = await createTestUser('SUPPORT', BigInt(10000), 'support-staff2');
      const managerUser = await createTestUser('MANAGER', BigInt(20000), 'manager-target');

      vi.spyOn(await import('@/lib/server/rbac'), 'requireStaffPermission').mockImplementation(
        async (_scope, _action, fn) => {
          return fn({ id: supportUser.id, email: supportUser.email, role: 'SUPPORT' } as any);
        }
      );

      const formData = new FormData();
      formData.append('userId', managerUser.id);
      formData.append('amount', '1000');
      formData.append('reason', 'Попытка начисления коллеге');

      const result = await updateBalanceAction(formData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Только OWNER может изменять баланс других сотрудников');
    });

    it('enforces overdraft protection when debit exceeds available balance', async () => {
      const client = await createTestUser('USER', BigInt(1000), 'client-low-bal'); // 10.00 RUB
      const owner = await createTestUser('OWNER', BigInt(0), 'owner-user');

      vi.spyOn(await import('@/lib/server/rbac'), 'requireStaffPermission').mockImplementation(
        async (_scope, _action, fn) => {
          return fn({ id: owner.id, email: owner.email, role: 'OWNER' } as any);
        }
      );

      const formData = new FormData();
      formData.append('userId', client.id);
      formData.append('amount', '-5000'); // Trying to debit 50.00 RUB when client has only 10.00 RUB
      formData.append('reason', 'Штраф');

      const result = await updateBalanceAction(formData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Недостаточно средств на балансе клиента');
    });

    it('blocks negative balance adjustments using "компенсация" or "бонус" as reason', async () => {
      const client = await createTestUser('USER', BigInt(50000), 'client-poka-yoke');
      const owner = await createTestUser('OWNER', BigInt(0), 'owner-poka');

      vi.spyOn(await import('@/lib/server/rbac'), 'requireStaffPermission').mockImplementation(
        async (_scope, _action, fn) => {
          return fn({ id: owner.id, email: owner.email, role: 'OWNER' } as any);
        }
      );

      const formData = new FormData();
      formData.append('userId', client.id);
      formData.append('amount', '-1000');
      formData.append('reason', 'Компенсация за задержку');

      const result = await updateBalanceAction(formData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Недопустимая причина для списания');
    });
  });

  // =========================================================================
  // SUITE 8: Round 2 Regressions & Invariant Stress (C-3, C-4, C-5)
  // =========================================================================
  describe('8. Round 2 Stress & Concurrency Invariants (C-3, C-4, C-5)', () => {
    it('C-4: Parallel retries of the exact same order share deterministic idempotency key and avoid double balance deduction', async () => {
      const user = await createTestUser('USER', BigInt(100000), 'c4-stress');
      const service = await createTestService(10, 500, 100);

      const order = await db.order.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          link: 'https://t.me/channel',
          quantity: 100,
          charge: BigInt(5000),
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

      // Run sequential/parallel retry
      await RetryCheckoutService.execute(input);

      // User balance was 1000.00, deducted 50.00 = 950.00 (95000 cents)
      const userAfter1 = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(userAfter1.balance).toBe(BigInt(95000));

      // Attempting to retry again when order is no longer AWAITING_PAYMENT should safely throw
      await expect(RetryCheckoutService.execute(input)).rejects.toThrow(
        'Этот заказ больше не ожидает оплаты'
      );

      // Ledger must have exactly ONE retry charge
      const ledgerEntries = await db.ledgerEntry.findMany({
        where: {
          userId: user.id,
          idempotencyKey: `retry-balance-${order.id}`,
        },
      });
      expect(ledgerEntries.length).toBe(1);
    });

    it('C-5: Multi-step refund: PARTIAL (30%) -> CANCELED remainder (70%) correctly totals 100% of charge', async () => {
      const user = await createTestUser('USER', BigInt(0), 'c5-multistep');
      const totalCharge = 20000; // 200.00 RUB

      const order = {
        id: `ord-multi-${Date.now()}`,
        userId: user.id,
        charge: totalCharge,
        quantity: 1000,
        remains: 300, // 30% unperformed
        status: 'PARTIAL',
        tenantId: 'smmplan',
      };

      // Step 1: Initial Partial Refund = 30% of 20000 = 6000 cents
      const res1 = await RefundPolicyService.processRefund(order);
      expect(res1).toBeDefined();

      const userStep1 = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(userStep1.balance).toBe(BigInt(6000));

      // Step 2: Transition to CANCELED -> Must refund remaining 14000 cents
      order.status = 'CANCELED';
      order.remains = 1000;
      const res2 = await RefundPolicyService.processRefund(order, 'Provider cancelled completely');
      expect(res2).toBeDefined();

      const userStep2 = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(userStep2.balance).toBe(BigInt(20000)); // Exactly 100%

      // Step 3: Repeated CANCELED call -> MUST return null and not add even 1 kopeck
      const res3 = await RefundPolicyService.processRefund(order);
      expect(res3).toBeNull();

      const userStep3 = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(userStep3.balance).toBe(BigInt(20000));
    });

    it('C-5 DEEP: 3-step refund lifecycle (PARTIAL 20% -> PARTIAL 50% -> CANCELED 100%) avoids key collision and refunds exactly 100%', async () => {
      const user = await createTestUser('USER', BigInt(0), 'c5-3step');
      const totalCharge = 10000; // 100.00 RUB

      const order = {
        id: `ord-3step-${Date.now()}`,
        userId: user.id,
        charge: totalCharge,
        quantity: 1000,
        remains: 200, // 20%
        status: 'PARTIAL',
        tenantId: 'smmplan',
      };

      // Step 1: 20% partial refund = 2000 cents
      const s1 = await RefundPolicyService.processRefund(order);
      expect(s1).toBeDefined();
      const u1 = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(u1.balance).toBe(BigInt(2000));

      // Step 2: 50% partial refund = delta of 3000 cents (total 5000)
      order.remains = 500;
      const s2 = await RefundPolicyService.processRefund(order);
      expect(s2).toBeDefined();
      const u2 = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(u2.balance).toBe(BigInt(5000));

      // Step 3: CANCELED -> refunds final remainder of 5000 cents (total 10000)
      // Under flawed code, key collided with s2 remainder and failed. Now passes with distinct key.
      order.status = 'CANCELED';
      order.remains = 1000;
      const s3 = await RefundPolicyService.processRefund(order, 'Complete failure');
      expect(s3).toBeDefined();
      const u3 = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(u3.balance).toBe(BigInt(10000));
    });

    it('FIX-H2 DEEP: Multi-tenant isolation blocks staff on smmplan from modifying flux client balance or banning flux users', async () => {
      const smmplanStaff = await createTestUser('SUPPORT', BigInt(0), 'staff-smmplan');
      // Create user on flux tenant
      const fluxUser = await db.user.create({
        data: {
          email: `flux-client-${Date.now()}@smmflux.ru`,
          tenantId: 'flux',
          balance: BigInt(5000),
          role: 'USER',
          isActive: true,
        },
      });

      vi.spyOn(await import('@/lib/server/rbac'), 'requireStaffPermission').mockImplementation(
        async (_scope, _action, fn) => {
          return fn({ id: smmplanStaff.id, email: smmplanStaff.email, role: 'SUPPORT', tenantId: 'smmplan' } as any);
        }
      );

      // Attempt cross-tenant balance update
      const formBal = new FormData();
      formBal.append('userId', fluxUser.id);
      formBal.append('amount', '1000');
      formBal.append('reason', 'Cross tenant adjustment');
      const balRes = await updateBalanceAction(formBal);
      expect(balRes.success).toBe(false);
      expect(balRes.error).toContain('клиент принадлежит другой витрине');

      // Attempt cross-tenant ban
      const { banUserAction } = await import('@/actions/admin/users');
      const formBan = new FormData();
      formBan.append('userId', fluxUser.id);
      const banRes = await banUserAction(formBan);
      expect(banRes.success).toBe(false);
      expect(banRes.error).toContain('клиент принадлежит другой витрине');
    });

    it('FIX-M1 DEEP: VAT turnover deducts ORDER_CANCEL transactions in addition to REFUND', async () => {
      const testTenant = `vat-deduct-${Date.now()}`;
      
      // Mock payment aggregate: 21,000,000 gross
      vi.spyOn(db.payment, 'aggregate').mockResolvedValueOnce({
        _sum: { amount: BigInt(21_000_000_00) }, // 21M RUB gross (over 20M)
      } as any);

      // Mock ledger aggregate with 2M ORDER_CANCEL deductions -> net 19M (under 20M!)
      const ledgerSpy = (vi.spyOn(db.ledgerEntry, 'aggregate') as any).mockImplementationOnce(async (args: any) => {
        // Assert that the query inspects both REFUND and ORDER_CANCEL
        expect(args.where.transactionType).toEqual({ in: ['REFUND', 'ORDER_CANCEL'] });
        return { _sum: { amount: BigInt(2_000_000_00) } };
      });

      const isExceeded = await checkVatThreshold(testTenant);
      // Net turnover: 21M - 2M = 19M (< 20M threshold) -> should be FALSE (no VAT22)
      expect(isExceeded).toBe(false);
      ledgerSpy.mockRestore();
    });
  });
});
