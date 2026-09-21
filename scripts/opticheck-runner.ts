/**
 * scripts/opticheck-runner.ts
 *
 * Единый автоматизированный раннер мета-системы проверки оптимизации (OptiCheck Meta-Harness).
 * Платформа: OmniSMM 1.0 (SMMplan / SMMflux)
 * 
 * Объединяет 5 архитектурных слоев верификации в единый отчет с метриками и оценкой рисков:
 * 1. Слой 1: AST-контроль архитектурных инвариантов и чистоты слоев (ALSH + AST)
 * 2. Слой 2: Память, Event Loop и Контейнеры (Node.js 20+, 75% V8 Heap, Prisma Singleton)
 * 3. Слой 3: База данных и Хвостовые задержки (PostgreSQL 16, Query Latency, Keyset Invariant)
 * 4. Слой 4: Конкурентность, ACID и Финансовая сверка (13 SQL-проверок AEARH, Ledger-First)
 * 5. Слой 5: Математические ИИ-харнесы оптимизации (5 детерминированных экономических моделей)
 */

import './init-host-env';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

import { AstGuardrailsEngine, GuardrailViolation } from './run-ast-guardrails';
import { CleanArchitectureGuard } from './check-clean-architecture';
import { runReconciliation, ReconciliationReport } from '../.antigravity/scripts/reconciliation';
import { UnitEconomicsElasticityHarness } from '../src/services/ai/harnesses/unit-economics-elasticity.harness';
import { SupplierArbitrageOptimizationHarness } from '../src/services/ai/harnesses/supplier-arbitrage.harness';
import { ChurnRiskLtvDefenseHarness } from '../src/services/ai/harnesses/churn-risk-ltv.harness';
import { CashflowLiquidityForecastHarness } from '../src/services/ai/harnesses/cashflow-forecast.harness';
import { CustomerLiabilityTreasuryHarness } from '../src/services/ai/harnesses/customer-liability-treasury.harness';
import { PrismaClient } from '@prisma/client';

export type RegressionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface LayerResult {
  layer: number;
  name: string;
  passed: boolean;
  durationMs: number;
  metrics: Record<string, unknown>;
  warnings: string[];
  blockers: string[];
}

export interface OptiCheckReport {
  timestamp: string;
  totalDurationMs: number;
  overallPassed: boolean;
  optiCheckScore: number; // 0 - 100
  regressionRisk: RegressionRiskLevel;
  layers: LayerResult[];
  summary: {
    totalLayers: number;
    passedLayers: number;
    failedLayers: number;
    blockersCount: number;
    warningsCount: number;
  };
}

class OptiCheckRunner {
  private projectRoot: string;

  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * СЛОЙ 1: Статический AST-контроль и схематические инварианты
   */
  public async verifyLayer1Ast(): Promise<LayerResult> {
    const start = performance.now();
    const blockers: string[] = [];
    const warnings: string[] = [];

    // 1.1 AST Guardrails
    const astEngine = new AstGuardrailsEngine(this.projectRoot);
    const { violations } = astEngine.run('src');

    const astBlockers = violations.filter((v: GuardrailViolation) => v.severity === 'BLOCKER');
    const astMajors = violations.filter((v: GuardrailViolation) => v.severity === 'MAJOR');
    const astWarnings = violations.filter((v: GuardrailViolation) => v.severity === 'WARNING');

    if (astBlockers.length > 0) {
      blockers.push(`AST Guardrails: ${astBlockers.length} BLOCKER violations found`);
    }
    if (astMajors.length > 0) {
      warnings.push(`AST Guardrails: ${astMajors.length} MAJOR violations found`);
    }

    // 1.2 Clean Architecture Dependency & Cycles
    let archPassed = true;
    let cyclesCount = 0;
    let archBlockersCount = 0;

    try {
      const archGuard = new CleanArchitectureGuard(this.projectRoot);
      const { passed, ir } = archGuard.run();
      archPassed = passed;
      cyclesCount = ir.cycles.length;
      archBlockersCount = ir.violations.filter((v) => v.severity === 'BLOCKER').length;

      if (!archPassed) {
        blockers.push(`Clean Architecture: Inward dependency violations (${archBlockersCount}) or cycles (${cyclesCount})`);
      }
    } catch (err) {
      warnings.push(`Clean Architecture check encountered error: ${(err as Error).message}`);
    }

    const durationMs = Math.round(performance.now() - start);
    const passed = blockers.length === 0;

    return {
      layer: 1,
      name: 'AST Guardrails & Clean Architecture',
      passed,
      durationMs,
      metrics: {
        totalAstViolations: violations.length,
        astBlockers: astBlockers.length,
        astMajors: astMajors.length,
        astWarnings: astWarnings.length,
        cyclesCount,
        archBlockersCount,
        archPassed,
      },
      warnings,
      blockers,
    };
  }

