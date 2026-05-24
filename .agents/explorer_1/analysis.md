# Deep Exploration & Audit Report: Smmplan Support & Admin Logging System

This report compiles the findings of a comprehensive read-only exploration and audit of the Smmplan administrative server actions, support operations, and audit log infrastructure. The objective is to map all active administrative operations, analyze their audit logging status, and document all missing audit logging gaps or architectural discrepancies to inform subsequent implementation.

---

## 1. Summary of Findings

Smmplan features a robust administrative audit logging infrastructure with dedicated `AdminAuditLog` DB models and helpers (`auditAdmin` for fire-and-forget; `auditAdminAwaitable` for synchronous, refund-bearing financial actions). However, our comprehensive deep audit identified several critical gaps:
1. **Complete Lack of Logging**: Destructive test-mode operations (`test-mode.actions.ts`), support shortcuts templates (`template.ts`), and highly privileged CMS content creation and editing operations (`content.ts`) entirely lack audit logging.
2. **Architectural & RBAC Mismatch**: Administrative tasks in **CMS Pages** and **Finance Settings** write to the user-facing `AuditLog` instead of the compliance-focused `AdminAuditLog`. Furthermore, `content.ts` utilizes the Server-Component-only helper `enforcePageRole` inside its actions, resulting in abrupt browser redirects instead of API-standard error payloads, and preventing it from logging admin emails because `enforcePageRole` does not fetch email addresses.
3. **Dedicated Subsystem Separation**: Service provider routing swaps (`routing.actions.ts`) log to a custom `RoutingAuditLog` table rather than the standard `AdminAuditLog` table.
4. **Double-logging**: Administrative catalog updates trigger redundant, double-logged entries at both the action and service boundaries.

---

## 2. Catalog of Administrative Actions

Administrative actions are secured via `requireStaffPermission(section, action, callback)` or `enforcePageRole(roles)`. Below is the mapping of all active administrative mutations across the Smmplan codebase.

### 2.1. User & Client Management (`src/actions/admin/users.ts` & `src/actions/admin/clients.ts`)

| Action / Operation | Target File | Lines | Security Guard | Audit Log Status | Log Action / Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **updateBalanceAction** | `admin/users.ts` | `18-57` | `clients:edit` | **FULLY AUDITED** | `auditAdminAwaitable` (`'UPDATE_BALANCE_REQUEST'`) |
| **banUserAction** | `admin/users.ts` | `59-85` | `clients:edit` | **FULLY AUDITED** | `auditAdminAwaitable` (`'BAN_USER'`) |
| **unbanUserAction** | `admin/users.ts` | `87-113` | `clients:edit` | **FULLY AUDITED** | `auditAdminAwaitable` (`'UNBAN_USER'`) |
| **loginAsAction** | `admin/users.ts` | `119-174` | `clients:edit` (OWNER/ADMIN only) | **FULLY AUDITED** | `auditAdminAwaitable` (`'LOGIN_AS_USER'`) |
| **approveQuarantineAction** | `admin/users.ts` | `176-193` | `finance:edit` (OWNER/ADMIN only) | **FULLY AUDITED** | Transactional `tx.adminAuditLog.create` via `escrowService.resolveQuarantine` (`'QUARANTINE_APPROVE'`) |
| **rejectQuarantineAction** | `admin/users.ts` | `195-212` | `finance:edit` (OWNER/ADMIN only) | **FULLY AUDITED** | Transactional `tx.adminAuditLog.create` via `escrowService.resolveQuarantine` (`'QUARANTINE_REJECT'`) |
| **updateClientDiscountAction** | `admin/clients.ts` | `44-83` | `CLIENTS:edit` | **FULLY AUDITED** | `auditAdmin` (`'CLIENT_DISCOUNT_SET'`) |
| **updateClientNoteAction** | `admin/clients.ts` | `86-113` | `CLIENTS:edit` | **FULLY AUDITED** | `auditAdmin` (`'CLIENT_NOTE_UPDATE'`) |

### 2.2. Order Failover & Resolution (`src/actions/admin/orders.ts`)

These actions perform critical balance deductions or refund actions. To enforce strict non-repudiation, **all mutations in this module utilize `auditAdminAwaitable`**.

