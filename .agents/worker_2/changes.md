# Changes Report — Checkout Rounding Exploit Fix

## Modified Files

### 1. `src/services/marketing.service.ts`
Enforced a safety floor of at least 1 cent (`1` kopeck) for any positive quantity in both the provider cost calculation and the retail total calculation.
**Key lines changed (79-86):**
```typescript
    // 1. Calculate base original price in Cents (Convert USD provider rate to RUB Cents)
    const providerCostPer1000Cents = service.rate * usdToRub * 100;
    const providerCostCents = quantity > 0
      ? Math.max(1, Math.round((providerCostPer1000Cents / 1000) * quantity))
      : Math.round((providerCostPer1000Cents / 1000) * quantity);

    // Apply the same Beautiful Rounding logic used in the Catalog to ensure price parity
    const rawRetailPer1000Rub = service.rate * service.markup * usdToRub;
    const beautifulRetailPer1000Rub = applyBeautifulRounding(rawRetailPer1000Rub);
    const originalTotalCents = quantity > 0
      ? Math.max(1, Math.round((beautifulRetailPer1000Rub * 100 / 1000) * quantity))
      : Math.round((beautifulRetailPer1000Rub * 100 / 1000) * quantity);
```

---

### 2. `src/services/marketing.service.test.ts`
Added a unit test case validating that a low-quantity order on a micro-priced service does not round to 0 cents, but instead enforces the 1-cent floor.
**Test code added:**
```typescript
    it('enforces a safety floor of 1 cent for micro-priced service with low quantity', async () => {
       vi.mocked(db.service.findUnique).mockResolvedValueOnce({ id: 'srv1', minQty: 1, maxQty: 100, rate: 0.0003, markup: 1.1 } as any);
       const res = await marketingService.calculatePrice(null, 'srv1', 1);
       
       expect(res.originalTotalCents).toBe(1);
       expect(res.providerCostCents).toBe(1);
       expect(res.totalCents).toBe(3); // safety floor is 3 cents when providerCostCents is 1
    });
```

---

## Verification Results

### 1. Unit Tests (`npm run test`)
All 20 tests in `src/services/marketing.service.test.ts` passed successfully.
```bash
 ✓ src/services/marketing.service.test.ts (20 tests) 9574ms
       ✓ returns PLATINUM for >= 1,000,000 RUB  530ms
       ✓ returns GOLD for >= 250,000 RUB  458ms
       ✓ returns SILVER for >= 50,000 RUB  467ms
       ✓ returns BRONZE for >= 10,000 RUB  457ms
       ✓ returns REGULAR for < 10,000 RUB  455ms
       ✓ throws if service not found  482ms
       ✓ throws if quantity out of bounds  459ms
       ✓ calculates default price with no user/discounts  509ms
       ✓ applies maximum discount and capping at 30%  459ms
       ✓ applies DISCOUNT promo correctly and falls back to safety floor if needed  471ms
       ✓ does not apply invalid promo code  467ms
       ✓ enforces a safety floor of 1 cent for micro-priced service with low quantity  452ms
       ✓ does nothing if no code provided  464ms
       ✓ throws if promo is invalid/inactive  485ms
       ✓ throws if promo uses maxed out  501ms
       ✓ throws if promo is expired  497ms
       ✓ updates uses successfully  487ms
       ✓ throws if concurrent update maxes out limit unexpectedly  507ms
       ✓ returns mapped array capping rates at safety floor with max discounts  495ms
       ✓ applies safety floor if discount pushes B2B rate too low  458ms

 Test Files  1 passed (1)
      Tests  20 passed (20)
   Start at  23:21:56
   Duration  10.05s (transform 93ms, setup 130ms, import 99ms, tests 9.57s, environment 0ms)
```

### 2. Production Build (`npm run build`)
Production compilation completed successfully.
```bash
▲ Next.js 16.2.6 (webpack)
- Environments: .env
- Experiments (use with caution):
  · serverActions

  Creating an optimized production build ...
✓ Compiled successfully in 45s
  Skipping validation of types
  Finished TypeScript config validation in 12ms ...
  Collecting page data using 11 workers ...
  Generating static pages using 11 workers (17/17) in 897ms
  Finalizing page optimization ...
  Collecting build traces ...

Route (app)                         Revalidate  Expire
┌ ○ /                                       1m      1y
├ ○ /_not-found
...
└ ƒ /support

ƒ Proxy (Middleware)
○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses generateStaticParams)
ƒ  (Dynamic) server-rendered on demand
```
