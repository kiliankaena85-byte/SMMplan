# SPEC-2026-09-21: Multi-Tenant Balance Isolation & Cross-Tenant Leak Remediation

## 1. Context & Business Problem
Under the OmniSMM 1.0 architecture (`multi-tenant-isolation-arch`), the platform operates two digital store fronts:
- **SMMplan** (`smmplan.pro`): Wholesale reseller & API panel.
- **SMMflux** (`smmflux.ru`): Retail content creator & blogger storefront.

Each brand represents a distinct legal, financial, and fiscal entity (ст. 54.1 НК РФ, 54-ФЗ).
In Prisma, the `User` model has a composite unique constraint `@@unique([email, tenantId])` with independent `balance: BigInt` fields.

### Symptom:
A logged-in user on SMMplan visits SMMflux (`/?tenant=flux`). The checkout wizard displays:
`Личный баланс: Доступно: 19.20 ₽` (inherited from the SMMplan user row).
When attempting to pay for an order on SMMflux using balance (`10.00 ₽`), the checkout server action charges the SMMflux tenant (`tenantId: 'flux'`).
On SMMflux, the user has a 0.00 ₽ balance (or no account yet).
`WalletOps.charge` rejects the payment with `WalletInsufficientFundsError` ("Недостаточно средств на балансе. Пожалуйста, пополните счет.").

## 2. Root Cause
1. **Frontend / SSR Leak (`src/app/page.tsx`, `dashboard/page.tsx`):**
   `session.userId` points to the user's primary account on `smmplan`.
   `db.user.findUnique({ where: { id: session.userId } })` queries the user record without matching `tenantId`.
   When on `smmflux`, the SMMplan balance is leaked to the SMMflux client as `userBalanceCents`.
2. **Checkout Validation Disconnect (`checkout-transaction.service.ts`):**
   `CheckoutTransactionService` looks up the user by `{ email, tenantId: 'flux' }`.
   If the user has a password and is logged into their SMMplan account, `currentSessionUserId !== user.id` triggers a false `AccountExistsError`.
3. **Missing OWNER Account on SMMflux:**
   No owner account existed on `tenantId: 'flux'`, leaving the owner unable to test or place balance orders on SMMflux.

## 3. Invariants & Architecture Requirements
1. **Zero Cross-Tenant Balance Leak (Hard Invariant):**
   On any storefront (`smmplan` or `flux`), `userBalanceCents` displayed in UI MUST reflect ONLY the balance of that user on the current `tenantId`. If the user does not exist on `tenantId`, balance is strictly 0.
2. **Strict Multi-Tenant Resolution (`resolveTenantUser`):**
   When `session.userId` is present, the system resolves the user for the current request `tenantId`:
   - If `sessionUser.tenantId === requestTenantId`, use `sessionUser.balance`.
   - If `sessionUser.tenantId !== requestTenantId`, query `db.user.findUnique({ where: { email_tenantId: { email: sessionUser.email.toLowerCase(), tenantId: requestTenantId } } })`.
   - If no record exists on `requestTenantId`, balance is 0 cents.
3. **Cross-Tenant Session Auth Acceptance:**
   If a user is logged in with `sessionUser.email === checkoutEmail`, `checkout-transaction.service.ts` recognizes the authenticated session even if `currentSessionUserId !== tenantUser.id` (since the session was issued on the sibling tenant).
4. **OWNER Provisioning & Balance:**
   The platform owner account (`art@artmspektr.ru`) is provisioned as `role: 'OWNER'` with `allowedTenants: ['smmplan', 'flux']` on both tenants, with appropriate working balance on both.

## 4. Verification Plan
- Unit tests in `src/__tests__/unit/multi-tenant-balance-isolation.test.ts` covering:
  1. Tenant balance isolation in user resolution (leak prevention).
  2. SMMflux showing 0 balance when user only has balance on SMMplan.
  3. SMMflux showing SMMflux-specific balance when user has accounts on both.
  4. Cross-tenant authenticated checkout without `AccountExistsError`.
- Type checking: `npx tsc --noEmit` -> 0 errors.
- Secrets checking: `node scripts/check-bundle-secrets.mjs` -> 0 leaked secrets.
- Database verification of owner accounts on `smmplan` and `flux`.
