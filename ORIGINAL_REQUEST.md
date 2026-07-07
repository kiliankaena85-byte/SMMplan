# Original User Request

## Initial Request — 2026-07-07T18:08:26+03:00

The project aims to perform a comprehensive security audit of the `gsd-plan-re-evaluation` skill text (located at `d:\SMM_plan_2\.agent\skills\gsd-plan-re-evaluation\SKILL.md`). The team will analyze the markdown instructions to find logical loopholes and Prompt Injection vulnerabilities, producing a detailed audit report.

Working directory: `~/teamwork_projects/gsd_plan_audit`
Integrity mode: development

## Requirements

### R1. Prompt Injection Audit
Analyze the `SKILL.md` instructions for Prompt Injection vulnerabilities. Identify ways a malicious user prompt could bypass the mandatory checks, force the agent to skip phases, or manipulate the `plan_density_linter.py` execution requirements.

### R2. Logical Loopholes Audit
Audit the 6 vectors of critical deconstruction and the 4-phase protocol. Identify any structural weaknesses, contradictions, or "escape hatches" where an agent could technically comply with the instructions without actually performing a deep, meaningful re-evaluation.

### R3. Audit Report Generation
Produce a detailed Markdown report (`audit_report.md`) that catalogs all identified vulnerabilities. Do not modify the original `SKILL.md` file; only report the findings.

## Acceptance Criteria

### Audit Quality
- [ ] The `audit_report.md` file exists in the working directory.
- [ ] The report identifies at least 3 concrete attack vectors (Prompt Injection or logical bypasses) against the current `SKILL.md` instructions.
- [ ] For each vulnerability, the report describes a specific, actionable payload or scenario that would successfully trigger the bypass.
- [ ] The report includes an assessment of the "pre-mortem" phase to ensure agents cannot easily fake the failure simulation.

## Follow-up — 2026-07-07T18:39:59+03:00

Создание системы "Круглый стол экспертов" (Round Table) для проекта SMMplan. Это отказоустойчивая мульти-агентная архитектура. Каждый агент (Maker/Checker) обладает собственным файлом скилла (SKILL.md). Система реализует цикл непрерывного обучения (Multi-pass Research), самокоррекции (Self-Correction Loop), строгую экономию токенов и **многоуровневый Фактчекинг**.

Working directory: d:\SMM_plan_2\teamwork_projects\round_table_experts
Integrity mode: development

## Requirements

### R1. Orchestrator Engine (State Machine)
Develop a robust Node.js/TypeScript orchestrator script using a State Machine pattern. The workflow: 1) User Request -> 2) Architect Draft -> 3) Parallel Review (Security + QA) -> 4) Synthesis.

### R2. Expert Skills (YAML + Markdown)
Create 4 distinct `SKILL.md` files: Architect, Security Auditor, QA Engineer, Deep Researcher. Each file must contain YAML frontmatter (`name`, `description`) and adhere strictly to SMMplan's tech stack.

### R3. GraphRAG Integration & Structured Outputs
Experts must query the GraphRAG API (`POST http://localhost:8100/api/search`). All expert responses must be returned as strict JSON objects validated via Zod schemas, eliminating fragile free-text parsing.

### R4. Continuous Learning & Strict Fact-Checking (Anti-Poisoning)
When the table identifies a knowledge gap, the Deep Researcher is triggered. 
**CRITICAL RULE:** The Researcher MUST NOT write raw data to the database. It must apply a **Fact-Checking Protocol**:
1. **Multi-Source Validation:** Any new technical fact must be verified by at least 2 independent authoritative sources before ingestion.
2. **Confidence Scoring:** The data pushed via `POST http://localhost:8100/api/knowledge` must include a `confidence_score` (0.0 to 1.0).

### R5. Self-Correction & Conflict Resolution
If a Checker rejects a Maker's proposal, the Orchestrator triggers a Self-Correction Loop, feeding the JSON error report back to the Maker for revision. 

### R6. Resilience & Audit Trail
The Orchestrator implements retry logic for malformed JSON and GraphRAG timeouts. It generates a structured `DISCUSSION_LOG.json` containing the chain of thought, decisions, and GraphRAG citations.

### R7. Token Efficiency & Context Compression
To prevent token bloat without degrading reasoning quality, the Orchestrator must implement strict context management (Summary Passing, Strict RAG Limits `top_k: 3`, Conversational Filter).

## Acceptance Criteria

### Execution & Code Quality
- [ ] A TypeScript orchestrator script is implemented and executes without syntax errors.
- [ ] 4 distinct `SKILL.md` files exist in a `skills/` subdirectory.
- [ ] Zod schemas are defined for all inter-agent communication.

### Verification (The Forcing Function)
- [ ] A programmatic test script (`test_round_table.ts`) exists that simulates a complex request containing a knowledge gap AND a security vulnerability.
- [ ] **Fact-Check Simulation:** The test script must inject a "Fake Fact" during the research phase. It must verify that the Orchestrator/Researcher *rejects* the fake fact due to lack of a second source, successfully preventing a `POST /api/knowledge` injection.
- [ ] The test script verifies GraphRAG HTTP requests (`/api/search`, `/api/knowledge`).
- [ ] The test script validates that the Orchestrator correctly strips/compresses context between expert turns.
