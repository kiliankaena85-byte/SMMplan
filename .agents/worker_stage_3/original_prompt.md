## 2026-05-23T12:11:02Z
You are the Stage 3 Verification Worker (archetype: teamwork_preview_worker).
Your absolute working directory is: d:\SMM_plan_2\.agents\worker_stage_3

Your task is to run the complete build, test, and type-safety verification pipeline for the Stage 3 requirements, identify any failures, fix them if necessary following AGENTS.md and user_global rules, and report the full outputs.

Please perform the following steps in sequence:
1. Initialize the test database schema:
   `npm run test:db`
2. Run the Vitest unit and integration tests:
   `npm run test`
3. Verify type safety:
   `npx tsc --noEmit`
4. Run ESLint to check for zero warnings:
   `npm run lint`
5. Compile the production Next.js build:
   `npm run build`
6. Run the Playwright E2E tests:
   `npm run test:e2e`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

If any of the verification steps fail, locate the failing file/test, analyze the error, resolve the issue (following search-replace and code structure rules of AGENTS.md), and re-run the pipeline until everything is 100% successful.

Document your commands, stdout, and exit codes of each step in a comprehensive report at d:\SMM_plan_2\.agents\worker_stage_3\verification_report.md.
Once complete, write a detailed handoff report in d:\SMM_plan_2\.agents\worker_stage_3\handoff.md and notify me. Maintain progress.md in your directory as your liveness heartbeat.