| Action / Operation | Lines | Security Guard | Audit Log Status | Log Action / Method |
| :--- | :--- | :--- | :--- | :--- |
| **cancelOrderAction** | `41-64` | `orders:edit` | **FULLY AUDITED** | `auditAdminAwaitable` (`'ORDER_CANCEL'`) |
| **restartOrderAction** | `66-88` | `orders:edit` | **FULLY AUDITED** | `auditAdminAwaitable` (`'ORDER_RESTART'`) |
| **setOrderStatusAction** | `93-160` | `orders:edit` | **FULLY AUDITED** | `auditAdminAwaitable` (`'ORDER_STATUS_OVERRIDE'`) |
| **forceCompleteOrderAction** | `167-211` | `orders:edit` | **FULLY AUDITED** | `auditAdminAwaitable` (`'ORDER_FORCE_COMPLETE'`) |
| **bulkCancelOrdersAction** | `215-283` | `orders:edit` | **FULLY AUDITED** | `auditAdminAwaitable` (`'ORDER_BULK_CANCEL'`) |
| **manualRerouteOrder** | `356-469` | `orders:edit` | **FULLY AUDITED** | `auditAdminAwaitable` (`'MANUAL_REROUTE'`) |

### 2.3. Catalog, Markup & Provider Operations

| Action / Operation | Target File | Lines | Security Guard | Audit Log Status | Log Action / Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **updateMarkupAction** | `admin/catalog.ts` | `14-40` | `finance:edit` | **DOUBLE LOGGING** | `auditAdmin` (`'SERVICE_MARKUP_UPDATE'`) AND `adminCatalogService.updateMarkup` (`'SERVICE_MARKUP_CHANGE'`) |
| **toggleServiceAction** | `admin/catalog.ts` | `42-67` | `catalog:edit` | **DOUBLE LOGGING** | `auditAdmin` (`'SERVICE_ENABLE'`/`'SERVICE_DISABLE'`) AND `adminCatalogService.toggleService` |
| **bulkUpdateMarkupAction** | `admin/catalog.ts` | `73-109` | `finance:edit` | **DOUBLE LOGGING** | `auditAdmin` (`'BULK_MARKUP_UPDATE'`) AND queued worker job triggers `adminCatalogService.bulkUpdateMarkup` |
| **batchToggleServicesAction**| `admin/catalog/batch.ts` | `28-57` | `catalog:edit` | **FULLY AUDITED** | `auditAdmin` (`'BATCH_SERVICE_ENABLE'`/`'BATCH_SERVICE_DISABLE'`) |
| **batchSetMarkupAction** | `admin/catalog/batch.ts` | `60-112` | `finance:edit` | **FULLY AUDITED** | `auditAdmin` (`'BATCH_MARKUP_SET'`) |
| **updateServiceMarkupAction**| `admin/catalog/batch.ts` | `115-161`| `finance:edit` | **FULLY AUDITED** | `auditAdmin` (`'SERVICE_MARKUP_UPDATE'`) |
| **toggleServiceActiveAction**| `admin/catalog/batch.ts` | `164-188`| `catalog:edit` | **FULLY AUDITED** | `auditAdmin` (`'SERVICE_ENABLE'`/`'SERVICE_DISABLE'`) |
| **createCategory** | `admin/catalog/categories.ts`| `17-42`| `CATALOG:edit` | **FULLY AUDITED** | `auditAdmin` (`'CATEGORY_CREATE'`) |
| **updateCategory** | `admin/catalog/categories.ts`| `44-71`| `CATALOG:edit` | **FULLY AUDITED** | `auditAdmin` (`'CATEGORY_UPDATE'`) |
| **deleteCategory** | `admin/catalog/categories.ts`| `73-96`| `CATALOG:edit` | **FULLY AUDITED** | `auditAdmin` (`'CATEGORY_DELETE'`) |
| **updateServiceDescription** | `admin/catalog/enrichment.ts`| `7-34`| `CATALOG:edit` | **FULLY AUDITED** | `db.adminAuditLog.create` (`'UPDATE_SERVICE_DESCRIPTION'`) |
| **softDeleteServiceAction** | `admin/catalog/soft-delete.ts`| `17-34`| `CATALOG:edit` | **FULLY AUDITED** | `adminCatalogService.softDeleteService` (`'SERVICE_SOFT_DELETE'`) |
| **createProvider** | `admin/providers/crud.ts` | `54-95` | `providers:edit`| **FULLY AUDITED** | `auditAdmin` (`'PROVIDER_CREATE'`) |
| **updateProvider** | `admin/providers/crud.ts` | `97-144`| `providers:edit`| **FULLY AUDITED** | `auditAdmin` (`'PROVIDER_UPDATE'`) |
| **deleteProvider** | `admin/providers/crud.ts` | `146-167`| `providers:edit`| **FULLY AUDITED** | `auditAdmin` (`'PROVIDER_DELETE'`) |
| **syncProviderCatalogAction**| `admin/providers/crud.ts` | `275-291`| `providers:edit`| **FULLY AUDITED** | `adminCatalogService.syncProviderCatalog` (`'PROVIDER_CATALOG_SYNC'`) |
| **adminSyncProviderCatalog** | `admin/providers/sync-action.ts`| `20-132`| `PROVIDERS:edit`| **FULLY AUDITED** | `auditAdmin` (`'CATALOG_SURGICAL_SYNC'`) |
| **approveQuarantinedService**| `admin/providers/sync-action.ts`| `135-183`| `PROVIDERS:edit`| **FULLY AUDITED** | `auditAdmin` (`'QUARANTINE_APPROVE'`) |
| **rejectQuarantinedService** | `admin/providers/sync-action.ts`| `185-203`| `PROVIDERS:edit`| **FULLY AUDITED** | `auditAdmin` (`'QUARANTINE_REJECT'`) |
| **approveAllQuarantined** | `admin/providers/sync-action.ts`| `206-249`| `PROVIDERS:edit`| **FULLY AUDITED** | `auditAdmin` (`'QUARANTINE_APPROVE_ALL'`) |
| **archiveZombieService** | `admin/providers/sync-action.ts`| `251-283`| `PROVIDERS:edit`| **FULLY AUDITED** | `auditAdmin` (`'SERVICE_ARCHIVE_ZOMBIE'`) |
| **liftApiBlock** | `admin/providers/sync-action.ts`| `285-313`| `PROVIDERS:edit`| **FULLY AUDITED** | `auditAdmin` (`'SERVICE_LIFT_API_BLOCK'`) |
| **importSelectedServices** | `admin/providers/import-cherry-pick.ts`| `257-282`| `PROVIDERS:edit`| **FULLY AUDITED** | `adminCatalogService.importServices` (`'SERVICES_IMPORT'`) |

