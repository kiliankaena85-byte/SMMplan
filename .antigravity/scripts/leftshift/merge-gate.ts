import fs from 'fs';
import path from 'path';
import { getBaselineEvidence } from '../baseline';
import { runStaticRulesOnCodebase } from './run-rules';
import { runTestGate } from './test-gate';
import { runInvariantGate } from './invariant-gate';
import { runGoldenEvals } from '../run-evals';
import { runTests } from '../test-runner';
import { runBreakerLoop } from './breaker-loop';
import { runRuntimeChecks } from './runtime-checks';

export interface MergeGateReport {
  baseline: any;
  static_findings: any[];
  test_gate: any;
  invariant_gate: any;
  aearh_evals: any;
  leftshift_tests: any;
  breaker: any;
  runtime_checks: any;
  blocked: boolean;
  block_reasons: string[];
  residual_accepted: string[];
  timestamp: string;
}

export async function runMergeGate(allowDirtyFlag: boolean = false): Promise<MergeGateReport> {
  const block_reasons: string[] = [];

  // Step 1: Baseline Gate
  let baseline: any = null;
  try {
    baseline = getBaselineEvidence(allowDirtyFlag);
  } catch (err: any) {
    block_reasons.push(`STEP_1_BASELINE_FAILED: ${err.message}`);
  }

  // Step 2: Static Rules
  const staticResult = runStaticRulesOnCodebase();
  const criticalHighStatic = staticResult.findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH');
  if (criticalHighStatic.length > 0) {
    block_reasons.push(`STEP_2_STATIC_RULES_FAILED: Found ${criticalHighStatic.length} CRITICAL/HIGH findings in codebase.`);
  }

  // Step 3: Test-First Gate
  const testGateResult = runTestGate();
  if (!testGateResult.passed) {
    block_reasons.push(`STEP_3_TEST_GATE_FAILED: Missing tests for modified sensitive paths (${testGateResult.missingTestCategories.join(', ')}).`);
  }

  // Step 4: Invariant Gate
  const invariantResult = await runInvariantGate();
  if (!invariantResult.passed) {
    block_reasons.push(`STEP_4_INVARIANT_GATE_FAILED: Database invariant checks failed (${invariantResult.criticalFailuresCount} critical failures).`);
  }

  // Step 5: AEARH Self-Tests
  const aearhTestsResult = runTests('.antigravity/tests/harness.test.ts');
  if (aearhTestsResult.failed > 0) {
    block_reasons.push(`STEP_5_AEARH_SELFTESTS_FAILED: ${aearhTestsResult.failed} Vitest test(s) failed in harness.test.ts.`);
  }

  // Step 6: AEARH Evals
  const evalsResult = runGoldenEvals();
  if (!evalsResult.passed) {
    block_reasons.push('STEP_6_AEARH_EVALS_FAILED: Golden evals validation failed.');
  }

  // Step 7: Left-Shift Self-Tests
  const leftshiftTestsResult = runTests('.antigravity/tests/leftshift.test.ts .antigravity/tests/scanners.test.ts .antigravity/tests/reconciliation.test.ts');
  if (leftshiftTestsResult.failed > 0) {
    block_reasons.push(`STEP_7_LEFTSHIFT_SELFTESTS_FAILED: ${leftshiftTestsResult.failed} Vitest test(s) failed in ALSH self-tests.`);
  }

  // Step 8: Breaker Pass
  const breakerResult = runBreakerLoop();
  if (!breakerResult.passed) {
    block_reasons.push(`STEP_8_BREAKER_FAILED: Breaker agent found ${breakerResult.exploits_found} exploitable security vulnerability/vulnerabilities.`);
  }

  const runtimeChecksResult = runRuntimeChecks();

  const blocked = block_reasons.length > 0;
  const timestamp = new Date().toISOString();

  const report: MergeGateReport = {
    baseline,
    static_findings: staticResult.findings,
    test_gate: testGateResult,
    invariant_gate: invariantResult,
    aearh_evals: evalsResult,
    leftshift_tests: leftshiftTestsResult,
    breaker: breakerResult,
    runtime_checks: runtimeChecksResult,
    blocked,
    block_reasons,
    residual_accepted: [
      'RES-HARNESS-01: Working tree dirty files (local dev environment)',
      'RES-HARNESS-02: Pending database migration for Service.tenantId'
    ],
    timestamp
  };

  const outDir = path.resolve(process.cwd(), '.antigravity/reports');
  fs.mkdirSync(outDir, { recursive: true });
  const fileTimestamp = timestamp.replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(outDir, `leftshift-merge-gate-${fileTimestamp}.json`), JSON.stringify(report, null, 2));

  return report;
}

if (require.main === module) {
  console.log('=== ALSH MERGE GATE EXECUTION ===');
  const allowDirty = process.argv.includes('--allow-dirty');
  runMergeGate(allowDirty)
    .then(report => {
      console.log(JSON.stringify({
        blocked: report.blocked,
        block_reasons: report.block_reasons,
        static_findings_count: report.static_findings.length,
        timestamp: report.timestamp
      }, null, 2));

      if (report.blocked) {
        console.error('\n🛑 MERGE BLOCKED: The pull request / commit contains security violations or unverified changes!');
        process.exit(1);
      } else {
        console.log('\n✅ MERGE PASSED: All 8 left-shift security and quality gates passed.');
      }
    })
    .catch(err => {
      console.error('Merge gate fatal error:', err);
      process.exit(1);
    });
}
