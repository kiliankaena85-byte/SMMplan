## 2026-05-24T11:21:00Z
Implement Milestone 1 (R1: Ergonomic UX & Warm Theme for Support Panel) of our Smmplan hardening project.

Objective:
Harden and polish the support operator workspace to reduce eye strain, maximize touch targets, and improve operator flow:
1. Warm Theme & Typography:
   - Use warm palette tokens (Zinc/Ivory background, graphite slate text, amber accents) from `globals.css` in the support panel components. Do NOT use hardcoded colors.
   - Set optimal line-height of 1.6 for all message threads and main chat text.
   - Ensure all touch targets/clickable buttons are at least 44px on mobile and desktop.
2. Hidden/Collapsible ClientProfileSidebar:
   - Make the `ClientProfileSidebar` component on the right side of the chat collapsible on desktop and hidden by default.
   - Add an elegant header toggle button (e.g. info or profile icon) to show/hide it smoothly.
   - On mobile screens, display this sidebar component as a slide-out Drawer or BottomSheet (using HeroUI components).
3. Support limits and metrics:
   - Render `supportLimitCents` and `supportSpentTodayCents` clearly inside the sidebar, helping operators keep track of refunds and compensation budgets.
4. Inline Order Actions & Details:
   - In the chat thread, allow attached order cards to display.
   - Integrate an inline order drawer or details sheet directly inside `/admin/tickets/[id]` so the operator can view details, cancel, restart, or refund the order without navigating away.
5. Support Bridge:
   - In the order details card, add a "В тикеты провайдера" button.
   - When clicked, copy the provider external order ID to the clipboard with a success toast, and open the provider support URL in a new tab.

Stack and Conventions:
- Respect the Smmplan Lite AI Developer Contract (AGENTS.md) at all costs!
- React 19 rules (no forwardRef, useActionState, use transition-all classes for interactive elements).
- Tailwind CSS v4 custom semantic classes.
- Target files: `src/app/admin/tickets/components/unified-workspace.tsx`, `src/components/support/ClientProfileSidebar.tsx`, etc.

Verification:
- Run typescript compilation (`npx tsc --noEmit`) and ensure 0 errors.
- Run `npm run build` to verify production compilation.
- Record all build and test command outcomes in your handoff report.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your implementation details to `changes.md` and your 5-component handoff report to `handoff.md` inside your working directory: `d:\SMM_plan_2\.agents\worker_stage4_m1_ux\`.
