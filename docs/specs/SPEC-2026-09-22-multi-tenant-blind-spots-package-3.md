# SPEC-2026-09-22: Multi-Tenant Blind Spots & Cross-Storefront Resolution (Package 3)

## 1. Metadata & Standards
- **Version:** 1.0.0 (SDD-TDD 2026 Standard)
- **Author:** OmniSMM 1.0 Core Security Architecture Team
- **Date:** 2026-09-22
- **Risk Tier:** Tier 1 (Critical Financial, Authentication & Tenant Isolation)
- **Compliance:** ст. 54.1 НК РФ, OWASP Top 10:2025 A01 (Broken Access Control), A07 (Identification and Authentication Failures), BGS-2026.

---

## 2. Problem Statement & Root Cause Analysis
OmniSMM 1.0 operates multiple storefront brands (`smmplan` and `flux`) on separate domains (`smmplan.pro` and `smmflux.ru`).
A user may authenticate with a session originating from one tenant (`session.userId`), but while navigating another storefront (e.g. SMMflux), their actions and data must map to the corresponding account on the target tenant (`tenantUser.id`).
Eight distinct blind spots were identified where code assumed `userId === session.userId` or ignored `tenantId`, resulting in 403 Forbidden errors, cross-storefront redirects to the wrong domain, or crediting the wrong tenant's balance:

1. **`[PAY-01]` Payment Status Polling (`src/app/api/payments/[id]/status/route.ts`):**
   `payment.userId !== session.userId` blocks polling when payment belongs to `tenantUser.id` created on sibling tenant.
2. **`[PAY-02]` Retry Checkout (`src/services/orders/retry-checkout.service.ts`):**
   `where: { id: orderId, userId: sessionUserId }` fails when order was created by `tenantUser.id`. `WalletOps.charge` and `payment.create` passed `sessionUserId` instead of `order.userId`. `successUrl` hardcoded default app URL.
3. **`[PAY-03]` Deposit Return URL (`src/actions/user/top-up.action.ts`):**
   `successUrl` called `getBaseUrlAsync()` without `tenantId`, redirecting SMMflux top-ups to `smmplan.pro`.
4. **`[BAL-01]` Promo/Voucher Activation (`src/actions/user/promo.ts`):**
   `activatePromoCodeAction` read `user.tenantId` from `session.userId`, causing SMMflux promo codes to be rejected, and crediting the smmplan user balance instead of the active tenant.
5. **`[SUP-01]` Ticket Message Dispatch (`src/actions/support/ticket.ts`):**
   `addTicketMessage` checked `tenantId: session.tenantId`, failing when user chats on SMMflux while session has `tenantId: smmplan`.
6. **`[SUP-02]` Ticket Attachment Upload (`src/app/api/support/upload/route.ts`):**
   Filtered by `user.tenantId`, blocking uploads when user or multi-tenant staff operates across storefronts.
7. **`[SUP-03]` Media Attachment Viewing (`src/app/api/media/[...path]/route.ts`):**
   Checked `ticket.tenantId === user.tenantId`, blocking staff with `allowedTenants` or clients with cross-tenant identities.
8. **`[SUP-04]` Ticket Order Dropdown (`src/app/dashboard/tickets/[id]/page.tsx`):**
   Queried `where: { userId: session.userId, tenantId: currentTenantId }`, returning empty orders for sibling tenant accounts.

---

## 3. Architecture & Resolution Contract

### 3.1 `[PAY-01]` Payment Status Polling
- Fetch `payment` including `user: { select: { id: true, email: true, tenantId: true } }`.
- Access granted if:
  - Payment is guest (`!payment.userId`), OR
  - User direct match (`payment.userId === session.userId`), OR
  - Email match (`payment.user?.email.toLowerCase() === session.email.toLowerCase()`), OR
  - Resolved tenant user match (`resolveTenantUser(session.userId, payment.tenantId).id === payment.userId`), OR
  - Staff with tenant permission (`isTenantAllowedForUser(session, payment.tenantId)`).

### 3.2 `[PAY-02]` Retry Checkout Service
- Fetch order by `id: orderId`, verify ownership via `order.userId === sessionUserId` OR email match OR `allowedUserIds`.
- Verify `order.tenantId === currentTenantId` (unless owner).
- In `WalletOps.charge`: charge `order.userId` with `tenantId: order.tenantId`.
- In `payment.create`: set `userId: order.userId` and `tenantId: order.tenantId`.
- `successUrl`: `absoluteCanonical(order.tenantId, '/success?orderId=' + order.id)`.

### 3.3 `[PAY-03]` Top-Up Action Return URL
- Replace `getBaseUrlAsync()` with `absoluteCanonical(targetTenantId, '/dashboard/add-funds?success=1')`.

### 3.4 `[BAL-01]` Promo/Voucher Activation
- Resolve `activeTenant = normalizeTenantId(resolveTenantFromRequest(await headers())) || 'smmplan'`.
- Resolve `tenantUser = await resolveTenantUser(session.userId, activeTenant, true)`.
- Query `promoCode` with `tenantId: activeTenant`.
- Idempotency key: `promo-${cleanCode}-${tenantUser.id}` with `tenantId: activeTenant`.
- `WalletOps.credit(tx, tenantUser.id, promo.amount, reason, { idempotencyKey, tenantId: activeTenant })`.

### 3.5 `[SUP-01]` Support Ticket Message Dispatch
- Resolve `currentTenant = normalizeTenantId(resolveTenantFromHeaders(await headers()) || session.tenantId)`.
- Verify staff with `isTenantAllowedForUser(session, ticket.tenantId)`.
- Verify client ownership (`ticket.userId in [session.userId, tenantUser.id]` or email match) AND `ticket.tenantId === currentTenant`.
- Order verification matches `tenantId: ticket.tenantId || currentTenant`.

### 3.6 `[SUP-02]` Support Attachment Upload
- Query ticket with user relation.
- Verify staff with `isTenantAllowedForUser(user, ticket.tenantId)`.
- Verify client with `[userId, tenantUser.id]` or email match.

### 3.7 `[SUP-03]` Media Attachment Route
- Verify staff with `isTenantAllowedForUser(user, ticket.tenantId)`.
- Verify client with `[userId, tenantUser.id]` or email match, plus request domain matching `ticket.tenantId`.

### 3.8 `[SUP-04]` Ticket Order Dropdown & Historical Tickets
- Resolve `allowedUserIds = [session.userId, tenantUser?.id]`.
- Fetch `initialOrders` and `historicalTickets` with `userId: { in: allowedUserIds }` and `tenantId: currentTenantId`.

---

## 4. Verification & Testing Plan
- Test Suite: `src/__tests__/unit/multi-tenant-blind-spots-package-3.test.ts`.
- Coverage:
  1. `[PAY-01]` Status polling allows email-matched and tenantUser-matched payments, blocks foreign users.
  2. `[PAY-02]` Retry checkout charges tenant user, sets canonical successUrl for flux and smmplan.
  3. `[PAY-03]` Top-up sets canonical successUrl per tenant.
  4. `[BAL-01]` Promo code credits active tenant user, enforces active tenant promo code isolation.
  5. `[SUP-01]` to `[SUP-04]` Multi-tenant ticket chat, uploads, media viewing, and orders dropdown.
- Strict Typecheck: `npx tsc --noEmit` (0 errors).
- Linter: `npx eslint` (0 errors).
