# Smmplan Support & Admin Logging System Audit Report

## Executive Summary
This comprehensive audit evaluates the integrity, safety, and correctness of the Smmplan database audit logging system. The investigation identified **multiple active critical security and serialization bugs** that directly jeopardize transaction completion and data security:
1. **Critical BigInt serialization crashes** inside administrative balance adjustments (`escrow.service.ts`) and referral payouts (`marketing.service.ts`). Since `BigInt` fields (such as balances and transaction amounts) are formatted using standard JS stringification, operations will synchronously fail and rollback.
2. **Raw credential exposure vulnerability** due to the absence of a centralized metadata secret-scrubbing utility in the `auditAdmin` helper, relying instead on high-discipline caller sanitization.
3. **Robust database-level integrity** on deletions and constraint violations (P2002/P2003) due to relation decoupling, though key architectural coverage gaps (such as unrecorded user logins) persist.

Below, we detail our findings, trace the underlying logic, and outline concrete architectural proposals to achieve zero-defect status.

---

## 1. Audit Logging Architecture in Smmplan
The system manages three primary audit logging models defined in `prisma/schema.prisma`:
*   `AdminAuditLog`: The primary model for tracing administrative actions (e.g., balance changes, catalog syncs, setting modifications).
*   `AuditLog`: Used for tracking client-facing loyalty actions, referral events, and CMS page saves.
*   `RoutingAuditLog`: Tracks internal SMM-provider routing rule updates and order route overrides.

Administrative actions are recorded using the utility `src/lib/admin-audit.ts`, which exports:
1.  `auditAdmin(...)`: Fire-and-forget logging (handles DB promise rejection silently).
2.  `auditAdminAwaitable(...)`: Synchronous, blocking DB write for highly critical adjustments.

---

## 2. Deep-Dive Security & Integrity Analysis

### Vector 1: Raw Credential Exposure Risks (Passwords, YooKassa API Keys, Vault Secrets)
*   **Encrypted Storage Layer**: Smmplan successfully isolates sensitive settings (e.g., `yookassaSecretKey`, `smtpPassword`, `cryptoBotToken`, `resendApiKey`) using the `VaultService` to encrypt them before database insertion.
*   **Manual Scrubbing in Actions**: Callers are highly disciplined. For example, `src/actions/admin/settings.ts` manually maps safe fields to log during a settings change:
    ```typescript
    oldValue: { siteName: oldSettings?.siteName, maintenanceMode: oldSettings?.maintenanceMode },
    newValue: { siteName, maintenanceMode }
    ```
    This successfully keeps raw secrets out of the audit log fields.
*   **The Zero-Scrubbing Risk**: The `auditAdmin` and `auditAdminAwaitable` functions do **not** implement any automatic scanning or scrubbing. If a developer accidentally passes a database object directly to the audit trail (e.g., `oldValue: provider` or `newValue: systemSettings`), `JSON.stringify` will write the decrypted or raw secrets (API keys, SMTP credentials) straight into the database `AdminAuditLog` table in plain text.
*   **Security Assessment**: *MEDIUM RISK*. The system relies completely on developer discipline to avoid secret exposure. An automatic, recursive key-based secret scrubber inside the central logging utility is required to meet the security contract defined in `PROJECT.md`.

---

### Vector 2: Circular JSON & BigInt Serialization Risks

#### 1. The BigInt Serialization Bug (Severe Crash Risk)
JavaScript's native `JSON.stringify` throws a `TypeError: Do not know how to serialize a BigInt` when processing raw JS `BigInt` values. In Smmplan, key financial fields (e.g., `balance`, `quarantineBalance`, `totalSpent`, `amount`) are represented in the database as `BigInt` (to hold high-precision currency values in cents).

We identified **two critical active bugs** where raw `BigInt` values are stringified, causing synchronous server action failures:

##### Bug A: Balance Quarantine Flow (`src/services/admin/escrow.service.ts:155`)
When an administrative balance adjustment exceeds the trust limit, it is routed to the escrow quarantine bubble. The system writes an audit log in `executeQuarantineAdjustmentTx`:
```typescript
auditAdmin({
  adminId: admin.id,
  adminEmail: admin.email,
  action: 'USER_BALANCE_QUARANTINED',
  target: targetUserId,
  targetType: 'USER',
  oldValue: { quarantineBalance: user.quarantineBalance }, // CRITICAL BUG: user.quarantineBalance is a BigInt!
  newValue: { 
    quarantineBalance: Number(user.quarantineBalance) + amountCents, 
    delta: amountCents, 
    reason, 
    status: 'QUARANTINE' 
  },
});
```
*   **Impact**: When `user.quarantineBalance` is passed directly within `oldValue`, the `auditAdmin` helper synchronously triggers `JSON.stringify({ quarantineBalance: user.quarantineBalance })`. This throws a `TypeError: Do not know how to serialize a BigInt` and instantly crashes the entire balance quarantine action.

