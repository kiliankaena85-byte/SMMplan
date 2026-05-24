import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accountingService } from './accounting.service';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    payment: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
    },
    systemSettings: {
      findUnique: vi.fn(),
    },
  },
}));

describe('AccountingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates standard tax rate (6%) when annual revenue is below 20M RUB', async () => {
    // 1. Mock payment groups (succeeded payments) for selected period
    vi.mocked(db.payment.groupBy).mockResolvedValue([
      {
        gateway: 'yookassa',
        _sum: { amount: BigInt(50000000) }, // 500,000 RUB in cents
      },
    ] as any);

    // 2. Mock aggregate for current calendar year succeeded payments (annual revenue)
    vi.mocked(db.payment.aggregate).mockResolvedValue({
      _sum: { amount: BigInt(1500000000) }, // 15,000,000 RUB (under 20M limit)
    } as any);

    // 3. Mock orders
    vi.mocked(db.order.findMany).mockResolvedValue([]);

    // 4. Mock system settings
    vi.mocked(db.systemSettings.findUnique).mockResolvedValue({
      id: 'global',
      taxRate: 6.0,
      opexMonthly: 100000,
    } as any);

    const metrics = await accountingService.getMetrics();

    expect(metrics.annualRevenue).toBe(1500000000);
    expect(metrics.isVatThresholdExceeded).toBe(false);
    expect(metrics.effectiveTaxRate).toBe(6.0);
    expect(metrics.taxes).toBe(Math.round(metrics.marginGross * 0.06));
  });

  it('calculates elevated tax rate (11%) when annual revenue is exactly or above 20M RUB', async () => {
    // 1. Mock payment groups
    vi.mocked(db.payment.groupBy).mockResolvedValue([
      {
        gateway: 'yookassa',
        _sum: { amount: BigInt(50000000) }, // 500,000 RUB in cents
      },
    ] as any);

    // 2. Mock aggregate for annual revenue to be exactly 20,000,000 RUB (2,000,000,000 cents)
    vi.mocked(db.payment.aggregate).mockResolvedValue({
      _sum: { amount: BigInt(2000000000) },
    } as any);

    // 3. Mock orders
    vi.mocked(db.order.findMany).mockResolvedValue([]);

    // 4. Mock system settings
    vi.mocked(db.systemSettings.findUnique).mockResolvedValue({
      id: 'global',
      taxRate: 6.0,
      opexMonthly: 100000,
    } as any);

    const metrics = await accountingService.getMetrics();

    expect(metrics.annualRevenue).toBe(2000000000);
    expect(metrics.isVatThresholdExceeded).toBe(true);
    expect(metrics.effectiveTaxRate).toBe(11.0);
    expect(metrics.taxes).toBe(Math.round(metrics.marginGross * 0.11));
  });

  it('correctly calculates taxes under INCOME scheme (based on gross revenue)', async () => {
    // 1. Mock payment groups (succeeded payments)
    vi.mocked(db.payment.groupBy).mockResolvedValue([
      {
        gateway: 'yookassa',
        _sum: { amount: BigInt(50000000) }, // 500,000 RUB in cents (gross revenue)
      },
    ] as any);

    // 2. Mock aggregate for current calendar year
    vi.mocked(db.payment.aggregate).mockResolvedValue({
      _sum: { amount: BigInt(1500000000) }, // 15M RUB (under 20M limit)
    } as any);

    // 3. Mock orders
    vi.mocked(db.order.findMany).mockResolvedValue([]);

    // 4. Mock system settings with INCOME scheme and 6% tax rate
    vi.mocked(db.systemSettings.findUnique).mockResolvedValue({
      id: 'global',
      taxRate: 6.0,
      opexMonthly: 500000, // 5,000 RUB in cents
      usnScheme: 'INCOME',
    } as any);

    const metrics = await accountingService.getMetrics();

    // Gross revenue in cents: 50000000
    // Refunds: 0, Gateway fees: 3.5% = 1750000 cents
    // Net revenue: 50000000 - 1750000 = 48250000 cents
    // COGS: 0, Gross margin: 48250000 cents
    // INCOME Tax base: Gross Revenue = 50000000 cents
    // Tax rate: 6%
    // Taxes: 50000000 * 0.06 = 3000000 cents (30,000 RUB)
    // OPEX: 500000 cents (5,000 RUB)
    // Net profit = Gross margin - Taxes - OPEX = 48250000 - 3000000 - 500000 = 44750000 cents
    expect(metrics.revenueGross).toBe(50000000);
    expect(metrics.usnScheme).toBe('INCOME');
    expect(metrics.taxes).toBe(3000000);
    expect(metrics.profitNet).toBe(44750000);
  });

  it('correctly calculates taxes under INCOME_EXPENSES scheme (based on gross margin)', async () => {
    // 1. Mock payment groups
    vi.mocked(db.payment.groupBy).mockResolvedValue([
      {
        gateway: 'yookassa',
        _sum: { amount: BigInt(50000000) }, // 500,000 RUB in cents (gross revenue)
      },
    ] as any);

    // 2. Mock aggregate for current calendar year
    vi.mocked(db.payment.aggregate).mockResolvedValue({
      _sum: { amount: BigInt(1500000000) },
    } as any);

    // 3. Mock orders
    vi.mocked(db.order.findMany).mockResolvedValue([]);

    // 4. Mock system settings with INCOME_EXPENSES scheme and 15% tax rate
    vi.mocked(db.systemSettings.findUnique).mockResolvedValue({
      id: 'global',
      taxRate: 15.0,
      opexMonthly: 500000,
      usnScheme: 'INCOME_EXPENSES',
    } as any);

    const metrics = await accountingService.getMetrics();

    // Gross revenue: 50000000
    // Refunds: 0, Gateway fees: 1750000
    // Net revenue: 48250000
    // COGS: 0, Gross margin: 48250000
    // INCOME_EXPENSES Tax base: Gross Margin = 48250000 cents
    // Tax rate: 15%
    // Taxes: 48250000 * 0.15 = 7237500 cents
    // OPEX: 500000
    // Net profit = 48250000 - 7237500 - 500000 = 40512500 cents
    expect(metrics.revenueGross).toBe(50000000);
    expect(metrics.usnScheme).toBe('INCOME_EXPENSES');
    expect(metrics.taxes).toBe(7237500);
    expect(metrics.profitNet).toBe(40512500);
  });

  it('correctly rounds tax and profit net values to prevent float fractional cents', async () => {
    vi.mocked(db.payment.groupBy).mockResolvedValue([
      {
        gateway: 'yookassa',
        _sum: { amount: BigInt(50000333) }, // 500,003.33 RUB in cents
      },
    ] as any);

    vi.mocked(db.payment.aggregate).mockResolvedValue({
      _sum: { amount: BigInt(1500000000) },
    } as any);

    vi.mocked(db.order.findMany).mockResolvedValue([]);

    vi.mocked(db.systemSettings.findUnique).mockResolvedValue({
      id: 'global',
      taxRate: 6.33, // Fractional tax rate to test rounding
      opexMonthly: 500001,
      usnScheme: 'INCOME',
    } as any);

    const metrics = await accountingService.getMetrics();

    // Gross revenue: 50000333
    // Refunds: 0, Gateway fees: 3.5% = 1750012 (Math.round(50000333 * 0.035))
    // Net revenue: 50000333 - 1750012 = 48250321
    // COGS: 0, Gross margin: 48250321
    // INCOME Tax: 50000333 * 0.0633 = 3165021.0789 -> round to 3165021 cents
    // Profit net = 48250321 - 3165021 - 500001 = 44585299
    expect(Number.isInteger(metrics.taxes)).toBe(true);
    expect(Number.isInteger(metrics.profitNet)).toBe(true);
    expect(metrics.taxes).toBe(3165021);
    expect(metrics.profitNet).toBe(44585299);
  });
});
