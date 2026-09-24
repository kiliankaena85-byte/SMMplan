import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletService, deductBalanceWithLock, ImmutableLedgerError } from '@/services/financial/wallet.service';
import { adminUserService } from '@/services/admin/user.service';
import { WalletOps } from '@/services/financial/wallet-ops';
import { db } from '@/lib/db';
import { auditAdminAwaitable } from '@/lib/admin-audit';

vi.mock('@/lib/admin-audit', () => ({
  auditAdmin: vi.fn(),
  auditAdminAwaitable: vi.fn().mockResolvedValue({ id: 'audit-1' }),
}));

vi.mock('@/lib/transactions', () => ({
  runSerializableTransaction: vi.fn(async (cb) => {
    return await cb({});
  }),
}));

vi.mock('@/services/financial/wallet-ops', () => ({
  WalletOps: {
    charge: vi.fn(),
    credit: vi.fn(),
    refund: vi.fn(),
    adminAdjust: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      if (typeof cb === 'function') {
        return await cb({});
      }
      return cb;
    }),
  },
}));

describe('BAL-01 / BAL-02 / BAL-03: Immutable Ledger & Exact BigInt Wallet Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ImmutableLedgerError handling', () => {
    it('throws ImmutableLedgerError when charge encounters immutability violation', async () => {
      vi.mocked(WalletOps.charge).mockRejectedValueOnce(
        new Error('LedgerEntry immutability trigger: modifications forbidden')
      );

      await expect(
        WalletService.charge('user-1', 1000, 'Test charge')
      ).rejects.toThrow(ImmutableLedgerError);
    });

    it('throws ImmutableLedgerError when credit encounters immutability violation', async () => {
      vi.mocked(WalletOps.credit).mockRejectedValueOnce(
        new Error('immutability violation: append-only ledger')
      );

      await expect(
        WalletService.credit('user-1', 1000, 'Test credit')
      ).rejects.toThrow(ImmutableLedgerError);
    });

    it('throws ImmutableLedgerError when refund encounters immutability violation', async () => {
      vi.mocked(WalletOps.refund).mockRejectedValueOnce(
        new Error('LedgerEntry immutability trigger: modifications forbidden')
      );

      await expect(
        WalletService.refund('user-1', 1000, 'Test refund')
      ).rejects.toThrow(ImmutableLedgerError);
    });

    it('throws ImmutableLedgerError when deductBalanceWithLock encounters immutability violation', async () => {
      vi.mocked(WalletOps.charge).mockRejectedValueOnce(
        new Error('immutability violation: append-only ledger')
      );

      await expect(
        deductBalanceWithLock('user-1', 1000, 'Test deduct')
      ).rejects.toThrow(ImmutableLedgerError);
    });

    it('returns error result for standard operational errors without throwing ImmutableLedgerError', async () => {
      vi.mocked(WalletOps.charge).mockRejectedValueOnce(
        new Error('Insufficient funds')
      );

      const res = await WalletService.charge('user-1', 1000, 'Test charge');
      expect(res.success).toBe(false);
      expect('error' in res ? res.error : undefined).toBe('Insufficient funds');
    });
  });

  describe('adminUserService.updateBalance exact BigInt and auditAdminAwaitable', () => {
    it('handles BigInt and number without precision loss and awaits auditAdminAwaitable', async () => {
      const hugeBalance = BigInt('900719925474099300'); // > Number.MAX_SAFE_INTEGER
      const delta = BigInt('500000');

      vi.mocked(db.user.findUniqueOrThrow).mockResolvedValueOnce({
        id: 'user-huge',
        balance: hugeBalance,
        tenantId: 'smmplan',
      } as any);

      vi.mocked(WalletOps.adminAdjust).mockResolvedValueOnce({
        success: true,
        balance: hugeBalance + delta,
        cached: false,
        entry: {} as any,
      });

      await adminUserService.updateBalance(
        'user-huge',
        delta,
        'Manual compensation',
        { id: 'admin-1', email: 'owner@smmplan.pro' }
      );

      expect(WalletOps.adminAdjust).toHaveBeenCalledWith(
        expect.anything(),
        'user-huge',
        delta,
        'Manual compensation',
        expect.objectContaining({
          adminId: 'admin-1',
          tenantId: 'smmplan',
        })
      );

      expect(auditAdminAwaitable).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: 'admin-1',
          action: 'USER_BALANCE_CHANGE',
          target: 'user-huge',
          oldValue: { balance: hugeBalance.toString() },
          newValue: expect.objectContaining({
            balance: (hugeBalance + delta).toString(),
            delta: delta.toString(),
            reason: 'Manual compensation',
          }),
        })
      );
    });
  });
});
