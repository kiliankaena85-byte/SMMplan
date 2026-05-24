# SMMPlan Admin Panel Comprehensive Audit Report

**Audit Date**: May 23, 2026  
**Auditor Archetype**: teamwork_preview_explorer (Read-Only Visual, Logical, UX/UI, Routing, and Backend Auditor)  
**Target Path**: `/admin/*` (`src/app/admin/`, `src/actions/admin/`, related components and services)

---

## 1. Executive Summary

This report presents a thorough, multi-layered visual, logical, UX/UI, routing, and backend security/architectural audit of the Smmplan admin panel. The primary focus of the audit is to ensure absolute alignment with Smmplan’s architectural standards, design specifications (per `AGENTS.md`), security protocols (RBAC enforcement, EscrowGuard, and audit trail integrity), and visual perfection.

Overall, the Smmplan admin panel exhibits **world-class security practices** (e.g., highly robust staff impersonation logs, EscrowGuard daily Support balance limits, and route-level RBAC layouts). However, several key areas containing **UI/UX API layout violations, visual design system deviations, and minor dead-code logical debt** have been identified and cataloged below.

---

## 2. Route & Action Mapping

### 2.1 Admin Route Structure (`src/app/admin/`)
* **`/admin/layout.tsx`**: Core layout handling RBAC checks and building the dynamic sidebar.
* **`/admin/dashboard/`**: Operational home dashboard displaying key platform stats.
* **`/admin/orders/`**: Active SMM panel orders search, filtering, and export.
* **`/admin/refills/`**: Drip-feed / refill task management.
* **`/admin/tickets/`**: Client support ticket queues.
* **`/admin/clients/`**: Client database manager, balance adjustment, and impersonation entry.
* **`/admin/finance/`**: Billing history, manual balance escrow queue, and ledger auditing.
* **`/admin/marketing/`**: Referral payout management and promotion codes generator.
* **`/admin/catalog/`**: SMM service catalogs, categories mapping, and provider import manager.
* **`/admin/catalog/quarantine/`**: Catalog quarantine check dashboard.
* **`/admin/catalog/enrichment/`**: Content/descriptions enrichment table.
* **`/admin/providers/`**: Configuration for SMM APIs, balances sync, and schemas inferring.
* **`/admin/pages/`**: In-house CMS page manager (Next.js SSR compliant).
* **`/admin/system/features/`**: Feature-flag switches (`ON` | `TEST` | `OFF`).
* **`/admin/system/queues/`**: BullMQ background workers health dashboard.

### 2.2 Server Actions (`src/actions/admin/`)
Every action is protected using the granular RBAC wrappers: `requireStaffPermission(section, actionMode, action)` or `requireOwnerPermission(action)`.
* **`providers/crud.ts`**: `createProvider`, `updateProvider`, `deleteProvider` (unexported bug), `checkProviderConnection`, `getGlobalProviderLiquidity`, `syncProviderCatalogAction`, `inferProviderSchema`.
* **`providers/import-cherry-pick.ts`**: Shadow catalog imports.
* **`catalog/batch.ts`**: Bulk actions (`batchToggleServicesAction`, `batchSetMarkupAction`, `updateServiceMarkupAction`, `toggleServiceActiveAction`).
* **`catalog/soft-delete.ts`**: Soft service deletion (`softDeleteServiceAction`).
* **`catalog/enrichment.ts`**: Descriptions updates.
* **`routing.actions.ts`**: Multi-provider failover routing (`executeHotSwap`, `addServiceRoute`, `toggleRouteStatus`, `changeRoutePriority`, `deleteServiceRoute`).
* **`users.ts`**: Financial operations and profile actions (`updateBalanceAction`, `banUserAction`, `unbanUserAction`, `loginAsAction`, `approveQuarantineAction`, `rejectQuarantineAction`).
* **`clients.ts`**: `updateClientDiscountAction`, `updateClientNoteAction`.
* **`marketing.ts`**: Promo codes & referrals (`createPromoCode`, `togglePromoCode`, `deletePromoCode`, `processReferralPayout`).
* **`settings.ts`**: `updateUserRole`, `updateGlobalSettings`.
* **`feature-flags.ts`**: Feature toggle management.
* **`test-mode.actions.ts`**: Test mode switcher.

---

## 3. Deep Architectural & Code Audit Findings

### 3.1 Routing & Navigation Layout (RBAC & RBAC Layouts)
* **Strengths**: 
  - **Bulletproof Section-Level RBAC**: Section subdirectories (`catalog`, `finance`, `marketing`, `pages`, `providers`, `settings`, `dashboard`) each have a `layout.tsx` that utilizes `await enforcePageRole([...])` to block access early in the Next.js rendering cycle. This is an excellent security measure.
  - **Dynamic Navigation Filtering**: The root `AdminLayout` dynamically checks the user's granular database staff role permissions (`user.staffRole.permissions`) to filter and construct the sidebar elements, ensuring Support/Managers only see links they have read access to.
* **Minor Logical Issue**:
  - The root routes under `/admin/` (e.g. `/admin/orders`, `/admin/tickets`, `/admin/clients`, `/admin/refills`, `/admin/system/`) rely purely on the root layout check (`ADMIN_ROLES.includes(user.role)`). If a Support staff doesn't have permissions to see "tickets" but knows the URL, the root layout allows it because it lacks a sub-layout for `/admin/tickets/`.

