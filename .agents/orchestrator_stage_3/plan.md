# Stage 3 Implementation & Verification Plan

## Architecture & Scope
Verification of customer support chat (R1), manual TG merging (R2), and balance safety limits (R3) on top of the Smmplan Next.js 16/React 19 stack.

## Verifiable User Stories
- **US-1: Support Chat Redirect & History**:
  - Client navigates to `/dashboard/tickets`. If there is an active session, client is redirected to `/dashboard/tickets/[id]`.
  - Tickets chat shows history of previous 3 closed tickets, demarcated by `--- Диалог завершен ---`.
- **US-2: Support Chat Order Binding**:
  - Support chat input area has a premium 📦 order binding dropdown button next to the attach files button.
  - Clicking 📦 shows user's active/completed orders.
  - Selecting an order attaches it as a preview card to the message, which transmits to the DB and displays in both client and operator views.
- **US-3: Manual Telegram Account Merge**:
  - In `ClientProfileSidebar.tsx` (admin/support panel), entering an email in the bind secondary TG profile fields shows a preview of the merge (number of orders, balance of target account).
  - Clicking `#manual-bind-confirm` executes the actual merge: temporary TG account (`tg_...`) details/balance/orders are moved to the main web account, the temporary profile is deleted from the DB, and no race conditions occur.
- **US-4: Admin Balance Safety Bounds**:
  - Adjusting user balance has Zod validation in the range [-500k, +500k] and trims trailing/leading spaces from the reason string.
  - Support operators are restricted from setting negative trust limits or trust limits >100k RUB.
  - Personal discount validity dates (future only) and promocode values validations.
- **US-5: Automated Test & Build Acceptance**:
  - Vitest integration tests for support chat API must pass 100%.
  - Playwright E2E tests `e2e/tickets.spec.ts` and `e2e/admin-panel.spec.ts` must pass 100%.
  - Production build `npm run build` and typescript checks `npx tsc --noEmit` must pass without any warnings.

## Verification Pipeline
For each milestone:
1. Dispatch Explorer to inspect code, identify files, and map requirements to implementation gaps.
2. Dispatch Worker to implement the features, run unit tests, and resolve build issues.
3. Dispatch Reviewer to review code quality and verify standards.
4. Dispatch Forensic Auditor to check integrity.
5. Gate checks: verify all criteria are met.
