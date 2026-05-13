import { describe, it, expect, vi, beforeEach } from 'vitest';
import { marketingService } from '../../src/services/marketing.service';
import { SettingsProvider } from '../../src/lib/settings';

// Mock DB to prevent external calls
vi.mock('../../src/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
    service: { findUnique: vi.fn() },
    promoCode: { findUnique: vi.fn() }
  }
}));

// Mock Settings Provider for exchange rates
vi.mock('../../src/lib/settings', () => ({
  SettingsProvider: {
    getExchangeRateUSD: vi.fn().mockResolvedValue(100.0) // 1 USD = 100 RUB
  }
}));

import { db } from '../../src/lib/db';

/**
 * Custom Property-Based Testing framework simulator
 * Used because `fast-check` could not be installed due to local network proxy limits.
 */
function checkProperty(
  iterations: number,
  generator: () => any,
  propertyFn: (val: any) => void | Promise<void>
) {
  return async () => {
    for (let i = 0; i < iterations; i++) {
      const val = generator();
      try {
        await propertyFn(val);
      } catch (err: any) {
        throw new Error(`Property failed at iteration ${i} with value ${JSON.stringify(val)}. Error: ${err.message}`);
      }
    }
  };
}

describe('Fast-Check (Property-Based Testing): Pricing Invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Generator for random checkout scenarios
  const generateScenario = () => {
    const quantity = Math.floor(Math.random() * 10000000) + 1; // 1 to 10m
    const rateUSD = Math.random() * 10; // 0.00 to 10.00 USD per 1000
    const markup = 1.0 + Math.random() * 9.0; // 1.0 to 10.0 multiplier
    const personalDiscount = Math.floor(Math.random() * 50); // 0% to 50%
    const totalSpent = Math.floor(Math.random() * 1000000_00); // Up to 1m RUB
    return { quantity, rateUSD, markup, personalDiscount, totalSpent };
  };

  it('INV-1: No Money Creation & Safety Floor Guarantee', checkProperty(1000, generateScenario, async (scenario) => {
    // Setup Mock state
    vi.mocked(db.service.findUnique).mockResolvedValue({
      id: 'srv-1',
      rate: scenario.rateUSD,
      markup: scenario.markup,
      minQty: 1,
      maxQty: 100000000
    } as any);

    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'usr-1',
      totalSpent: scenario.totalSpent,
      personalDiscount: scenario.personalDiscount
    } as any);

    const res = await marketingService.calculatePrice('usr-1', 'srv-1', scenario.quantity);

    // INVARIANT: Platform never creates money out of thin air.
    // The total price charged must always be greater than or equal to the Safety Floor.
    expect(res.totalCents).toBeGreaterThanOrEqual(res.safetyFloorCents);

    // INVARIANT: The Safety floor must be strictly strictly greater than the provider cost (to cover taxes).
    if (res.providerCostCents > 0) {
       expect(res.safetyFloorCents).toBeGreaterThan(res.providerCostCents);
    }
    
    // Profit must be non-negative
    const profit = res.totalCents - res.providerCostCents;
    expect(profit).toBeGreaterThanOrEqual(0);
  }));

  it('INV-2: Finite Integer Currency', checkProperty(1000, generateScenario, async (scenario) => {
    vi.mocked(db.service.findUnique).mockResolvedValue({
      id: 'srv-1',
      rate: scenario.rateUSD,
      markup: scenario.markup,
      minQty: 1,
      maxQty: 100000000
    } as any);

    const res = await marketingService.calculatePrice(null, 'srv-1', scenario.quantity);

    // INVARIANT: All financial outputs MUST be valid, finite integers (Cents)
    expect(Number.isFinite(res.totalCents)).toBe(true);
    expect(Number.isFinite(res.providerCostCents)).toBe(true);
    expect(Number.isFinite(res.discountCents)).toBe(true);
    expect(Number.isInteger(res.totalCents)).toBe(true);
    expect(Number.isInteger(res.providerCostCents)).toBe(true);
    expect(Number.isInteger(res.discountCents)).toBe(true);
    
    expect(res.totalCents).not.toBeNaN();
    
    // Check for "Negative Zero"
    expect(Object.is(res.totalCents, -0)).toBe(false);
  }));

  it('INV-3: Monotonicity (Higher Quantity = Strictly Non-Decreasing Cost)', checkProperty(500, generateScenario, async (scenario) => {
    vi.mocked(db.service.findUnique).mockResolvedValue({
      id: 'srv-1',
      rate: scenario.rateUSD,
      markup: scenario.markup,
      minQty: 1,
      maxQty: 100000000
    } as any);

    // We only change quantity, keeping everything else exactly the same.
    const qty1 = scenario.quantity;
    const qty2 = qty1 + Math.floor(Math.random() * 1000) + 1; // qty2 is strictly > qty1

    const res1 = await marketingService.calculatePrice(null, 'srv-1', qty1);
    const res2 = await marketingService.calculatePrice(null, 'srv-1', qty2);

    // INVARIANT: Buying more must never result in a lower total price
    expect(res2.totalCents).toBeGreaterThanOrEqual(res1.totalCents);
    expect(res2.providerCostCents).toBeGreaterThanOrEqual(res1.providerCostCents);
  }));

  it('INV-4: Hard Ceiling on Discounts (MAX_TOTAL_DISCOUNT)', checkProperty(500, generateScenario, async (scenario) => {
    vi.mocked(db.service.findUnique).mockResolvedValue({
      id: 'srv-1',
      rate: scenario.rateUSD,
      markup: scenario.markup,
      minQty: 1,
      maxQty: 100000000
    } as any);

    // Force extreme discounts
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'usr-1',
      totalSpent: 9999999999, // Max volume tier
      personalDiscount: 99 // 99% personal discount
    } as any);

    const res = await marketingService.calculatePrice('usr-1', 'srv-1', scenario.quantity);

    // INVARIANT: Max discount percentage must never exceed the hard ceiling (currently 30% by default constants, though it could dynamically lower due to safety floor)
    expect(res.discountPercent).toBeLessThanOrEqual(30); 
  }));

  it('INV-5: Reversibility & Linear Scaling (Base Price)', checkProperty(500, generateScenario, async (scenario) => {
    vi.mocked(db.service.findUnique).mockResolvedValue({
      id: 'srv-1',
      rate: scenario.rateUSD,
      markup: scenario.markup,
      minQty: 1,
      maxQty: 100000000
    } as any);

    // To avoid rounding artifacts affecting large scale math perfectly,
    // we check that doubling quantity doubles provider cost within +/- 1 cent
    const qty = scenario.quantity;
    const res1 = await marketingService.calculatePrice(null, 'srv-1', qty);
    const res2 = await marketingService.calculatePrice(null, 'srv-1', qty * 2);

    const costDiff = Math.abs(res2.providerCostCents - (res1.providerCostCents * 2));
    
    // INVARIANT: Provider cost scales linearly with quantity
    // Maximum drift is 1 cent due to Math.round() on halves
    expect(costDiff).toBeLessThanOrEqual(1);
  }));
});