### 3.2 Server Actions Security, EscrowGuard, and Impersonation
* **Strengths**:
  - **EscrowGuard Integration**: Balance modification (`updateBalanceAction`) correctly routes through `escrowService.evaluateBalanceAdjustment` which validates Support limits and places any transactions exceeding the threshold (e.g. 10,000 ₽) into a quarantine state for Owner review.
  - **Water-Tight Impersonation Traceability**: The `loginAsAction` correctly injects the `impersonatedBy: admin.id` field both inside the active database `session` table and the signed JWT payload. This makes impersonation fully auditable and prevents admins from performing actions anonymously.
  - **Database Auditing**: High-impact actions call `auditAdmin` or `auditAdminAwaitable` (which blocks completion until the audit log is successfully written to PostgreSQL, crucial for financial trace safety).
* **Logical & Code Quality Bugs**:
  - **Unexported Action in `providers/crud.ts`**: The `deleteProvider` function on line 146 is declared as `async function deleteProvider(rawId: string)` without an `export` keyword. As a result, it is not usable as a Server Action.
  - **Duplicate/Deprecated Code in `catalog.ts`**: In `src/actions/admin/catalog.ts`, `updateMarkupAction`, `toggleServiceAction`, and `getMarkupAnalyticsAction` are unexported and dead-code duplicate debt because catalog batching actions (`src/actions/admin/catalog/batch.ts`) are used in the UI instead.

### 3.3 UX/UI, Component Library (HeroUI v3), and WCAG Accessibility
* **Bugs / Violations Identified**:
  - **HeroUI v3 API Layout Violation (Table `aria-label`)**: 
    In `src/app/admin/catalog/enrichment/client-table.tsx` (lines 241-244), the `aria-label` attribute is incorrectly placed on the root `<Table>` element rather than `<Table.Content>`.
    Similarly, in the shared table component `src/components/ui/data-table.tsx` (line 106), `<Table aria-label="Data Table">` places `aria-label` on the root instead of `<Table.Content>`.
    *Per HeroUI v3 API specifications, `aria-label`, `selectionMode`, and `sortDescriptor` must be placed directly on the `<Table.Content>` compound wrapper, which renders the actual `<table>` element.*
  - **Design System Border Violation**: 
    The shared table components (`src/components/ui/table.tsx` and `src/components/ui/data-table.tsx`) contain inline borders between table rows:
    ```tsx
    // src/components/ui/table.tsx:60
    className={cn("border-b transition-colors...", className)}
    // src/components/ui/data-table.tsx:127
    className="hover:bg-muted/30 border-b border-border last:border-0 transition-colors"
    ```
    *AGENTS.md explicitly states: "НИКОГДА не добавляй `1px solid` borders между строками таблиц. Используй тональный контраст."*
  - **Missing Table Accessibility Labels**: 
    Tables inside `src/app/admin/providers/client-table.tsx` (line 21) and `src/app/admin/settings/team-management.tsx` (lines 94 & 170) do not contain `aria-label` properties, which violates WCAG 2.2 AA access standards.
  - **Chip Component Color TypeMismatch**:
    In `src/app/admin/catalog/enrichment/client-table.tsx` (line 168):
    `<Chip size="sm" variant="secondary" color="default">`
    *HeroUI v3 Chip does not support `variant="secondary"` (which is a Button variant, not a Chip variant). Supported Chip variants are: `solid | bordered | light | flat`. This mismatch could cause rendering anomalies or typecheck failures.*

### 3.4 Pricing Model & SMM Provider Logic
* **Strengths**:
  - Catalog calculations in `src/app/admin/catalog/page.tsx` and inline editors strictly follow `AGENTS.md` specifications. They calculate USD purchase rates (`rate`), multiply by the markup and global USD exchange rate (`usdToRub`), then output two clean values: `pricePer1000Cents` for internal billing, and `pricePerUnitRub` (expressed as rubles per 1 unit) in client views. No component manually divides by 1000 in frontend layouts.

---

## 4. Priority Remediation Roadmap

Based on the findings, here is a categorized and prioritized list of recommendations for the implementation team:

| Priority | Type | Target Path | Description | Recommended Remediation |
|---|---|---|---|---|
| **P0** | Bug | `src/actions/admin/providers/crud.ts:146` | `deleteProvider` is declared without an `export` keyword, making provider deletion impossible from Server Action handlers. | Add `export` keyword to `deleteProvider` declaration. |
| **P1** | Security / UX | `src/app/admin/catalog/enrichment/client-table.tsx:241` <br> `src/components/ui/data-table.tsx:106` | HeroUI v3 API Violation: `aria-label` is located on root `<Table>` instead of `<Table.Content>`. | Move the `aria-label` prop from the `<Table>` component to the `<Table.Content>` component. |
| **P1** | Design System | `src/components/ui/table.tsx:60` <br> `src/components/ui/data-table.tsx:127` | Border style violation: Table rows feature `border-b border-border` lines, violating Smmplan's tonal contrast standard. | Remove `border-b border-border` classes and style row separation using background opacity/tonal contrast instead (e.g. `even:bg-muted/10` or hovering opacity). |
| **P2** | Accessibility | `src/app/admin/providers/client-table.tsx:21` <br> `src/app/admin/settings/team-management.tsx:94,170` | Missing `aria-label` properties on tables, violating WCAG accessibility compliance. | Add descriptive `aria-label` to these table elements. |
| **P2** | Type Safety | `src/app/admin/catalog/enrichment/client-table.tsx:168` | Invalid `<Chip>` component configuration: using unsupported `variant="secondary"`. | Change `variant="secondary"` to a supported HeroUI v3 variant (such as `flat` or `bordered`). |
| **P3** | Code Debt | `src/actions/admin/catalog.ts:14,42,114` | Deprecated, unexported duplicate functions: `updateMarkupAction`, `toggleServiceAction`, `getMarkupAnalyticsAction`. | Safe-delete these unused functions since their batch-focused replacements in `catalog/batch.ts` are fully active. |
