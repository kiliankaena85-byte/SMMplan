# Stage 2 Deep Audit Plan - Smmplan Admin Panel (/admin/*)

This plan outlines the execution of a Stage 2 Deep Audit focusing on Concurrency/Transactions, Cold Start/Empty States, Input Validation, and Tailwind 4/WCAG 2.2 AA Compliance.

## 1. Objectives & Scope
The audit targets all directories and files related to the Smmplan admin panel:
- Routing: `src/app/admin/**/*`
- Components: `src/components/admin/**/*` and shared admin components
- Server Actions: `src/actions/admin/**/*`
- Databases/Services: Prisma schemas, lock mechanics, balance adjust, settings update concurrency, and user blocking logic.

## 2. Audit Verticals & Methodology

### Task 1: Concurrency & Transaction Isolation
- **Goal**: Identify race conditions, missing transaction blocks, or unsafe reads/writes in financial top-ups, balance adjustments, user blocking, and setting updates.
- **Methodology**: Search for Prisma calls (`prisma.user.update`, `prisma.transaction.create`, etc.) and check for isolation levels or lock mechanisms. Verify if transaction rollback works.
- **Output**: Locate specific files/lines where concurrent requests could cause double-spending, data corruption, or bypass block lists. Offer drop-in fixes.

### Task 2: Cold Start & Empty States
- **Goal**: Analyze page behaviors under a zero-record database condition. Check if the pages crash, infinite-load, or display broken styles when arrays are empty.
- **Methodology**: Check how lists (orders, tickets, catalog, clients, refills, providers) handle empty values. Ensure Skeletons exist and render correctly.
- **Output**: Identify files/lines lacking skeleton loaders, loading states, or clear "No items found" empty states. Design matching Tailwind 4 + HeroUI v3 empty states.

### Task 3: Input Validation Bounds & Zod Schemas
- **Goal**: Inspect Zod schemas and validation rules for all administrative forms. Ensure forms enforce strict limits (e.g., maximum inputs, negative values, HTML escaping, string trimming).
- **Methodology**: Analyze schemas in `src/validators/admin.ts`, server action validators, and form components.
- **Output**: Pinpoint areas with weak validation bounds, missing Zod schemas, or vulnerable sanitization filters. Provide complete schemas and input guards.

### Task 4: Tailwind 4 Token & WCAG 2.2 AA Contrast Compliance
- **Goal**: Validate compliance with Tailwind 4 token conventions (`globals.css`) and audit visual elements for WCAG 2.2 AA Dark Mode contrast ratios.
- **Methodology**: Check style files, Tailwind config, and inline styles in admin pages. Verify contrast of texts, statuses, and badges under Dark Mode.
- **Output**: List non-compliant inline styles, hardcoded colors, and poor contrast colors (contrast ratio < 4.5:1). Propose token-compliant Tailwind 4 classes.

## 3. Subagent Dispatch Strategy

### Stage 2.1: Deep Exploration
- Spawn `teamwork_preview_explorer` (ReadOnly) to audit:
  - **Explorer A**: Focuses on Concurrency & Transaction Isolation and Cold Start & Empty States.
  - **Explorer B**: Focuses on Input Validation Bounds/Zod Schemas and Tailwind 4/WCAG Contrast.
- Explorer subagents will analyze the codebase, trace paths, and write their detailed finding files inside their assigned directories under `.agents/`.

### Stage 2.2: Synthesis & Compilation
- Spawn `teamwork_preview_worker` to:
  - Read findings from both Explorers.
  - Reconcile, verify line numbers and code snippets.
  - Write and merge all findings exhaustively into `d:\SMM_plan_2\brain\admin_panel_audit_report.md`.
  - Compile drop-in code fixes, exact files, and line ranges.

### Stage 2.3: Verification
- Spawn `teamwork_preview_reviewer` to review the compiled report and verify the accuracy of the findings.
- Run static checks on any proposed code fixes to guarantee zero typescript/lint issues.

## 4. Timeline & Milestones
- [ ] Phase 1: Planning and Decompose (Done)
- [ ] Phase 2: Dispatch Explorer A & B (Pending)
- [ ] Phase 3: Synthesize Explorer Findings (Pending)
- [ ] Phase 4: Write & Compile Report (Pending)
- [ ] Phase 5: Verification & Review (Pending)
