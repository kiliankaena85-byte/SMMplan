import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { runSerializableTransaction } from '@/lib/transactions';

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
    super(`User ${userId} not found.`);
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

    if (idempotencyKey) {
      const existing = await tx.ledgerEntry.findFirst({
        where: { idempotencyKey },
      });
      
      if (existing) {
        return { success: true, balance: null, cached: true, entry: existing };
      }
    }

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
        select: { id: true, balance: true, tenantId: true },
      });
      if (!checkUser) {
        throw new WalletUserNotFoundError(userId);
      }
      if (tenantId && checkUser.tenantId !== tenantId) {
        throw new Error(`Cross-tenant access forbidden: user is in ${checkUser.tenantId}, expected ${tenantId}`);
      }
      throw new WalletInsufficientFundsError(rawCents, checkUser.balance);
    }

    const finalUser = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { balance: true, tenantId: true }
    });

    const entry = await tx.ledgerEntry.create({
      data: {
        userId,
        tenantId: tenantId || finalUser.tenantId || 'smmplan',
        adminId,
        amount: -rawCents,
        reason,
        status: 'APPROVED',
        idempotencyKey,
        transactionType: 'PAYMENT'
      }
    });

    return { success: true, balance: finalUser.balance, cached: false, entry };
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

    if (idempotencyKey) {
      const existing = await tx.ledgerEntry.findFirst({
        where: { idempotencyKey },
      });
      if (existing) {
        return { success: true, balance: null, cached: true, entry: existing };
      }
    }

    if (tenantId) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, tenantId: true }
      });
      if (!user) {
        throw new WalletUserNotFoundError(userId);
      }
      if (user.tenantId !== tenantId) {
        throw new Error(`Cross-tenant credit forbidden: user is in ${user.tenantId}, expected ${tenantId}`);
      }
    }

    try {
      const entry = await tx.ledgerEntry.create({
        data: {
          userId,
          tenantId: tenantId || 'smmplan',
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
        (error as { code: string }).code === 'P2002' && 
        'meta' in error && 
        typeof (error as { meta?: { target?: string[] } }).meta?.target === 'object'
      ) {
        throw error;
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

    if (idempotencyKey) {
      const existing = await tx.ledgerEntry.findFirst({
        where: { idempotencyKey },
      });
      if (existing) {
        return { success: true, balance: null, cached: true, entry: existing };
      }
    }

    if (tenantId) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, tenantId: true }
      });
      if (!user) {
        throw new WalletUserNotFoundError(userId);
      }
      if (user.tenantId !== tenantId) {
        throw new Error(`Cross-tenant adjust forbidden: user is in ${user.tenantId}, expected ${tenantId}`);
      }
    }

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: rawCents } },
      select: { balance: true, tenantId: true }
    });

    const entry = await tx.ledgerEntry.create({
      data: {
        userId,
        tenantId: tenantId || updatedUser.tenantId || 'smmplan',
        adminId,
        amount: rawCents, 
        reason,
        status: 'APPROVED',
        idempotencyKey,
        transactionType: 'COMPENSATION'
      }
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

    if (idempotencyKey) {
      const existing = await tx.ledgerEntry.findFirst({
        where: { idempotencyKey },
      });
      if (existing) {
        return { success: true, balance: null, cached: true, entry: existing };
      }
    }

    if (tenantId) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, tenantId: true }
      });
      if (!user) {
        throw new WalletUserNotFoundError(userId);
      }
      if (user.tenantId !== tenantId) {
        throw new Error(`Cross-tenant refund forbidden: user is in ${user.tenantId}, expected ${tenantId}`);
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

    // Safety guard: if totalSpent became negative due to race or edge cases, auto-clamp to 0
    if (updatedUser.totalSpent < BigInt(0)) {
      await tx.user.update({
        where: { id: userId },
        data: { totalSpent: BigInt(0) }
      });
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
    amountCents: number | bigint
  ) {
    const rawCents = typeof amountCents === 'bigint' ? amountCents : BigInt(amountCents);
    const absAmount = rawCents < BigInt(0) ? -rawCents : rawCents;
    const updated = await tx.user.updateMany({
      where: { id: userId, quarantineBalance: { gte: absAmount } },
      data: { quarantineBalance: { decrement: absAmount } }
    });

    if (updated.count === 0) {
      await tx.user.update({
        where: { id: userId },
        data: { quarantineBalance: BigInt(0) }
      });
    }
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