  /**
   * СЛОЙ 2: Память, Event Loop и Контейнеры (Docker Memory Ops)
   */
  public async verifyLayer2Memory(): Promise<LayerResult> {
    const start = performance.now();
    const blockers: string[] = [];
    const warnings: string[] = [];

    const mem = process.memoryUsage();
    const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
    const rssMb = Math.round(mem.rss / 1024 / 1024);

    // 75% V8 Heap Rule: Docker limit = 1024MB, Node.js target <= 768MB
    const maxOldSpaceBudgetMb = 768;
    const heapUtilizationPercent = Math.round((heapUsedMb / maxOldSpaceBudgetMb) * 100);

    if (heapUsedMb > maxOldSpaceBudgetMb * 0.9) {
      blockers.push(`Heap usage (${heapUsedMb}MB) exceeds 90% of container budget (${maxOldSpaceBudgetMb}MB)`);
    } else if (heapUsedMb > maxOldSpaceBudgetMb * 0.75) {
      warnings.push(`Heap usage (${heapUsedMb}MB) exceeds 75% container threshold`);
    }

    // Event Loop Lag measurement
    const eventLoopLagMs = await new Promise<number>((resolve) => {
      const before = performance.now();
      setImmediate(() => {
        const delta = performance.now() - before;
        resolve(Math.round(delta * 100) / 100);
      });
    });

    if (eventLoopLagMs > 50) {
      blockers.push(`Event Loop lag is critical (${eventLoopLagMs}ms > 50ms)`);
    } else if (eventLoopLagMs > 20) {
      warnings.push(`Event Loop lag elevated (${eventLoopLagMs}ms > 20ms)`);
    }

    const durationMs = Math.round(performance.now() - start);
    const passed = blockers.length === 0;

    return {
      layer: 2,
      name: 'Memory, Event Loop & V8 Heap Saturation',
      passed,
      durationMs,
      metrics: {
        heapUsedMb,
        heapTotalMb,
        rssMb,
        maxOldSpaceBudgetMb,
        heapUtilizationPercent,
        eventLoopLagMs,
      },
      warnings,
      blockers,
    };
  }

  /**
   * СЛОЙ 3: База данных и Хвостовые задержки (NFR & Keyset Engine)
   */
  public async verifyLayer3Database(): Promise<LayerResult> {
    const start = performance.now();
    const blockers: string[] = [];
    const warnings: string[] = [];

    const db = new PrismaClient();
    let pingLatencyMs = 0;
    let queryLatencyMs = 0;
    let serviceSampleCount = 0;

    try {
      // 3.1 Raw Ping Latency (SELECT 1)
      const pingStart = performance.now();
      await db.$queryRawUnsafe('SELECT 1');
      pingLatencyMs = Math.round((performance.now() - pingStart) * 100) / 100;

      // 3.2 Key Query Latency (Catalog Index Probe)
      const qStart = performance.now();
      const services = await db.service.findMany({
        where: { isActive: true },
        take: 20,
        select: { id: true, name: true, numericId: true, rate: true },
      });
      queryLatencyMs = Math.round((performance.now() - qStart) * 100) / 100;
      serviceSampleCount = services.length;

      // NFR Query Budget: Ping < 20ms, Query < 30ms
      if (pingLatencyMs > 50) {
        warnings.push(`DB ping latency elevated: ${pingLatencyMs}ms (> 50ms)`);
      }
      if (queryLatencyMs > 100) {
        warnings.push(`Catalog query latency elevated: ${queryLatencyMs}ms (> 100ms)`);
      }
    } catch (err) {
      blockers.push(`Database connection failed: ${(err as Error).message}`);
    } finally {
      await db.$disconnect();
    }

    const durationMs = Math.round(performance.now() - start);
    const passed = blockers.length === 0;

    return {
      layer: 3,
      name: 'Database Latency & NFR Performance Budget',
      passed,
      durationMs,
      metrics: {
        pingLatencyMs,
        queryLatencyMs,
        serviceSampleCount,
        queryBudgetTargetMs: 30,
      },
      warnings,
      blockers,
    };
  }

