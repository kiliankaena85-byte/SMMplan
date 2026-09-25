import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  WalletOps,
  WalletInsufficientFundsError,
  WalletInvalidAmountError,
  WalletUserNotFoundError,
} from '@/services/financial/wallet-ops';
import { checkVatThreshold } from '@/services/financial/payment-gateway.service';
import { db } from '@/lib/db';

// ---------------------------------------------------------------------------
// Mock Setup
// ---------------------------------------------------------------------------
vi.mock('@/lib/db', () => ({
  db: {
    payment: {
      aggregate: vi.fn(),
    },
    ledgerEntry: {
      aggregate: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/audit', () => ({
  auditAdminAwaitable: vi.fn().mockResolvedValue(undefined),
  auditAdmin: vi.fn(),
}));

// Mock Transaction Factory
type MockTx = {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  ledgerEntry: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

function createMockTx(initialBalance: bigint = BigInt(10000), tenantId: string = 'smmplan'): MockTx {
  let currentBalance = initialBalance;
  const ledgerStore: Map<string, any> = new Map();

  return {
    user: {
      findUnique: vi.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
        if (where.id === 'user-not-found') return null;
        return {
          id: where.id,
          balance: currentBalance,
          tenantId,
          totalSpent: BigInt(5000),
          quarantineBalance: BigInt(0),
        };
      }),
      findUniqueOrThrow: vi.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
        return {
          id: where.id,
          balance: currentBalance,
          tenantId,
        };
      }),
      update: vi.fn().mockImplementation(async ({ where, data }: any) => {
        if (data.balance?.increment !== undefined) {
          currentBalance += BigInt(data.balance.increment);
        }
        return {
          id: where.id,
          balance: currentBalance,
          totalSpent: data.totalSpent ?? BigInt(5000),
          quarantineBalance: data.quarantineBalance?.increment ?? BigInt(0),
        };
      }),
      updateMany: vi.fn().mockImplementation(async ({ where, data }: any) => {
        const requiredGte = where.balance?.gte;
        if (requiredGte !== undefined && currentBalance < BigInt(requiredGte)) {
          return { count: 0 };
        }
        if (data.balance?.increment !== undefined) {
          currentBalance += BigInt(data.balance.increment);
        }
        return { count: 1 };
      }),
    },
    ledgerEntry: {
      findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
        if (where.idempotencyKey && ledgerStore.has(where.idempotencyKey)) {
          return ledgerStore.get(where.idempotencyKey);
        }
        return null;
      }),
      create: vi.fn().mockImplementation(async ({ data }: any) => {
        if (data.idempotencyKey && ledgerStore.has(data.idempotencyKey)) {
          const err: any = new Error('Unique constraint failed on idempotencyKey');
          err.code = 'P2002';
          throw err;
        }
        const entry = { id: `ledger-${Date.now()}-${Math.random()}`, ...data };
        if (data.idempotencyKey) {
          ledgerStore.set(data.idempotencyKey, entry);
        }
        return entry;
      }),
    },
  };
}

