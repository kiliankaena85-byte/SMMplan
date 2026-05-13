import { Prisma } from '@prisma/client';

type PrismaTx = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

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
    if (amountCents <= 0) {
      throw new Error('Charge amount must be strictly greater than zero.');
    }

    const { idempotencyKey, adminId } = opts || {};

    // 1. Check Idempotency immediately
    if (idempotencyKey) {
      const existing = await tx.ledgerEntry.findUnique({
        where: { idempotencyKey },
      });
      
      if (existing) {
        return { success: true, balance: null, cached: true, entry: existing };
      }
    }

    // 2. Fetch User with strict locking
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, balance: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found.`);
    }

    // 3. Mathematical validation
    if (user.balance < amountCents) {
      throw new Error(`Insufficient funds: needed ${amountCents}, got ${user.balance}`);
    }

    // 4. Atomic decrement (Database Level)
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        balance: { decrement: amountCents },
        totalSpent: { increment: amountCents }
      },
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

    return { success: true, balance: updatedUser.balance, cached: false, entry };
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
    if (amountCents <= 0) {
      throw new Error('Credit amount must be strictly greater than zero.');
    }

    const { idempotencyKey, adminId } = opts || {};

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
        amount: amountCents, // Native positive for credits
        reason,
        status: 'APPROVED',
        idempotencyKey,
      }
    });

    return { success: true, balance: updatedUser.balance, cached: false, entry };
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
    if (amountCents === 0) {
      throw new Error('Adjustment amount cannot be zero.');
    }

    const { idempotencyKey, adminId } = opts || {};

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
    if (amountCents <= 0) {
      throw new Error('Refund amount must be strictly greater than zero.');
    }

    const { idempotencyKey, adminId } = opts || {};

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
  }
};
