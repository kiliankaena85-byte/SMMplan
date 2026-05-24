## 2026-05-24T11:59:07Z

Implement Milestone 4 (R4: Balance Verification Ledger) of the Smmplan Stage 4 Hardening.

Objectives:
1. Write a Node execution utility class `BalanceVerifier` inside `src/utils/balance-verifier.ts`.
2. Reconcile user balance with the sum of their approved ledger entries:
   - Retrieve all active (`isActive: true`), non-deleted (`isDeleted: false`) users.
   - For each user, query all approved `LedgerEntry` records (`status: 'APPROVED'`) for that user.
   - Sum the `amount` values (using bigint summation) from these entries.
   - Compare the ledger transaction sum to `User.balance`.
   - If the sum matches `User.balance`, then the account is reconciled and safe.
   - If the sum does NOT match `User.balance` (a discrepancy exists, even 1 cent):
     - Lock the user's account by setting `isActive: false` and updating `adminNote` with a clear message: `[CRITICAL DISCREPANCY] Автоматическая блокировка: баланс (<balance>) не сходится с реестром (<ledgerSum>). Разница: <discrepancy> центов.`.
     - Log a database warning / create an `AdminAuditLog` entry (with `action: "USER_BALANCE_DISCREPANCY"`, `target: user.id`, `targetType: "USER"`, and a descriptive `newValue` string).
     - Send a critical admin alert using `sendAdminAlert` from `@/lib/notifications` with severity `CRITICAL`.
3. Wire the script to run via package script `npm run check-balances` in `package.json`:
   - The CLI execution should run via `dotenv -e .env -- tsx src/utils/balance-verifier.ts`.
   - When run from CLI, it should print a structured, beautiful Russian console report showing how many users were scanned, how many were clean, and detail any discrepancies found (and user accounts locked).
   - If any discrepancy is found, exit the script with exit code `1`. If all is clean, exit with exit code `0`.
   - The script should close the Prisma connection properly upon exit.
4. Create a comprehensive Vitest test suite `src/utils/balance-verifier.test.ts` to verify all of this:
   - Set up test cases: a user with correct balance and ledger, a user with discrepant balance, verifying account locking, verifier alert triggers, and audit logging.
   - Mock notification exports or check queue additions to ensure the alert is fired correctly.
   - Run the tests via:
     `npx dotenv -e .env.test -- vitest run src/utils/balance-verifier.test.ts`

Stack and Conventions:
- Follow Smmplan Lite AI Developer Contract (AGENTS.md) at all costs!
- Strictly adhere to zero-defect execution.
- Maintain absolute type-safety. No 'any' types without comments.
- Do NOT rewrite files completely if small edits are sufficient (but since these are new files, writing the full contents is expected).

Verification:
- Run typescript compilation (`npx tsc --noEmit`) and ensure 0 errors.
- Run `npm run build` to confirm production compilation.
- Record all build and test command outcomes in your handoff report.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your implementation details to `changes.md` and your 5-component handoff report to `handoff.md` inside your working directory: `d:\SMM_plan_2\.agents\worker_stage4_m4_verifier\`.
