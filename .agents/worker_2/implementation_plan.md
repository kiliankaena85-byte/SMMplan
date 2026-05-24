# Implementation Plan — Checkout Rounding Exploit Fix

## Problem Description
Micro-priced services ordered with low quantities (e.g. 0.03 RUB per 1k with 100 units) have calculated prices that round down to 0 cents, leading to a free checkout exploit (0.00 RUB).
Specifically, in `src/services/marketing.service.ts`:
- `providerCostCents` is calculated as `Math.round((providerCostPer1000Cents / 1000) * quantity);`
- `originalTotalCents` is calculated as `Math.round((beautifulRetailPer1000Rub * 100 / 1000) * quantity);`
When the product of rate and quantity is very small, these values round down to `0`. We must enforce a safety floor of at least 1 cent (1 kopeck) for any positive quantity using `Math.max(1, Math.round(...))`.

## Proposed Solution
Modify the price calculation in `src/services/marketing.service.ts` to:
```typescript
const providerCostCents = quantity > 0
  ? Math.max(1, Math.round((providerCostPer1000Cents / 1000) * quantity))
  : Math.round((providerCostPer1000Cents / 1000) * quantity);

const originalTotalCents = quantity > 0
  ? Math.max(1, Math.round((beautifulRetailPer1000Rub * 100 / 1000) * quantity))
  : Math.round((beautifulRetailPer1000Rub * 100 / 1000) * quantity);
```

Add a unit test case in `src/services/marketing.service.test.ts` to assert that low-quantity micro-priced orders get rounded up to exactly 1 cent.

---

## 🔴 Double-Pass Planning: 5 Vectors of Reliability

### 1. Архитектурный стык (Server/Client boundaries, hooks, reactive dependencies)
- **Evaluation**: The change is entirely contained within the server-side `MarketingService` class (`src/services/marketing.service.ts`). It alters no public API signatures, types, or databases. The return type remains `PricingResult` where `totalCents`, `originalTotalCents`, and `providerCostCents` are still numbers.
- **Verification**: Ensure the client-side ordering forms and the server actions calling `calculatePrice` function seamlessly with `1` cent as the minimum. No UI changes are needed because the UI naturally renders positive decimals / integer cents without division errors.

### 2. Хаос и пустота (Cold Start, empty DB, transaction failures, broken inputs)
- **Evaluation**: The calculation handles `quantity > 0` conditionally. If `quantity` is `0`, it correctly evaluates to `0` cents and does not cause a positive charge on zero quantity. 
- **Edge cases**:
  - `quantity = 0`: Returns 0 cents, correctly.
  - Very small rate (e.g. `0.000001` per 1k): Still yields 1 cent minimum instead of 0 for positive quantity.
  - Large quantity: Becomes normal value because `Math.max(1, standard_cents)` evaluates to standard_cents since `standard_cents >= 1`.

### 3. Visual & UX Density (Responsiveness, no gigantic items, Tailwind 4 semantics)
- **Evaluation**: The UI displays `pricePerUnitRub` based on `pricePer1kRub / 1000` or the order total. Minimum 1 cent order value in the backend prevents free checkouts and aligns with payment gateways which cannot process 0.00 RUB transactions.

### 4. Доступность WCAG 2.2 AA
- **Evaluation**: N/A for this backend logic, but prevents zero-charge order submission.

### 5. Security & Trust (Trust boundary protection, payment logo checks)
- **Evaluation**: This fix directly hardens the checkout trust boundary. Before this fix, users could buy items for 0.00 RUB. Now, every single positive quantity purchase will cost at least 1 cent, completely closing the rounding exploit.

---

## 🔴 Премортем-анализ (Failure Simulation)

| Сценарий отказа | Программный механизм защиты |
|---|---|
| 1. `quantity` equals 0, but user is charged 1 cent anyway | Use conditional `quantity > 0` check so that zero quantity order results in `0` cents. |
| 2. Floating-point arithmetic errors on extremely low rate (e.g., `rate * usdToRub = NaN` or `Infinity`) | Prisma schema validates `rate` as non-null decimal, and SettingsProvider returns a valid number. Standard JS float rounding is handled safely by `Math.round`. |
| 3. High quantity order gets capped at 1 cent due to incorrect `Math.max` parameter ordering | Order is structured as `Math.max(1, Math.round(...))`. Since positive quantity for standard services has `Math.round(...) >= 1`, it will correctly choose the larger actual cost. |

---

## Concrete Execution Steps
1. **Investigate**: Check `src/services/marketing.service.ts` around lines 79-86. Done.
2. **Implement Code Change**: Update `providerCostCents` and `originalTotalCents` to apply the safety floor if `quantity > 0`.
3. **Verify locally**: Make sure that `tsc` still compiles.
4. **Implement Test Change**: Add a unit test to `src/services/marketing.service.test.ts` focusing on micro-priced orders with low quantities.
5. **Run Tests**: Execute `npm run test` to verify marketing service tests and project tests pass.
6. **Production Build**: Execute `npm run build` to verify no compilation issues occur.
7. **Report**: Write `changes.md` and `handoff.md`.
