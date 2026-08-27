import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { runSerializableTransaction } from '@/lib/transactions';
import { ExactMath } from '@/lib/financial/exact-math';

export { ExactMath };

type PrismaTx = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class WalletInsufficientFundsError extends Error {
  readonly code = 'INSUFFICIENT_FUNDS';
  constructor(needed: number | bigint, got: number | bigint) {
    super(`Insufficient funds: needed ${needed.toString()}, got ${got.toString()}`);
    this.name = 'WalletInsufficientFundsError';
  }
}

export class WalletUserNotFoundError extends Error {
  readonly code = 'USER_NOT_FOUND';
  constructor(userId: string) {
    super(`User ${userId} not found or tenant access forbidden.`);
    this.name = 'WalletUserNotFoundError';
  }
}

export class WalletInvalidAmountError extends Error {
  readonly code = 'INVALID_AMOUNT';
  constructor(action: 'Charge' | 'Credit' | 'Adjustment' | 'Refund') {
    super(`${action} amount must be a strictly positive finite number.`);
    this.name = 'WalletInvalidAmountError';
  }
}

export interface WalletOpsOptions {
  idempotencyKey?: string;
  adminId?: string;
  tenantId?: string;
}

export const WalletOps = {
  /**
   * Safe charge mechanism without creating a new transaction.
   * Modifying balances using this guarantees no double-spending.
   * Strictly enforces Ledger-First Principle (LedgerEntry created BEFORE balance mutation).
   */
  async charge(
    tx: PrismaTx,
    userId: string,
    amountCents: number | bigint,
    reason: string,
    opts?: WalletOpsOptions
  ) {
    const rawCents = typeof amountCents === 'bigint' ? amountCents : BigInt(amountCents);
    const MAX_SINGLE_CHARGE_CENTS = BigInt(100_000_000); // 1M RUB safety cap
    if (rawCents <= BigInt(0) || rawCents > MAX_SINGLE_CHARGE_CENTS) {
      throw new WalletInvalidAmountError('Charge');
    }

    const { idempotencyKey, adminId, tenantId } = opts || {};

    // 1. Validate User existence and tenant isolation
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, balance: true, tenantId: true }
    });

    if (!user) {
      throw new WalletUserNotFoundError(userId);
    }

    if (tenantId && user.tenantId !== tenantId) {
      throw new WalletUserNotFoundError(userId);
    }

    if (user.balance < rawCents) {
      throw new WalletInsufficientFundsError(rawCents, user.balance);
    }

    const resolvedTenantId = tenantId || user.tenantId || 'smmplan';

    // 2. Idempotency pre-check
    if (idempotencyKey) {
      const existing = await tx.ledgerEntry.findFirst({
        where: { idempotencyKey },
      });
      
      if (existing) {
        return { success: true, balance: user.balance, cached: true, entry: existing };
      }
    }

    // 3. LEDGER-FIRST INVARIANT: Create LedgerEntry FIRST before updating User.balance
    try {
      const entry = await tx.ledgerEntry.create({
        data: {
          userId,
          tenantId: resolvedTenantId,
          adminId,
          amount: -rawCents,
          reason,
          status: 'APPROVED',
          idempotencyKey,
          transactionType: 'PAYMENT'
        }
      });

      // 4. Atomically mutate balance with concurrency check
      const updatedUserBatch = await tx.user.updateMany({
        where: { 
          id: userId,
          balance: { gte: rawCents },
          ...(tenantId ? { tenantId } : {})
        },
        data: {
          balance: { decrement: rawCents },
          totalSpent: { increment: rawCents }
        }
      });

      if (updatedUserBatch.count === 0) {
        const checkUser = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, balance: true },
        });
        throw new WalletInsufficientFundsError(rawCents, checkUser?.balance ?? BigInt(0));
      }

      const finalUser = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { balance: true }
      });

      return { success: true, balance: finalUser.balance, cached: false, entry };
    } catch (error: unknown) {
      if (
        idempotencyKey &&
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        const existing = await tx.ledgerEntry.findFirst({
          where: { idempotencyKey },
        });
        if (existing) {
          const userCurrent = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
          return { success: true, balance: userCurrent?.balance ?? null, cached: true, entry: existing };
        }
      }
      throw error;
    }
  },

  /**
   * Refill user balance (e.g., from Yookassa top-up) without creating a new transaction.
   */
  async credit(
    tx: PrismaTx,
    userId: string,
    amountCents: number | bigint,
    reason: string,
    opts?: WalletOpsOptions
  ) {
    const rawCents = typeof amountCents === 'bigint' ? amountCents : BigInt(amountCents);
    const MAX_SINGLE_CREDIT_CENTS = BigInt(100_000_000); // 1M RUB safety cap
    if (rawCents <= BigInt(0) || rawCents > MAX_SINGLE_CREDIT_CENTS) {
      throw new WalletInvalidAmountError('Credit');
    }

    const { idempotencyKey, adminId, tenantId } = opts || {};

    // Fetch user once for both tenant-check and tenantId fallback
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true }
    });

    if (tenantId) {
      if (!user || user.tenantId !== tenantId) {
        throw new WalletUserNotFoundError(userId);
      }
    } else if (!user) {
      throw new WalletUserNotFoundError(userId);
    }

    const resolvedTenantId = tenantId || user?.tenantId || 'smmplan';

    if (idempotencyKey) {
      const existing = await tx.ledgerEntry.findFirst({
        where: { idempotencyKey },
      });
      if (existing) {
        return { success: true, balance: null, cached: true, entry: existing };
      }
    }

    try {
      const entry = await tx.ledgerEntry.create({
        data: {
          userId,
          tenantId: resolvedTenantId,  // Bug #3 fixed: was tenantId || 'smmplan', missing user.tenantId fallback
          adminId,
          amount: rawCents,
          reason,
          status: 'APPROVED',
          idempotencyKey,
          transactionType: 'PAYMENT'
        }
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: rawCents } },
        select: { balance: true }
      });

      return { success: true, balance: updatedUser.balance, cached: false, entry };
    } catch (error: unknown) {
      if (
        idempotencyKey && 
        typeof error === 'object' && 
        error !== null && 
        'code' in error && 
        (error as { code: string }).code === 'P2002'
      ) {
        // Bug #1 fixed: use tx.* instead of db.* to stay within transaction isolation boundary
        const existing = await tx.ledgerEntry.findFirst({
          where: { idempotencyKey },
        });
        if (existing) {
          const updatedUser = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
          return { success: true, balance: updatedUser?.balance ?? null, cached: true, entry: existing };
        }
      }
      throw error;
    }
  },

  /**
   * Universal adjustment for admin operations (can be positive or negative)
   * Does NOT affect totalSpent.
   */
  async adminAdjust(
    tx: PrismaTx,
    userId: string,
    amountCents: number | bigint,
    reason: string,
    opts?: WalletOpsOptions
  ) {
    const rawCents = typeof amountCents === 'bigint' ? amountCents : BigInt(amountCents);
    if (rawCents === BigInt(0)) {
      throw new WalletInvalidAmountError('Adjustment');
    }

    const { idempotencyKey, adminId, tenantId } = opts || {};

    if (tenantId) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, tenantId: true }
      });
      if (!user || user.tenantId !== tenantId) {
        throw new WalletUserNotFoundError(userId);
      }
    }

    if (idempotencyKey) {
      const existing = await tx.ledgerEntry.findFirst({
        where: { idempotencyKey },
      });
      if (existing) {
        return { success: true, balance: null, cached: true, entry: existing };
      }
    }

    // Fetch user tenantId for ledger entry (also validates user existence)
    const userRecord = await tx.user.findUnique({
      where: { id: userId },
      select: { tenantId: true }
    });
    if (!userRecord) throw new WalletUserNotFoundError(userId);

    // Bug fixed: create ledger entry FIRST, then update balance
    // (matches immutable ledger pattern — if ledger.create fails, balance stays unchanged)
    const entry = await tx.ledgerEntry.create({
      data: {
        userId,
        tenantId: tenantId || userRecord.tenantId || 'smmplan',
        adminId,
        amount: rawCents,
        reason,
        status: 'APPROVED',
        idempotencyKey,
        transactionType: 'COMPENSATION'
      }
    });

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: rawCents } },
      select: { balance: true }
    });

    return { success: true, balance: updatedUser.balance, cached: false, entry };
  },

  /**
   * Refund user balance: increments balance, decrements totalSpent, creates ledger entry.
   */
  async refund(
    tx: PrismaTx,
    userId: string,
    amountCents: number | bigint,
    reason: string,
    opts?: WalletOpsOptions
  ) {
    const rawCents = typeof amountCents === 'bigint' ? amountCents : BigInt(amountCents);
    if (rawCents <= BigInt(0)) {
      throw new WalletInvalidAmountError('Refund');
    }

    const { idempotencyKey, adminId, tenantId } = opts || {};

    if (tenantId) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, tenantId: true }
      });
      if (!user || user.tenantId !== tenantId) {
        throw new WalletUserNotFoundError(userId);
      }
    }

    if (idempotencyKey) {
      const existing = await tx.ledgerEntry.findFirst({
        where: { idempotencyKey },
      });
      if (existing) {
        return { success: true, balance: null, cached: true, entry: existing };
      }
    }

    // Execute atomic balance increment and totalSpent decrement in single Prisma update step
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        balance: { increment: rawCents },
        totalSpent: { decrement: rawCents }
      },
      select: { balance: true, totalSpent: true, tenantId: true }
    });

    // Accounting integrity check: negative totalSpent indicates a bug (more refunds than charges).
    // Do NOT silently clamp — fail fast and alert ops.
    if (updatedUser.totalSpent < BigInt(0)) {
      console.error(`[WalletOps.refund] CRITICAL: Accounting anomaly — totalSpent for user ${userId} went negative (${updatedUser.totalSpent.toString()}). Refund amount: ${rawCents}. This indicates a double-refund or accounting bug. Throwing to abort transaction.`);
      throw new Error(`[WalletOps.refund] Accounting integrity violation: totalSpent went negative for user ${userId}. Transaction aborted.`);
    }

    const entry = await tx.ledgerEntry.create({
      data: {
        userId,
        tenantId: tenantId || updatedUser.tenantId || 'smmplan',
        adminId,
        amount: rawCents,
        reason,
        status: 'APPROVED',
        idempotencyKey,
        transactionType: 'REFUND',
      }
    });

    return { success: true, balance: updatedUser.balance, cached: false, entry };
  },

  /**
   * Add funds to user quarantine balance bubble instead of main balance.
   */
  async quarantineAdd(
    tx: PrismaTx,
    userId: string,
    amountCents: number | bigint,
    reason: string,
    opts?: WalletOpsOptions
  ) {
    const { idempotencyKey, adminId, tenantId } = opts || {};
    const rawCents = typeof amountCents === 'bigint' ? amountCents : BigInt(amountCents);
    const absAmount = rawCents < BigInt(0) ? -rawCents : rawCents;

    if (tenantId) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, tenantId: true }
      });
      if (!user || user.tenantId !== tenantId) {
        throw new WalletUserNotFoundError(userId);
      }
    }

    const user = await tx.user.update({
      where: { id: userId },
      data: { quarantineBalance: { increment: absAmount } },
      select: { tenantId: true }
    });

    return await tx.ledgerEntry.create({
      data: {
        userId,
        tenantId: tenantId || user.tenantId || 'smmplan',
        adminId,
        amount: rawCents,
        reason,
        status: 'QUARANTINE',
        idempotencyKey,
        transactionType: 'COMPENSATION'
      }
    });
  },

  /**
   * Release or clear quarantine balance for a user.
   */
  async quarantineRelease(
    tx: PrismaTx,
    userId: string,
    amountCents: number | bigint,
    opts?: WalletOpsOptions & { reason?: string }
  ) {
    const rawCents = typeof amountCents === 'bigint' ? amountCents : BigInt(amountCents);
    const absAmount = rawCents < BigInt(0) ? -rawCents : rawCents;
    const { idempotencyKey, adminId, tenantId, reason } = opts || {};

    const updated = await tx.user.updateMany({
      where: { id: userId, quarantineBalance: { gte: absAmount } },
      data: { quarantineBalance: { decrement: absAmount } }
    });

    if (updated.count === 0) {
      // H-4 FIX: Log critical alert instead of silently zeroing quarantine balance.
      // The caller requested release of more than available — this indicates a data
      // integrity issue or concurrent modification. Zeroing the balance destroys
      // remaining quarantine funds without audit trail.
      console.error(`[WalletOps.quarantineRelease] CRITICAL: Cannot release ${absAmount} kopecks from quarantine for user ${userId} — insufficient quarantine balance. Manual intervention required.`);
      throw new Error(`Quarantine release failed: insufficient quarantine balance (requested: ${absAmount}, user: ${userId}). Manual review required.`);
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { tenantId: true }
    });

    return await tx.ledgerEntry.create({
      data: {
        userId,
        tenantId: tenantId || user?.tenantId || 'smmplan',
        adminId,
        amount: -absAmount,
        reason: reason || 'Снятие / разблокировка средств из карантина',
        status: 'APPROVED',
        idempotencyKey,
        transactionType: 'COMPENSATION'
      }
    });
  }
};

/**
 * Direct balance adjustment with mandatory tenant context and serializable transaction.
 */
export async function adjustBalance(
  userId: string, 
  amountCents: bigint | number, 
  context: { actorId: string; tenantId: string; reason: string }
) {
  const user = await db.user.findFirst({
    where: {
      id: userId,
      tenantId: context.tenantId
    }
  });

  if (!user) {
    throw new Error(`User ${userId} not found in tenant ${context.tenantId} or access denied`);
  }

  return await runSerializableTransaction(async (tx) => {
    return await WalletOps.adminAdjust(
      tx,
      userId,
      amountCents,
      context.reason,
      { adminId: context.actorId, tenantId: context.tenantId }
    );
  });
}
