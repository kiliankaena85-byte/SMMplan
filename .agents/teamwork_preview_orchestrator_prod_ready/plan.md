# Plan: Smmplan Production Readiness & R5 Expansion

## Objectives
Bring Smmplan admin panel, marketing features, refills security, catalog search intelligence, and support ticketing workspace to 100% production readiness.

## Milestones & Sequence

1. **Planning Phase (Active)**
   - Decompose and map requirements R1-R5.
   - Establish strict interface contracts and safety guarantees.
   - Draft `implementation_plan.md` for human/user approval.

2. **Milestone 1: Marketing Tab Modernization (R1)**
   - Recharts Area/Line chart for referral payout dynamics in `referral-chart.tsx`.
   - Rename `PENDING` to Russian context in `client-referrers-table.tsx`.
   - Implement random 8-character promo code generator and dynamic field rendering in `create-promo-form.tsx`.
   - Replace checkboxes with HeroUI `Switch` and delete button with stateful confirmation dialog in `promocode-columns.tsx`.

3. **Milestone 2: Refills Security & Background Queues (R2)**
   - Add backend state validation in Refill Server Action: reject canceled (`CANCELED`) or fully refunded orders.
   - Set up BullMQ `refillQueue` with 3 attempts and 15-minute fixed backoff retry delay.
   - Implement BullMQ refill worker/processor at `src/workers/processors/refill.processor.ts`.
   - Connect refill processor to main background worker thread `src/workers/index.ts`.

4. **Milestone 3: Catalog Intelligent Search (R3)**
   - Update `listServices` in `catalog.service.ts` to support 5-vector auto-recognition.
   - Check numeric ID, text contains, external ID, provider ID, and network platform slug dynamically.

5. **Milestone 4: Premium UI/UX & WCAG Accessibility (R4)**
   - Re-evaluate all 17 mapped native browser `confirm()` calls.
   - Replace each call with stateful inline/component HeroUI `Modal` components.
   - Add transparent clickable pseudo-elements (`after:`) to smaller buttons (`size="sm"`) to enforce `>= 44px` touch targets without breaking visual balance.

6. **Milestone 5: Unified Tickets Workspace (R5)**
   - Design and build the two-panel `/admin/tickets` interface:
     - Left panel: status filter buttons (All, Open, Pending, Closed), search bar, card list with avatars, meta tags, last message preview, and pagination.
     - Right panel: active ticket details, assigned operator display, attached order card, full chat messages, reply form, and an elegant premium empty state.
   - Drive active ticket selection with the `ticketId` query parameter.
   - Implement mobile responsiveness (single-panel layout, back buttons).
   - Implement Collapsible Client Profile Sidebar: collapsed by default, toggled via a button in the chat header, and rendering inside a slide-out HeroUI Drawer sheet on mobile viewports.

7. **Milestone 6: Mobile Support Operator UX & Support Bridge (R6)**
   - Apply dynamic viewport height units (`dvh`) to prevent viewport clipping under Chrome/Safari.
   - Implement programmatic autoscroll-to-bottom on virtual keyboard show/focus events using the VisualViewport API.
   - Design a horizontal snap swiping templates selection bar on touch devices.
   - Mount attached order details and operations inside a compact, touch-accessible mobile Drawer sheet (BottomSheet).
   - Wire the Intelligent Support Bridge action flow: copying the external ID and opening the provider tickets page in a new browser tab.

8. **Verification & Audit**
   - Run compilation checks (`npx tsc --noEmit`) and build production bundler (`npm run build`).
   - Spawn challenger subagents to stress test endpoints.
   - Spawn auditor subagent to execute strict forensic integrity audits.
