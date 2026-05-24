# Implementation Plan - Support & Admin Logging System Audit & Hardening

## Overview
This plan addresses all identified logging coverage gaps, security vulnerabilities, and crash vectors found during the deep exploration phase. All implementations must strictly conform to the developer contract (`AGENTS.md`) and Next.js 16 / React 19 standards.

---

## 1. Central Logging Utility Hardening (`src/lib/admin-audit.ts`)
### Issues:
- Synchronous serialization using `JSON.stringify` throws a `TypeError` when encountering `BigInt` values, crashing the parent Server Action before database insertion.
- Lacks a centralized, recursive secret scrubber, running the risk of credential/Vault leak.
- Lacks circular JSON reference protection.

### Solution:
- Update `src/lib/admin-audit.ts` to implement a robust, safe JSON stringifier that:
  - Supports `BigInt` serialization by converting `BigInt` to a string or numeric value (e.g. `val.toString()`).
  - Implements deep recursive key sanitization to scrub sensitive keys: `password`, `pass`, `hash`, `token`, `secret`, `key`, `credentials`, `yookassa`, `vault`.
  - Gracefully handles circular references.
  - Safe-guards against synchronous errors by wrapping serialization in a try-catch, falling back to a safe placeholder on failure.

---

## 2. Support Operations Auditing & IP Resolution (`src/actions/support/` & `src/actions/admin/users.ts`)
### Issues:
- Support ticket responses (`adminReplyTicket`) and ticket status transitions (`changeTicketStatus`) are completely unlogged in `AdminAuditLog`.
- IP addresses are hardcoded as `'internal'` in message editing (`editTicketMessage`), manual Telegram binds (`adminManualTelegramBind`), and compensations (`logManualCompensation`).
- User impersonation (`loginAsAction`) omits the `ipAddress` field, logging `null` in the DB.

### Solution:
- In `src/actions/support/ticket.ts`:
  - Log `TICKET_REPLY_SEND` or `TICKET_INTERNAL_NOTE_ADD` to `AdminAuditLog` inside `adminReplyTicket` synchronously or via safe audit call.
  - Log `TICKET_STATUS_CHANGE` inside `changeTicketStatus`.
  - Replace `'internal'` with `await getClientIp('unknown')` in `editTicketMessage` and `adminManualTelegramBind`.
- In `src/actions/support/compensation.ts`:
  - Replace `'internal'` with `await getClientIp('unknown')` in `logManualCompensation`.
- In `src/actions/admin/users.ts`:
  - Retrieve client IP via `await getClientIp('unknown')` and pass it to `loginAsAction`'s `auditAdminAwaitable` call.

---

## 3. High-Risk Services & BigInt Crash Resolutions (`src/services/admin/`)
### Issues:
- `resolveQuarantine` in `escrow.service.ts` passes raw `BigInt` fields to `oldValue` and `newValue`, crashing the escrow approval process, and omits the operator's IP address.
- `processReferralPayout` in `marketing.service.ts` passes raw `BigInt` fields to `JSON.stringify` inside the database transaction, crashing referral payouts.

### Solution:
- In `src/services/admin/escrow.service.ts` (`resolveQuarantine`):
  - Retrieve client IP via `await getClientIp('unknown')` and save it to the `AdminAuditLog` record.
  - Cast raw `BigInt` fields to strings (or let the new safe serializer handle it, but explicitly casting is safer).
- In `src/services/admin/marketing.service.ts` (`processPayout`):
  - Cast `updatedUser.balance` and other `BigInt` fields to strings or numbers before JSON stringification.

---

## 4. Test Mode & Canned Reply Gaps (`src/actions/admin/` & `src/actions/support/`)
### Issues:
- Test-mode adjustments (`adminToggleTestMode` and `adminClearTestData` in `test-mode.actions.ts`) are completely unlogged.
- Canned reply templates creation, updating, and deletion (`upsertTemplate` and `deleteTemplate` in `template.ts`) are completely unlogged.

### Solution:
- Log `SYSTEM_TEST_MODE_TOGGLE` and `SYSTEM_TEST_DATA_CLEAR` using `auditAdminAwaitable` with the operator's resolved IP.
- Log `SUPPORT_TEMPLATE_CREATE`, `SUPPORT_TEMPLATE_UPDATE`, and `SUPPORT_TEMPLATE_DELETE` in `template.ts`.

---

## 5. Architectural Mismatch & Catalog Double-Logging
### Issues:
- CMS page changes (`savePage` in `src/actions/cms/pages.ts`) and Finance settings (`updateSystemSettings` in `src/actions/finance/settings.ts`) write to user activity logs (`db.auditLog`) instead of administrative logs (`AdminAuditLog`).
- Catalog actions in `src/actions/admin/catalog.ts` trigger duplicate entries in `AdminAuditLog` by logging at both the action boundary and inside `adminCatalogService`.

### Solution:
- Redirect CMS and Finance settings logs to `auditAdmin` targeting `AdminAuditLog`.
- Remove duplicate `auditAdmin` logging calls at the Server Action boundary in `src/actions/admin/catalog.ts` (relying on `adminCatalogService`'s internal logs).

---

## 6. Silent Smart Bind Merges (`src/bot/index.ts`)
### Issue:
- The automated Telegram profile merge transaction completes silently, deleting the temporary user and transferring tickets/orders without any audit trail.

### Solution:
- In `src/bot/index.ts`, inside the atomic transaction, add a `tx.adminAuditLog.create` call documenting `'TELEGRAM_SMART_BIND_MERGE'` with metadata containing the source temporary user ID, target web user ID, and list of transferred resources.

---

## Verification Criteria
1. Strict TypeScript Check: `npx tsc --noEmit` must complete with code 0.
2. Production Build: `npm run build` must succeed without warnings or errors.
3. Test Suites: Run Playwright E2E and Vitest unit/integration tests to ensure no regressions.