### 2.4. System Settings, Marketing & Referrals

| Action / Operation | Target File | Lines | Security Guard | Audit Log Status | Log Action / Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **updateUserRole** | `admin/settings.ts` | `15-59` | `settings:edit` | **FULLY AUDITED** | `auditAdminAwaitable` (`'USER_ROLE_CHANGE'`) |
| **updateGlobalSettings** | `admin/settings.ts` | `63-184` | `settings:edit` | **FULLY AUDITED** | `auditAdmin` (`'SYSTEM_SETTINGS_UPDATE'`) (Credential Scrubbed) |
| **updateSupportLimit** | `admin/team.ts` | `14-51` | `settings:edit` | **FULLY AUDITED** | `auditAdmin` (`'UPDATE_TRUST_BUDGET'`) |
| **createPromoCode** | `admin/marketing.ts` | `27-62` | `marketing:edit`| **FULLY AUDITED** | `auditAdmin` (`'PROMOCODE_CREATE'`) |
| **togglePromoCode** | `admin/marketing.ts` | `64-82` | `marketing:edit`| **FULLY AUDITED** | `auditAdmin` (`'PROMOCODE_ENABLE'`/`'PROMOCODE_DISABLE'`) |
| **deletePromoCode** | `admin/marketing.ts` | `84-102` | `marketing:edit`| **FULLY AUDITED** | `auditAdmin` (`'PROMOCODE_DELETE'`) |
| **processReferralPayout** | `admin/marketing.ts` | `109-134`| `marketing:edit`| **FULLY AUDITED** | `auditAdmin` (`'REFERRAL_PAYOUT'`) |
| **setFeatureFlagState** | `admin/feature-flags.ts`| `29-53` | `SETTINGS:edit` | **FULLY AUDITED** | `auditAdmin` (`'FEATURE_FLAG_CHANGE'`) |

### 2.5. Support Operations (`src/actions/support/`)

