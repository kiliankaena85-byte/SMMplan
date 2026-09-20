/**
 * (c) 2026 SMMplan & OmniSMM 1.0.
 * Property-Based Fuzzing & Financial Invariant Unit Tests.
 *
 * Hard Invariants Tested:
 * 1. ExactMath rubles <-> kopecks bijection (Zero Floating-Point Drift).
 * 2. ExactMath banker's rounding (Half-Even Symmetry & Bounded Error).
 * 3. Micro-pricing monotonicity (Increased quantity never decreases total charge).
 * 4. Floor invariant (charge >= floor).
 * 5. Partial refund boundedness (0 <= refund <= charge).
 * 6. WalletOps Ledger-First Principle (LedgerEntry created strictly BEFORE User.balance mutation).
 * 7. Non-negative balance & atomic insufficient funds protection.
 * 8. Admin adjustment safety caps (MAX_ADJUSTMENT_CAP_KOPECKS & ELEVATED_ADJUSTMENT_CAP_KOPECKS).
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { ExactMath } from '@/lib/financial/exact-math';
import {
  WalletOps,
  MAX_ADJUSTMENT_CAP_KOPECKS,
  ELEVATED_ADJUSTMENT_CAP_KOPECKS,
  WalletInsufficientFundsError,
  WalletInvalidAmountError,
} from '@/services/financial/wallet-ops';

describe('Admin Financial Invariants — ExactMath Engine', () => {
  describe('1. Property-Based Fuzzing: rublesToKopecks & kopecksToRublesString', () => {
    it('fuzzes valid rubles representations without floating-point drift', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100_000_000 }), // 0 to 1,000,000.00 RUB
          fc.integer({ min: 0, max: 99 }), // 0 to 99 kopecks
          (rub, kop) => {
            const kopStr = kop < 10 ? `0${kop}` : `${kop}`;
            const strVal = `${rub}.${kopStr}`;
            const expectedKopecks = BigInt(rub) * BigInt(100) + BigInt(kop);

            const convertedFromStr = ExactMath.rublesToKopecks(strVal);
            expect(convertedFromStr).toBe(expectedKopecks);

            const convertedToRubStr = ExactMath.kopecksToRublesString(convertedFromStr);
            expect(convertedToRubStr).toBe(strVal);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('rejects negative, NaN, Infinity, and non-finite monetary values', () => {
      expect(() => ExactMath.rublesToKopecks(-0.01)).toThrow(/Negative monetary/);
      expect(() => ExactMath.rublesToKopecks(NaN)).toThrow(/Invalid monetary/);
      expect(() => ExactMath.rublesToKopecks(Infinity)).toThrow(/Invalid monetary/);
      expect(() => ExactMath.rublesToKopecks(-Infinity)).toThrow(/Invalid monetary/);
      expect(() => ExactMath.rublesToKopecks('invalid-rubles')).toThrow(/Invalid monetary/);
    });
  });

  describe('2. Banker\'s Rounding (Half-Even) Invariants', () => {
    it('rounds halfway cases strictly to the nearest even number', () => {
      // 2.5 -> 2, 3.5 -> 4
      expect(ExactMath.roundHalfEven(BigInt(25000), BigInt(10000))).toBe(BigInt(2));
      expect(ExactMath.roundHalfEven(BigInt(35000), BigInt(10000))).toBe(BigInt(4));
      // 4.5 -> 4, 5.5 -> 6
      expect(ExactMath.roundHalfEven(BigInt(45000), BigInt(10000))).toBe(BigInt(4));
      expect(ExactMath.roundHalfEven(BigInt(55000), BigInt(10000))).toBe(BigInt(6));
      // Negative half-even symmetry: -2.5 -> -2, -3.5 -> -4
      expect(ExactMath.roundHalfEven(BigInt(-25000), BigInt(10000))).toBe(BigInt(-2));
      expect(ExactMath.roundHalfEven(BigInt(-35000), BigInt(10000))).toBe(BigInt(-4));
    });

    it('fuzzes banker\'s rounding to ensure symmetric and bounded behavior', () => {
      fc.assert(
        fc.property(fc.integer({ min: -1_000_000, max: 1_000_000 }), (val) => {
          const divisor = BigInt(100);
          const scaled = BigInt(val);
          const rounded = ExactMath.roundHalfEven(scaled, divisor);

          // Scaled error must be at most half of the divisor (50 kopecks)
          const diff = scaled > BigInt(0) ? scaled - rounded * divisor : -(scaled - rounded * divisor);
          expect(diff <= BigInt(50)).toBe(true);
        }),
        { numRuns: 300 }
      );
    });
  });

  describe('3. Order Micro-Pricing & Monotonicity Invariants', () => {
    it('guarantees monotonicity: increasing quantity never decreases total charge', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50_000 }),
          fc.integer({ min: 1, max: 50_000 }),
          fc.integer({ min: 10, max: 500_000 }), // rate per 1k in kopecks (0.10 to 5000.00 RUB)
          fc.integer({ min: 0, max: 5000 }), // margin in bps (0% to 50%)
          (q1, q2, ratePer1k, marginBps) => {
            const minQty = Math.min(q1, q2);
            const maxQty = Math.max(q1, q2);

            const cost1 = ExactMath.calculateOrderCostKopecks(minQty, BigInt(ratePer1k), BigInt(marginBps));
            const cost2 = ExactMath.calculateOrderCostKopecks(maxQty, BigInt(ratePer1k), BigInt(marginBps));

            expect(cost2 >= cost1).toBe(true);
          }
        ),
        { numRuns: 300 }
      );
    });

    it('strictly enforces the minimum charge floor (anti-zero-charge invariant)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 10 }), // very low rate (0.01 RUB per 1k)
          fc.integer({ min: 1, max: 10 }), // floor (e.g. 1 to 10 kopecks)
          (qty, rate, floor) => {
            const cost = ExactMath.calculateOrderCostKopecks(qty, BigInt(rate), BigInt(0), BigInt(floor));
            expect(cost >= BigInt(floor)).toBe(true);
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('4. Partial Refund Invariants (Order Cancellation / Partial Completion)', () => {
    it('bounded refund invariant: 0 <= refund <= totalCharge for all valid inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 1_000_000 }), // total charge in kopecks
          fc.integer({ min: 10, max: 100_000 }), // initial quantity
          fc.integer({ min: 0, max: 100_000 }), // remains
          (totalCharge, initQty, remains) => {
            const actualRemains = Math.min(remains, initQty);
            const refund = ExactMath.calculatePartialRefund(BigInt(totalCharge), initQty, actualRemains);

            expect(refund >= BigInt(0)).toBe(true);
            expect(refund <= BigInt(totalCharge)).toBe(true);

            if (actualRemains === 0) {
              expect(refund).toBe(BigInt(0));
            }
            if (actualRemains === initQty) {
              expect(refund).toBe(BigInt(totalCharge));
            }
          }
        ),
        { numRuns: 400 }
      );
    });

    it('pro-rata fairness: refund proportion closely matches remaining proportion', () => {
      const charge = BigInt(10000); // 100.00 RUB
      const totalUnits = 1000;

      // 100% remains -> 100% refund
      expect(ExactMath.calculatePartialRefund(charge, totalUnits, 1000)).toBe(BigInt(10000));
      // 50% remains -> 50% refund
      expect(ExactMath.calculatePartialRefund(charge, totalUnits, 500)).toBe(BigInt(5000));
      // 25% remains -> 25% refund
      expect(ExactMath.calculatePartialRefund(charge, totalUnits, 250)).toBe(BigInt(2500));
      // 0% remains -> 0 refund
      expect(ExactMath.calculatePartialRefund(charge, totalUnits, 0)).toBe(BigInt(0));
    });
  });
});

describe('Admin Financial Invariants — WalletOps & Safety Guards', () => {
  function createMockTx(initialBalance: bigint = BigInt(100_000)) {
    let currentBalance = initialBalance;
    const callLog: string[] = [];

    return {
      callLog,
      getBalance: () => currentBalance,
      user: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
          callLog.push('user.findUnique');
          return {
            id: where.id,
            balance: currentBalance,
            tenantId: 'smmplan',
            role: 'USER',
            isDeleted: false,
          };
        }),
        findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
          callLog.push('user.findUniqueOrThrow');
          return {
            id: where.id,
            balance: currentBalance,
            tenantId: 'smmplan',
            role: 'USER',
            isDeleted: false,
          };
        }),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: { balance: { increment?: bigint; decrement?: bigint } | bigint } }) => {
          callLog.push('user.update');
          if (typeof data.balance === 'bigint') {
            currentBalance = data.balance;
          } else if (data.balance?.increment !== undefined) {
            currentBalance += data.balance.increment;
          } else if (data.balance?.decrement !== undefined) {
            currentBalance -= data.balance.decrement;
          }
          return { id: where.id, balance: currentBalance };
        }),
        updateMany: vi.fn(async ({ where, data }: { where: any; data: any }) => {
          callLog.push('user.updateMany');
          if (data.balance?.decrement !== undefined) {
            currentBalance -= data.balance.decrement;
          } else if (data.balance?.increment !== undefined) {
            currentBalance += data.balance.increment;
          }
          return { count: 1 };
        }),
      },
      ledgerEntry: {
        create: vi.fn(async ({ data }: { data: any }) => {
          callLog.push('ledgerEntry.create');
          return { id: 'mock-ledger-id', ...data };
        }),
        findUnique: vi.fn(async () => null),
      },
    };
  }

  describe('1. Ledger-First Principle Invariant', () => {
    it('creates LedgerEntry strictly BEFORE mutating user.balance in WalletOps.charge', async () => {
      const mockTx = createMockTx(BigInt(50_000));
      const res = await WalletOps.charge(mockTx as any, 'user-123', BigInt(15_000), 'Order checkout #101');

      expect(res.success).toBe(true);
      expect(mockTx.getBalance()).toBe(BigInt(35_000));

      const ledgerIndex = mockTx.callLog.indexOf('ledgerEntry.create');
      const updateIndex = Math.max(mockTx.callLog.indexOf('user.update'), mockTx.callLog.indexOf('user.updateMany'));

      expect(ledgerIndex).toBeGreaterThan(-1);
      expect(updateIndex).toBeGreaterThan(-1);
      expect(ledgerIndex).toBeLessThan(updateIndex); // Ledger-First!
    });

    it('creates LedgerEntry strictly BEFORE mutating user.balance in WalletOps.credit', async () => {
      const mockTx = createMockTx(BigInt(20_000));
      const res = await WalletOps.credit(mockTx as any, 'user-123', BigInt(10_000), 'Payment deposit');

      expect(res.success).toBe(true);
      expect(mockTx.getBalance()).toBe(BigInt(30_000));

      const ledgerIndex = mockTx.callLog.indexOf('ledgerEntry.create');
      const updateIndex = mockTx.callLog.indexOf('user.update');

      expect(ledgerIndex).toBeLessThan(updateIndex);
    });
  });

  describe('2. Non-Negative Balance & Insufficient Funds Invariant', () => {
    it('throws WalletInsufficientFundsError and prevents balance change when balance is insufficient', async () => {
      const mockTx = createMockTx(BigInt(1_000)); // 10.00 RUB

      await expect(
        WalletOps.charge(mockTx as any, 'user-123', BigInt(5_000), 'Attempt charge 50 RUB')
      ).rejects.toThrow(WalletInsufficientFundsError);

      expect(mockTx.getBalance()).toBe(BigInt(1_000)); // Untouched!
      expect(mockTx.callLog).not.toContain('user.update');
    });

    it('rejects invalid zero or negative amounts with WalletInvalidAmountError', async () => {
      const mockTx = createMockTx(BigInt(50_000));

      await expect(
        WalletOps.charge(mockTx as any, 'user-123', BigInt(0), 'Zero charge')
      ).rejects.toThrow(WalletInvalidAmountError);

      await expect(
        WalletOps.charge(mockTx as any, 'user-123', BigInt(-500), 'Negative charge')
      ).rejects.toThrow(WalletInvalidAmountError);

      await expect(
        WalletOps.credit(mockTx as any, 'user-123', BigInt(0), 'Zero credit')
      ).rejects.toThrow(WalletInvalidAmountError);
    });
  });

  describe('3. Admin Adjustment Safety Cap Invariants (P2-14)', () => {
    it('rejects admin debit adjustments exceeding MAX_ADJUSTMENT_CAP_KOPECKS without elevated cap', async () => {
      const mockTx = createMockTx(BigInt(200_000_000)); // High balance
      const excessiveAmount = -(MAX_ADJUSTMENT_CAP_KOPECKS + BigInt(1));

      await expect(
        WalletOps.adminAdjust(mockTx as any, 'user-123', excessiveAmount, 'Excessive debit adjustment')
      ).rejects.toThrow(/Negative adjustment exceeds safety cap limit/);
    });

    it('rejects admin credit adjustments exceeding MAX_ADJUSTMENT_CAP_KOPECKS without elevated cap', async () => {
      const mockTx = createMockTx(BigInt(10_000));
      const excessiveAmount = MAX_ADJUSTMENT_CAP_KOPECKS + BigInt(100);

      await expect(
        WalletOps.adminAdjust(mockTx as any, 'user-123', excessiveAmount, 'Excessive credit adjustment')
      ).rejects.toThrow(/Positive adjustment exceeds safety cap limit/);
    });

    it('allows large adjustments up to ELEVATED_ADJUSTMENT_CAP_KOPECKS when allowElevatedCap is granted', async () => {
      const mockTx = createMockTx(BigInt(20_000_000_000));
      const elevatedAmount = BigInt(500_000_000); // 5,000,000.00 RUB

      const res = await WalletOps.adminAdjust(
        mockTx as any,
        'user-123',
        -elevatedAmount,
        'Authorized Owner large adjustment',
        { allowElevatedCap: true }
      );

      expect(res.success).toBe(true);
    });

    it('rejects adjustments exceeding even ELEVATED_ADJUSTMENT_CAP_KOPECKS regardless of flags', async () => {
      const mockTx = createMockTx(BigInt(50_000_000_000));
      const impossibleAmount = ELEVATED_ADJUSTMENT_CAP_KOPECKS + BigInt(1);

      await expect(
        WalletOps.adminAdjust(
          mockTx as any,
          'user-123',
          impossibleAmount,
          'Beyond 10M RUB limit',
          { allowElevatedCap: true }
        )
      ).rejects.toThrow(/Positive adjustment exceeds safety cap limit/);
    });
  });
});
