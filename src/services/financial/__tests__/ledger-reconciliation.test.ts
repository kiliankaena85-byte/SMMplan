import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { LedgerReconciliationService } from '../ledger-reconciliation.service';

describe.sequential('LedgerReconciliationService Tests', () => {
  beforeEach(async () => {
    // 1. Clear tables for pristine test environment in canonical lock order
    await db.$executeRawUnsafe('TRUNCATE TABLE "LedgerEntry", "AdminAuditLog", "User" CASCADE;');

    // 2. Enable test mode in system settings
    await db.systemSettings.upsert({
      where: { id: 'global' },
      update: { isTestMode: true },
      create: { id: 'global', isTestMode: true },
    });
  });

  describe('getSummary', () => {
    it('should report 100% integrity when all accounts match ledger entries', async () => {
      // Create clean users
      const u1 = await db.user.create({
        data: {
          email: 'u1@example.com',
          balance: BigInt(5000), // 50.00 RUB
          tenantId: 'smmplan',
        },
      });

      const u2 = await db.user.create({
        data: {
          email: 'u2@example.com',
          balance: BigInt(2500), // 25.00 RUB
          tenantId: 'smmplan',
        },
      });

      // Matching ledger entries
      await db.ledgerEntry.createMany({
        data: [
          { userId: u1.id, amount: BigInt(3000), reason: 'Top-up 1', status: 'APPROVED', tenantId: 'smmplan' },
          { userId: u1.id, amount: BigInt(2000), reason: 'Top-up 2', status: 'APPROVED', tenantId: 'smmplan' },
          { userId: u2.id, amount: BigInt(2500), reason: 'Top-up', status: 'APPROVED', tenantId: 'smmplan' },
        ],
      });

      const summary = await LedgerReconciliationService.getSummary('smmplan');

      expect(summary.totalUsersChecked).toBe(2);
      expect(summary.reconciledUsersCount).toBe(2);
      expect(summary.discrepancyUsersCount).toBe(0);
      expect(summary.totalUserBalancesCents).toBe(7500);
      expect(summary.totalLedgerSumsCents).toBe(7500);
      expect(summary.netDiscrepancyCents).toBe(0);
      expect(summary.integrityPercentage).toBe(100);
    });

    it('should detect discrepancies when user balances are inflated or deflated', async () => {
      // Clean user
      const cleanUser = await db.user.create({
        data: {
          email: 'clean@example.com',
          balance: BigInt(1000),
          tenantId: 'smmplan',
        },
      });
      await db.ledgerEntry.create({
        data: { userId: cleanUser.id, amount: BigInt(1000), reason: 'Valid', status: 'APPROVED' },
      });

      // Inflated user: balance 3000, ledger 2000 (diff +1000)
      const inflatedUser = await db.user.create({
        data: {
          email: 'inflated@example.com',
          balance: BigInt(3000),
          tenantId: 'smmplan',
        },
      });
      await db.ledgerEntry.create({
        data: { userId: inflatedUser.id, amount: BigInt(2000), reason: 'Partial', status: 'APPROVED' },
      });

      // Deflated user: balance 500, ledger 1000 (diff -500)
      const deflatedUser = await db.user.create({
        data: {
          email: 'deflated@example.com',
          balance: BigInt(500),
          tenantId: 'smmplan',
        },
      });
      await db.ledgerEntry.create({
        data: { userId: deflatedUser.id, amount: BigInt(1000), reason: 'Charge missing', status: 'APPROVED' },
      });

      const summary = await LedgerReconciliationService.getSummary('all');

      expect(summary.totalUsersChecked).toBe(3);
      expect(summary.reconciledUsersCount).toBe(1);
      expect(summary.discrepancyUsersCount).toBe(2);
      expect(summary.totalUserBalancesCents).toBe(4500);
      expect(summary.totalLedgerSumsCents).toBe(4000);
      expect(summary.netDiscrepancyCents).toBe(500); // 1000 + (-500) = 500
      expect(summary.integrityPercentage).toBe(33.33);
    });

    it('should strictly exclude quarantine and rejected ledger entries from approved sum', async () => {
      const user = await db.user.create({
        data: {
          email: 'quarantine_user@example.com',
          balance: BigInt(1000),
          quarantineBalance: BigInt(500),
          tenantId: 'smmplan',
        },
      });

      await db.ledgerEntry.createMany({
        data: [
          { userId: user.id, amount: BigInt(1000), reason: 'Approved Credit', status: 'APPROVED' },
          { userId: user.id, amount: BigInt(500), reason: 'Quarantined Escrow', status: 'QUARANTINE' },
          { userId: user.id, amount: BigInt(200), reason: 'Rejected Adjustment', status: 'REJECTED' },
        ],
      });

      const summary = await LedgerReconciliationService.getSummary('smmplan');

      expect(summary.totalUsersChecked).toBe(1);
      expect(summary.reconciledUsersCount).toBe(1);
      expect(summary.discrepancyUsersCount).toBe(0);
      expect(summary.totalUserBalancesCents).toBe(1000);
      expect(summary.totalLedgerSumsCents).toBe(1000);
      expect(summary.netDiscrepancyCents).toBe(0);
    });

    it('should respect tenant filtering', async () => {
      const smmplanUser = await db.user.create({
        data: { email: 'smmplan@test.com', balance: BigInt(1000), tenantId: 'smmplan' },
      });
      await db.ledgerEntry.create({
        data: { userId: smmplanUser.id, amount: BigInt(1000), reason: 'Ok', status: 'APPROVED', tenantId: 'smmplan' },
      });

      const fluxUser = await db.user.create({
        data: { email: 'flux@test.com', balance: BigInt(2000), tenantId: 'flux' },
      });
      await db.ledgerEntry.create({
        data: { userId: fluxUser.id, amount: BigInt(2000), reason: 'Ok', status: 'APPROVED', tenantId: 'flux' },
      });

      const smmplanSummary = await LedgerReconciliationService.getSummary('smmplan');
      expect(smmplanSummary.totalUsersChecked).toBe(1);
      expect(smmplanSummary.totalUserBalancesCents).toBe(1000);

      const fluxSummary = await LedgerReconciliationService.getSummary('flux');
      expect(fluxSummary.totalUsersChecked).toBe(1);
      expect(fluxSummary.totalUserBalancesCents).toBe(2000);

      const allSummary = await LedgerReconciliationService.getSummary('all');
      expect(allSummary.totalUsersChecked).toBe(2);
      expect(allSummary.totalUserBalancesCents).toBe(3000);
    });
  });

  describe('getAccounts', () => {
    it('should return paginated accounts with anomalies sorted first', async () => {
      const clean = await db.user.create({
        data: { email: 'aaa_clean@test.com', balance: BigInt(1000), tenantId: 'smmplan' },
      });
      await db.ledgerEntry.create({
        data: { userId: clean.id, amount: BigInt(1000), reason: 'Ok', status: 'APPROVED' },
      });

      const anomalySmall = await db.user.create({
        data: { email: 'zzz_anomaly_small@test.com', balance: BigInt(1100), tenantId: 'smmplan' },
      });
      await db.ledgerEntry.create({
        data: { userId: anomalySmall.id, amount: BigInt(1000), reason: 'Diff 100', status: 'APPROVED' },
      });

      const anomalyLarge = await db.user.create({
        data: { email: 'mmm_anomaly_large@test.com', balance: BigInt(5000), tenantId: 'smmplan' },
      });
      await db.ledgerEntry.create({
        data: { userId: anomalyLarge.id, amount: BigInt(1000), reason: 'Diff 4000', status: 'APPROVED' },
      });

      const result = await LedgerReconciliationService.getAccounts({
        page: 1,
        pageSize: 10,
      });

      expect(result.totalCount).toBe(3);
      expect(result.items.length).toBe(3);

      // Largest anomaly first
      expect(result.items[0].email).toBe('mmm_anomaly_large@test.com');
      expect(result.items[0].discrepancy).toBe(4000);
      expect(result.items[0].isDiscrepancy).toBe(true);

      // Smaller anomaly second
      expect(result.items[1].email).toBe('zzz_anomaly_small@test.com');
      expect(result.items[1].discrepancy).toBe(100);
      expect(result.items[1].isDiscrepancy).toBe(true);

      // Clean account third
      expect(result.items[2].email).toBe('aaa_clean@test.com');
      expect(result.items[2].discrepancy).toBe(0);
      expect(result.items[2].isDiscrepancy).toBe(false);
    });

    it('should filter by onlyAnomalies', async () => {
      const clean = await db.user.create({
        data: { email: 'clean@test.com', balance: BigInt(1000), tenantId: 'smmplan' },
      });
      await db.ledgerEntry.create({
        data: { userId: clean.id, amount: BigInt(1000), reason: 'Ok', status: 'APPROVED' },
      });

      const anomaly = await db.user.create({
        data: { email: 'anomaly@test.com', balance: BigInt(2000), tenantId: 'smmplan' },
      });
      await db.ledgerEntry.create({
        data: { userId: anomaly.id, amount: BigInt(1000), reason: 'Diff', status: 'APPROVED' },
      });

      const anomaliesOnly = await LedgerReconciliationService.getAccounts({
        onlyAnomalies: true,
      });

      expect(anomaliesOnly.totalCount).toBe(1);
      expect(anomaliesOnly.items.length).toBe(1);
      expect(anomaliesOnly.items[0].email).toBe('anomaly@test.com');
    });

    it('should filter by search query', async () => {
      await db.user.create({
        data: { email: 'target_client@example.com', balance: BigInt(500), tenantId: 'smmplan' },
      });
      await db.user.create({
        data: { email: 'other_person@example.com', balance: BigInt(500), tenantId: 'smmplan' },
      });

      const searchResult = await LedgerReconciliationService.getAccounts({
        search: 'target_client',
      });

      expect(searchResult.totalCount).toBe(1);
      expect(searchResult.items[0].email).toBe('target_client@example.com');
    });
  });

  describe('getUserAuditTimeline', () => {
    it('should sequentially compute running balance and return entries in reverse order', async () => {
      const user = await db.user.create({
        data: {
          email: 'timeline_user@example.com',
          balance: BigInt(2500),
          quarantineBalance: BigInt(300),
          totalSpent: BigInt(1000),
          tenantId: 'smmplan',
        },
      });

      // Insert entries with increasing timestamps
      const baseTime = new Date('2026-01-01T10:00:00Z');

      await db.ledgerEntry.create({
        data: {
          userId: user.id,
          amount: BigInt(2000), // +2000 (running: 2000)
          reason: 'Deposit',
          status: 'APPROVED',
          createdAt: new Date(baseTime.getTime() + 1000),
        },
      });

      await db.ledgerEntry.create({
        data: {
          userId: user.id,
          amount: BigInt(-1000), // -1000 (running: 1000)
          reason: 'Order #123 charge',
          status: 'APPROVED',
          createdAt: new Date(baseTime.getTime() + 2000),
        },
      });

      await db.ledgerEntry.create({
        data: {
          userId: user.id,
          amount: BigInt(300), // Quarantine entry (does not increment approved running balance)
          reason: 'Pending escrow',
          status: 'QUARANTINE',
          createdAt: new Date(baseTime.getTime() + 3000),
        },
      });

      await db.ledgerEntry.create({
        data: {
          userId: user.id,
          amount: BigInt(1500), // +1500 (running: 2500)
          reason: 'Topup #2',
          status: 'APPROVED',
          createdAt: new Date(baseTime.getTime() + 4000),
        },
      });

      const timeline = await LedgerReconciliationService.getUserAuditTimeline(user.id);

      expect(timeline.user.id).toBe(user.id);
      expect(timeline.user.balance).toBe(2500);
      expect(timeline.user.quarantineBalance).toBe(300);
      expect(timeline.discrepancy).toBe(0);
      expect(timeline.isDiscrepancy).toBe(false);

      // Entries reversed for UI display (newest first)
      expect(timeline.entries.length).toBe(4);

      // 1. Most recent: Topup #2 (+1500, running: 2500)
      expect(timeline.entries[0].reason).toBe('Topup #2');
      expect(timeline.entries[0].amount).toBe(1500);
      expect(timeline.entries[0].runningBalance).toBe(2500);

      // 2. Quarantine entry: +300, status QUARANTINE (running balance stayed at 1000)
      expect(timeline.entries[1].reason).toBe('Pending escrow');
      expect(timeline.entries[1].status).toBe('QUARANTINE');
      expect(timeline.entries[1].runningBalance).toBe(1000);

      // 3. Order charge: -1000 (running: 1000)
      expect(timeline.entries[2].reason).toBe('Order #123 charge');
      expect(timeline.entries[2].amount).toBe(-1000);
      expect(timeline.entries[2].runningBalance).toBe(1000);

      // 4. Oldest: Deposit (+2000, running: 2000)
      expect(timeline.entries[3].reason).toBe('Deposit');
      expect(timeline.entries[3].amount).toBe(2000);
      expect(timeline.entries[3].runningBalance).toBe(2000);
    });
  });

  describe('remediateUser', () => {
    it('should lock an anomalous user and create an audit log', async () => {
      const user = await db.user.create({
        data: {
          email: 'lock_target@test.com',
          balance: BigInt(5000),
          isActive: true,
          tenantId: 'smmplan',
        },
      });

      const admin = { id: 'admin-123', email: 'admin@smmplan.pro' };

      const res = await LedgerReconciliationService.remediateUser(
        user.id,
        'LOCK',
        admin,
        'Suspicious phantom balance'
      );

      expect(res.success).toBe(true);
      expect(res.message).toContain('успешно заблокирован');

      // Verify DB state
      const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(updated.isActive).toBe(false);
      expect(updated.adminNote).toContain('[RECONCILIATION GUARD]');
      expect(updated.adminNote).toContain('admin@smmplan.pro');
      expect(updated.adminNote).toContain('Suspicious phantom balance');

      // Verify AdminAuditLog
      const auditLog = await db.adminAuditLog.findFirst({
        where: { target: user.id, action: 'USER_LOCK_RECONCILIATION' },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog!.adminEmail).toBe(admin.email);
    });

    it('should automatically balance discrepancies via compensating ledger entry and audit log', async () => {
      // User with balance 3000, but ledger approved entries sum to only 2000 (diff = +1000)
      const user = await db.user.create({
        data: {
          email: 'auto_adjust_user@test.com',
          balance: BigInt(3000),
          isActive: true,
          tenantId: 'smmplan',
        },
      });

      await db.ledgerEntry.create({
        data: {
          userId: user.id,
          amount: BigInt(2000),
          reason: 'Initial credit',
          status: 'APPROVED',
          tenantId: 'smmplan',
        },
      });

      // Verify pre-condition: discrepancy of 1000 cents
      const preSummary = await LedgerReconciliationService.getSummary('smmplan');
      expect(preSummary.discrepancyUsersCount).toBe(1);
      expect(preSummary.netDiscrepancyCents).toBe(1000);

      const admin = { id: 'admin-456', email: 'fin-officer@smmplan.pro' };

      const res = await LedgerReconciliationService.remediateUser(
        user.id,
        'AUTO_ADJUST',
        admin,
        'Fix missing payment ledger entry'
      );

      expect(res.success).toBe(true);
      expect(res.message).toContain('успешно синхронизированы');

      // Verify post-condition: discrepancy is completely eliminated (0)
      const postSummary = await LedgerReconciliationService.getSummary('smmplan');
      expect(postSummary.discrepancyUsersCount).toBe(0);
      expect(postSummary.netDiscrepancyCents).toBe(0);
      expect(postSummary.integrityPercentage).toBe(100);

      // Verify new compensating LedgerEntry exists
      const compensatingEntry = await db.ledgerEntry.findFirst({
        where: {
          userId: user.id,
          transactionType: 'COMPENSATION',
        },
      });
      expect(compensatingEntry).toBeDefined();
      expect(compensatingEntry!.amount).toBe(BigInt(1000));
      expect(compensatingEntry!.status).toBe('APPROVED');
      expect(compensatingEntry!.adminId).toBe(admin.id);
      expect(compensatingEntry!.reason).toContain('Fix missing payment ledger entry');

      // Verify timeline reflects the fix
      const timeline = await LedgerReconciliationService.getUserAuditTimeline(user.id);
      expect(timeline.discrepancy).toBe(0);
      expect(timeline.isDiscrepancy).toBe(false);

      // Verify AdminAuditLog
      const auditLog = await db.adminAuditLog.findFirst({
        where: { target: user.id, action: 'RECONCILIATION_AUTO_ADJUST' },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog!.adminEmail).toBe(admin.email);
    });

    it('should be a no-op if account is already balanced', async () => {
      const user = await db.user.create({
        data: { email: 'balanced@test.com', balance: BigInt(1000), tenantId: 'smmplan' },
      });
      await db.ledgerEntry.create({
        data: { userId: user.id, amount: BigInt(1000), reason: 'Exact', status: 'APPROVED' },
      });

      const admin = { id: 'admin-789', email: 'admin@smmplan.pro' };
      const res = await LedgerReconciliationService.remediateUser(user.id, 'AUTO_ADJUST', admin);

      expect(res.success).toBe(true);
      expect(res.message).toContain('Расхождений не обнаружено');

      // No compensation ledger entry created
      const compCount = await db.ledgerEntry.count({
        where: { userId: user.id, transactionType: 'COMPENSATION' },
      });
      expect(compCount).toBe(0);
    });

    it('should be a safe no-op for a brand-new user with 0 balance and 0 ledger entries', async () => {
      const user = await db.user.create({
        data: { email: 'zero_user@test.com', balance: BigInt(0), tenantId: 'smmplan' },
      });

      const admin = { id: 'admin-c2', email: 'auditor@smmplan.pro' };
      const res = await LedgerReconciliationService.remediateUser(user.id, 'AUTO_ADJUST', admin);

      expect(res.success).toBe(true);
      expect(res.message).toContain('Расхождений не обнаружено');

      const compCount = await db.ledgerEntry.count({
        where: { userId: user.id, transactionType: 'COMPENSATION' },
      });
      expect(compCount).toBe(0);
    });

    it('should be a safe no-op for a user with negative balance matching negative ledger sum', async () => {
      const user = await db.user.create({
        data: { email: 'neg_user@test.com', balance: BigInt(-5000), tenantId: 'smmplan' },
      });
      await db.ledgerEntry.create({
        data: { userId: user.id, amount: BigInt(-5000), reason: 'Clawback', status: 'APPROVED', tenantId: 'smmplan' },
      });

      const admin = { id: 'admin-c2', email: 'auditor@smmplan.pro' };
      const res = await LedgerReconciliationService.remediateUser(user.id, 'AUTO_ADJUST', admin);

      expect(res.success).toBe(true);
      expect(res.message).toContain('Расхождений не обнаружено');

      const compCount = await db.ledgerEntry.count({
        where: { userId: user.id, transactionType: 'COMPENSATION' },
      });
      expect(compCount).toBe(0);
    });

    it('should handle accounts with 0 entries cleanly in getUserAuditTimeline', async () => {
      const user = await db.user.create({
        data: { email: 'no_entries@test.com', balance: BigInt(2500), tenantId: 'smmplan' },
      });

      const timeline = await LedgerReconciliationService.getUserAuditTimeline(user.id);
      expect(timeline.user.id).toBe(user.id);
      expect(timeline.user.balance).toBe(2500);
      expect(timeline.entries).toEqual([]);
      expect(timeline.discrepancy).toBe(2500);
      expect(timeline.isDiscrepancy).toBe(true);
    });

    it('should safely throw or report error for non-existent / missing user IDs', async () => {
      const missingId = 'non-existent-user-cuid-999';
      await expect(
        LedgerReconciliationService.getUserAuditTimeline(missingId)
      ).rejects.toThrow();

      await expect(
        LedgerReconciliationService.remediateUser(missingId, 'AUTO_ADJUST', { id: 'admin-1', email: 'admin@test.pro' })
      ).rejects.toThrow();
    });

    it('should prevent double compensation when AUTO_ADJUST is called consecutively (idempotency guard)', async () => {
      const user = await db.user.create({
        data: {
          email: 'consecutive_adjust@test.com',
          balance: BigInt(4000),
          isActive: true,
          tenantId: 'smmplan',
        },
      });

      await db.ledgerEntry.create({
        data: {
          userId: user.id,
          amount: BigInt(1500),
          reason: 'Initial credit',
          status: 'APPROVED',
          tenantId: 'smmplan',
        },
      });

      const admin = { id: 'admin-c2', email: 'auditor@smmplan.pro' };

      // Call 1: Auto adjust discrepancy (+2500)
      const res1 = await LedgerReconciliationService.remediateUser(user.id, 'AUTO_ADJUST', admin, 'First fix');
      expect(res1.success).toBe(true);
      expect(res1.message).toContain('успешно синхронизированы');

      // Verify exactly 1 compensation exists
      let compensations = await db.ledgerEntry.findMany({
        where: { userId: user.id, transactionType: 'COMPENSATION' },
      });
      expect(compensations.length).toBe(1);
      expect(compensations[0].amount).toBe(BigInt(2500));

      // Call 2: Immediate consecutive duplicate remediation
      const res2 = await LedgerReconciliationService.remediateUser(user.id, 'AUTO_ADJUST', admin, 'Duplicate fix');
      expect(res2.success).toBe(true);
      expect(res2.message).toContain('Расхождений не обнаружено — баланс сходится');

      // Verify STILL exactly 1 compensation exists (no double compensation)
      compensations = await db.ledgerEntry.findMany({
        where: { userId: user.id, transactionType: 'COMPENSATION' },
      });
      expect(compensations.length).toBe(1);

      // Verify final ledger sum equals user balance
      const agg = await db.ledgerEntry.aggregate({
        _sum: { amount: true },
        where: { userId: user.id, status: 'APPROVED' },
      });
      expect(agg._sum.amount).toBe(BigInt(4000));
    });
  });
});