##### Bug B: Referral Payout Transaction (`src/services/admin/marketing.service.ts:133`)
During a manual referral payout, the system updates user balances and attempts to log inside the transaction:
```typescript
// Audit Log
await tx.adminAuditLog.create({
  data: {
    adminId: adminId,
    adminEmail: 'System',
    action: 'REFERRAL_PAYOUT',
    target: userId,
    targetType: 'USER',
    newValue: JSON.stringify({ amount: amountToPayCents, newBalance: updatedUser.balance }), // CRITICAL BUG: updatedUser.balance is a BigInt!
  },
});
```
*   **Impact**: Because `updatedUser.balance` is a BigInt, `JSON.stringify` immediately throws a `TypeError`. This aborts the database transaction and completely blocks the referral payout process, preventing admins from paying support partners.

##### Dead-Code Bug: Dead-Code Landmine (`src/services/admin/user.service.ts:139`)
In `adminUserService.updateBalance` (defined but currently unused by main action routers):
```typescript
auditAdmin({
  ...
  oldValue: { balance: oldBalance }, // CRITICAL BUG: oldBalance is a BigInt!
  newValue: { balance: Number(oldBalance) + amountCents, delta: amountCents, reason },
});
```
*   **Impact**: If a developer ever integrates or triggers this function, it will crash synchronously on balance updates.

#### 2. The Fire-and-Forget Fallacy
A major architectural flaw in `auditAdmin` is that serialization is evaluated synchronously:
```typescript
export function auditAdmin(params: { ... }) {
  // Fire-and-forget: does not block the main operation
  void db.adminAuditLog.create({
    data: {
      ...
      oldValue: params.oldValue != null ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue != null ? JSON.stringify(params.newValue) : null,
    },
  }).catch((err) => { ... });
}
```
*   **Impact**: Because `JSON.stringify` runs on the main thread *before* the promise is constructed, any serialization exception (e.g. BigInt or Circular reference) is thrown **synchronously**. It completely escapes the `.catch(...)` block and crashes the parent server action. Developers believed `auditAdmin` was safe and non-blocking, but it is a silent crash path.

---

### Vector 3: Database Constraint Violations (P2002/P2003)
*   **AdminAuditLog Decoupling**: In `prisma/schema.prisma`, `AdminAuditLog` maintains `adminId: String` as a raw field **without a foreign key relation** to the `User` table.
    *   *Result*: Deleting staff members or admins will **never** trigger foreign key violations (`P2003`) on old log records.
*   **AuditLog Cascade Safety**: `AuditLog` has an explicit cascade onDelete handler to its parent `User`:
    ```prisma
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    ```
    *   *Result*: Deleting a normal client user will automatically purge their audit history cleanly, avoiding `P2003` blockages.
*   **Unique Constraint (P2002) Resistance**: `AdminAuditLog` uses CUID primary keys and only simple indices (`adminId`, `createdAt`, `targetType`). It contains no unique constraints, meaning logging insertions are immune to `P2002` duplicate key conflicts.
*   **Ledger Security Constraint (P2003)**: `LedgerEntry` correctly uses `onDelete: Restrict` on `userId`. This ensures financial logs cannot be accidentally purged by deleting a client with active ledger records (accounting integrity is strictly preserved).
*   **Provider Deletion Safety**: In `src/actions/admin/providers/crud.ts`, the deletion checks if provider-owned services exist beforehand:
    ```typescript
    const count = await db.service.count({ where: { providerId: id } });
    if (count > 0) return { success: false, error: "..." };
    ```
    This completely mitigates database-level cascade errors by resolving relationship checks at the action layer.

---

## 3. Coverage & Feature Gap Analysis
1.  **Unlogged Administrative Logins**: The `LoginLog` table is defined in the Prisma schema to record administrative and user sessions, but the actual authentication routes do **not** write to it. This leaves a major security gap in auditing unauthorized staff entry.
2.  **No Payload Truncation**: Standard JSON stringification logs entire objects without checking payload size. If a catalog sync runs and logs extensive provider data, this can trigger storage bloat or memory failures.
3.  **Duplicate Logging**: In the referral payout flow, logging is performed twice (once inside the transaction with a bug, and again post-transaction), which is redundant.

---

## 4. Proposals & Mitigation Strategies