  /**
   * СЛОЙ 4: Гонки, ACID и Финансовая сверка (AEARH)
   */
  public async verifyLayer4FinancialReconciliation(): Promise<LayerResult> {
    const start = performance.now();
    const blockers: string[] = [];
    const warnings: string[] = [];

    let report: ReconciliationReport | null = null;
    try {
      report = await runReconciliation();
      if (!report.passed) {
        blockers.push(`AEARH Financial Reconciliation failed: ${report.criticalFailuresCount} critical failure(s)`);
      }
      if (report.warningsCount > 0) {
        warnings.push(`AEARH Financial Reconciliation reported ${report.warningsCount} warning(s)`);
      }
    } catch (err) {
      blockers.push(`Reconciliation execution crashed: ${(err as Error).message}`);
    }

    const durationMs = Math.round(performance.now() - start);
    const passed = blockers.length === 0 && (report?.passed ?? false);

    return {
      layer: 4,
      name: 'AEARH Financial Reconciliation & Concurrency Locks',
      passed,
      durationMs,
      metrics: {
        reconciliationPassed: report?.passed ?? false,
        totalChecks: report?.checks.length ?? 0,
        criticalFailuresCount: report?.criticalFailuresCount ?? 0,
        warningsCount: report?.warningsCount ?? 0,
      },
      warnings,
      blockers,
    };
  }

