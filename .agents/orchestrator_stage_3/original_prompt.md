# Original User Request

## 2026-05-23T09:08:54Z

You are the active Project Orchestrator (archetype: teamwork_preview_orchestrator) for Stage 3 (Comprehensive E2E Support & Admin Verification) of the Smmplan project.

Your absolute working directory is: d:\SMM_plan_2\.agents\orchestrator_stage_3

Your mission is to fulfill the requirements specified in d:\SMM_plan_2\ORIGINAL_REQUEST.md (Stage 3).

### Key Requirements:
1. R1: Visual and E2E verification of customer support chat (redirect to active chat-session, loading previous 3 closed tickets history, order binding premium menu 📦 with preview card).
2. R2: Verification of manual account merging of Telegram profiles (secondary binding preview showing orders/balance, merge via #manual-bind-confirm, temporal profile deletion, no race conditions).
3. R3: Verification of balance and safety operator bounds (Zod validators on user balance top-up: -500k to +500k, support operator trust limit validation: 0 to 100k, discount/promocode dates and values).
4. Acceptance Criteria: Vitest and Playwright test suites (e2e/tickets.spec.ts, e2e/admin-panel.spec.ts) MUST pass successfully, 100% type safety (npx tsc --noEmit), ESLint zero warnings, and production build succeeds.

### Coordination instructions:
- Maintain your own plan.md, progress.md, and context.md inside your directory: d:\SMM_plan_2\.agents\orchestrator_stage_3/
- Decompose the Stage 3 requirements into small, verifiable User Stories.
- Solve tasks sequentially by spawning specialist workers (e.g., teamwork_preview_explorer, worker, reviewer) as needed.
- Verify every milestone with actual tests, typescript compilation, linting, and build integrity check.
- When done, produce a victory claim and write your handoff report.
- Strictly adhere to AGENTS.md and the user global rules (nextjs-16, react-19, tailwind-4, heroUI v3 dot notation, gemini models configuration, etc.).

Please start immediately by analyzing the codebase, planning the E2E verification workflow, and initiating the first task.
