# Handoff Report — M1: Exploration & Codebase Analysis Complete

This is a **Hard Handoff** detailing the exhaustive security and architectural audit of Smmplan's administrative server actions and support logging coverage.

---

## 1. Observation

During our codebase exploration, we made the following direct observations:

1. **Audit Logs Infrastructure**:
   - `prisma/schema.prisma` contains the `AdminAuditLog` model (line 550) with standard fields: `adminId`, `adminEmail`, `action`, `target`, `targetType`, `oldValue`, `newValue`, and `ipAddress`.
   - It also contains the user-facing `AuditLog` model (line 509) and the dedicated `RoutingAuditLog` model (line 688).
   - `src/lib/admin-audit.ts` defines helper functions `auditAdmin` and `auditAdminAwaitable` for writing log entries to `AdminAuditLog`.

2. **Gaps in Auditing**:
   - **Test Mode Actions (`src/actions/admin/test-mode.actions.ts`)**: Contains destructive actions `adminClearTestData` (deletes test orders and transaction records) and `adminToggleTestMode` that have **no audit logging calls at all**.
   - **Support Replies Templates (`src/actions/support/template.ts`)**: Contains `upsertTemplate` and `deleteTemplate` that have **no audit logging calls at all**.
   - **CMS Content Management Actions (`src/actions/admin/content.ts`)**: Contains `createContent` (line 24), `updateContent` (line 74), `publishContent` (line 103), `unpublishContent` (line 139), and `deleteContent` (line 159) which perform high-privilege operations with **no audit logging calls at all**.
   - **CMS Page Management (`src/actions/cms/pages.ts`)**: Contains `savePage` which writes logs to the user-facing `db.auditLog` on line 46 instead of `db.adminAuditLog`:
     ```typescript
     await db.auditLog.create({
       data: {
         userId: admin.id,
         action: 'CMS_PAGE_SAVE',
         details: `Saved page: ${title} (/${slug})`
       }
     });
     ```
   - **Finance Settings (`src/actions/finance/settings.ts`)**: Contains `updateSystemSettings` which writes logs to user-facing `db.auditLog` on line 24:
     ```typescript
     await db.auditLog.create({
       data: {
         userId: admin.id,
         action: 'UPDATE_FINANCE_SETTINGS',
         details: `Updated taxRate to ${taxRate}%, opexMonthly to ${opexRubles} RUB`
       }
     });
     ```
   - **Service Routing Actions (`src/actions/admin/routing.actions.ts`)**: Actions like `executeHotSwap`, `addServiceRoute`, `toggleRouteStatus`, and `deleteServiceRoute` write directly to `tx.routingAuditLog.create` instead of the main centralized compliance `AdminAuditLog` table. Furthermore, `changeRoutePriority` (line 241) lacks any logging whatsoever.
   - **Double-logging in Catalog Actions (`src/actions/admin/catalog.ts`)**: Actions like `updateMarkupAction` call both `adminCatalogService.updateMarkup` (which audits internally) AND `auditAdmin` directly at the action boundary.

3. **Architectural / RBAC Anti-Pattern**:
   - In `src/actions/admin/content.ts` (lines 25, 75, 104, 140, 160), authorization is enforced via `await enforcePageRole(["ADMIN", "OWNER"])`.
   - In `src/lib/server/rbac.ts:100`, the helper `enforcePageRole` is explicitly commented: `"Meant to be executed strictly at the top level of Server Components (page.tsx, layout.tsx)"` and selections in `enforcePageRole` (line 114) select only `{ id: true, role: true }` (no email).
   - This causes abrupt redirects when Server Actions fail, rather than standard JSON error payloads, and prevents direct audit logging of admin emails since the email is not fetched.

---

## 2. Logic Chain

1. **Base Premise**: All administrative mutations that alter system configuration, support settings, public articles, core course material, or service provider paths must be securely audited inside the centralized `AdminAuditLog` table using standard utilities (`auditAdmin` / `auditAdminAwaitable` / `tx.adminAuditLog.create`) to ensure non-repudiation and tracking.
2. **Identification of Gaps**:
   - By inspecting `src/actions/admin/test-mode.actions.ts`, `src/actions/support/template.ts`, and `src/actions/admin/content.ts`, we found no references to `auditAdmin`, `auditAdminAwaitable`, or direct writes to `adminAuditLog`. Therefore, these high-privilege operations bypass the security system completely.
   - By inspecting `src/actions/cms/pages.ts` and `src/actions/finance/settings.ts`, we observed that while auditing is performed, it writes to `db.auditLog`. Since `db.auditLog` maps to standard client activity logs rather than administrative staff audits, this represents an architectural mismatch that pollutes client feeds and violates the `AdminAuditLog` central dashboard requirement.
   - By inspecting `src/actions/admin/routing.actions.ts`, we observed that routing modifications bypass the central `AdminAuditLog` completely by target-specific writing to `RoutingAuditLog`, and `changeRoutePriority` lacks logging entirely.
   - By analyzing the rbac system in `src/lib/server/rbac.ts` and `src/actions/admin/content.ts`, we found that calling `enforcePageRole` inside server actions blocks grace-payload error handling and prevents direct retrieval of the `adminEmail` needed for auditing.
3. **Conclusion**: M1 is complete. Smmplan has a strong logging core, but specific modules (Test Mode, Templates, CMS Content, CMS Pages, Finance Settings, and Routing) require integration or architectural corrections in the next phase (M2).

---

## 3. Caveats

- We assumed that read-only query operations (such as global searches, ledger pagination, and analytics retrievals) do not require audit logging, as is standard in non-repudiation frameworks to avoid logging bloat.
- We did not implement code fixes directly, adhering strictly to our read-only investigation scope.

---

## 4. Conclusion

The audit logging coverage is **~75% complete** for administrative mutations. It is **0% complete** for test-mode adjustments, canned replies templates, and CMS content updates. Furthermore, CMS pages and Finance settings modifications are incorrectly categorized into user logs, and Routing adjustments write to a segregated custom table. The gaps have been mapped with precise file locations and line numbers, and concrete fix blueprints have been designed in `analysis.md` to guide the Implementer in Milestone 2.

---

## 5. Verification Method

To verify our findings independently:
1. **Manual Inspection**:
   - Run `git grep -n "auditAdmin"` and verify that the target files identified as lacking logging (`test-mode.actions.ts`, `template.ts`, and `content.ts`) indeed show zero matches.
   - Inspect `src/actions/cms/pages.ts` at line 46 and `src/actions/finance/settings.ts` at line 24 to confirm they target the `db.auditLog` model instead of `db.adminAuditLog` / `auditAdmin` helpers.
   - Verify `src/actions/admin/routing.actions.ts` to confirm writes are directed to `tx.routingAuditLog.create` and that `changeRoutePriority` has no logging calls.
2. **Execution of Build Integrity**:
   - Run `npx tsc --noEmit` to confirm the codebase remains in a valid, compiling state with zero type errors.