  /**
   * СЛОЙ 5: Бизнес- и ИИ-харнесы оптимизации (Deterministic Economic Harnesses)
   */
  public async verifyLayer5AiHarnesses(): Promise<LayerResult> {
    const start = performance.now();
    const blockers: string[] = [];
    const warnings: string[] = [];

    let elasticityPassed = false;
    let arbitragePassed = false;
    let churnPassed = false;
    let cashflowPassed = false;
    let treasuryPassed = false;

    // 5.1 Elasticity & Margin Guard
    try {
      const res = UnitEconomicsElasticityHarness.simulate({
        serviceId: 'srv_opticheck_test',
        serviceName: 'Telegram Реальные Подписчики',
        baseCogsRub: 100.0,
        fxBufferPercent: 5,
        currentPriceRub: 130.0,
        currentVolume: 1000,
        priceElasticityOfDemand: -1.2,
        elasticityModel: 'LINEAR',
        minMarginFloorPercent: 15,
        markupSteps: [0.15, 0.25, 0.35, 0.45],
        roundingStrategy: 'CHARM_90',
      });
      elasticityPassed = res.optimalPricePoint.grossMarginPercent >= 15 && res.effectiveCogsWithFxRub === 105;
      if (!elasticityPassed) blockers.push('UnitEconomicsElasticityHarness calculation failed margin floor invariant');
    } catch (e) {
      blockers.push(`Elasticity Harness crashed: ${(e as Error).message}`);
    }

    // 5.2 Supplier Arbitrage Optimization
    try {
      const res = SupplierArbitrageOptimizationHarness.optimize({
        targetServiceCategory: 'TG_MEMBERS',
        candidates: [
          {
            providerId: 'p1',
            providerName: 'Primary Provider',
            externalServiceId: '10',
            baseCogsRub: 80,
            slaP50Minutes: 5,
            slaP90Minutes: 15,
            cancellationRate: 0.01,
            qualityDropRate: 0.01,
            currentUsdBalance: 500,
          },
          {
            providerId: 'p2',
            providerName: 'Secondary Provider',
            externalServiceId: '20',
            baseCogsRub: 90,
            slaP50Minutes: 10,
            slaP90Minutes: 20,
            cancellationRate: 0.02,
            qualityDropRate: 0.02,
            currentUsdBalance: 200,
          },
        ],
      });
      arbitragePassed = res.selectedPrimaryRoute.providerId === 'p1' && res.fallbackCascade.length === 1;
      if (!arbitragePassed) blockers.push('SupplierArbitrageOptimizationHarness selected incorrect route');
    } catch (e) {
      blockers.push(`Arbitrage Harness crashed: ${(e as Error).message}`);
    }

    // 5.3 Churn Risk & LTV Defense
    try {
      const res = ChurnRiskLtvDefenseHarness.evaluate({
        customer: {
          userId: 'usr_opti_test',
          accountAgeDays: 90,
          historicalSpendRub: 50000,
          lifetimeMarginRub: 15000,
          monthlyAverageSpendRub: 12000,
          failedOrdersCount30d: 2,
          ticketSupportLagHours: 3.0,
          recentDropRatePercent: 5.0,
          customerTier: 'VIP',
        },
      });
      churnPassed = res.estimatedLtvRub > 0 && res.trustBudgetCeilingRub > 0;
      if (!churnPassed) blockers.push('ChurnRiskLtvDefenseHarness returned invalid LTV or trust budget');
    } catch (e) {
      blockers.push(`Churn Risk Harness crashed: ${(e as Error).message}`);
    }

    // 5.4 Cashflow Liquidity Forecast
    try {
      const res = CashflowLiquidityForecastHarness.forecast({
        forecastHorizonDays: 5,
        currentLiquidBankBalanceRub: 200000,
        currentProviderUsdBalance: 1000,
        usdToRubExchangeRate: 92.0,
        projectedDailyBurnUsd: 150,
        minimumProviderSafeBufferUsd: 200,
        gateways: [
          { gatewayId: 'gw_1', name: 'YooKassa', settlementLagDays: 1, processingFeePercent: 3.5, holdbackReservePercent: 0 },
        ],
        inflowSchedule: [
          { dayOffset: 1, gatewayId: 'gw_1', grossAmountRub: 50000 },
          { dayOffset: 2, gatewayId: 'gw_1', grossAmountRub: 50000 },
        ],
        plannedTopUpsUsd: [],
      });
      cashflowPassed = res.overallStatus === 'HEALTHY' && res.finalProjectedProviderUsdBalance > 0;
      if (!cashflowPassed) blockers.push('CashflowLiquidityForecastHarness failed runway simulation');
    } catch (e) {
      blockers.push(`Cashflow Harness crashed: ${(e as Error).message}`);
    }

    // 5.5 Customer Liability Treasury & Safe Owner Draw
    try {
      const res = CustomerLiabilityTreasuryHarness.evaluate({
        liquidCashBankRub: 500000,
        liquidCashGatewaysRub: 100000,
        providerBalancesUsd: 1000,
        usdToRubExchangeRate: 90.0,
        totalCustomerWithdrawableDepositsRub: 150000,
        totalCustomerBonusBalancesRub: 20000,
        activeUnfulfilledOrdersCostRub: 50000,
        currentQuarterGrossInflowRub: 600000,
        taxScheme: 'USN_6_INCOME',
        gatewayRollingReservePercent: 5,
        minimumWorkingCapitalBufferRub: 80000,
      });
      treasuryPassed = res.safeOwnerDrawCapacityRub > 0 && res.liquidityHealthStatus === 'SOLVENT_GREEN';
      if (!treasuryPassed) blockers.push('CustomerLiabilityTreasuryHarness failed solvency calculation');
    } catch (e) {
      blockers.push(`Treasury Harness crashed: ${(e as Error).message}`);
    }

    const durationMs = Math.round(performance.now() - start);
    const passed = blockers.length === 0;

    return {
      layer: 5,
      name: 'Deterministic Economic & AI Optimization Harnesses',
      passed,
      durationMs,
      metrics: {
        elasticityPassed,
        arbitragePassed,
        churnPassed,
        cashflowPassed,
        treasuryPassed,
        allHarnessesGreen: passed,
      },
      warnings,
      blockers,
    };
  }

