## 2026-05-24T11:18:14Z

Analyze the codebase and prepare a detailed report identifying where and how the Stage 4 Hardening requirements should be implemented.
Specifically, explore and report on:
1. Support Panel (R1): Locate support panel files, tickechat pages (e.g., `src/app/admin/tickets/[id]/page.tsx`, `ClientProfileSidebar`, etc.) and global styles for the warm theme.
2. Auto-pricing & Loss Prevention (R2): Locate files for provider synchronization, margin calculation, exchange rate APIs, Cron jobs, or workers.
3. Financial Dashboard Block (R3): Locate the admin dashboard code (e.g., `src/app/admin/page.tsx`, finance overview widgets) and check how USN tax choice could be integrated.
4. Balance Verification (R4): Check for any existing balance verifier script (`src/utils/balance-verifier.ts` or similar), transactions, and ledger structure in `prisma/schema.prisma`.
5. Visual QA Playwright (R5): Check where Playwright is configured, if there is a script `scripts/visual-qa.js`, or any pixelmatch references.

Objective: Provide exact file paths, current code structure, and recommended implementation approach for each of the 5 requirements.
Scope boundary: DO NOT write or edit code. DO NOT execute run commands to perform fixes. This is a read-only analysis.
Output requirements: Write a detailed report `analysis.md` in your working directory `d:\SMM_plan_2\.agents\explorer_stage4_analysis\`.
Completion criteria: A fully completed analysis.md report detailing files, schemas, and approaches.
