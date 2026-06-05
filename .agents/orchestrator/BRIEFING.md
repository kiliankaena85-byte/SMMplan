# BRIEFING — 2026-06-05T07:59:23+03:00

## Mission
Coordinate the QA audit, codebase cleanup, and production DB migration for Smmplan Lite.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: d:\SMM_plan_2\.agents\orchestrator
- Original parent: main agent (id: 9504c51e-a246-4931-8fd5-8ad7c1eb3896)
- Original parent conversation ID: 9fce6f89-5b62-4979-9960-b10a20148a06

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: d:\SMM_plan_2\PROJECT.md
1. **Decompose**: Split scope into: Plan formulation, Code cleanup, Local DB Sanitization, Production DB migration, Test/SMTP fixing, Final verification.
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: Explorer → Worker → Reviewer → gate
   - **Delegate (sub-orchestrator)**: Spawn teamwork_preview_worker and teamwork_preview_explorer agents as needed.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns.
- **Work items**:
  1. Formulate Plan [done]
  2. Code Cleanup [done]
  3. Local DB Sanitization [done]
  4. Production DB Migration [in-progress]
  5. Test / SMTP Fixing [done]
  6. Final Verification [pending]
- **Current phase**: 3
- **Current focus**: Production DB Migration

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- Write only to your folder; read any folder.
- Follow Zero-Defect Execution Protocol, Double-Pass Planning, and Pre-mortem analysis.

## Current Parent
- Conversation ID: 9fce6f89-5b62-4979-9960-b10a20148a06
- Updated: not yet

## Key Decisions Made
- Checked local environment and confirmed tests are isolated via .env.test.
- Triggered database sanitization locally, verified all counts to be 0 for transactional tables.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_cleanup_init | teamwork_preview_explorer | Codebase cleanup audit | completed | e48b1715-1348-4bda-aca3-eb16d77786cc |
| worker_cleanup_tests | teamwork_preview_worker | Codebase cleanup and test fixes | completed | dd549d6b-fc17-4620-a9c1-1fd8d7cc7c1e |
| worker_db_sanitize | teamwork_preview_worker | Local DB sanitization and verification | completed | 59c1d29e-71af-491e-a6fe-9cef0aa0dc73 |
| worker_db_migration | teamwork_preview_worker | Production DB migration and container restarts | in-progress | a7d9dd6f-34cc-4c68-a31f-5c3733703b2d |

## Succession Status
- Succession required: no
- Spawn count: 4 / 16
- Pending subagents: a7d9dd6f-34cc-4c68-a31f-5c3733703b2d
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 9fce6f89-5b62-4979-9960-b10a20148a06/task-15
- Safety timer: 9fce6f89-5b62-4979-9960-b10a20148a06/task-258
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- d:\SMM_plan_2\PROJECT.md — Global index for Smmplan Lite Hardening Project
- d:\SMM_plan_2\ORIGINAL_REQUEST.md — Verbatim user requirements
