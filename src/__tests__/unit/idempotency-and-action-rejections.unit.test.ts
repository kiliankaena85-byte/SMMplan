/**
 * (c) 2026 SMMplan & OmniSMM 1.0.
 * Challenger 2 Empirical Verification Test Suite:
 * 1. Idempotency Key Uniqueness & Retry Invariants (WalletOps charge, credit, refund, adminAdjust).
 * 2. Concurrency P2002 unique constraint simulation (no duplicate balance mutations under race conditions).
 * 3. Server Actions Error Handling & Contract Integrity ({ success: false, error: ... } for malformed requests).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletOps, WalletInsufficientFundsError, WalletInvalidAmountError } from '@/services/financial/wallet-ops';
import { calculatePriceAction, checkoutAction } from '@/actions/order/checkout';
import { createApiInvoiceAction } from '@/actions/user/corporate-invoice.action';
import { createDemoPaymentAction } from '@/actions/order/demo-payment.action';
import { forceSyncMyPaymentsAction } from '@/actions/order/sync-payment';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'x-tenant-id': 'smmplan', host: 'smmplan.pro' })),
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/session', () => ({
  verifySession: vi.fn(async () => null),
  getEncodedKey: vi.fn(),
  SESSION_COOKIE_NAME: 'session',
}));

vi.mock('@/lib/settings', () => ({
  SettingsManager: {
    isMockPaymentEnabled: vi.fn(async () => false),
    isTestMode: vi.fn(async () => false),
    getPaymentSecrets: vi.fn(async () => ({})),
  },
  SettingsProvider: {
    isTestMode: vi.fn(async () => false),
    getExchangeRateUSD: vi.fn(async () => 100.0),
    getContactAndLegalSettings: vi.fn(async () => ({})),
    getSupportEmailDomain: vi.fn(async () => 'smmplan.pro'),
  },
}));

vi.mock('@/services/core/rate-limit.service', () => ({
  RateLimitService: {
    check: vi.fn(async () => true),
    checkCustomKey: vi.fn(async () => true),
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    service: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === 'srv-active') {
          return { id: 'srv-active', name: 'Test Service', isActive: true, pricePer1k: 10000 };
        }
        return null;
      }),
    },
    serviceSmartConfig: {
      findUnique: vi.fn(async () => null),
    },
    user: {
      findUnique: vi.fn(async () => null),
    },
  },
}));

vi.mock('@/services/marketing.service', () => ({
  marketingService: {
    calculatePrice: vi.fn(async (_user: any, _serviceId: string, quantity: number) => {
      const totalCents = Math.round(quantity * 0.1 * 100);
      return {
        totalCents,
        originalTotalCents: totalCents,
        discountCents: 0,
        discountPercent: 0,
        tier: 'STANDARD',
      };
    }),
  },
}));

/**
 * Creates a stateful mock Prisma transaction client that enforces
 * unique constraints on (idempotencyKey, tenantId) in ledgerEntry.
 */
