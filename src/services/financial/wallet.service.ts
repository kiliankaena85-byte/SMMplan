import { WalletOps } from './wallet-ops';
import { runSerializableTransaction } from '@/lib/transactions';

export class ImmutableLedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImmutableLedgerError';
  }
}

export class WalletService {
  /**
   * Safe charge mechanism with Serializable isolation & Idempotency.
   * Modifying balances using this guarantees no double-spending.
   */
  static async charge(
    userId: string,
    amountCents: number | bigint,
    reason: string,
    idempotencyKey?: string,
    adminId?: string,
    tenantId?: string
  ) {
    try {
      return await runSerializableTransaction(async (tx) =>
        WalletOps.charge(tx, userId, amountCents, reason, { idempotencyKey, adminId, tenantId })
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('immutability violation') || msg.includes('LedgerEntry immutability')) {
        throw new ImmutableLedgerError(`IMMUTABLE_LEDGER_VIOLATION: ${msg}`);
      }
      return { success: false, error: msg || 'Transaction failed', balance: null, cached: false };
    }
  }

  /**
   * Refill user balance (e.g., from Yookassa top-up)
   */
  static async credit(
    userId: string,
    amountCents: number | bigint,
    reason: string,
    idempotencyKey?: string,
    adminId?: string,
    tenantId?: string
  ) {
    try {
      return await runSerializableTransaction(async (tx) =>
        WalletOps.credit(tx, userId, amountCents, reason, { idempotencyKey, adminId, tenantId })
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('immutability violation') || msg.includes('LedgerEntry immutability')) {
        throw new ImmutableLedgerError(`IMMUTABLE_LEDGER_VIOLATION: ${msg}`);
      }
      return { success: false, error: msg || 'Transaction failed', balance: null, cached: false };
    }
  }

  /**
   * Refund user balance: increments balance, decrements totalSpent, creates ledger entry.
   * 
   * ARCHITECTURE CONTRACT: Единственный способ оформить возврат клиенту.
   * Гарантирует: идемпотентность, Serializable isolation, ledger audit trail.
   */
  static async refund(
    userId: string,
    amountCents: number | bigint,
    reason: string,
    idempotencyKey?: string,
    adminId?: string,
    tenantId?: string
  ) {
    try {
      return await runSerializableTransaction(async (tx) =>
        WalletOps.refund(tx, userId, amountCents, reason, { idempotencyKey, adminId, tenantId })
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('immutability violation') || msg.includes('LedgerEntry immutability')) {
        throw new ImmutableLedgerError(`IMMUTABLE_LEDGER_VIOLATION: ${msg}`);
      }
      return { success: false, error: msg || 'Refund transaction failed', balance: null, cached: false };
    }
  }
}

/**
 * Atomic balance deduction with strict Serializable isolation and tenant guard.
 */
export async function deductBalanceWithLock(
  userId: string,
  amountCents: bigint | number,
  reason: string,
  opts?: { orderId?: string; idempotencyKey?: string; tenantId?: string }
) {
  try {
    return await runSerializableTransaction(async (tx) => {
      return await WalletOps.charge(
        tx,
        userId,
        amountCents,
        reason,
        {
          idempotencyKey: opts?.idempotencyKey || (opts?.orderId ? `order-${opts.orderId}` : undefined),
          tenantId: opts?.tenantId
        }
      );
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('immutability violation') || msg.includes('LedgerEntry immutability')) {
      throw new ImmutableLedgerError(`IMMUTABLE_LEDGER_VIOLATION: ${msg}`);
    }
    throw e;
  }
}
