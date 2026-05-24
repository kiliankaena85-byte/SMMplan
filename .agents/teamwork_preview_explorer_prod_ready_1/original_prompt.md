## 2026-05-24T08:14:48Z

Objective: Perform a comprehensive, read-only exploration of the codebase to analyze and prepare an implementation plan for Smmplan production readiness requirements.

Working Directory: d:\SMM_plan_2\.agents\teamwork_preview_explorer_prod_ready_1\

Please analyze the following files and directories:
1. Marketing UI Components:
   - `src/app/admin/marketing/referral-chart.tsx` (Analyze how the placeholder is structured and how we can integrate Recharts AreaChart or LineChart for payout dynamics).
   - `src/app/admin/marketing/client-referrers-table.tsx` (Analyze columns and how to rename PENDING column).
   - `src/app/admin/marketing/create-promo-form.tsx` (Analyze the form inputs, dynamic showing/hiding of fields, and how to add a 🎲 random promo generator).
   - `src/app/admin/marketing/promocode-columns.tsx` (Analyze status checkbox, change to HeroUI Switch, and modify coupon delete from browser confirm() to Popover/Modal).
2. Refills Backend & Workers:
   - Find where refills are created and managed (e.g. Server Actions, services).
   - Find if there is a background worker for refills (e.g., BullMQ worker). Analyze how to implement Retry Backoff (3 attempts, 15m delay) and handle the ERROR status.
3. Catalog Search:
   - `src/services/admin/catalog.service.ts` (Analyze how search/filtering is handled, and how to add providerId, network, and externalId auto-recognition).
4. Accessibility & Modals:
   - Scan for any remaining browser `confirm()` calls in the admin panel.
   - Scan for touch target issues in the admin panel buttons.

Produce a detailed analysis report at `d:\SMM_plan_2\.agents\teamwork_preview_explorer_prod_ready_1\analysis.md` containing:
- Exact file paths, line ranges, and code snippets.
- Specific implementation strategies adhering to AGENTS.md rules (Next.js 16, React 19, Tailwind CSS 4.0.0, HeroUI v3 dot notation, VaultService, etc.).
- A clear step-by-step recommendation for the worker.