function createSharedDatabaseState(initialBalance: bigint = BigInt(100_000)) {
  let balance = initialBalance;
  let totalSpent = BigInt(0);
  const ledgerEntries: any[] = [];
  const operationsLog: string[] = [];

  const createTx = () => ({
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        operationsLog.push('user.findUnique');
        return {
          id: where.id,
          balance,
          totalSpent,
          tenantId: 'smmplan',
          role: 'USER',
          isDeleted: false,
        };
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        operationsLog.push('user.findUniqueOrThrow');
        return {
          id: where.id,
          balance,
          totalSpent,
          tenantId: 'smmplan',
          role: 'USER',
          isDeleted: false,
        };
      }),
      update: vi.fn(async ({ data }: { data: any }) => {
        operationsLog.push('user.update');
        if (typeof data.balance === 'bigint') {
          balance = data.balance;
        } else if (data.balance?.increment !== undefined) {
          balance += BigInt(data.balance.increment);
        } else if (data.balance?.decrement !== undefined) {
          balance -= BigInt(data.balance.decrement);
        }
        if (data.totalSpent !== undefined) {
          totalSpent = typeof data.totalSpent === 'bigint' ? data.totalSpent : BigInt(data.totalSpent);
        }
        return { id: 'usr-123', balance, totalSpent };
      }),
      updateMany: vi.fn(async ({ data }: { data: any }) => {
        operationsLog.push('user.updateMany');
        const decrement = BigInt(data.balance?.decrement ?? 0);
        if (balance >= decrement) {
          balance -= decrement;
          if (data.totalSpent?.increment !== undefined) {
            totalSpent += BigInt(data.totalSpent.increment);
          }
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
    ledgerEntry: {
      findFirst: vi.fn(async ({ where }: { where: { idempotencyKey?: string; tenantId?: string } }) => {
        operationsLog.push('ledgerEntry.findFirst');
        const found = ledgerEntries.find(
          (e) => e.idempotencyKey === where.idempotencyKey && e.tenantId === where.tenantId
        );
        return found || null;
      }),
      create: vi.fn(async ({ data }: { data: any }) => {
        operationsLog.push('ledgerEntry.create');
        // Enforce unique constraint simulation on (idempotencyKey, tenantId)
        if (data.idempotencyKey) {
          const duplicate = ledgerEntries.find(
            (e) => e.idempotencyKey === data.idempotencyKey && e.tenantId === data.tenantId
          );
          if (duplicate) {
            const p2002Error: any = new Error('Unique constraint failed on (idempotencyKey, tenantId)');
            p2002Error.code = 'P2002';
            throw p2002Error;
          }
        }
        const created = { id: `led-${ledgerEntries.length + 1}`, ...data };
        ledgerEntries.push(created);
        return created;
      }),
    },
  });

  return {
    createTx,
    getBalance: () => balance,
    getTotalSpent: () => totalSpent,
    getLedgerEntries: () => ledgerEntries,
    getOperationsLog: () => operationsLog,
  };
}

describe('Challenger 2 Empirical Verification: Idempotency & Action Rejection Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: STRESS-TEST IDEMPOTENCY KEY UNIQUENESS & RETRY BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Idempotency Key Uniqueness & Retry Invariants in WalletOps', () => {
    it('STRESS-IDEMP-001: 10 repeated sequential charge calls with the same idempotency key mutate balance EXACTLY once', async () => {
      const dbState = createSharedDatabaseState(BigInt(100_000)); // 1,000.00 RUB
      const chargeAmount = BigInt(15_000); // 150.00 RUB
      const key = 'idem-charge-stress-001';

      // 1st call: fresh charge
      const firstResult = await WalletOps.charge(
        dbState.createTx() as any,
        'usr-123',
        chargeAmount,
        'Order checkout #1',
        { idempotencyKey: key }
      );

      expect(firstResult.success).toBe(true);
      expect(firstResult.cached).toBe(false);
      expect(firstResult.balance).toBe(BigInt(85_000));
      expect(dbState.getBalance()).toBe(BigInt(85_000));
      expect(dbState.getLedgerEntries().length).toBe(1);

      // 9 sequential retries with the identical idempotency key
      for (let i = 2; i <= 10; i++) {
        const retryResult = await WalletOps.charge(
          dbState.createTx() as any,
          'usr-123',
          chargeAmount,
          'Order checkout #1 (retry)',
          { idempotencyKey: key }
        );

        expect(retryResult.success).toBe(true);
        expect(retryResult.cached).toBe(true);
        expect(retryResult.balance).toBe(BigInt(85_000)); // Balance remains unchanged
        expect(dbState.getBalance()).toBe(BigInt(85_000)); // Underlying state never double-debited
        expect(dbState.getLedgerEntries().length).toBe(1); // No duplicate ledger entry
      }
    });

    it('STRESS-IDEMP-002: 10 repeated sequential credit calls with the same key credit balance EXACTLY once', async () => {
      const dbState = createSharedDatabaseState(BigInt(50_000)); // 500.00 RUB
      const creditAmount = BigInt(20_000); // 200.00 RUB
      const key = 'idem-credit-stress-002';

      // 1st call: fresh top-up
      const first = await WalletOps.credit(
        dbState.createTx() as any,
        'usr-123',
        creditAmount,
        'YooKassa Payment Deposit',
        { idempotencyKey: key }
      );

      expect(first.success).toBe(true);
      expect(first.cached).toBe(false);
      expect(first.balance).toBe(BigInt(70_000));
      expect(dbState.getBalance()).toBe(BigInt(70_000));
      expect(dbState.getLedgerEntries().length).toBe(1);

      // 9 subsequent retries with identical key
      for (let i = 2; i <= 10; i++) {
        const retry = await WalletOps.credit(
          dbState.createTx() as any,
          'usr-123',
          creditAmount,
          'YooKassa Payment Deposit (retry)',
          { idempotencyKey: key }
        );

        expect(retry.success).toBe(true);
        expect(retry.cached).toBe(true);
        expect(dbState.getBalance()).toBe(BigInt(70_000)); // Untouched
        expect(dbState.getLedgerEntries().length).toBe(1); // No double credit ledger entries
      }
    });

    it('STRESS-IDEMP-003: 10 repeated sequential refund calls with the same key refund balance EXACTLY once', async () => {
      const dbState = createSharedDatabaseState(BigInt(30_000)); // 300.00 RUB
      const refundAmount = BigInt(10_000); // 100.00 RUB
      const key = 'idem-refund-stress-003';

      const first = await WalletOps.refund(
        dbState.createTx() as any,
        'usr-123',
        refundAmount,
        'Partial Order Refund #555',
        { idempotencyKey: key }
      );

      expect(first.success).toBe(true);
      expect(first.cached).toBe(false);
      expect(first.balance).toBe(BigInt(40_000));
      expect(dbState.getBalance()).toBe(BigInt(40_000));

      for (let i = 2; i <= 10; i++) {
        const retry = await WalletOps.refund(
          dbState.createTx() as any,
          'usr-123',
          refundAmount,
          'Partial Order Refund #555 (retry)',
          { idempotencyKey: key }
        );

        expect(retry.success).toBe(true);
        expect(retry.cached).toBe(true);
        expect(dbState.getBalance()).toBe(BigInt(40_000)); // Never inflated
        expect(dbState.getLedgerEntries().length).toBe(1);
      }
    });

    it('STRESS-IDEMP-004: 10 repeated sequential adminAdjust calls with the same key adjust balance EXACTLY once', async () => {
      const dbState = createSharedDatabaseState(BigInt(100_000));
      const adjustAmount = BigInt(-5_000); // -50.00 RUB adjustment
      const key = 'idem-adjust-stress-004';

      const first = await WalletOps.adminAdjust(
        dbState.createTx() as any,
        'usr-123',
        adjustAmount,
        'Manual correction by Support',
        { idempotencyKey: key, adminId: 'adm-1' }
      );

      expect(first.success).toBe(true);
      expect(first.cached).toBe(false);
      expect(first.balance).toBe(BigInt(95_000));
      expect(dbState.getBalance()).toBe(BigInt(95_000));

      for (let i = 2; i <= 10; i++) {
        const retry = await WalletOps.adminAdjust(
          dbState.createTx() as any,
          'usr-123',
          adjustAmount,
          'Manual correction retry',
          { idempotencyKey: key, adminId: 'adm-1' }
        );

        expect(retry.success).toBe(true);
        expect(retry.cached).toBe(true);
        expect(dbState.getBalance()).toBe(BigInt(95_000));
        expect(dbState.getLedgerEntries().length).toBe(1);
      }
    });

    it('STRESS-IDEMP-005: P2002 race condition handling catches concurrent duplicates and prevents double deduction', async () => {
      const dbState = createSharedDatabaseState(BigInt(100_000));
      const key = 'race-condition-key-005';
      const chargeAmount = BigInt(25_000);

      const tx1 = dbState.createTx();
      const tx2 = dbState.createTx();

      let findFirstRan = false;
      tx2.ledgerEntry.findFirst = vi.fn(async () => {
        if (!findFirstRan) {
          findFirstRan = true;
          return null;
        }
        return dbState.getLedgerEntries()[0] || null;
      });

      const res1 = await WalletOps.charge(tx1 as any, 'usr-123', chargeAmount, 'Race order tx1', { idempotencyKey: key });
      expect(res1.success).toBe(true);
      expect(res1.cached).toBe(false);
      expect(dbState.getBalance()).toBe(BigInt(75_000));

      const res2 = await WalletOps.charge(tx2 as any, 'usr-123', chargeAmount, 'Race order tx2', { idempotencyKey: key });
      expect(res2.success).toBe(true);
      expect(res2.cached).toBe(true);
      expect(dbState.getBalance()).toBe(BigInt(75_000));
      expect(dbState.getLedgerEntries().length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: SERVER ACTIONS REJECTION CONTRACTS ({ success: false, error })
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Server Actions Structured Rejection Contracts', () => {
    describe('calculatePriceAction rejection behavior', () => {
      it('rejects non-positive, non-integer, or exceeding quantity without throwing unhandled exceptions', async () => {
        const testCases = [0, -10, 1.5, NaN, 20_000_000];

        for (const qty of testCases) {
          const res = await calculatePriceAction('srv-active', qty);
          expect(res).toBeDefined();
          expect(res.success).toBe(false);
          expect(typeof res.error).toBe('string');
          expect(res.error).toMatch(/Количество должно быть целым положительным числом/);
        }
      });

      it('rejects invalid runs values (< 1 or > 100) with structured error', async () => {
        const invalidRuns = [0, -5, 101, 500];

        for (const runs of invalidRuns) {
          const res = await calculatePriceAction('srv-active', 100, undefined, runs);
          expect(res).toBeDefined();
          expect(res.success).toBe(false);
          expect(res.error).toBe('Количество запусков должно быть от 1 до 100');
        }
      });

      it('rejects non-existent or inactive service with structured error', async () => {
        const res = await calculatePriceAction('srv-non-existent', 100);
        expect(res).toBeDefined();
        expect(res.success).toBe(false);
        expect(res.error).toBe('Услуга не найдена или неактивна');
      });

      it('rejects malformed promo code characters with structured error', async () => {
        const res = await calculatePriceAction('srv-active', 100, 'PROMO$$$BAD');
        expect(res).toBeDefined();
        expect(res.success).toBe(false);
        expect(res.error).toBe('Некорректный формат промокода');
      });
    });

    describe('checkoutAction rejection behavior', () => {
      it('rejects invalid email formats gracefully via createSafeAction without throwing', async () => {
        const res = await checkoutAction({
          serviceId: 'srv-active',
          link: 'https://t.me/validchannel',
          quantity: 100,
          email: 'invalid-email-address',
        });

        expect(res).toBeDefined();
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error).toBe('Неверный email');
        }
      });

      it('rejects link with spaces or too short with structured error', async () => {
        const res = await checkoutAction({
          serviceId: 'srv-active',
          link: 'https://t.me/has spaces in url',
          quantity: 100,
          email: 'user@example.com',
        });

        expect(res).toBeDefined();
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error).toBe('Ссылка не должна содержать пробелов');
        }
      });

      it('rejects zero or negative quantity with structured error', async () => {
        const res = await checkoutAction({
          serviceId: 'srv-active',
          link: 'https://t.me/validchannel',
          quantity: 0,
          email: 'user@example.com',
        });

        expect(res).toBeDefined();
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error).toMatch(/Минимальное количество/);
        }
      });

      it('rejects non-integer quantity with structured error', async () => {
        const res = await checkoutAction({
          serviceId: 'srv-active',
          link: 'https://t.me/validchannel',
          quantity: 50.5,
          email: 'user@example.com',
        });

        expect(res).toBeDefined();
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error).toBe('Количество должно быть целым числом');
        }
      });
    });

    describe('corporate-invoice and demo-payment rejection behavior', () => {
      it('createApiInvoiceAction returns { success: false, error } on unauthenticated requests', async () => {
        const res = await createApiInvoiceAction({
          amountRub: 5000,
          companyName: 'ООО Ромашка',
          inn: '7701234567',
        });

        expect(res).toBeDefined();
        expect(res.success).toBe(false);
        expect(res.error).toBe('Необходима авторизация');
      });

      it('createDemoPaymentAction returns { success: false, error } on amount below threshold', async () => {
        const res = await createDemoPaymentAction({
          amountRub: 2,
        });

        expect(res).toBeDefined();
        expect(res.success).toBe(false);
        expect(res.error).toBe('Минимальная сумма к оплате — 10 ₽');
      });

      it('forceSyncMyPaymentsAction returns { success: false, error } when unauthenticated', async () => {
        const res = await forceSyncMyPaymentsAction();

        expect(res).toBeDefined();
        expect(res.success).toBe(false);
        expect(res.error).toBe('Необходима авторизация');
      });
    });
  });
});
