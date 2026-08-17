"use server";

import { requireStaffPermission } from "@/lib/server/rbac";
import {
  providerBalanceService,
  CachedProviderBalance,
  GlobalLiquiditySummary,
} from "@/services/admin/provider-balance.service";

export type ProviderBalanceActionResult =
  | { success: true; data: CachedProviderBalance }
  | { success: false; error: string };

export type AllProviderBalancesActionResult =
  | { success: true; data: CachedProviderBalance[] }
  | { success: false; error: string };

export type GlobalLiquidityActionResult =
  | ({ success: true; data: GlobalLiquiditySummary } & GlobalLiquiditySummary)
  | { success: false; error: string };

/**
 * Server Action: Fetches cached balance and health status for a single provider.
 */
export async function getProviderBalanceAction(
  providerId: string,
  forceRefresh = false
): Promise<ProviderBalanceActionResult> {
  return requireStaffPermission('providers', 'view', async () => {
    try {
      const data = await providerBalanceService.getProviderBalance(providerId, forceRefresh);
      return { success: true, data };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Не удалось получить баланс провайдера.';
      return { success: false, error: errMsg };
    }
  });
}

/**
 * Server Action: Fetches cached balances for all active providers.
 */
export async function getAllProviderBalancesAction(
  forceRefresh = false
): Promise<AllProviderBalancesActionResult> {
  return requireStaffPermission('providers', 'view', async () => {
    try {
      const data = await providerBalanceService.getAllProviderBalances(forceRefresh);
      return { success: true, data };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Не удалось получить балансы провайдеров.';
      return { success: false, error: errMsg };
    }
  });
}

/**
 * Server Action: Fetches aggregated global liquidity and 24h burn metrics.
 */
export async function getGlobalProviderLiquidityAction(
  forceRefresh = false
): Promise<GlobalLiquidityActionResult> {
  return requireStaffPermission('providers', 'view', async () => {
    try {
      const summary = await providerBalanceService.getGlobalLiquiditySummary(forceRefresh);
      return {
        success: true,
        ...summary,
        data: summary,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Не удалось рассчитать общую ликвидность.';
      return { success: false, error: errMsg };
    }
  });
}