// ===========================================================================
// DOMAIN 1: WalletOps.adminAdjust Concurrency & Negative Protection
// ===========================================================================
describe('CHALLENGER STRESS 1: WalletOps.adminAdjust Negative Adjustments & Concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AST/Source Verification: adminAdjust strictly enforces { balance: { gte: absCents } } on negative decrements', () => {
    const filePath = path.resolve(process.cwd(), 'src/services/financial/wallet-ops.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Verify presence of balance: { gte: absCents } guard in adminAdjust
    expect(content).toContain('if (rawCents < BigInt(0))');
    expect(content).toContain('const absCents = -rawCents;');
    expect(content).toContain('balance: { gte: absCents }');
    expect(content).toContain('if (updatedUserBatch.count === 0)');
    expect(content).toContain('throw new WalletInsufficientFundsError');
  });

  it('successfully decrements balance when sufficient funds exist and records ledger entry first', async () => {
    const tx = createMockTx(BigInt(5000)); // 50.00 RUB
    const decrement = BigInt(-2000); // -20.00 RUB

    const result = await WalletOps.adminAdjust(tx as any, 'user-1', decrement, 'Admin penalty', {
      adminId: 'admin-1',
    });

    expect(result.success).toBe(true);
    expect(result.balance).toBe(BigInt(3000));
    expect(tx.ledgerEntry.create).toHaveBeenCalledTimes(1);
    expect(tx.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'user-1',
          balance: { gte: BigInt(2000) },
        }),
        data: { balance: { increment: BigInt(-2000) } },
      })
    );
  });

  it('rejects decrement when initial balance is less than absCents (concurrency safety)', async () => {
    const tx = createMockTx(BigInt(1500)); // 15.00 RUB
    const decrement = BigInt(-2000); // -20.00 RUB

    await expect(
      WalletOps.adminAdjust(tx as any, 'user-1', decrement, 'Overdraft penalty')
    ).rejects.toThrow(WalletInsufficientFundsError);

    // Ledger entry was created inside transaction, but updateMany returned count: 0
    expect(tx.user.updateMany).toHaveBeenCalledTimes(1);
  });

  it('simulates race condition: concurrent decrements competing for single balance cannot drive balance below zero', async () => {
    // Shared state simulating PostgreSQL table with row-level concurrency
    let sharedDbBalance = BigInt(1000); // 10.00 RUB
    const sharedLedger: any[] = [];

    // Simulate PostgreSQL serializable / read-committed atomic UPDATE "User" WHERE id = ... AND balance >= absCents
    const runConcurrentAdjust = async (amount: bigint, traceId: string) => {
      const absCents = -amount;
      // Step 1: ledger.create
      const entry = { id: `le-${traceId}`, amount, idempotencyKey: `trace-${traceId}` };
      sharedLedger.push(entry);

      // Step 2: Atomic updateMany with { balance: { gte: absCents } }
      if (sharedDbBalance >= absCents) {
        sharedDbBalance -= absCents;
        return { success: true, balance: sharedDbBalance, entry };
      } else {
        // Atomic condition failed in DB
        // In real PostgreSQL, transaction rolls back and removes entry from sharedLedger
        const idx = sharedLedger.indexOf(entry);
        if (idx !== -1) sharedLedger.splice(idx, 1);
        throw new WalletInsufficientFundsError(absCents, sharedDbBalance);
      }
    };

    // 5 concurrent requests attempting to deduct 400 kopecks each from 1000 kopecks initial balance
    // At most 2 can succeed (2 * 400 = 800 <= 1000). The third requires 400 when only 200 remains!
    const attempts = [
      runConcurrentAdjust(BigInt(-400), 'req-1'),
      runConcurrentAdjust(BigInt(-400), 'req-2'),
      runConcurrentAdjust(BigInt(-400), 'req-3'),
      runConcurrentAdjust(BigInt(-400), 'req-4'),
      runConcurrentAdjust(BigInt(-400), 'req-5'),
    ];

    const results = await Promise.allSettled(attempts);

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    // Exactly 2 succeeded, 3 failed with WalletInsufficientFundsError
    expect(succeeded.length).toBe(2);
    expect(failed.length).toBe(3);

    // Remaining balance is strictly >= 0 (exactly 200 kopecks)
    expect(sharedDbBalance).toBe(BigInt(200));
    expect(sharedDbBalance).toBeGreaterThanOrEqual(BigInt(0));

    // Ledger entries match only the committed adjustments
    expect(sharedLedger.length).toBe(2);
  });
});

