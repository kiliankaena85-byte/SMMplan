## Current Position

Milestone: v3.1 Post-MVP Enhancements
Phase: Production Hardening & Testing
Status: IN PROGRESS
Last activity: 2026-05-15 — Catalog UI stabilization (HeroUI v3 strict collections), Playwright E2E verification of Safety Floor logic.

### Done:
- [x] Sidebar grouping (Operations, Finance, Core, System).
- [x] Catalog: Denormalized RUB pricing with "Beautiful Rounding".
- [x] Catalog: RBAC support (hide provider rates for SUPPORT).
- [x] Orders: Sub-navigation Tabs (Orders/Refills).
- [x] Orders: RBAC support (hide cost for SUPPORT).
- [x] Clients: RBAC support (hide balance/LTV/adjustments for SUPPORT).
- [x] Server Actions: Unified `requireStaffPermission` security.
- [x] Marketing: Refined Promocodes & Referrals with interactive UI.
- [x] Finance: Dashboard overhaul (KPIs, Ledger DataTable, Escrow Quarantine).
- [x] Settings: Reorganized System/Integrations/Team/Audit tabs with improved UX.
- [x] Analytics: Service-level profitability charts & LTV tables.
- [x] Tickets: Complete refactoring to HeroUI (AI-assisted replies abandoned per architectural decision).
- [x] Provider Sync Hardening: Webhook routing integration (VexBoost).
- [x] **Financial Integrity:** Removed Redis-based locks (MutexManager) from WalletOps & PaymentGateway, shifting to native PostgreSQL Serializable isolation.
- [x] **Architectural Audit:** Confirmed no Next.js RSC boundary violations, trust boundary leaks, or N+1 query patterns in Admin routes.

### Next:
- [ ] Technical Debt: Resolve 29,620 ESLint strict mode errors (`any` types, `unused-vars`) via bulk auto-fix and targeted typing refactoring.
- [ ] Catalog Import UAT: Finalize robust import logic for provider services (Shadow Catalog).
- [ ] Phase 2: Production Hardening (Docker, CI/CD, Linux Migration).
