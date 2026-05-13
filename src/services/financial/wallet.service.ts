import { db } from '../../lib/db';
import { WalletOps } from './wallet-ops';

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
    try {
      return await db.$transaction(
        async (tx) => WalletOps.charge(tx, userId, amountCents, reason, { idempotencyKey, adminId }),
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
    try {
      return await db.$transaction(
        async (tx) => WalletOps.credit(tx, userId, amountCents, reason, { idempotencyKey, adminId }),
        { isolationLevel: 'Serializable' }
      );
    } catch (e: any) {
      return { success: false, error: e.message || 'Transaction failed', balance: null, cached: false };
    }
  }

  /**
   * Refund user balance: increments balance, decrements totalSpent, creates ledger entry.
   * 
   * ARCHITECTURE CONTRACT: Единственный способ оформить возврат клиенту.
   * Гарантирует: идемпотентность, Serializable isolation, ledger audit trail.
   * 
   * ВАЖНО: В отличие от credit(), этот метод УМЕНЬШАЕТ totalSpent,
   * что необходимо для корректной бухгалтерии (P&L).
   */
  static async refund(
    userId: string,
    amountCents: number,
    reason: string,
    idempotencyKey?: string,
    adminId?: string
  ) {
    try {
      return await db.$transaction(
        async (tx) => WalletOps.refund(tx, userId, amountCents, reason, { idempotencyKey, adminId }),
        { isolationLevel: 'Serializable' }
      );
    } catch (e: any) {
      return { success: false, error: e.message || 'Refund transaction failed', balance: null, cached: false };
    }
  }
}
