import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { WalletOps, MAX_ADJUSTMENT_CAP_KOPECKS } from '@/services/financial/wallet-ops';

describe('WalletOps AdminAdjust Safety Cap Invariants (P2-14)', () => {
  let testUserId: string;

  beforeEach(async () => {
    const user = await db.user.create({
      data: {
        email: `wallet-cap-test-${Date.now()}@example.com`,
        role: 'USER',
        tenantId: 'smmplan',
        balance: BigInt(50000), // 500 RUB
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    if (testUserId) {
      await db.ledgerEntry.deleteMany({ where: { userId: testUserId } }).catch(() => {});
      await db.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  it('rejects negative adjustment exceeding MAX_ADJUSTMENT_CAP_KOPECKS', async () => {
    await expect(
      db.$transaction(async (tx) => {
        await WalletOps.adminAdjust(
          tx,
          testUserId,
          -(MAX_ADJUSTMENT_CAP_KOPECKS + BigInt(1)),
          'Attempt excessive negative adjustment'
        );
      })
    ).rejects.toThrow('Negative adjustment exceeds safety cap limit');
  });

  it('rejects positive adjustment exceeding MAX_ADJUSTMENT_CAP_KOPECKS', async () => {
    await expect(
      db.$transaction(async (tx) => {
        await WalletOps.adminAdjust(
          tx,
          testUserId,
          MAX_ADJUSTMENT_CAP_KOPECKS + BigInt(100),
          'Attempt excessive positive adjustment'
        );
      })
    ).rejects.toThrow('Positive adjustment exceeds safety cap limit');
  });
});
