# Support Representative Operations Logging Audit Report

## 1. Executive Summary
This report presents a read-only security and operational audit of the logging coverage for **Support Representative** and **Administrator** actions within the Smmplan Lite core codebase. 

While core administrative modifications (like manual balance requests, user banning, and role updates) are explicitly logged, we identified critical accountability gaps where support representative operations are performed completely silently, as well as multiple instances where security parameters (like IP addresses) are either hardcoded or missing from critical audit entries.

---

## 2. Methodology & Problem Boundary
The boundary of this investigation is scoped to the administrative and support actions executed within `src/actions/` (specifically `tickets.ts`, `admin/team.ts`, `admin/users.ts`, `support/compensation.ts`, and `support/template.ts`) and automatic bot profile merging located in `src/bot/index.ts`. 

We examined:
1. **What operations** are performed by support representatives.
2. **Whether they are logged** to database audit structures (`AdminAuditLog`, `AuditLog`, `LedgerEntry`, etc.).
3. **What identifiers** are used to trace accountability.
4. **Logging coverage gaps and security vulnerabilities** within the audit system.

---

## 3. Database Schema Context (Audit Logs)
The PostgreSQL database (managed via `prisma/schema.prisma`) defines three specialized auditing models:

1. **`AdminAuditLog`** (Lines 550–566 in `schema.prisma`):
   * `id`: `String @id @default(cuid())`
   * `adminId`: `String` (Unique CUID of the operator)
   * `adminEmail`: `String` (Denormalized operator email for fast indexing/display)
   * `action`: `String` (e.g. `USER_BALANCE_CHANGE`, `BAN_USER`)
   * `target`: `String` (CUID or ID of the affected resource)
   * `targetType`: `String` (e.g. `USER`, `SERVICE`, `ORDER`, `SETTINGS`, `TICKET`)
   * `oldValue`: `String?` (Stringified JSON snapshot of state before the change)
   * `newValue`: `String?` (Stringified JSON snapshot of state after the change)
   * `ipAddress`: `String?` (Client IP address of the administrator)
   * `createdAt`: `DateTime @default(now())`

2. **`LedgerEntry`** (Lines 567–584 in `schema.prisma`):
   * Logs financial modifications, linking the client (`userId`) and the initiating support agent/admin (`adminId`), along with mandatory justifications (`reason`) and an `idempotencyKey`.

3. **`AuditLog`** (Lines 509–518 in `schema.prisma`):
   * Standard user-facing logging (`userId`, `action`, `details`).

*Note: The `AdminAuditLog` model does NOT store `sessionId`. It maps operations directly to `adminId` and `adminEmail`.*

---

## 4. Operation Auditing Coverage Analysis

### A. Ticket Management & Messaging (`src/actions/support/ticket.ts` & `src/services/support/ticket.service.ts`)
We analyzed all operations inside `ticket.ts` and `ticket.service.ts` to evaluate auditing coverage:

| Action / Operation | Initiated By | Logged to `AdminAuditLog`? | Identifiers Captured | Identified Gaps / Vulnerabilities |
|:---|:---|:---|:---|:---|
| **`adminReplyTicket`** (Sending message / note) | Support / Manager | ❌ **No** | None | **Critical Gap**: Messages sent by support reps or internal support notes do not write to `AdminAuditLog`. The `TicketMessage` database record does not store `adminId` or `adminEmail`. It is impossible to identify which operator wrote a message or note if multiple admins exist. |
| **`changeTicketStatus`** (Resolving/Reopening) | Support / Manager | ❌ **No** | None | **Critical Gap**: Closing or opening tickets is not audited. No trace of which staff member closed the ticket. |
| **`editTicketMessage`** (Editing a message) | Support / Manager | ✅ **Yes** | `adminId`, `adminEmail`, `target` (message ID), `oldValue`/`newValue` | **IP Masking**: The IP address is hardcoded to `'internal'` rather than resolving the operator's actual IP address. |
| **`adminManualTelegramBind`** (Manual merge) | Admin / Owner | ✅ **Yes** | `adminId`, `adminEmail`, `target` (web user ID), `oldValue`/`newValue` | **IP Masking**: The IP address is hardcoded to `'internal'` instead of resolving the actual client IP. |
| **`requestTelegramBind`** (Requesting merge) | Support / Manager | ❌ **No** | None | Action completes silently without an audit trail. |
| **`generateSmartReplyAction`** | Support / Manager | ❌ **No** | None | Smart reply generation is not audited. |

---

### B. Support Limits & Trust Budgets (`src/actions/admin/team.ts` & `src/actions/support/compensation.ts`)
Support representatives have daily trust budgets (`supportLimitCents`) to issue compensations or refunds without requiring Owner/Admin approval.

