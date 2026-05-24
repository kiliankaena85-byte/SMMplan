# Implementation Plan: Balance Verification Ledger

## 1. ТЗ (Logic Spec)
- **Class Location**: `src/utils/balance-verifier.ts`
- **Method Signature**:
  ```typescript
  export interface ReconciliationResult {
    userId: string;
    email: string;
    userBalance: bigint;
    ledgerSum: bigint;
    discrepancy: bigint;
    isDiscrepancy: boolean;
    lockedSuccessfully: boolean;
  }
  
  export class BalanceVerifier {
    static async verifyAllBalances(): Promise<ReconciliationResult[]>;
  }
  ```
- **Reconciliation Rules**:
  - Load all users where `isActive: true` and `isDeleted: false`.
  - For each user:
    - Sum approved ledger entries (`status: 'APPROVED'`). Summation must use `BigInt` addition: `agg._sum.amount ?? 0n`.
    - Compare `User.balance` (which is `BigInt`) to `ledgerSum`.
    - If `User.balance === ledgerSum`, then the account is clean.
    - If they do NOT match (even by 1 cent):
      - Update `User` to `isActive: false` and set `adminNote` to exactly:
        `[CRITICAL DISCREPANCY] Автоматическая блокировка: баланс (<balance>) не сходится с реестром (<ledgerSum>). Разница: <discrepancy> центов.` (replacing tokens with exact values).
      - Create an `AdminAuditLog` entry with `action: "USER_BALANCE_DISCREPANCY"`, `target: user.id`, `targetType: "USER"`, `newValue: "[CRITICAL DISCREPANCY] Автоматическая блокировка: баланс (<balance>)..."` or descriptive text, `adminId: "SYSTEM"`, `adminEmail: "system@smmplan.pro"`.
      - Send a critical admin alert using `sendAdminAlert` from `@/lib/notifications` with severity `CRITICAL`.
- **CLI Mode**:
  - If executed directly:
    - Load `.env` using dotenv or rely on CLI loader environment.
    - Run the verification.
    - Print a beautiful console report in Russian.
    - If any discrepancies exist, exit with code `1`. Otherwise, exit with code `0`.
    - Gracefully disconnect Prisma (`await db.$disconnect()`).

---

## 2. Double-Pass Planning (5 Векторов Надежности)

1. **Архитектурный стык**:
   - *Analysis*: The verifier modifies `isActive` and `adminNote` of the user. In standard Smmplan operations, does locking an account affect active sessions? Yes, `isActive: false` will reject future checkouts or logins. This is highly secure.
   - *Mitigation*: The CLI uses the same `db` client from `@/lib/db`, ensuring connection pools and transactions are consistent.
2. **Хаос и пустота**:
   - *Analysis*: What if there are zero users or zero ledger entries?
   - *Mitigation*: The summation aggregates nicely using `db.ledgerEntry.aggregate` with fallback to `0n` if `_sum.amount` is null. If there are no users, the CLI reports `0 users scanned` and exits gracefully with code `0`.
3. **Visual & UX Density**:
   - *Analysis*: The CLI report must be readable, structured, and contain complete information.
   - *Mitigation*: Use Russian, color indicators (red for block, green for success), aligned columns or structured bullet points.
4. **Доступность WCAG 2.2 AA**:
   - *Analysis*: Not directly applicable to the backend CLI, but the CLI output must support standard Unicode symbols (like 🚨, ✅) and be accessible in shell readers.
5. **Security & Trust**:
   - *Analysis*: Prevent balance races during locking.
   - *Mitigation*: We perform the audit dynamically. To prevent locks while user is performing operations, the check handles accounts sequentially. In high-traffic scenarios, locking mismatched accounts instantly minimizes potential drain.

---

## 3. Премортем-анализ (Failure Simulation)

| Сценарий отказа (Hypothetical Failure) | Механизм защиты (Defense Mechanism) | Risk Score (P×I) |
|---|---|---|
| **1. Prisma Connection Exhaustion**: Running the script sequentially inside a massive loop causes too many aggregate calls, depleting the pool. | Batch users or query sequentially using single Prisma client connection, closing the connection cleanly in `finally` blocks. | Low (2 × 3 = 6) |
| **2. Silent Alert Failure**: The notification queue fails or Redis is down, causing the verifier to swallow the discrepancy alert. | Wrap `sendAdminAlert` in try/catch and log to stderr as a fallback so that system administrators monitoring stdout/stderr are immediately notified. | Medium (3 × 4 = 12) |
| **3. Floating-Point Precision Loss**: Reconciling fractional values causes false positives. | Smmplan uses PostgreSQL `BigInt` for monetary values in Cents. All summations are strictly integer-based `BigInt` operations, guaranteeing zero precision loss. | Low (1 × 5 = 5) |

---

## 4. Implementation Steps
1. Create `src/utils/balance-verifier.ts` containing the class `BalanceVerifier` and the CLI execution hook.
2. Wire up the CLI script `npm run check-balances` in `package.json` utilizing `dotenv -e .env -- tsx src/utils/balance-verifier.ts`.
3. Create a Vitest suite in `src/utils/balance-verifier.test.ts`.
4. Run validation and verification: `npx tsc --noEmit` and `npm run check-balances` inside test DB environments.
