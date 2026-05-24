## 2026-05-22T23:20:48Z

The Forensic Auditor identified a rounding exploit on the checkout / order engine:
- In `src/services/marketing.service.ts` at line 80 and 85:
  ```tsx
  const providerCostCents = Math.round((providerCostPer1000Cents / 1000) * quantity);
  ```
  and
  ```tsx
  const originalTotalCents = Math.round((beautifulRetailPer1000Rub * 100 / 1000) * quantity);
  ```
  For micro-priced services ordered with low quantities (e.g. 0.03 RUB per 1k with 100 units), the calculated price rounds down to 0 cents, leading to a free checkout exploit (0.00 RUB)!

Your task:
1. Modify `src/services/marketing.service.ts` to enforce a safety floor of at least 1 cent (`1` kopeck) for any positive quantity. Use `Math.max(1, Math.round(...))` for positive quantities in both `providerCostCents` and `originalTotalCents`.
2. Modify `src/services/marketing.service.test.ts` to add a unit test case validating that a low-quantity order on a micro-priced service does not round to 0 cents, but instead enforces the 1-cent floor.
3. Run `npm run test` to verify that all tests in `src/services/marketing.service.test.ts` pass cleanly.
4. Run `npm run build` to verify the production compilation.

Follow all rules in `d:\SMM_plan_2\AGENTS.md` (e.g. Next.js 16/React 19 patterns, semantic tokens, no inline colors, Zero-Defect Execution Protocol).
Write a report of the files modified and test outputs in `.agents/worker_2/changes.md`.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.