| Action / Operation | Target File | Lines | Security Guard | Audit Log Status | Log Action / Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **logManualCompensation** | `support/compensation.ts`| `17-113` | `support:edit` | **FULLY AUDITED** | Transactional `tx.adminAuditLog.create` (`'BALANCE_TOPUP_COMPENSATION'`/`'MANUAL_REFILL_COMPENSATION'`) |
| **editTicketMessage** | `support/ticket.ts` | `210-261` | `support:edit` | **FULLY AUDITED** | Transactional `tx.adminAuditLog.create` (`'TICKET_MESSAGE_EDITED'`) |
| **adminManualTelegramBind** | `support/ticket.ts` | `315-396` | `support:edit` (OWNER/ADMIN only) | **FULLY AUDITED** | Transactional `tx.adminAuditLog.create` (`'MANUAL_TELEGRAM_BIND'`) |

### 2.6. CMS Content & Custom Routing Operations

| Action / Operation | Target File | Lines | Security Guard | Audit Log Status | Log Action / Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **createContent** | `admin/content.ts` | `24-55` | `enforcePageRole` (ADMIN/OWNER) | **NO LOGGING** | None |
| **updateContent** | `admin/content.ts` | `74-101` | `enforcePageRole` (ADMIN/OWNER) | **NO LOGGING** | None |
| **publishContent** | `admin/content.ts` | `103-137`| `enforcePageRole` (ADMIN/OWNER) | **NO LOGGING** | None |
| **unpublishContent** | `admin/content.ts` | `139-157`| `enforcePageRole` (ADMIN/OWNER) | **NO LOGGING** | None |
| **deleteContent** | `admin/content.ts` | `159-173`| `enforcePageRole` (ADMIN/OWNER) | **NO LOGGING** | None |
| **executeHotSwap** | `admin/routing.actions.ts` | `75-132` | `services:edit` | **CUSTOM TABLE ONLY** | `tx.routingAuditLog.create` (`'SWAP'`) |
| **addServiceRoute** | `admin/routing.actions.ts` | `140-198` | `services:edit` | **CUSTOM TABLE ONLY** | `tx.routingAuditLog.create` (`'ADD_ROUTE'`) |
| **toggleRouteStatus** | `admin/routing.actions.ts` | `200-239` | `services:edit` | **CUSTOM TABLE ONLY** | `tx.routingAuditLog.create` (`'TOGGLE_STATUS'`) |
| **changeRoutePriority**| `admin/routing.actions.ts`| `241-275` | `services:edit` | **NO LOGGING** | None (Priority order change is unrecorded) |
| **deleteServiceRoute** | `admin/routing.actions.ts` | `277-316` | `services:edit` | **CUSTOM TABLE ONLY** | `tx.routingAuditLog.create` (`'DELETE_ROUTE'`) |

---

## 3. Audit Log Infrastructure Details

Smmplan separates audit trails using a high-integrity design:

1. **AdminAuditLog Table (PostgreSQL)**:
   - Primary log target for administrative staff operations.
   - Standardized format containing: `adminId`, `adminEmail`, `action` string, `target` resource identifier, `targetType` enum (`USER`, `ORDER`, `SERVICE`, `PROVIDER`, `SETTINGS`, `TICKET`, `LEDGER`), `oldValue` & `newValue` JSON structures, `ipAddress`, and `createdAt` timestamp.
2. **AuditLog Table**:
   - Secondary client-facing audit log for basic profile activities (e.g. changing password).

3. **Core Helpers (`src/lib/admin-audit.ts`)**:
   - `auditAdmin`: Fire-and-forget wrapper. Catches errors silently to ensure logging failures never block system execution.
   - `auditAdminAwaitable`: Synchronous awaitable version. **Used for critical financial or destructive operations** (balance requests, bans, order cancels, reroutes, role modifications) to guarantee logging completes before the transaction wraps.

4. **Transactional Direct DB Insertion (`tx.adminAuditLog.create`)**:
   - For ultra-high reliability support actions (e.g. compensations, ticket editing, Telegram binds), Smmplan writes logs *inside* the SQL transaction block. This makes the database mutations and their audit records fully atomic.

---

## 4. Gap Analysis: Missing Audit Logging & Issues

### Gap 4.1: Destructive Test Mode Actions (`src/actions/admin/test-mode.actions.ts`)

The test-mode actions completely bypass the auditing system.
- **Target File:** `src/actions/admin/test-mode.actions.ts`
- **Actions Lacking Audit:**
  - `adminToggleTestMode` (Toggles global mock test system state).
  - `adminClearTestData` (Performs the "Nucleus Clear" — a highly destructive `deleteMany` query erasing test orders and transactional balances from the database).
