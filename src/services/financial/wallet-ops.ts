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
    amountCents: number,
    reason: string,
    opts?: { idempotencyKey?: string; adminId?: string }
  ) {
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new WalletInvalidAmountError('Charge');
    }

    const { idempotencyKey, adminId } = opts || {};

    // Removed Redis Mutex: PostgreSQL handles row-level locking securely. Holding a DB transaction open 
    // while waiting for an external Redis lock is an anti-pattern that leads to connection pool exhaustion.
      // 1. Check Idempotency immediately
      if (idempotencyKey) {
        const existing = await tx.ledgerEntry.findUnique({
          where: { idempotencyKey },
        });
        
        if (existing) {
          return { success: true, balance: null, cached: true, entry: existing };
        }
      }

      // 2. Atomic Check-and-Decrement (Optimistic Concurrency Control)
      // We update ONLY if balance is sufficient. This prevents TOCTOU races.
      const updatedUserBatch = await tx.user.updateMany({
        where: { 
          id: userId,
          balance: { gte: amountCents }
        },
        data: {
          balance: { decrement: amountCents },
          totalSpent: { increment: amountCents }
        }
      });

      if (updatedUserBatch.count === 0) {
        // Find out WHY it failed to provide a clear error message
        const checkUser = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, balance: true },
        });
        if (!checkUser) {
          throw new WalletUserNotFoundError(userId);
        }
        throw new WalletInsufficientFundsError(amountCents, checkUser.balance);
      }

      // 3. Fetch the new balance safely within the same transaction lock
      const finalUser = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { balance: true }
      });

      // 5. Create Ledger Audit Log
      const entry = await tx.ledgerEntry.create({
        data: {
          userId,
          adminId,
          amount: -amountCents, // Native negative for debits
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
    amountCents: number,
    reason: string,
    opts?: { idempotencyKey?: string; adminId?: string }
  ) {
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new WalletInvalidAmountError('Credit');
    }

    const { idempotencyKey, adminId } = opts || {};

    // Create-first pattern: atomic idempotency barrier
    try {
      const entry = await tx.ledgerEntry.create({
        data: {
          userId,
          adminId,
          amount: amountCents, // Native positive for credits
          reason,
          status: 'APPROVED',
          idempotencyKey,
        }
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amountCents } },
        select: { balance: true }
      });

      return { success: true, balance: updatedUser.balance, cached: false, entry };
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
        const existing = await tx.ledgerEntry.findUnique({
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
        const existing = await tx.ledgerEntry.findUnique({
          where: { idempotencyKey },
        });
        if (existing) {
          return { success: true, balance: null, cached: true, entry: existing };
        }
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: { increment: amountCents },
          totalSpent: { decrement: amountCents }
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
        }
      });

      return { success: true, balance: updatedUser.balance, cached: false, entry };
    // Removed Mutex wrapper closing bracket
  }
};
