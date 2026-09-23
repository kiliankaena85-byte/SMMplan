import { describe, it, expect } from 'vitest';

export interface RawLedgerEntry {
  id: string;
  amount: bigint;
  reason: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  transactionType: string;
  adminId?: string | null;
  idempotencyKey?: string | null;
  createdAt: Date;
}

export function computeReverseRunningBalance(
  currentBalanceBigInt: bigint,
  entriesDesc: RawLedgerEntry[]
) {
  let currentBalance = currentBalanceBigInt;
  return entriesDesc.map(entry => {
    const isApproved = entry.status === 'APPROVED';
    const balanceAfter = currentBalance;
    if (isApproved) {
      currentBalance -= entry.amount;
    }

    const orderMatch = /#(\d{3,9})/.exec(entry.reason);
    const orderNumericId = orderMatch ? Number(orderMatch[1]) : null;

    return {
      id: entry.id,
      amountCents: Number(entry.amount),
      amountRub: Number(entry.amount) / 100,
      runningBalanceCents: isApproved ? Number(balanceAfter) : null,
      runningBalanceRub: isApproved ? Number(balanceAfter) / 100 : null,
      reason: entry.reason,
      status: entry.status,
      idempotencyKey: entry.idempotencyKey || null,
      transactionType: entry.transactionType,
      adminId: entry.adminId || null,
      orderNumericId,
      createdAt: entry.createdAt.toISOString(),
    };
  });
}

describe('Dashboard Finance Reverse Running Balance Unit Tests', () => {
  it('correctly reconstructs historical running balance backwards from latest user.balance', () => {
    // Current user balance is 500.00 RUB (50,000 cents)
    const currentBalance = BigInt(50000);

    // Entries in DESC order (newest first)
    const entries: RawLedgerEntry[] = [
      {
        id: 'entry-3',
        amount: BigInt(10000), // +100.00 RUB deposit
        reason: 'Пополнение баланса ЮKassa #999',
        status: 'APPROVED',
        transactionType: 'DEPOSIT',
        createdAt: new Date('2026-09-22T10:00:00Z'),
      },
      {
        id: 'entry-2',
        amount: BigInt(-5000), // -50.00 RUB charge for order
        reason: 'Оплата заказа #10429 (Telegram Просмотры)',
        status: 'APPROVED',
        transactionType: 'ORDER_CHARGE',
        createdAt: new Date('2026-09-22T09:00:00Z'),
      },
      {
        id: 'entry-1',
        amount: BigInt(-2000), // Rejected attempt
        reason: 'Неудачная попытка списания #10428',
        status: 'REJECTED',
        transactionType: 'ORDER_CHARGE',
        createdAt: new Date('2026-09-22T08:30:00Z'),
      },
      {
        id: 'entry-0',
        amount: BigInt(45000), // +450.00 RUB initial deposit
        reason: 'Первичное пополнение',
        status: 'APPROVED',
        transactionType: 'DEPOSIT',
        createdAt: new Date('2026-09-22T08:00:00Z'),
      },
    ];

    const result = computeReverseRunningBalance(currentBalance, entries);

    // Entry 3 (newest): Balance after this deposit was 500.00 RUB
    expect(result[0].runningBalanceCents).toBe(50000);
    expect(result[0].runningBalanceRub).toBe(500);
    expect(result[0].orderNumericId).toBe(999);

    // Entry 2: Balance after this -50.00 charge was 400.00 RUB (500 - 100)
    expect(result[1].runningBalanceCents).toBe(40000);
    expect(result[1].runningBalanceRub).toBe(400);
    expect(result[1].orderNumericId).toBe(10429);

    // Entry 1: REJECTED entry should NOT affect running balance
    expect(result[2].runningBalanceCents).toBeNull();
    expect(result[2].runningBalanceRub).toBeNull();
    expect(result[2].orderNumericId).toBe(10428);

    // Entry 0 (oldest): Balance after initial deposit of +450 was 450.00 RUB (400 - (-50))
    expect(result[3].runningBalanceCents).toBe(45000);
    expect(result[3].runningBalanceRub).toBe(450);
    expect(result[3].orderNumericId).toBeNull();
  });

  it('handles empty entries array without errors', () => {
    const result = computeReverseRunningBalance(BigInt(10000), []);
    expect(result).toEqual([]);
  });

  it('handles negative balances correctly if overdraft occurred', () => {
    const currentBalance = BigInt(-1000); // -10.00 RUB
    const entries: RawLedgerEntry[] = [
      {
        id: 'overdraft-1',
        amount: BigInt(-2000),
        reason: 'Корректировка баланса',
        status: 'APPROVED',
        transactionType: 'ADMIN_ADJUST',
        createdAt: new Date('2026-09-22T12:00:00Z'),
      },
    ];

    const result = computeReverseRunningBalance(currentBalance, entries);

    expect(result[0].runningBalanceCents).toBe(-1000);
    expect(result[0].runningBalanceRub).toBe(-10);
  });
});