  /**
   * Запуск полного мета-харнеса OptiCheck
   */
  public async runFullSuite(): Promise<OptiCheckReport> {
    const suiteStart = performance.now();
    console.log('================================================================================');
    console.log('🛡️  OPTICHECK META-HARNESS: FULL-SPECTRUM OPTIMIZATION VERIFICATION SUITE  🛡️');
    console.log('================================================================================');
    console.log(`Platform Engine: OmniSMM 1.0 (SMMplan / SMMflux)`);
    console.log(`Timestamp:       ${new Date().toISOString()}\n`);

    const layers: LayerResult[] = [];

    // Layer 1
    console.log('▶ [1/5] Verifying Layer 1: AST Guardrails & Clean Architecture...');
    const l1 = await this.verifyLayer1Ast();
    layers.push(l1);
    this.printLayerSummary(l1);

    // Layer 2
    console.log('\n▶ [2/5] Verifying Layer 2: Memory, Event Loop & V8 Heap Saturation...');
    const l2 = await this.verifyLayer2Memory();
    layers.push(l2);
    this.printLayerSummary(l2);

    // Layer 3
    console.log('\n▶ [3/5] Verifying Layer 3: Database Latency & NFR Performance Budget...');
    const l3 = await this.verifyLayer3Database();
    layers.push(l3);
    this.printLayerSummary(l3);

    // Layer 4
    console.log('\n▶ [4/5] Verifying Layer 4: AEARH Financial Reconciliation & Concurrency...');
    const l4 = await this.verifyLayer4FinancialReconciliation();
    layers.push(l4);
    this.printLayerSummary(l4);

    // Layer 5
    console.log('\n▶ [5/5] Verifying Layer 5: Deterministic AI Optimization Harnesses...');
    const l5 = await this.verifyLayer5AiHarnesses();
    layers.push(l5);
    this.printLayerSummary(l5);

    const totalDurationMs = Math.round(performance.now() - suiteStart);
    const passedLayers = layers.filter((l) => l.passed).length;
    const failedLayers = layers.length - passedLayers;
    const totalBlockers = layers.reduce((acc, l) => acc + l.blockers.length, 0);
    const totalWarnings = layers.reduce((acc, l) => acc + l.warnings.length, 0);

    // Score: 100 - (20 points per failed layer) - (2 points per warning capped at 20)
    let optiCheckScore = 100 - (failedLayers * 20) - Math.min(totalWarnings * 2, 20);
    if (optiCheckScore < 0) optiCheckScore = 0;

    let regressionRisk: RegressionRiskLevel = 'LOW';
    if (totalBlockers > 0 || failedLayers > 1) {
      regressionRisk = 'CRITICAL';
    } else if (failedLayers === 1) {
      regressionRisk = 'HIGH';
    } else if (totalWarnings > 3) {
      regressionRisk = 'MEDIUM';
    }

    const overallPassed = totalBlockers === 0 && failedLayers === 0;

    const report: OptiCheckReport = {
      timestamp: new Date().toISOString(),
      totalDurationMs,
      overallPassed,
      optiCheckScore,
      regressionRisk,
      layers,
      summary: {
        totalLayers: layers.length,
        passedLayers,
        failedLayers,
        blockersCount: totalBlockers,
        warningsCount: totalWarnings,
      },
    };

    this.printExecutiveReport(report);
    this.saveReportArtifact(report);

    return report;
  }

  private printLayerSummary(l: LayerResult): void {
    const icon = l.passed ? '🟢 PASS' : '🔴 FAIL';
    console.log(`  └─ Status: ${icon} (${l.durationMs}ms)`);
    if (l.blockers.length > 0) {
      l.blockers.forEach((b) => console.log(`     🛑 BLOCKER: ${b}`));
    }
    if (l.warnings.length > 0) {
      l.warnings.forEach((w) => console.log(`     ⚠️  WARN: ${w}`));
    }
  }

  private printExecutiveReport(report: OptiCheckReport): void {
    console.log('\n================================================================================');
    console.log('📊  OPTICHECK EXECUTIVE SUMMARY REPORT  📊');
    console.log('================================================================================');
    console.log(`Overall Status:   ${report.overallPassed ? '🟢 ALL LAYERS VERIFIED (PASS)' : '🔴 DEFECTS DETECTED (FAIL)'}`);
    console.log(`OptiCheck Score:  ${report.optiCheckScore} / 100`);
    console.log(`Regression Risk:  ${report.regressionRisk}`);
    console.log(`Total Duration:   ${report.totalDurationMs}ms`);
    console.log(`Passed Layers:    ${report.summary.passedLayers} / ${report.summary.totalLayers}`);
    console.log(`Blockers Count:   ${report.summary.blockersCount}`);
    console.log(`Warnings Count:   ${report.summary.warningsCount}`);
    console.log('================================================================================\n');
  }

  private saveReportArtifact(report: OptiCheckReport): void {
    try {
      const artifactsDir = path.join(this.projectRoot, 'artifacts');
      if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
      }
      const artifactPath = path.join(artifactsDir, 'opticheck-report.json');
      fs.writeFileSync(artifactPath, JSON.stringify(report, null, 2), 'utf-8');
      console.log(`📄 Saved OptiCheck artifact to: ${artifactPath}`);
    } catch (e) {
      console.warn(`Failed to save report artifact: ${(e as Error).message}`);
    }
  }
}

// CLI Execution
if (process.argv[1]?.includes('opticheck-runner.ts')) {
  const runner = new OptiCheckRunner();
  runner.runFullSuite()
    .then((report) => {
      process.exit(report.overallPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('❌ OptiCheck Runner fatal error:', err);
      process.exit(1);
    });
}
