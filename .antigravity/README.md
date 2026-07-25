# Antigravity Evidence-First Audit & Remediation Harness (AEARH v1.1)

AEARH is an enterprise high-assurance framework designed to audit, remediate, verify, and enforce security and financial integrity across complex microservice & monolith architectures.

---

## 1. What is AEARH
AEARH enforces strict evidence level requirements (L0 to L8) and automated validation gates. It prevents premature risk closure, unevidenced claims, and placeholder verification reports.

## 2. Evidence Levels
- **L0_CLAIMED:** Declarative claim without code or test proof.
- **L1_DESIGN_PRESENT:** Architecture design document present.
- **L2_CODE_IMPLEMENTED:** Source code implemented with exact file/line references.
- **L3_POSITIVE_TEST_PASSED:** Unit/integration happy-path test passed.
- **L4_NEGATIVE_TEST_PASSED:** Security negative test (tampering/invalid payload rejection) passed.
- **L5_RACE_FUZZ_PASSED:** Multi-worker concurrent fuzz test passed.
- **L6_RECONCILIATION_PASSED:** Financial SQL reconciliation invariants verified on active database state.
- **L7_MONITORED:** Real-time production telemetry and alerts configured.
- **L8_PRODUCTION_PROVEN:** Incident-free execution verified in production over time.

## 3. Status Taxonomy
`VERIFIED_PASS`, `VERIFIED_WITH_CONDITIONS`, `PARTIAL`, `UNVERIFIED`, `NOT_IMPLEMENTED`, `NOT_APPLICABLE`, `RISK_ACCEPTED`, `NEEDS_REMEDIATION`, `NEEDS_TEST`, `NEEDS_INFRA_PROOF`.

## 4. Baseline Gate
Inspects working tree state (`git status`), commit SHA (`git rev-parse HEAD`), branch, log, schema hash (`prisma/schema.prisma`), and package versions. Rejects uncommitted dirty working tree by default unless `--allow-dirty` flag is passed.

## 5. Evidence Validator
Validates evidence pack JSON documents against machine-readable JSON schemas and level requirements. Rejects overclaimed statuses, missing negative tests for security controls, missing reconciliation for financial controls, and missing concurrency tests for race controls.

## 6. Scanners
Static code and schema analysis scripts:
- `route-scanner.ts`: Scans Next.js App Router pages, API routes, layouts, webhooks, and cron jobs.
- `schema-scanner.ts`: Analyzes Prisma models, unique constraints, relations, and indexes.
- `balance-mutations.ts`: Detects direct balance mutations vs `WalletOps` calls.
- `idempotency-keys.ts`: Detects unstable idempotency key patterns (`Date.now()`, `Math.random()`).
- `dev-routes.ts`: Scans `/api/dev/*` endpoints for production guards.
- `tenant-filters.ts`: Analyzes multi-tenant query scoping.
- `ownership-filters.ts`: Scans detail queries for user ownership verification (IDOR protection).
- `security-events.ts`: Scans security logging calls.

## 7. Reconciliation
Automated SQL invariant checks for user balance vs ledger match, duplicate idempotency keys, duplicate referral commissions, negative balances, orphan records, stuck tasks, and refund overcharges.

## 8. Evals
Golden evaluation test cases (`.antigravity/evals/golden/`) verifying that the evidence validator accurately detects and rejects flawed evidence reports (e.g. `008-smart-drip-overclaim.json`).

## 9. Commands
```bash
npm run harness:baseline     # Runs baseline gate
npm run harness:validate     # Runs evidence validator against report JSON
npm run harness:scan         # Runs all 8 static code & schema scanners
npm run harness:reconcile    # Runs 13 financial & data reconciliation SQL checks
npm run harness:test         # Runs automated integration tests
npm run harness:evals        # Runs golden eval test cases
npm run harness:selftest     # Runs harness Vitest self-test suite
npm run harness:all          # Executes complete baseline, scan, reconcile, test & eval pipeline
```

## 10. How to Run Audit
1. Execute `npm run harness:baseline` to capture clean commit SHA and schema hash.
2. Execute `npm run harness:scan` to generate surface maps in `.antigravity/evidence/scanners/`.
3. Analyze architecture and generate evidence pack report JSON in `.antigravity/reports/`.
4. Validate report using `npm run harness:validate <report.json>`.

## 11. How to Remediate
1. Implement fixes in `src/` according to threat model requirements.
2. Create automated negative/concurrency tests under `test/integration/`.
3. Commit remediation changes to git.

## 12. How to Verify
1. Run Vitest test suite (`npm run harness:test`).
2. Run SQL reconciliation (`npm run harness:reconcile`).
3. Re-run `npm run harness:validate` to ensure zero validator errors.

## 13. How to Close Risk
A risk can only be marked `CLOSED` when all associated controls are `VERIFIED_PASS` at required evidence levels (L4 security, L6 financial, L5 race) and verified by clean commit.

## 14. How to Accept Residual Risk
Low/Medium risks that cannot be immediately remediated may be marked `RISK_ACCEPTED` if documented with impact assessment, mitigation strategy, and sign-off in residual risks backlog.