- **Vulnerability:** A rogue administrator or compromised credentials could trigger `adminClearTestData` to wipe system-wide mock records, and no record would exist in the `AdminAuditLog` table.

### Gap 4.2: Canned Support Replies Management (`src/actions/support/template.ts`)

- **Target File:** `src/actions/support/template.ts`
- **Actions Lacking Audit:**
  - `upsertTemplate` (Inserts or updates support message shortcuts).
  - `deleteTemplate` (Deletes replies).
- **Vulnerability:** Support staff could modify templates to inject malicious links or phishing prompts into customer-facing support resources. This modification would happen completely undetected.

### Gap 4.3: Logging System Mismatch in CMS & Finance Settings

CMS page changes and finance configurations are high-privilege activities, but they bypass the administrative audit trail, polluting user-facing logs instead.

1. **CMS Page Actions (`src/actions/cms/pages.ts`)**:
   - **Action:** `savePage` updates or creates core marketing/academy pages.
   - **Discrepancy:** Writes to user-facing logs via `db.auditLog.create` on line 46:
     ```typescript
     await db.auditLog.create({
       data: {
         userId: admin.id,
         action: 'CMS_PAGE_SAVE',
         details: `Saved page: ${title} (/${slug})`
       }
     });
     ```
2. **Finance Settings Actions (`src/actions/finance/settings.ts`)**:
   - **Action:** `updateSystemSettings` modifies global taxation rules and opex values.
   - **Discrepancy:** Writes to user-facing logs via `db.auditLog.create` on line 24:
     ```typescript
     await db.auditLog.create({
       data: {
         userId: admin.id,
         action: 'UPDATE_FINANCE_SETTINGS',
         details: `Updated taxRate to ${taxRate}%, opexMonthly to ${opexRubles} RUB`
       }
     });
     ```
- **Consequence:** These high-privilege events pollute user activity tables and cannot be viewed in the central Admin Audit Log dashboard.

### Issue 4.4: Catalog Double-Logging

The administrative catalog server actions (`updateMarkupAction`, `toggleServiceAction`, `bulkUpdateMarkupAction`) in `src/actions/admin/catalog.ts` trigger double-logging.
- **Example Flow:** `updateMarkupAction` calls `adminCatalogService.updateMarkup` which internally performs `auditAdmin({ action: 'SERVICE_MARKUP_CHANGE', ... })`. Then, after that method resolves, the Server Action immediately calls `auditAdmin({ action: 'SERVICE_MARKUP_UPDATE', ... })` itself.
- **Consequence:** This duplicates entries in the `AdminAuditLog` table for the same physical change, inflating database size and muddying audit forensics.

### Gap 4.5: CMS Content Management Actions (`src/actions/admin/content.ts`)

Highly privileged content mutations (articles, academy lessons, news posts) completely lack auditing and contain an architectural/RBAC anti-pattern.
- **Target File:** `src/actions/admin/content.ts`
- **Actions Lacking Audit:** `createContent`, `updateContent`, `publishContent`, `unpublishContent`, `deleteContent`.
- **RBAC & Architectural Mismatch:**
  - Authorization is verified using `await enforcePageRole(["ADMIN", "OWNER"])`.
  - However, `enforcePageRole` is designed strictly for Server Components (as documented in `rbac.ts`), throwing redirect exceptions instead of returning API-friendly error objects.
  - Furthermore, `enforcePageRole` only selects `{ id: true, role: true }` and does **not** fetch the administrator's email.
  - Since the `AdminAuditLog` schema requires `adminEmail` as a non-nullable field, we cannot audit these mutations without either fetching the email separately or (preferably) migrating these actions to use `requireStaffPermission('content', 'edit', async (admin) => { ... })`.
- **Vulnerability:** A rogue administrator could rewrite academy courses, delete news posts, or inject XSS payloads into public marketing pages without any audit record or email-trace in the database.

### Gap 4.6: Routing Actions Separate Logging Table (`src/actions/admin/routing.actions.ts`)

- **Target File:** `src/actions/admin/routing.actions.ts`
- **Actions Logging to Custom Table:** `executeHotSwap`, `addServiceRoute`, `toggleRouteStatus`, `deleteServiceRoute` write directly to `tx.routingAuditLog.create`.
- **Action Lacking Audit Entirely:** `changeRoutePriority` has no logging whatsoever.
- **Vulnerability:** While routing actions are logged to `RoutingAuditLog`, they do not write to the main `AdminAuditLog` table. This bypasses the centralized admin security panel. Additionally, changes to route failover priorities (`changeRoutePriority`) are completely unrecorded, leaving manual priority manipulation untraced.

