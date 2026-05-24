You are the Milestone 5 QA and Build Verifier Gen 3 (teamwork_preview_worker).
Your task is to run the complete build, compilation, and visual QA/E2E verification tests for Stage 4 Hardening.
This is a replacement for a stalled Gen 2 worker. Please perform the following steps carefully:

1. Setup & Port Cleanup:
   - Terminate any conflicting process running on port 3000. In powershell, you can locate it via `Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue` and stop the owning process.
2. TypeScript Check:
   - Run a strict typescript compiler check: `npx tsc --noEmit`. Ensure 0 errors.
3. Next.js Production Build:
   - Run production compilation build: `npm run build`. Ensure it builds successfully with 0 compilation errors.
4. Standalone Visual-QA Script Verification:
   - Run Prisma mock seed if required: `npx dotenv -e .env -- npx tsx prisma/seed-mock.ts` or similar. Let's check `scripts/visual-qa.js` or see if the database is already seeded.
   - Start the production next server in the background: `npx dotenv -e .env -- npm run start`.
   - Wait 5-10 seconds for the server to be fully online (confirm port 3000 is listening).
   - Run the standalone visual-qa comparison script: `npm run visual-qa:compare`.
   - Ensure the comparison executes successfully, prints a beautiful console report, and exits with 0 (or 1 if diff exists, but let's confirm the result).
   - Terminate the background next server process.
5. Playwright E2E Visual Regression Verification:
   - Run the E2E visual test command: `npm run test:visual`.
   - This command runs Playwright tests in `e2e/visual-regression.spec.ts`.
   - Playwright's config will automatically start the webServer via `npx dotenv -e .env.test -- npm run start`.
   - Verify that all visual tests pass successfully.
6. Handoff & Documentation:
   - Write a detailed summary of changes to `changes.md` in your working directory `d:\SMM_plan_2\.agents\worker_stage4_m5_qa_verifier_gen3\`.
   - Write a comprehensive 5-component handoff report to `handoff.md` in your working directory.
   - Send a final completion message to the Project Orchestrator with the logs, build outputs, and exit codes for all steps.

Constraint reminder:
- DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
- Strictly follow all guidelines in AGENTS.md.
- Ensure all outputs are detailed and verified.

Let's begin!
