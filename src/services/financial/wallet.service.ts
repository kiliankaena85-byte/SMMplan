import { db } from '../../lib/db';

export class WalletService {
  /**
   * Safe charge mechanism with Serializable isolation & Idempotency.
   * Modifying balances using this guarantees no double-spending.
   */
  static async charge(
    userId: string,
    amountCents: number,
    reason: string,
    idempotencyKey?: string,
    adminId?: string
  ) {
    if (amountCents <= 0) {
      throw new Error('Charge amount must be strictly greater than zero.');
    }

    try {
      return await db.$transaction(
        async (tx) => {
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
        // Maximum isolation to prevent concurrent writes stealing balance
        { isolationLevel: 'Serializable' }
      );
    } catch (e: any) {
      return { success: false, error: e.message || 'Transaction failed', balance: null, cached: false };
    }
  }

  /**
   * Refill user balance (e.g., from Yookassa top-up)
   */
  static async credit(
    userId: string,
    amountCents: number,
    reason: string,
    idempotencyKey?: string,
    adminId?: string
  ) {
    if (amountCents <= 0) {
      throw new Error('Credit amount must be strictly greater than zero.');
    }

    try {
      return await db.$transaction(
        async (tx) => {
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
        { isolationLevel: 'Serializable' }
      );
    } catch (e: any) {
      return { success: false, error: e.message || 'Transaction failed', balance: null, cached: false };
    }
  }
}
