# BRIEFING — 2026-05-23

## Mission
Verify customer support chat, manual account merging, and balance/safety bounds (Stage 3) via E2E and Unit Tests.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: d:\SMM_plan_2\.agents\orchestrator_stage_3
- Original parent: top-level
- Original parent conversation ID: 499c45a3-688a-4cef-8ca0-44a59d6051b7

## 🔒 My Workflow
- **Pattern**: Project Pattern (Orchestrator Decompose -> Dispatch -> Iterate -> Gate)
- **Scope document**: d:\SMM_plan_2\.agents\orchestrator_stage_3\PROJECT.md
1. **Decompose**: Decompose Stage 3 requirements into small, verifiable User Stories.
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: Explorer -> Worker -> Reviewer -> test -> gate
   - **Delegate (sub-orchestrator)**: If milestones are too large, spawn a sub-orchestrator.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. Initialize Project & Mapping [pending]
  2. Implement/Verify R1: Customer Support Chat [pending]
  3. Implement/Verify R2: Telegram Profile Manual Merge [pending]
  4. Implement/Verify R3: Balance and Operator Bounds [pending]
  5. E2E Acceptance Testing (vitest/playwright) [pending]
- **Current phase**: 1
- **Current focus**: Initialize Project & Mapping

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- Act as a DISPATCH-ONLY orchestrator.
- Maintain plan.md, progress.md, context.md inside d:\SMM_plan_2\.agents\orchestrator_stage_3/
- Zero tolerance for integrity violations. Clean Forensic Auditor verdict is required.

## Current Parent
- Conversation ID: 499c45a3-688a-4cef-8ca0-44a59d6051b7
- Updated: not yet

## Key Decisions Made
- Use Project Pattern to direct Stage 3 completion.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_stage_3 | teamwork_preview_explorer | Perform code exploration for Stage 3 requirements | completed | 6f62331d-ef21-42fa-bd09-6cf489ad2377 |
| worker_stage_3 | teamwork_preview_worker | Run comprehensive build/test/lint/E2E verification | in-progress | dfc6a81b-67c0-4b29-aec4-b5dee3888f2f |

## Succession Status
- Succession required: no
- Spawn count: 2 / 16
- Pending subagents: [dfc6a81b-67c0-4b29-aec4-b5dee3888f2f]
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 499c45a3-688a-4cef-8ca0-44a59d6051b7/task-9
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- d:\SMM_plan_2\.agents\orchestrator_stage_3\original_prompt.md — Original User Request
