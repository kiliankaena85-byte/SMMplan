import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { runReconciliation } from '../scripts/reconciliation';

const db = new PrismaClient();

describe('AEARH Financial Reconciliation Negative Test Suite', () => {
  beforeAll(async () => {
    // Ensure clean state for financial and campaign tables tested by reconciliation
    await db.$executeRawUnsafe(`
      TRUNCATE TABLE "LedgerEntry", "Commission", "SmartExecution", "SmartTask", "SmartCampaign", "Order", "User" CASCADE;
    `);
    await db.tenant.upsert({
      where: { id: 'smmplan' },
      update: { name: 'SMMplan', slug: 'smmplan', domain: 'smmplan.local' },
      create: { id: 'smmplan', name: 'SMMplan', slug: 'smmplan', domain: 'smmplan.local', vaultSalt: 'test-salt' },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('runs reconciliation checks against current dataset and validates structure', async () => {
    const report = await runReconciliation();
    expect(report.checks.length).toBeGreaterThanOrEqual(13);
    expect(report.timestamp).toBeDefined();

    for (const check of report.checks) {
      expect(check.check_id).toBeDefined();
      expect(['CRITICAL', 'HIGH', 'MEDIUM']).toContain(check.severity);
      expect(check.query.length).toBeGreaterThan(10);
      expect(typeof check.passed).toBe('boolean');
      expect(Array.isArray(check.rows)).toBe(true);
    }
  });

  it('detects balance mismatch when user balance has positive value with zero ledger entries', async () => {
    // 1. Inject anomaly: create a user with positive balance but zero ledger entries
    const testEmail = `recon-mismatch-${Date.now()}-${Math.random().toString(36).substring(7)}@smmplan.test`;
    const mismatchBalance = 88800n; // 888.00 RUB in kopecks

    const user = await db.user.create({
      data: {
        email: testEmail,
        tenantId: 'smmplan',
        balance: mismatchBalance,
        role: 'USER',
      },
    });

    try {
      // 2. Run reconciliation
      const report = await runReconciliation();

      // 3. Must fail due to critical mismatch
      expect(report.passed).toBe(false);
      expect(report.criticalFailuresCount).toBeGreaterThanOrEqual(1);

      // 4. Check specific USER_BALANCE_LEDGER_MATCH failure
      const balanceCheck = report.checks.find(c => c.check_id === 'USER_BALANCE_LEDGER_MATCH');
      expect(balanceCheck).toBeDefined();
      expect(balanceCheck!.passed).toBe(false);
      expect(balanceCheck!.severity).toBe('CRITICAL');

      // 5. Verify the report records the exact user id and discrepancy
      const mismatchRow = balanceCheck!.rows.find((r: any) => r.id === user.id);
      expect(mismatchRow).toBeDefined();
      expect(BigInt(mismatchRow.balance)).toBe(mismatchBalance);
      expect(BigInt(mismatchRow.ledger_sum)).toBe(0n);
      const discrepancy = BigInt(mismatchRow.balance) - BigInt(mismatchRow.ledger_sum);
      expect(discrepancy).toBe(mismatchBalance);
    } finally {
      // 6. Clean up test user
      await db.user.delete({ where: { id: user.id } });
    }
  });

  it('detects partial balance mismatch when ledger entries exist but sum differs from user balance', async () => {
    const testEmail = `recon-partial-${Date.now()}-${Math.random().toString(36).substring(7)}@smmplan.test`;
    const userBalance = 100000n; // 1000.00 RUB
    const ledgerAmount = 40000n;  // 400.00 RUB
    const expectedDiscrepancy = 60000n; // 600.00 RUB mismatch

    const user = await db.user.create({
      data: {
        email: testEmail,
        tenantId: 'smmplan',
        balance: userBalance,
        role: 'USER',
      },
    });

    const ledger = await db.ledgerEntry.create({
      data: {
        userId: user.id,
        amount: ledgerAmount,
        reason: 'Partial reconciliation test deposit',
        transactionType: 'PAYMENT',
        idempotencyKey: `recon-idem-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        tenantId: 'smmplan',
      },
    });

    try {
      const report = await runReconciliation();
      const balanceCheck = report.checks.find(c => c.check_id === 'USER_BALANCE_LEDGER_MATCH');
      expect(balanceCheck).toBeDefined();
      expect(balanceCheck!.passed).toBe(false);

      const mismatchRow = balanceCheck!.rows.find((r: any) => r.id === user.id);
      expect(mismatchRow).toBeDefined();
      expect(BigInt(mismatchRow.balance)).toBe(userBalance);
      expect(BigInt(mismatchRow.ledger_sum)).toBe(ledgerAmount);
      const discrepancy = BigInt(mismatchRow.balance) - BigInt(mismatchRow.ledger_sum);
      expect(discrepancy).toBe(expectedDiscrepancy);
    } finally {
      await db.ledgerEntry.delete({ where: { id: ledger.id } });
      await db.user.delete({ where: { id: user.id } });
    }
  });

  it('detects negative referral balance when referralBalance invariant is breached', async () => {
    const testEmail = `recon-negref-${Date.now()}-${Math.random().toString(36).substring(7)}@smmplan.test`;
    const anomalyBalance = -15000; // -150.00 RUB in cents (Int in User schema)

    const user = await db.user.create({
      data: {
        email: testEmail,
        tenantId: 'smmplan',
        balance: 0n,
        referralBalance: anomalyBalance,
        role: 'USER',
      },
    });

    try {
      const report = await runReconciliation();
      const check = report.checks.find(c => c.check_id === 'NEGATIVE_REFERRAL_BALANCE');
      expect(check).toBeDefined();
      expect(check!.passed).toBe(false);
      expect(check!.severity).toBe('HIGH');

      const violationRow = check!.rows.find((r: any) => r.id === user.id);
      expect(violationRow).toBeDefined();
      expect(Number(violationRow.referralBalance)).toBe(anomalyBalance);
    } finally {
      await db.user.delete({ where: { id: user.id } });
    }
  });

  it('detects multiple concurrent anomalies and aggregates failure counts accurately', async () => {
    const userAEmail = `recon-multi-a-${Date.now()}-${Math.random().toString(36).substring(7)}@smmplan.test`;
    const userBEmail = `recon-multi-b-${Date.now()}-${Math.random().toString(36).substring(7)}@smmplan.test`;
    const balanceAnomaly = 77700n;
    const refAnomaly = -25000;

    const userA = await db.user.create({
      data: {
        email: userAEmail,
        tenantId: 'smmplan',
        balance: balanceAnomaly,
        role: 'USER',
      },
    });

    const userB = await db.user.create({
      data: {
        email: userBEmail,
        tenantId: 'smmplan',
        balance: 0n,
        referralBalance: refAnomaly,
        role: 'USER',
      },
    });

    try {
      const report = await runReconciliation();
      expect(report.passed).toBe(false);
      expect(report.criticalFailuresCount).toBeGreaterThanOrEqual(1);
      expect(report.warningsCount).toBeGreaterThanOrEqual(1);

      const balanceCheck = report.checks.find(c => c.check_id === 'USER_BALANCE_LEDGER_MATCH');
      expect(balanceCheck?.passed).toBe(false);
      expect(balanceCheck?.rows.some((r: any) => r.id === userA.id)).toBe(true);

      const refCheck = report.checks.find(c => c.check_id === 'NEGATIVE_REFERRAL_BALANCE');
      expect(refCheck?.passed).toBe(false);
      expect(refCheck?.rows.some((r: any) => r.id === userB.id)).toBe(true);
    } finally {
      await db.user.deleteMany({
        where: { id: { in: [userA.id, userB.id] } },
      });
    }
  });

  it('detects duplicate idempotency key constraint query and validates clean baseline', async () => {
    const report = await runReconciliation();
    const check = report.checks.find(c => c.check_id === 'DUPLICATE_IDEMPOTENCY_KEY');
    expect(check).toBeDefined();
    expect(check!.severity).toBe('CRITICAL');
    expect(check!.query).toContain('idempotencyKey');
    expect(check!.passed).toBe(true);
    expect(check!.rows).toEqual([]);
  });

  it('detects duplicate commission constraint query and validates clean baseline', async () => {
    const report = await runReconciliation();
    const check = report.checks.find(c => c.check_id === 'DUPLICATE_COMMISSION');
    expect(check).toBeDefined();
    expect(check!.severity).toBe('CRITICAL');
    expect(check!.query).toContain('Commission');
    expect(check!.passed).toBe(true);
    expect(check!.rows).toEqual([]);
  });

  it('detects orphan ledger entry query and validates clean baseline', async () => {
    const report = await runReconciliation();
    const check = report.checks.find(c => c.check_id === 'ORPHAN_LEDGER_ENTRY');
    expect(check).toBeDefined();
    expect(check!.severity).toBe('HIGH');
    expect(check!.query).toContain('LedgerEntry');
    expect(check!.passed).toBe(true);
    expect(check!.rows).toEqual([]);
  });

  it('detects orphan drip order query and validates clean baseline', async () => {
    const report = await runReconciliation();
    const check = report.checks.find(c => c.check_id === 'ORPHAN_DRIP_ORDER');
    expect(check).toBeDefined();
    expect(check!.severity).toBe('HIGH');
    expect(check!.query).toContain('Order');
    expect(check!.passed).toBe(true);
    expect(check!.rows).toEqual([]);
  });

  it('detects orphan smart campaign query and validates clean baseline', async () => {
    const report = await runReconciliation();
    const check = report.checks.find(c => c.check_id === 'ORPHAN_SMART_CAMPAIGN');
    expect(check).toBeDefined();
    expect(check!.severity).toBe('HIGH');
    expect(check!.query).toContain('SmartCampaign');
    expect(check!.passed).toBe(true);
    expect(check!.rows).toEqual([]);
  });

  it('detects task quantity mismatch query and validates clean baseline', async () => {
    const report = await runReconciliation();
    const check = report.checks.find(c => c.check_id === 'SMART_TASK_QUANTITY_MISMATCH');
    expect(check).toBeDefined();
    expect(check!.severity).toBe('HIGH');
    expect(check!.query).toContain('totalQuantity');
    expect(check!.passed).toBe(true);
    expect(check!.rows).toEqual([]);
  });

  it('detects stuck SENT task query and validates clean baseline', async () => {
    const report = await runReconciliation();
    const check = report.checks.find(c => c.check_id === 'STUCK_SENT_TASK');
    expect(check).toBeDefined();
    expect(check!.severity).toBe('HIGH');
    expect(check!.query).toContain('SENT');
    expect(check!.passed).toBe(true);
    expect(check!.rows).toEqual([]);
  });

  it('detects sent task without execution query and validates clean baseline', async () => {
    const report = await runReconciliation();
    const check = report.checks.find(c => c.check_id === 'SENT_TASK_WITHOUT_EXECUTION');
    expect(check).toBeDefined();
    expect(check!.severity).toBe('HIGH');
    expect(check!.query).toContain('SmartExecution');
    expect(check!.passed).toBe(true);
    expect(check!.rows).toEqual([]);
  });

  it('detects duplicate smart execution query and validates clean baseline', async () => {
    const report = await runReconciliation();
    const check = report.checks.find(c => c.check_id === 'DUPLICATE_SMART_EXECUTION');
    expect(check).toBeDefined();
    expect(check!.severity).toBe('CRITICAL');
    expect(check!.query).toContain('SmartExecution');
    expect(check!.passed).toBe(true);
    expect(check!.rows).toEqual([]);
  });

  it('detects completed campaign with unfinished tasks query and validates clean baseline', async () => {
    const report = await runReconciliation();
    const check = report.checks.find(c => c.check_id === 'COMPLETED_CAMPAIGN_WITH_UNFINISHED_TASKS');
    expect(check).toBeDefined();
    expect(check!.severity).toBe('CRITICAL');
    expect(check!.query).toContain('COMPLETED');
    expect(check!.passed).toBe(true);
    expect(check!.rows).toEqual([]);
  });

  it('detects refund overcharge query and validates clean baseline', async () => {
    const report = await runReconciliation();
    const check = report.checks.find(c => c.check_id === 'REFUND_OVERCHARGE');
    expect(check).toBeDefined();
    expect(check!.severity).toBe('CRITICAL');
    expect(check!.query).toContain('REFUND');
    expect(check!.passed).toBe(true);
    expect(check!.rows).toEqual([]);
  });
});
