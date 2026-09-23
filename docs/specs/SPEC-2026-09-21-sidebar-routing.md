# SPEC: Sidebar Routing & Layout Isolation (Tier 2/3)

## 1. Problem Statement
The sidebar navigation `AdminSidebar` jumps active states when clicking on sub-tabs within the header because `OPERATIONS_TABS` and `FINANCE_TABS` group completely different root domains (e.g., `/admin/dashboard`, `/admin/orders`, `/admin/tickets` in one array). 
Additionally, navigating to nested dashboard routes drops the sidebar active highlight completely due to strict `===` matching in `isNavTabActive`. 

## 2. Requirements & Invariants
- **No Cross-Domain Tabs**: A domain's header tabs MUST ONLY link to sub-pages within that same domain (e.g., `/admin/orders` can link to `/admin/refills` because refills are part of the orders domain).
- **Dashboard Stability**: `/admin/dashboard` must maintain its active state for any child routes (`/admin/dashboard/*`).
- **Finance Isolation**: `/admin/transactions` (Ledger) should be isolated from `/admin/finance` (Treasury/P&L) tabs if they are separate sidebar items, or they can be merged under one sidebar root. 
- **Zero-Regression**: `npx tsc --noEmit` must pass with 0 errors. The app must render without runtime errors.

## 3. Implementation Plan
### Phase 1: Break apart OPERATIONS_TABS
1. **DASHBOARD_TABS**: Create `DASHBOARD_TABS` in `navigation-data.ts` containing only Dashboard sub-views (if any). Currently, just `{ label: 'Обзор', href: '/admin/dashboard' }`.
2. **ORDERS_TABS**: Create `ORDERS_TABS` grouping `/admin/orders`, `/admin/refills`, and `/admin/smart`.
3. Update `dashboard/page.tsx` to use `DASHBOARD_TABS`.
4. Update `orders/page.tsx`, `refills/page.tsx`, `smart/page.tsx`, and their loading files to use `ORDERS_TABS`.
5. Remove `OPERATIONS_TABS`.

### Phase 2: Break apart FINANCE_TABS
1. `FINANCE_TABS` groups `/admin/finance`, `/admin/transactions`, `/admin/finance/treasury`, `/admin/finance/balance-requests`, `/admin/marketing`, `/admin/fraud-monitor`.
2. In `ADMIN_NAVIGATION`, "Касса & P&L" points to `/admin/finance`, "Транзакции" points to `/admin/transactions`, "Маркетинг" points to `/admin/marketing`. These are 3 separate root sidebar items.
3. Split `FINANCE_TABS` into:
   - `FINANCE_TABS`: `/admin/finance`, `/admin/finance/treasury`, `/admin/finance/balance-requests`, `/admin/fraud-monitor`.
   - `TRANSACTIONS_TABS`: `/admin/transactions`.
   - `MARKETING_TABS`: `/admin/marketing`.
4. Update respective pages/loading files.

### Phase 3: Validation
- Run `npx tsc --noEmit`.
