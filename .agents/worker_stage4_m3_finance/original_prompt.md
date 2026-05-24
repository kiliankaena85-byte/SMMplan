## 2026-05-24T11:40:37Z
Implement/verify Milestone 3 (R3: Financial Dashboard Analytics) of the Smmplan Stage 4 Hardening.

Objectives:
1. Extend `prisma/schema.prisma` with the `UsnScheme` enum and add the selection settings to the database and `/admin/settings` configurations:
   ```prisma
   enum UsnScheme {
     INCOME
     INCOME_EXPENSES
   }

   model SystemSettings {
     // ...
     usnScheme UsnScheme @default(INCOME_EXPENSES)
   }
   ```
   Ensure you run database migration commands if needed via `npx prisma migrate dev` (run from within the worker environment).
2. Refactor `src/services/financial/accounting.service.ts` `getMetrics` to dynamically calculate taxes based on the selected `SystemSettings.usnScheme`:
   - USN "Income" (INCOME): Tax rate applied directly to gross revenue (`revenueGross`).
   - USN "Income minus Expenses" (INCOME_EXPENSES): Tax rate applied to gross margin (`marginGross`).
3. Add a premium, high-density financial analytics block to the admin dashboard (`src/app/admin/dashboard/page.tsx` or its sub-components) with five clean cards:
   - **«Поступило (Выручка)»**: Successful revenue gross sum (in rub).
   - **«Комиссии кассы»**: 3% gateway YooKassa commission expense in rub.
   - **«Закупки (Расход)»**: Cumulative sebiстоимость `providerCost` of successful provider orders.
   - **«Расчетный налог (УСН)»**: Interactive/dynamic tax card that displays calculated taxes, current USN scheme selection, and a clean Russian helper text explaining tax quarters and payment rules.
   - **«Чистая прибыль»**: Final net profit with color-coded traffic-light indicator:
     - Green: positive and stable net profit margin.
     - Yellow: positive but narrow net profit margin (low markup/high costs).
     - Red: negative net profit (expenses exceed revenue).
4. Create Vitest tests to verify:
   - Accounting metrics calculations for both INCOME and INCOME_EXPENSES schemes.
   - Net profit calculation and rounding invariants.

Stack and Conventions:
- Follow Smmplan Lite AI Developer Contract (AGENTS.md) at all costs!
- Tailwind CSS v4 custom semantic classes.
- Zero-defect code execution.

Verification:
- Run typescript verification (`npx tsc --noEmit`) and ensure 0 errors.
- Run `npm run build` to verify production compilation.
- Run the new vitest specs and report results in the handoff.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your implementation details to `changes.md` and your 5-component handoff report to `handoff.md` inside your working directory: `d:\SMM_plan_2\.agents\worker_stage4_m3_finance\`.

## 2026-05-24T11:51:23Z
From: Orchestrator (a7f29fe9-1e55-4742-b18d-fe0f50dc2ce0)
Context: Smmplan Stage 4 Hardening — Milestone 3 (Financial Dashboard Analytics)
Content: Hello! I am the Project Orchestrator checking on your status. How is your implementation of the dynamic USN tax calculations, database migrations, and finance dashboard cards progressing? Do you need any assistance, or are you running into any issues?
Action: Please reply with a brief status update or your completed handoff report.
