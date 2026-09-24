'use server';

import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/server/rbac';
import { CustomerLiabilityTreasuryHarness, TreasurySimulationOutput } from '@/services/ai/harnesses/customer-liability-treasury.harness';
import { AlfaBankService, AlfaBankAccountBalance } from '@/services/financial/bank-integrations/alfa-bank.service';
import { SettingsProvider } from '@/lib/settings';

import { redis } from '@/lib/redis';

export interface TreasuryReportResult {
  success: boolean;
  data?: TreasurySimulationOutput;
  bankAccount?: AlfaBankAccountBalance;
  bankSource?: 'ALFA_BANK_API' | 'MANUAL_ENTRY';
  error?: string;
}

/**
 * Calculates real-time Treasury Financial Health and Safe Owner Draw Capacity.
 */
export async function getTreasuryFinancialHealthAction(
  tenantId: string = 'smmplan',
  overrideBankRub?: number,
  manualGatewayRub: number = 150000,
  forceRefresh = false
): Promise<TreasuryReportResult> {
  return requireStaffPermission('FINANCE', 'view', async () => {
    try {
      const isGlobalScope = !tenantId || tenantId === 'all';
      const normalizedTenant = isGlobalScope ? 'all' : tenantId;
      const tenantFilter = isGlobalScope ? {} : { tenantId };
      const currentQuarterStart = new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1);
      const isDefaultParameters = overrideBankRub === undefined && manualGatewayRub === 150000;
      const cacheKey = `admin:treasury:${normalizedTenant}`;

      if (isDefaultParameters && !forceRefresh) {
        try {
          const cached = await redis.get(cacheKey);
          if (cached) {
            return JSON.parse(cached);
          }
        } catch {
          // Fallback to live computation
        }
      }

      const bankTenantId = isGlobalScope ? 'smmplan' : tenantId;

      // Execute all 6 dependencies concurrently via Promise.all
      const [
        usdToRub,
        alfaRes,
        userAggregates,
        orderAggregates,
        paymentAggregates,
        activeProvidersCount
      ] = await Promise.all([
        SettingsProvider.getExchangeRateUSD(),
        overrideBankRub === undefined 
          ? AlfaBankService.getLiveBalance(bankTenantId) 
          : Promise.resolve({ success: false, account: undefined, error: undefined }),
        db.user.aggregate({
          where: tenantFilter,
          _sum: {
            balance: true,
            bonusBalance: true,
          },
        }),
        db.order.aggregate({
          where: {
            ...tenantFilter,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
          _sum: { providerCost: true },
        }),
        db.payment.aggregate({
          where: {
            ...tenantFilter,
            status: 'SUCCEEDED',
            createdAt: { gte: currentQuarterStart },
          },
          _sum: { amount: true },
        }),
        db.provider.count({
          where: { isActive: true },
        })
      ]);

      let bankBalanceRub = overrideBankRub;
      let bankAccountInfo: AlfaBankAccountBalance | undefined = undefined;
      let bankSource: 'ALFA_BANK_API' | 'MANUAL_ENTRY' = 'MANUAL_ENTRY';
      let bankSyncError: string | undefined = undefined;

      if (overrideBankRub === undefined) {
        if (alfaRes.success && alfaRes.account) {
          bankBalanceRub = alfaRes.account.authorizedBalanceRub;
          bankAccountInfo = alfaRes.account;
          bankSource = 'ALFA_BANK_API';
        } else {
          bankBalanceRub = 250000.0; // Safe fallback
          bankSyncError = alfaRes.error || 'Не удалось синхронизировать баланс Альфа-Банка';
          console.warn('[getTreasuryFinancialHealthAction] Alfa-Bank sync error:', bankSyncError);
        }
      } else {
        bankSource = 'MANUAL_ENTRY';
      }

      const totalWithdrawableDepositsCents = userAggregates._sum.balance ?? BigInt(0);
      const totalBonusBalancesCents = userAggregates._sum.bonusBalance ?? BigInt(0);
      const totalWithdrawableDepositsRub = Number(totalWithdrawableDepositsCents) / 100;
      const totalBonusBalancesRub = Number(totalBonusBalancesCents) / 100;

      const activeOrdersCostCents = orderAggregates._sum.providerCost ?? BigInt(0);
      const activeOrdersCostRub = Number(activeOrdersCostCents) / 100;

      const quarterInflowCents = paymentAggregates._sum.amount ?? BigInt(0);
      const quarterInflowRub = Number(quarterInflowCents) / 100;

      const totalProviderUsd = activeProvidersCount * 250; // 250 USD per active provider estimate

      // Evaluate via Treasury Harness
      const report = CustomerLiabilityTreasuryHarness.evaluate({
        liquidCashBankRub: bankBalanceRub ?? 250000.0,
        liquidCashGatewaysRub: manualGatewayRub,
        providerBalancesUsd: totalProviderUsd,
        usdToRubExchangeRate: usdToRub,
        totalCustomerWithdrawableDepositsRub: totalWithdrawableDepositsRub,
        totalCustomerBonusBalancesRub: totalBonusBalancesRub,
        activeUnfulfilledOrdersCostRub: activeOrdersCostRub,
        currentQuarterGrossInflowRub: quarterInflowRub,
        taxScheme: 'USN_6_INCOME',
        gatewayRollingReservePercent: 5,
        minimumWorkingCapitalBufferRub: 100000,
      });

      const response: TreasuryReportResult = {
        success: true,
        data: report,
        bankAccount: bankAccountInfo,
        bankSource,
        error: bankSyncError,
      };

      if (isDefaultParameters) {
        try {
          await redis.set(cacheKey, JSON.stringify(response), 'EX', 60);
        } catch {
          // Safe fallback
        }
      }

      return response;
    } catch (err: unknown) {
      console.error('[getTreasuryFinancialHealthAction] Error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Внутренняя ошибка казначейства' };
    }
  });
}
