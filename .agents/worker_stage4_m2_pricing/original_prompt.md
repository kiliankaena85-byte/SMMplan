## 2026-05-24T11:34:05Z
Implement/verify Milestone 2 (R2: Auto-pricing with Elastic Quarantine & Loss Prevention using CBR USD/RUB exchange rates) of the Smmplan Stage 4 Hardening.

Objectives:
1. Ensure the background service or sync action successfully contacts the official Central Bank of Russia (CBR) API to retrieve the daily USD/RUB exchange rate.
2. In the sync catalog action (`src/actions/admin/providers/sync-action.ts`), enforce the exact auto-pricing mapping:
   - Calculate retail price: `pricePer1kRub = providerRateUSD * markup * usdToRubCourse`
   - Calculate single unit price: `pricePerUnitRub = pricePer1kRub / 1000` (ensure this matches AGENTS.md pricing rules exactly, and is used for UI rendering!).
3. Implement/verify Elastic Quarantine:
   - If the new provider cost in USD has jumped by more than 20% compared to the existing saved cost, automatically quarantine the service: set `isQuarantined = true`, `quarantineReason = "Ценовой скачок у провайдера"`, and `isActive = false`. Save the proposed rate to a pending field so it can be approved by the admin.
4. Implement/verify Loss Prevention (Loss Block):
   - During synchronization, or upon exchange rate fluctuations, if the calculated retail cost `pricePerUnitRub` becomes less than the purchase cost in rubles (`providerRateUSD * usdToRubCourse / 1000`), immediately deactivate the service (`isActive = false`), log a database alert/warning, and send a critical notification.
5. Create Vitest tests verifying:
   - Correct retail price calculations.
   - Quarantine trigger for >20% price increases.
   - Loss prevention auto-deactivation for unprofitable rates.

Stack and Conventions:
- Follow the Smmplan Lite AI Developer Contract (AGENTS.md) exactly.
- Strictly adhere to zero-defect execution.
- Target files: `src/services/system/cbr-rate.service.ts`, `src/actions/admin/providers/sync-action.ts`, `src/services/providers/quarantine.service.ts`, and relevant test suites.

Verification:
- Run typescript verification (`npx tsc --noEmit`) and ensure 0 errors.
- Run `npm run build` to confirm production compilation.
- Run all provider/pricing tests via Vitest and document command and outcomes in the handoff.