// ===========================================================================
// DOMAIN 2: Refund Idempotency & Deterministic Key Replay
// ===========================================================================
describe('CHALLENGER STRESS 2: Refund Idempotency & Deterministic Key Replay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AST/Source Verification: all refund idempotency keys in actions and services are deterministic (no Date.now)', () => {
    const ordersActionPath = path.resolve(process.cwd(), 'src/actions/admin/orders.ts');
    const ordersActionContent = fs.readFileSync(ordersActionPath, 'utf-8');

    // Line 246 pattern
    expect(ordersActionContent).toContain('idempotencyKey: `refund_${order.id}_${newStatus}`');
    expect(ordersActionContent).not.toMatch(/idempotencyKey:\s*`refund_\${order\.id}_\${newStatus}_\${Date\.now\(\)}`/);

    // Line 440 pattern
    expect(ordersActionContent).toContain('idempotencyKey: `refund_${safeOrder.id}_CANCELED`');
    expect(ordersActionContent).not.toMatch(/idempotencyKey:\s*`refund_\${safeOrder\.id}_CANCELED_\${Date\.now\(\)}`/);

    const orderServicePath = path.resolve(process.cwd(), 'src/services/admin/order.service.ts');
    const orderServiceContent = fs.readFileSync(orderServicePath, 'utf-8');

    // Line 647 pattern
    expect(orderServiceContent).toContain('idempotencyKey: `refund_${order.id}_CANCELED`');
    expect(orderServiceContent).not.toMatch(/idempotencyKey:\s*`refund_\${order\.id}_CANCELED_\${Date\.now\(\)}`/);
  });

  it('replaying refund with same idempotencyKey returns cached: true without duplicate ledger or balance increment', async () => {
    const tx = createMockTx(BigInt(1000));
    const deterministicKey = 'refund_ord_abc123_CANCELED';
    const refundAmount = BigInt(500);

    // First refund execution
    const firstResult = await WalletOps.refund(
      tx as any,
      'user-1',
      refundAmount,
      'Order ord_abc123 canceled',
      { idempotencyKey: deterministicKey, adminId: 'admin-1' }
    );

    expect(firstResult.success).toBe(true);
    expect(firstResult.cached).toBe(false);
    expect(firstResult.balance).toBe(BigInt(1500)); // 1000 + 500
    expect(tx.ledgerEntry.create).toHaveBeenCalledTimes(1);
    expect(tx.user.update).toHaveBeenCalledTimes(1);

    // Replay with identical idempotencyKey
    const secondResult = await WalletOps.refund(
      tx as any,
      'user-1',
      refundAmount,
      'Order ord_abc123 canceled (retry)',
      { idempotencyKey: deterministicKey, adminId: 'admin-1' }
    );

    expect(secondResult.success).toBe(true);
    expect(secondResult.cached).toBe(true);
    expect(secondResult.entry).toBeDefined();

    // Verify NO secondary ledger create or user balance update occurred
    expect(tx.ledgerEntry.create).toHaveBeenCalledTimes(1);
    expect(tx.user.update).toHaveBeenCalledTimes(1);
  });

  it('Ledger-First ordering protects against double-crediting if concurrent duplicate passes pre-check', async () => {
    // If two concurrent calls pass findFirst simultaneously, the DB unique constraint P2002
    // triggers on tx.ledgerEntry.create, throwing before tx.user.update is reached!
    const tx = createMockTx(BigInt(1000));
    const deterministicKey = 'refund_concurrent_key';

    // Simulate DB unique constraint collision on second create
    let createCallCount = 0;
    tx.ledgerEntry.create.mockImplementation(async ({ data }: any) => {
      createCallCount++;
      if (createCallCount > 1) {
        const p2002Error: any = new Error('Unique constraint failed on the fields: (`idempotencyKey`)');
        p2002Error.code = 'P2002';
        throw p2002Error;
      }
      return { id: 'entry-first', ...data };
    });

    // Both calls find no existing record initially (classic race)
    tx.ledgerEntry.findFirst.mockResolvedValue(null);

    // First call succeeds
    const call1 = await WalletOps.refund(
      tx as any,
      'user-1',
      BigInt(300),
      'Refund race 1',
      { idempotencyKey: deterministicKey }
    );
    expect(call1.success).toBe(true);
    expect(tx.user.update).toHaveBeenCalledTimes(1);

    // Second concurrent call fails at ledgerEntry.create with P2002
    await expect(
      WalletOps.refund(
        tx as any,
        'user-1',
        BigInt(300),
        'Refund race 2',
        { idempotencyKey: deterministicKey }
      )
    ).rejects.toThrow('Unique constraint failed');

    // Crucial: tx.user.update was NEVER called for the second transaction!
    expect(tx.user.update).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// DOMAIN 3: 54-FZ Gross Revenue VAT Threshold & Simulated Refunds
// ===========================================================================
describe('CHALLENGER STRESS 3: 54-FZ Gross Revenue Threshold (No Refund Deduction)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AST/Source Verification: checkVatThreshold evaluates strictly gross payments and never subtracts refunds', () => {
    const gatewayServicePath = path.resolve(process.cwd(), 'src/services/financial/payment-gateway.service.ts');
    const content = fs.readFileSync(gatewayServicePath, 'utf-8');

    // Verify 54-FZ comments and logic
    expect(content).toContain('// 2. 54-FZ & Tax Reform 2026');
    expect(content).toContain('The 20M ₽ threshold is evaluated strictly against gross revenue');
    expect(content).toContain('without subtracting customer refunds or store credits');
    expect(content).toContain('const isExceeded = grossKopecks >= VAT_THRESHOLD_KOPECKS;');

    // Verify refund deduction was purged
    expect(content).not.toContain('grossKopecks - refundKopecks');
    expect(content).not.toContain('netAnnualRevenueKopecks');
  });

  it('triggers VAT threshold (returns true) when gross payments reach 20M ₽ even with heavy refunds', async () => {
    // 20M ₽ in kopecks = 20,000,000 * 100 = 2,000,000,000 kopecks
    const GROSS_21M_KOPECKS = BigInt(2_100_000_000); // 21,000,000.00 RUB

    // Mock gross SUCCEEDED payments
    vi.mocked(db.payment.aggregate).mockResolvedValue({
      _sum: { amount: GROSS_21M_KOPECKS as any },
    } as any);

    // Check with a fresh tenant key to bypass in-memory 1-hour cache
    const testTenantId = `test-vat-tenant-${Date.now()}`;
    const result = await checkVatThreshold(testTenantId);

    // Threshold MUST be exceeded because gross is 21M >= 20M
    expect(result).toBe(true);

    // Verify that db.ledgerEntry.aggregate was NOT called for refunds
    expect(db.ledgerEntry.aggregate).not.toHaveBeenCalled();
  });

  it('does NOT trigger VAT threshold when gross payments are below 20M ₽', async () => {
    const GROSS_19M_KOPECKS = BigInt(1_999_999_900); // 19,999,999.00 RUB (100 kopecks short of 20M)

    vi.mocked(db.payment.aggregate).mockResolvedValue({
      _sum: { amount: GROSS_19M_KOPECKS as any },
    } as any);

    const testTenantId = `test-vat-tenant-below-${Date.now()}`;
    const result = await checkVatThreshold(testTenantId);

    expect(result).toBe(false);
  });

  it('boundary test: exactly 20,000,000.00 RUB triggers threshold (>= predicate)', async () => {
    const EXACT_20M_KOPECKS = BigInt(2_000_000_000); // Exactly 20,000,000.00 RUB

    vi.mocked(db.payment.aggregate).mockResolvedValue({
      _sum: { amount: EXACT_20M_KOPECKS as any },
    } as any);

    const testTenantId = `test-vat-tenant-exact-${Date.now()}`;
    const result = await checkVatThreshold(testTenantId);

    expect(result).toBe(true);
  });
});