| Action / Operation | Initiated By | Logged to `AdminAuditLog`? | Identifiers Captured | Identified Gaps / Vulnerabilities |
|:---|:---|:---|:---|:---|
| **`updateSupportLimit`** (Setting trust budget) | Admin / Owner | ✅ **Yes** | `adminId`, `adminEmail`, `target` (affected user ID), `oldValue`/`newValue` | **Omitted IP**: `ipAddress` parameter is omitted from `auditAdmin` call, defaulting to `null` in the database. Uses fire-and-forget logging. |
| **`logManualCompensation`** (Issuing refund/refill) | Support / Manager | ✅ **Yes** | `adminId`, `adminEmail`, `target` (ticket ID), `oldValue`/`newValue` | **IP Masking**: The IP address is hardcoded to `'internal'` instead of capturing the representative's actual client IP. |

---

### C. Account Merging & Telegram smart Binds (`src/bot/index.ts`)
When a user executes the automated Telegram Smart Bind protocol (e.g., clicking `/start tg_bind_TOKEN` in the Telegram bot), the system performs a profile merge.

* **Database Updates:** Inside `src/bot/index.ts` (lines 97-126), a transaction updates all associated `ticket`, `order`, `payment`, `ledgerEntry`, `invoice`, and `auditLog` records from the temporary user to the target web user, deletes the temporary user, and binds the `telegramId` to the web user.
* **Logging Status:** ❌ **NOT Logged**. There is absolutely no record of this merge operation in `AdminAuditLog` or `AuditLog`. If an issue occurs, there is no audit log indicating why the temporary user was deleted or how the Telegram account became bound to the web profile.

---

### D. Critical Admin & Escrow Actions (`src/actions/admin/users.ts` & `src/services/admin/escrow.service.ts`)
We audited core administrative actions that can be triggered by Support Representatives (if permissions allow) or Administrators.

1. **`updateBalanceAction` (Balance modifications):**
   * ✅ **Fully Audited**: Logs `UPDATE_BALANCE_REQUEST` to `AdminAuditLog` using `auditAdminAwaitable`.
   * ✅ **Session IP Resolved**: Correctly resolves `ipAddress` via `getClientIp('unknown')`.

2. **`banUserAction` & `unbanUserAction` (Client banning):**
   * ✅ **Fully Audited**: Logs `BAN_USER`/`UNBAN_USER` to `AdminAuditLog` via `auditAdminAwaitable`.
   * ✅ **Session IP Resolved**: Correctly resolves `ipAddress` via `getClientIp('unknown')`.

3. **`loginAsAction` (Impersonation):**
   * ⚠️ **Partially Audited**: Logs `LOGIN_AS_USER` via `auditAdminAwaitable` and records the origin in `Session.impersonatedBy`.
   * ❌ **Missing IP**: The `ipAddress` field is omitted from `auditAdminAwaitable` call, meaning the admin's IP address is not logged for this critical security-sensitive action.

4. **`resolveQuarantine` (Approve/Reject Escrow):**
   * ⚠️ **Partially Audited**: Logs `QUARANTINE_APPROVE`/`QUARANTINE_REJECT` to `AdminAuditLog`.
   * ❌ **Missing IP**: The `ipAddress` field is omitted, resulting in a `null` value in the database.

---

## 5. Critical Logging Coverage Gaps & Vulnerabilities

### 1. Anonymous Support Communications
* **Location:** `src/actions/support/ticket.ts` -> `adminReplyTicket()`
* **Mechanism:** When a support representative responds to a client ticket or writes an internal note (marked `isInternal: true`), no audit log is generated. Furthermore, the `TicketMessage` database record contains no foreign key or string reference to the executing `adminId` or `adminEmail`.
* **Vulnerability:** Accountability is lost. If an employee writes an offensive response or leaks private details in internal notes, there is no record indicating which representative authored the message. The system only logs `sender = STAFF` or `sender = INTERNAL`.

### 2. Silent Ticket Closures
* **Location:** `src/actions/support/ticket.ts` -> `changeTicketStatus()`
* **Mechanism:** Resolving/closing or reopening a ticket is performed in the database without any logging to `AdminAuditLog`.
* **Vulnerability:** Support agents can close tickets maliciously or manipulate SLA timers (such as Time to Resolution) without leaving a trace of their identity.

### 3. Hardcoded `'internal'` Client IPs
* **Locations:**
  * `src/actions/support/ticket.ts` -> `editTicketMessage()` (Line 243)
  * `src/actions/support/ticket.ts` -> `adminManualTelegramBind()` (Line 384)
  * `src/actions/support/compensation.ts` -> `logManualCompensation()` (Line 95)
* **Mechanism:** These actions pass `ipAddress: 'internal'` as a static string to the database audit record.
* **Vulnerability:** Fails security compliance requirements. By hiding the operator's actual IP address, a malicious actor operating with compromised support credentials cannot be geo-located or traced via networking logs.

### 4. Missing IP Addresses in Critical Admin Actions
* **Locations:**
  * `src/actions/admin/users.ts` -> `loginAsAction()`
  * `src/services/admin/escrow.service.ts` -> `resolveQuarantine()`
  * `src/actions/admin/team.ts` -> `updateSupportLimit()`