---

## 5. Actionable Proposals: Implementer Blueprint

Below is the concrete, machine-applicable blueprint to resolve the audit coverage gaps in the next phase.

### 5.1. Resolving Gap 4.1: Test Mode Action Audits

Add `auditAdminAwaitable` inside `test-mode.actions.ts`.

**Proposed Modification:**
```typescript
import { auditAdminAwaitable } from '@/lib/admin-audit';
import { getClientIp } from '@/utils/ip';

export async function adminToggleTestMode(enable: boolean) {
  return requireStaffPermission('SETTINGS', 'edit', async (admin) => {
    const previousState = await SettingsManager.getTestMode(); // Assume getter exists
    await SettingsManager.setTestMode(enable);
    
    const ipAddress = await getClientIp('unknown');
    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SYSTEM_TEST_MODE_TOGGLE',
      target: 'global',
      targetType: 'SETTINGS',
      oldValue: { testMode: previousState },
      newValue: { testMode: enable },
      ipAddress
    });

    return { success: true, message: `Test mode is now ${enable ? 'ON' : 'OFF'}` };
  });
}

export async function adminClearTestData() {
  return requireStaffPermission('SETTINGS', 'edit', async (admin) => {
    try {
      const resultOrders = await db.order.deleteMany({
        where: { isTest: true }
      });
      
      const ipAddress = await getClientIp('unknown');
      await auditAdminAwaitable({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'SYSTEM_TEST_DATA_CLEAR',
        target: 'all_test_records',
        targetType: 'SETTINGS',
        newValue: { clearedCount: resultOrders.count },
        ipAddress
      });

      return { 
        success: true, 
        message: `Cleared ${resultOrders.count} test orders and associated data.` 
      };
    } catch (e: any) {
      console.error("Failed to clear test data:", e);
      return { success: false, error: "Failed to perform Nucleus Clear." };
    }
  });
}
```

### 5.2. Resolving Gap 4.2: Support Templates Auditing

Integrate `auditAdmin` into template actions.

**Proposed Modification:**
```typescript
import { auditAdmin } from '@/lib/admin-audit';

export async function upsertTemplate(formData: FormData) {
  return requireStaffPermission('support', 'edit', async (admin) => {
    // ... validation steps ...
    const data = parsed.data;

    if (data.id) {
      const oldTemplate = await db.supportTemplate.findUnique({ where: { id: data.id } });
      await db.supportTemplate.update({
        where: { id: data.id },
        data: { label: data.label, text: data.text, sort: data.sort }
      });

      auditAdmin({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'SUPPORT_TEMPLATE_UPDATE',
        target: data.id,
        targetType: 'SETTINGS',
        oldValue: { label: oldTemplate?.label, text: oldTemplate?.text },
        newValue: { label: data.label, text: data.text }
      });
    } else {
      const created = await db.supportTemplate.create({
        data: { label: data.label, text: data.text, sort: data.sort }
      });

      auditAdmin({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'SUPPORT_TEMPLATE_CREATE',
        target: created.id,
        targetType: 'SETTINGS',
        newValue: { label: data.label, text: data.text }
      });
    }
    // ...
  });
}

export async function deleteTemplate(formData: FormData) {
  return requireStaffPermission('support', 'edit', async (admin) => {
    const id = formData.get('id') as string;
    if (!id) throw new Error('No id provided');

    const oldTemplate = await db.supportTemplate.findUnique({ where: { id } });
    await db.supportTemplate.delete({ where: { id } });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SUPPORT_TEMPLATE_DELETE',
      target: id,
      targetType: 'SETTINGS',
      oldValue: { label: oldTemplate?.label }
    });
    // ...
  });
}
```

### 5.3. Resolving Gap 4.3: Centralizing CMS & Finance Logging

Redirect audit logs from `db.auditLog` to `auditAdmin` / `auditAdminAwaitable`.

1. **In `src/actions/cms/pages.ts`:**
   ```typescript
   // BEFORE:
   await db.auditLog.create({ ... });

   // AFTER:
   auditAdmin({
     adminId: admin.id,
     adminEmail: admin.email,
     action: 'CMS_PAGE_SAVE',
     target: slug,
     targetType: 'SETTINGS',
     newValue: { title, slug }
   });
   ```

