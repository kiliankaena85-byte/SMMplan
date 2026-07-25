import { Prisma } from '@prisma/client';

type PrismaTx = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class WalletInsufficientFundsError extends Error {
  readonly code = 'INSUFFICIENT_FUNDS';
  constructor(needed: number, got: number | bigint) {
    super(`Insufficient funds: needed ${needed}, got ${got}`);
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
    opts?: { idempotencyKey?: string; adminId?: string }
  ) {
    const rawCents = typeof amountCents === 'bigint' ? amountCents : BigInt(amountCents);
    const MAX_SINGLE_CHARGE_CENTS = BigInt(100_000_000); // 1M RUB safety cap
    if (rawCents <= BigInt(0) || rawCents > MAX_SINGLE_CHARGE_CENTS) {
      throw new WalletInvalidAmountError('Charge');
    }

    const { idempotencyKey, adminId } = opts || {};

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
        balance: { gte: rawCents }
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
      if (!checkUser) {
        throw new WalletUserNotFoundError(userId);
      }
      throw new WalletInsufficientFundsError(Number(rawCents), checkUser.balance);
    }

    const finalUser = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { balance: true }
    });

    const entry = await tx.ledgerEntry.create({
      data: {
        userId,
        adminId,
        amount: -rawCents,
        reason,
        status: 'APPROVED',
        idempotencyKey,
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
    opts?: { idempotencyKey?: string; adminId?: string }
  ) {
    const rawCents = typeof amountCents === 'bigint' ? amountCents : BigInt(amountCents);
    if (rawCents <= BigInt(0)) {
      throw new WalletInvalidAmountError('Credit');
    }

    const { idempotencyKey, adminId } = opts || {};

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
          adminId,
          amount: rawCents,
          reason,
          status: 'APPROVED',
          idempotencyKey,
        }
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: rawCents } },
        select: { balance: true }
      });

      return { success: true, balance: updatedUser.balance, cached: false, entry };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (idempotencyKey && error.code === 'P2002' && error.meta?.target?.includes('idempotencyKey')) {
        // In a Serializable transaction, the transaction is already aborted here.
        // We throw the error so the caller can handle it gracefully.
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    userId: string,
    amountCents: number,
    reason: string,
    opts?: { idempotencyKey?: string; adminId?: string }
  ) {
    if (!Number.isFinite(amountCents) || amountCents === 0) {
      throw new WalletInvalidAmountError('Adjustment');
    }



    const { idempotencyKey, adminId } = opts || {};

    // Removed Redis Mutex to prevent DB connection pool exhaustion.
      if (idempotencyKey) {
        const existing = await tx.ledgerEntry.findFirst({
          where: { idempotencyKey },
        });
        if (existing) {
            return { success: true, balance: null, cached: true, entry: existing };
        }
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amountCents } },
        select: { balance: true }
      });

      const entry = await tx.ledgerEntry.create({
        data: {
          userId,
          adminId,
          amount: amountCents, 
          reason,
          status: 'APPROVED',
          idempotencyKey,
        }
      });

      return { success: true, balance: updatedUser.balance, cached: false, entry };
    // Removed Mutex wrapper closing bracket
  },

  /**
   * Refund user balance: increments balance, decrements totalSpent, creates ledger entry.
   * 
   * ARCHITECTURE CONTRACT: Единственный способ оформить возврат клиенту.
   * Гарантирует: идемпотентность, Serializable isolation, ledger audit trail.
   * 
   * ВАЖНО: В отличие от credit(), этот метод УМЕНЬШАЕТ totalSpent,
   * что необходимо для корректной бухгалтерии (P&L).
   */
  async refund(
    tx: PrismaTx,
    userId: string,
    amountCents: number,
    reason: string,
    opts?: { idempotencyKey?: string; adminId?: string }
  ) {
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new WalletInvalidAmountError('Refund');
    }

    const { idempotencyKey, adminId } = opts || {};

    // Removed Redis Mutex to prevent DB connection pool exhaustion.
      if (idempotencyKey) {
        const existing = await tx.ledgerEntry.findFirst({
          where: { idempotencyKey },
        });
        if (existing) {
          return { success: true, balance: null, cached: true, entry: existing };
        }
      }

      // Read current totalSpent first to cap the decrement
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { totalSpent: true }
      });
      const safeDecrement = Math.min(amountCents, Number(currentUser?.totalSpent ?? 0));

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: { increment: amountCents },
          totalSpent: safeDecrement > 0 ? { decrement: safeDecrement } : undefined
        },
        select: { balance: true }
      });

      const entry = await tx.ledgerEntry.create({
        data: {
          userId,
          adminId,
          amount: amountCents,
          reason,
          status: 'APPROVED',
          idempotencyKey,
          transactionType: 'REFUND',
        }
      });

      return { success: true, balance: updatedUser.balance, cached: false, entry };
    // Removed Mutex wrapper closing bracket
  },

  /**
   * Add funds to user quarantine balance bubble instead of main balance.
   */
  async quarantineAdd(
    tx: PrismaTx,
    userId: string,
    amountCents: number,
    reason: string,
    opts?: { idempotencyKey?: string; adminId?: string }
  ) {
    const { idempotencyKey, adminId } = opts || {};
    const absAmount = Math.abs(amountCents);

    await tx.user.update({
      where: { id: userId },
      data: { quarantineBalance: { increment: absAmount } }
    });

    return await tx.ledgerEntry.create({
      data: {
        userId,
        adminId,
        amount: amountCents,
        reason,
        status: 'QUARANTINE',
        idempotencyKey
      }
    });
  },

  /**
   * Release or clear quarantine balance for a user.
   */
  async quarantineRelease(
    tx: PrismaTx,
    userId: string,
    amountCents: number
  ) {
    const absAmount = Math.abs(amountCents);
    const updated = await tx.user.updateMany({
      where: { id: userId, quarantineBalance: { gte: absAmount } },
      data: { quarantineBalance: { decrement: absAmount } }
    });

    if (updated.count === 0) {
      await tx.user.update({
        where: { id: userId },
        data: { quarantineBalance: 0 }
      });
    }
  }
};
