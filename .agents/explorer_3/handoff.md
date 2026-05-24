# Handoff Report — Explorer 3 (Audit Logging Security & Integrity Audit)

## 1. Observation
We observed the following exact definitions, implementations, and calls within the codebase:

### A. Database Models (`prisma/schema.prisma`)
*   **BigInt Fields** (currency/spent in Cents):
    *   `User.balance` (line 15)
    *   `User.quarantineBalance` (line 16)
    *   `User.totalSpent` (line 17)
    *   `LedgerEntry.amount` (line 307)
*   **Decoupled Relations**:
    *   `AdminAuditLog` (lines 538–550) defines `adminId String` and `adminEmail String` as simple denormalized fields without foreign key relations (`@relation`) to `User`.
*   **Cascade Relations**:
    *   `AuditLog` (lines 521–527) specifies cascade deletion:
        ```prisma
        user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
        ```
*   **Restrict Relations**:
    *   `LedgerEntry` (lines 304–313) specifies restrict deletion:
        ```prisma
        user           User     @relation("UserLedger", fields: [userId], references: [id], onDelete: Restrict)
        ```

### B. Serialization Implementation (`src/lib/admin-audit.ts`)
*   The parameters are parsed synchronously before database creation:
    ```typescript
    oldValue: params.oldValue != null ? JSON.stringify(params.oldValue) : null,
    newValue: params.newValue != null ? JSON.stringify(params.newValue) : null,
    ```
    There is no try-catch surrounding `JSON.stringify`, and no support for `BigInt` or circular structure protection.

### C. BigInt Serialization Vulnerabilities
1.  **Balance Quarantine Submission** (`src/services/admin/escrow.service.ts` line 155):
    ```typescript
    oldValue: { quarantineBalance: user.quarantineBalance },
    ```
    Here, `user.quarantineBalance` is loaded as a raw JS `BigInt` from `db.user.findUniqueOrThrow`.
2.  **Referral Payout Transaction** (`src/services/admin/marketing.service.ts` line 133):
    ```typescript
    newValue: JSON.stringify({ amount: amountToPayCents, newBalance: updatedUser.balance }),
    ```
    Here, `updatedUser.balance` is loaded as a raw JS `BigInt` returned by the transaction's `tx.user.update` call.

---

## 2. Logic Chain
1.  **JS Serialization Constraint**: In JavaScript, passing a `BigInt` to `JSON.stringify` immediately throws a `TypeError: Do not know how to serialize a BigInt`.
2.  **Escrow Crash Trigger**: When `executeQuarantineAdjustmentTx` (in `escrow.service.ts`) executes, it invokes `auditAdmin` with `oldValue: { quarantineBalance: user.quarantineBalance }` (Observation C.1). Since `quarantineBalance` is a raw JS `BigInt` (Observation A.1), it triggers a `TypeError`.
3.  **Marketing Transaction Crash Trigger**: When `processPayout` (in `marketing.service.ts`) executes, it invokes `JSON.stringify` directly within `tx.adminAuditLog.create` passing `updatedUser.balance` (Observation C.2). Since `balance` is a raw JS `BigInt` (Observation A.1), it triggers a `TypeError` within the database transaction, causing it to roll back and abort the payout.
4.  **Failure to Isolate Synchronous Errors**: While the `auditAdmin` helper catches asynchronous DB insertion failures (`.catch(...)`), the `JSON.stringify` serialization is evaluated synchronously in the main thread (Observation B) *before* the promise is instantiated. Consequently, any serialization `TypeError` bypasses the asynchronous `.catch` block and crashes the parent server action immediately.
5.  **Lack of Centralized Sanitizer**: The `auditAdmin` utility passes metadata straight through to `JSON.stringify` without executing any deep key checking (Observation B). If system settings or provider credentials containing secrets are passed as an object, they will be logged in plain text.
6.  **Database Constraint Health**:
    *   Since `AdminAuditLog.adminId` is a plain `String` decoupled from the `User` relation (Observation A.2), staff deletion is immune to `P2003` foreign key blockages.
    *   Since `AuditLog` specifies `onDelete: Cascade` (Observation A.3), client user deletion purges log history and is immune to `P2003` blockages.
    *   Since `LedgerEntry` specifies `onDelete: Restrict` (Observation A.4), deleting users with financial history is prohibited by DB constraints, preserving bookkeeping integrity.

---

## 3. Caveats
*   We did not run runtime executions of the code since we operate strictly in **read-only investigation** mode.
*   We assume standard JS runtime behavior for `JSON.stringify` when encountering a `BigInt`.
*   Alternative options such as mapping all fields to numeric types in Prisma were discarded as `BigInt` is highly desirable for large currency scales.

---

## 4. Conclusion
1.  **Serialization Risks**: The system possesses **two active, critical crash vectors** in the quarantine escrow and referral payout flows. Administrative balance quarantine requests and referral payouts will consistently crash the server due to `BigInt` serialization failures.
2.  **Credential Protection**: Security relies fully on manual filtering in actions; a centralized, recursive secret scrubbing mechanism inside the logging helper is missing, leaving a risk of accidental credential logging.
3.  **Constraint Integrity**: Database relational integrity is robust; deletion cascades and restrictions correctly protect log links without blocking staff/user deletion where unnecessary.
4.  **Coverage Gap**: The `LoginLog` table is defined in the schema but unused in authentication actions, leaving a coverage gap.

---

## 5. Verification Method
1.  **Locate Target Files**: Inspect `src/services/admin/escrow.service.ts` around line 155 and `src/services/admin/marketing.service.ts` around line 133 to verify the presence of raw `BigInt` fields being serialized.
2.  **Verify Serialization Behavior**: In any Node.js environment, verify that calling `JSON.stringify({ value: 1000n })` yields a `TypeError: Do not know how to serialize a BigInt`.
3.  **Verify Decoupling**: Check `prisma/schema.prisma` lines 538–550 to confirm `AdminAuditLog` lacks foreign key relations to `User` on `adminId`.
4.  **Test Suite Execution**: Once the proposed changes are implemented, execute `npm run test` or `npx vitest` to ensure that standard ledger and service tests continue to compile and pass cleanly.