* **Mechanism:** These methods invoke the auditing database creations but omit the `ipAddress` parameter entirely, leading to `null` database values.
* **Vulnerability:** Impersonating a user (Login-As) and releasing quarantined funds are high-risk financial and privacy vectors. Failing to log the operator's IP address hinders forensic investigations of unauthorized activities.

### 5. Silent Database Merges
* **Location:** `src/bot/index.ts` -> `bot.start()` (automated `tg_bind`)
* **Mechanism:** Re-routing all tickets, orders, invoices, and payments, deleting a user profile, and granting KYC-verified status is performed without any audit trail.
* **Vulnerability:** A bug or database failure during a silent merge will leave no historical reference in audit tables, making it extremely difficult to diagnose data inconsistencies or state corruption.

### 6. Silent Support Template Management
* **Location:** `src/actions/support/template.ts`
* **Mechanism:** Creating, editing, or deleting templates is executed without any logging.
* **Vulnerability:** Malicious support staff could modify standard reply templates to distribute phishing links or delete all support templates, causing an operational outage.

### 7. Fire-and-Forget Audit Logs Loss
* **Location:** `src/lib/admin-audit.ts` -> `auditAdmin()`
* **Mechanism:** `auditAdmin` triggers a non-blocking `void db.adminAuditLog.create(...).catch(...)` write.
* **Vulnerability:** Under high server load, lock contention, or database connectivity glitches, audit logs will be silently dropped. The primary administrative operation completes successfully, but the audit entry is lost forever.

---

## 6. Recommended Remediation Design Patches

### Patch 1: Implement Real IP Resolution in Support Actions
Replace all instances of hardcoded `ipAddress: 'internal'` with `await getClientIp('unknown')` (from `@/utils/ip`).

*Example for `editTicketMessage` in `src/actions/support/ticket.ts`:*
```typescript
// Before
await tx.adminAuditLog.create({
  data: {
    adminId: user.id,
    adminEmail: user.email,
    action: 'TICKET_MESSAGE_EDITED',
    target: msg.id,
    targetType: 'TICKET_MESSAGE',
    oldValue: msg.text,
    newValue: newText.trim(),
    ipAddress: 'internal'
  }
});

// After
import { getClientIp } from '@/utils/ip';
const ipAddress = await getClientIp('unknown');
await tx.adminAuditLog.create({
  data: {
    adminId: user.id,
    adminEmail: user.email,
    action: 'TICKET_MESSAGE_EDITED',
    target: msg.id,
    targetType: 'TICKET_MESSAGE',
    oldValue: msg.text,
    newValue: newText.trim(),
    ipAddress
  }
});
```

### Patch 2: Audit Support Replies and Ticket Status Updates
Extend the `adminReplyTicket` and `changeTicketStatus` actions to record the operator's changes to the audit log.

*Example for `adminReplyTicket` in `src/actions/support/ticket.ts`:*
```typescript
export async function adminReplyTicket(formData: FormData) {
  return requireStaffPermission('support', 'edit', async (admin) => { // Capture admin context
    const parsed = adminReplySchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) throw new Error('Ошибка валидации сообщения');
    const { ticketId, message, isInternal, mediaUrl, mediaType, replyToId } = parsed.data;

    const sender = isInternal ? 'INTERNAL' : 'STAFF';
    const savedMsg = await ticketService.addMessage(ticketId, sender, message || '', mediaUrl, mediaType, replyToId);

    // Audit Log Creation
    const ipAddress = await getClientIp('unknown');
    await db.adminAuditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: isInternal ? 'TICKET_INTERNAL_NOTE_ADD' : 'TICKET_REPLY_SEND',
        target: ticketId,
        targetType: 'TICKET',
        newValue: JSON.stringify({ messageId: savedMsg.id, length: message?.length || 0 }),
        ipAddress
      }
    }).catch(err => console.error('[Audit] Failed to log support reply:', err));
    
    // ... rest of method
  });
}
```

### Patch 3: Secure Owner and Admin IP Resolving
Ensure `loginAsAction` and `resolveQuarantine` retrieve and log the client IP address.
```typescript
const ipAddress = await getClientIp('unknown');
await auditAdminAwaitable({
  adminId: admin.id,
  adminEmail: admin.email,
  action: 'LOGIN_AS_USER',
  target: userId,
  targetType: 'USER',
  newValue: { targetEmail: targetUser.email },
  ipAddress // Ensure IP is passed
});
```

---

## 7. Forensic & Operational Conclusion
While Smmplan implements strict RBAC guards via `requireStaffPermission`, the audit trails behind support interactions are heavily compromised by anonymous messaging schemas, hardcoded operator IPs, and unlogged ticket/profile merges. 

Applying the recommended patches will satisfy typical ISO 27001 / OWASP compliance mandates by establishing absolute traceability, eliminating administrative anonymity, and securing forensic evidence fields (IP addresses) across all support and admin actions.
