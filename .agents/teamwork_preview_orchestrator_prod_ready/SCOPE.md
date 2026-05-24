# Scope: Smmplan Production Readiness

## Architecture
This scope focuses on finalizing the Smmplan admin panel, marketing features, refills security, catalog search intelligence, and Premium UI/UX.
- **Framework & Libraries**: Next.js 16.0.10, React 19.0.0, Tailwind CSS 4.0.0, HeroUI v3.
- **Key Modules**:
  - **Marketing**: `src/app/admin/marketing/` (referrers table, Recharts line chart, promo form, promocode columns).
  - **Refills**: `src/app/admin/refills/`, Server Actions for refills, and BullMQ worker in `src/workers/refills.worker.ts` or similar background task system.
  - **Catalog**: `src/services/admin/catalog.service.ts`, `/admin/catalog` listing search and filter backend/frontend.
  - **Premium UI/UX**: Modal confirmations, touch targets, and accessibility checks.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Marketing Modernization | AreaChart/LineChart via Recharts, column rename, random promo generator (🎲), dynamic inputs, HeroUI `Switch`, custom delete dialog. | None | DONE |
| 2 | Refills Safety & BullMQ | Validate Server Actions (no canceled/refunded refills), implement Retry Backoff (3 attempts, 15m delay) for automated refills in background workers. | None | DONE |
| 3 | Catalog Intelligent Search | Filter by `providerId`/network in `catalog.service.ts`, auto-recognize `externalId` in search string to find specific services. | None | DONE |
| 4 | Premium UI/UX & WCAG | Replace `confirm()` with HeroUI Modals, verify touch targets >= 44px on mobile devices, pass tests/TypeScript/production build. | M1, M2, M3 | DONE |
| 5 | Unified Tickets Workspace | Two-panel support dialog under `/admin/tickets` driven by query params (`ticketId`) with mobile view responsive panel routing. | M4 | DONE |

## Interface Contracts
- **Recharts Data Format**: The LineChart/AreaChart data must be formatted dynamically from database referral metrics (dates and amounts).
- **Zod Promo Validation**: Schema in form should dynamically require fields based on promo type (Discount/Voucher).
- **Refill Server Action Rules**: Return descriptive validation error objects if the order is not in a valid state for refills.
- **BullMQ Workers**: Background job with backoff option: `{ attempts: 3, backoff: { type: 'fixed', delay: 15 * 60 * 1000 } }`.
- **Search Inputs**: Search term pattern matching for `externalId` (e.g., if numeric or matches specific pattern).
- **Unified Ticket URL State**: URL parameter `ticketId` triggers dynamic RSC detailed ticket data aggregation, with client-side reactive rendering inside React transitions.