### Proposal A: Hardened Audit Log Utility (Zero-Defect Implementation)
Replace the current `src/lib/admin-audit.ts` with a robust, defensive serialization utility. This implementation includes:
1.  **Safe BigInt Stringification**: Automatically serializes BigInts as standard numbers.
2.  **Circular Reference Protection**: Uses a cycle-safe replacer to avoid throwing JSON errors.
3.  **Recursive Secret Masking**: Automatically scrubs keys matching security-sensitive phrases (e.g. `password`, `key`, `secret`, `token`, `auth`, `salt`, `yookassa`, `vault`).
4.  **Payload Truncation**: Truncates excessively large fields to prevent database bloat.
5.  **Safe Synchronous Parsing**: Wraps all stringification in defensive try-catch containers to ensure logging never crashes the caller, even in synchronous operations.

```typescript
// Proposed replacement for src/lib/admin-audit.ts
import { db } from '@/lib/db';

const SENSITIVE_KEYS = [
  'password', 'pass', 'hash', 'token', 'secret', 'key', 
  'credentials', 'salt', 'auth', 'yookassa', 'vault', 'apikey'
];

/**
 * Robust JSON serializer that supports BigInt, circular structures, 
 * payload size limit truncation, and automatic secret scrubbing.
 */
function safeSerialize(obj: unknown): string | null {
  if (obj === null || obj === undefined) return null;

  try {
    const seen = new WeakSet();
    
    const stringified = JSON.stringify(obj, (key, value) => {
      // 1. Scrub secrets by checking against key patterns
      if (typeof key === 'string' && SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
        return '••••••••••••••••';
      }

      // 2. Handle BigInt gracefully by casting to numbers
      if (typeof value === 'bigint') {
        return Number(value);
      }

      // 3. Handle Circular structures cleanly
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }

      return value;
    });

    // 4. Truncate payload if it exceeds 64KB to avoid DB bloat
    if (stringified.length > 64 * 1024) {
      return stringified.substring(0, 64 * 1024) + '... [TRUNCATED]';
    }

    return stringified;
  } catch (err) {
    console.error('[AdminAudit] Serialization error:', err);
    return '[Serialization Error]';
  }
}

export function auditAdmin(params: {
  adminId: string;
  adminEmail: string;
  action: string;
  target: string;
  targetType: 'USER' | 'SERVICE' | 'ORDER' | 'SETTINGS' | 'PROVIDER' | 'TICKET' | 'LEDGER';
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
}) {
  // Evaluated inside safe try-catch so serialization failures CANNOT bubble up to action caller
  const oldValue = safeSerialize(params.oldValue);
  const newValue = safeSerialize(params.newValue);

  void db.adminAuditLog.create({
    data: {
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: params.action,
      target: params.target,
      targetType: params.targetType,
      oldValue,
      newValue,
      ipAddress: params.ipAddress ?? null,
    },
  }).catch((err) => {
    console.error('[AdminAudit] Failed to write log:', err);
  });
}

export async function auditAdminAwaitable(params: {
  adminId: string;
  adminEmail: string;
  action: string;
  target: string;
  targetType: 'USER' | 'SERVICE' | 'ORDER' | 'SETTINGS' | 'PROVIDER' | 'TICKET' | 'LEDGER';
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
}) {
  const oldValue = safeSerialize(params.oldValue);
  const newValue = safeSerialize(params.newValue);

  return db.adminAuditLog.create({
    data: {
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: params.action,
      target: params.target,
      targetType: params.targetType,
      oldValue,
      newValue,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
```

### Proposal B: Direct Bug Diffs
Until Proposal A is fully deployed, the following modifications should be applied immediately to cure active crashes:

#### 1. In `src/services/admin/escrow.service.ts`
Cast BigInt to a `Number` in the submit log:
```diff
<<<<
    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'USER_BALANCE_QUARANTINED',
      target: targetUserId,
      targetType: 'USER',
      oldValue: { quarantineBalance: user.quarantineBalance },
      newValue: { 
====
    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'USER_BALANCE_QUARANTINED',
      target: targetUserId,
      targetType: 'USER',
      oldValue: { quarantineBalance: Number(user.quarantineBalance) },
      newValue: { 
>>>>
```

#### 2. In `src/services/admin/marketing.service.ts`
Cast BigInt to a `Number` inside the database transaction:
```diff
<<<<
      // Audit Log
      await tx.adminAuditLog.create({
        data: {
          adminId: adminId,
          adminEmail: 'System', // Will map to real in action
          action: 'REFERRAL_PAYOUT',
          target: userId,
          targetType: 'USER',
          newValue: JSON.stringify({ amount: amountToPayCents, newBalance: updatedUser.balance }),
        },
      });
====
      // Audit Log
      await tx.adminAuditLog.create({
        data: {
          adminId: adminId,
          adminEmail: 'System', // Will map to real in action
          action: 'REFERRAL_PAYOUT',
          target: userId,
          targetType: 'USER',
          newValue: JSON.stringify({ amount: amountToPayCents, newBalance: Number(updatedUser.balance) }),
        },
      });
>>>>
```