2. **In `src/actions/finance/settings.ts`:**
   ```typescript
   // BEFORE:
   await db.auditLog.create({ ... });

   // AFTER:
   auditAdmin({
     adminId: admin.id,
     adminEmail: admin.email,
     action: 'FINANCE_SETTINGS_UPDATE',
     target: 'global',
     targetType: 'SETTINGS',
     newValue: { taxRate, opexMonthly }
   });
   ```

### 5.4. Resolving Issue 4.4: Eliminating Catalog Double-Logging

To solve the double-logging issue, remove the direct `auditAdmin` logs from `src/actions/admin/catalog.ts` and rely strictly on the logging performed inside `adminCatalogService` (or vice-versa).
Specifically, since the background BullMQ jobs and admin service methods are called by other workflows as well (e.g. CLI syncer), it is highly recommended to **keep the auditing centralized inside the domain service `adminCatalogService`** and completely delete the duplicate `auditAdmin` wrappers from `src/actions/admin/catalog.ts`.

### 5.5. Resolving Gap 4.5: Integrating CMS Content Actions Auditing

We propose refactoring `src/actions/admin/content.ts` to replace `enforcePageRole` with the standard Next.js 16/React 19 Server Action RBAC wrapper `requireStaffPermission`, which provides standard error payloads and fetches the administrator's email. Then, integrate standard `auditAdmin` logging.

**Proposed Refactoring & Logging Blueprint:**
```typescript
import { requireStaffPermission } from "@/lib/server/rbac";
import { auditAdmin } from "@/lib/admin-audit";

export async function updateContent(id: string, updateData: Partial<z.infer<typeof contentSchema>>) {
  return requireStaffPermission('content', 'edit', async (admin) => {
    const parsed = contentUpdateSchema.safeParse(updateData);
    if (!parsed.success) {
      return { success: false, error: "Невалидные данные", errors: parsed.error.flatten().fieldErrors };
    }

    try {
      const oldItem = await prisma.contentItem.findUnique({ where: { id } });
      const item = await prisma.contentItem.update({
        where: { id },
        data: parsed.data,
      });

      auditAdmin({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'CMS_CONTENT_UPDATE',
        target: id,
        targetType: 'SETTINGS',
        oldValue: { title: oldItem?.title, slug: oldItem?.slug, isPublished: oldItem?.isPublished },
        newValue: { title: item.title, slug: item.slug, isPublished: item.isPublished }
      });

      revalidateTag(`article-${item.slug}`, {});
      revalidateTag("cms-list", {});
      return { success: true, item };
    } catch (error) {
      return { success: false, error: "Ошибка при обновлении статьи" };
    }
  });
}
```

### 5.6. Resolving Gap 4.6: Standardizing Routing Actions Auditing

To unify route swaps in the central audit panel, we propose adding `auditAdmin` calls to routing actions under `src/actions/admin/routing.actions.ts` in addition to their custom transactional `RoutingAuditLog` table insertions. We also add missing audit logging to `changeRoutePriority`.

**Proposed Blueprint:**
```typescript
import { auditAdmin } from "@/lib/admin-audit";

// Inside executeHotSwap transaction block:
// ...
await tx.routingAuditLog.create({
  data: { serviceId, action: 'SWAP', fromProviderId: oldProviderId, toProviderId: targetRoute.providerId, reason, adminId: admin.id }
});

// Awaitable or non-blocking audit:
auditAdmin({
  adminId: admin.id,
  adminEmail: admin.email,
  action: 'ROUTE_HOT_SWAP',
  target: serviceId,
  targetType: 'SERVICE',
  oldValue: { providerId: oldProviderId },
  newValue: { providerId: targetRoute.providerId, routeId: newRouteId, reason }
});

// Inside changeRoutePriority:
export async function changeRoutePriority(routeId: string, direction: 'up' | 'down') {
  return requireStaffPermission('services', 'edit', async (admin) => {
    let serviceId = '';
    await db.$transaction(async (tx) => {
      // ... swap priority logic ...
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ROUTE_PRIORITY_CHANGE',
      target: routeId,
      targetType: 'SERVICE',
      newValue: { direction }
    });

    revalidatePath(`/admin/services/${serviceId}/routing`);
    return { success: true };
  });
}
```
