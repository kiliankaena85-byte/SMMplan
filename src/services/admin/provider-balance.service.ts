import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { SettingsProvider } from '@/lib/settings';
import { providerService } from '@/services/providers/provider.service';
import { ProviderDiagnosticService } from './provider-diagnostic.service';

export interface CachedProviderBalance {
  providerId: string;
  providerName: string;
  balance: number;
  rawBalance: string;
  currency: string;
  balanceUsd: number;
  balanceRub: number;
  status: 'healthy' | 'warning' | 'critical' | 'error';
  latencyMs: number;
  cachedAt: number;
  expiresAt: number;
  error?: string;
  suggestedFix?: string;
}

export interface GlobalLiquiditySummary {
  totalRub: number;
  totalUsd: number;
  activeCount: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  errorCount: number;
  burnRate24hRub: number;
  runwayDays: number | null;
  providers: CachedProviderBalance[];
  cachedAt: number;
}

export class ProviderBalanceService {
  private readonly CACHE_TTL_SECONDS = 60;
  private readonly ERROR_CACHE_TTL_SECONDS = 15;
  private readonly TIMEOUT_MS = 5000;

  /**
   * Retrieves current balance for a specific provider with 60-second Redis caching
   * and 5s timeout protection.
   */
  async getProviderBalance(providerId: string, forceRefresh = false): Promise<CachedProviderBalance> {
    const cacheKey = `provider:${providerId}:balance`;

    if (!forceRefresh) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as CachedProviderBalance;
        }
      } catch (err) {
        console.warn(`[ProviderBalanceService] Redis read error for ${cacheKey}:`, err);
      }
    }

    const provider = await db.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      const now = Date.now();
      return {
        providerId,
        providerName: 'Unknown',
        balance: 0,
        rawBalance: '0',
        currency: 'USD',
        balanceUsd: 0,
        balanceRub: 0,
        status: 'error',
        latencyMs: 0,
        cachedAt: now,
        expiresAt: now + this.ERROR_CACHE_TTL_SECONDS * 1000,
        error: 'Провайдер не найден в базе данных.',
      };
    }

    const startTime = Date.now();
    let latencyMs = 0;

    try {
      const instance = await providerService.getProviderInstance(provider);

      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('ETIMEDOUT: Connection timed out after 5000ms')), this.TIMEOUT_MS);
      });

      let balanceData: { balance: string; currency?: string };
      try {
        balanceData = await Promise.race([
          instance.getBalance(),
          timeoutPromise,
        ]);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      latencyMs = Date.now() - startTime;

      const rawBalance = balanceData.balance ?? '0';
      const numBalance = parseFloat(rawBalance) || 0;
      const currency = (balanceData.currency || provider.balanceCurrency || 'USD').toUpperCase().trim();

      // Normalize exchange rate
      let usdRate = 95.0;
      try {
        usdRate = await SettingsProvider.getExchangeRateUSD();
        if (!usdRate || usdRate <= 0) usdRate = 95.0;
      } catch {
        usdRate = 95.0;
      }

      let balanceUsd = 0;
      let balanceRub = 0;

      if (currency === 'USD') {
        balanceUsd = numBalance;
        balanceRub = numBalance * usdRate;
      } else if (currency === 'RUB') {
        balanceRub = numBalance;
        balanceUsd = usdRate > 0 ? numBalance / usdRate : 0;
      } else if (currency === 'EUR') {
        balanceUsd = numBalance * 1.08;
        balanceRub = balanceUsd * usdRate;
      } else {
        balanceUsd = numBalance;
        balanceRub = numBalance * usdRate;
      }

      // 3-tier health evaluation based on USD equivalent
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (balanceUsd > 50) {
        status = 'healthy';
      } else if (balanceUsd >= 10) {
        status = 'warning';
      } else {
        status = 'critical';
      }

      const now = Date.now();
      const result: CachedProviderBalance = {
        providerId: provider.id,
        providerName: provider.name,
        balance: numBalance,
        rawBalance,
        currency,
        balanceUsd: Math.round(balanceUsd * 100) / 100,
        balanceRub: Math.round(balanceRub * 100) / 100,
        status,
        latencyMs,
        cachedAt: now,
        expiresAt: now + this.CACHE_TTL_SECONDS * 1000,
      };

      try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', this.CACHE_TTL_SECONDS);
      } catch (cacheErr) {
        console.warn(`[ProviderBalanceService] Redis write error for ${cacheKey}:`, cacheErr);
      }

      // Update provider SLA metrics in DB
      try {
        const prevAvg = provider.avgResponseMs || 0;
        const newAvg = prevAvg > 0 ? Math.round(prevAvg * 0.7 + latencyMs * 0.3) : latencyMs;
        await db.provider.update({
          where: { id: provider.id },
          data: {
            lastSuccessAt: new Date(),
            avgResponseMs: newAvg,
            errorCount5m: 0,
          },
        });
      } catch (dbErr) {
        console.warn(`[ProviderBalanceService] SLA update failed for provider ${provider.id}:`, dbErr);
      }

      return result;
    } catch (err: unknown) {
      latencyMs = Date.now() - startTime;
      const translated = ProviderDiagnosticService.translateError(err, provider.apiUrl);
      const now = Date.now();

      const errorResult: CachedProviderBalance = {
        providerId: provider.id,
        providerName: provider.name,
        balance: 0,
        rawBalance: '0',
        currency: provider.balanceCurrency || 'USD',
        balanceUsd: 0,
        balanceRub: 0,
        status: 'error',
        latencyMs,
        cachedAt: now,
        expiresAt: now + this.ERROR_CACHE_TTL_SECONDS * 1000,
        error: translated.message,
        suggestedFix: translated.suggestedFix,
      };

      try {
        await redis.set(cacheKey, JSON.stringify(errorResult), 'EX', this.ERROR_CACHE_TTL_SECONDS);
      } catch (cacheErr) {
        console.warn(`[ProviderBalanceService] Redis write error for error record ${cacheKey}:`, cacheErr);
      }

      // Record error in provider SLA metrics
      try {
        await db.provider.update({
          where: { id: provider.id },
          data: {
            lastErrorAt: new Date(),
            errorCount5m: { increment: 1 },
          },
        });
      } catch (dbErr) {
        console.warn(`[ProviderBalanceService] SLA error update failed for provider ${provider.id}:`, dbErr);
      }

      return errorResult;
    }
  }

  /**
   * Retrieves balances for all active providers in parallel.
   */
  async getAllProviderBalances(forceRefresh = false): Promise<CachedProviderBalance[]> {
    const providers = await db.provider.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const balancePromises = providers.map((p) => this.getProviderBalance(p.id, forceRefresh));
    const results = await Promise.allSettled(balancePromises);

    return results.map((res, index) => {
      if (res.status === 'fulfilled') {
        return res.value;
      }
      const provider = providers[index];
      const now = Date.now();
      return {
        providerId: provider.id,
        providerName: provider.name,
        balance: 0,
        rawBalance: '0',
        currency: provider.balanceCurrency || 'USD',
        balanceUsd: 0,
        balanceRub: 0,
        status: 'error',
        latencyMs: 0,
        cachedAt: now,
        expiresAt: now + this.ERROR_CACHE_TTL_SECONDS * 1000,
        error: res.reason?.message || 'Не удалось получить баланс провайдера.',
      };
    });
  }

  /**
   * Calculates aggregated global liquidity across all active providers,
   * including 24h burn rate and estimated runway in days.
   */
  async getGlobalLiquiditySummary(forceRefresh = false): Promise<GlobalLiquiditySummary> {
    const cacheKey = 'providers:global:liquidity';

    if (!forceRefresh) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as GlobalLiquiditySummary;
        }
      } catch (err) {
        console.warn(`[ProviderBalanceService] Redis read error for ${cacheKey}:`, err);
      }
    }

    const providerBalances = await this.getAllProviderBalances(forceRefresh);

    // Calculate 24h burn rate from non-failed orders
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    let burnRate24hRub = 0;
    try {
      const aggregate = await db.order.aggregate({
        _sum: { providerCost: true },
        where: {
          createdAt: { gte: yesterday },
          status: { notIn: ['ERROR', 'CANCELED'] },
        },
      });

      const burnRate24hCents = Number(aggregate._sum.providerCost || 0);
      burnRate24hRub = burnRate24hCents / 100;
    } catch (orderErr) {
      console.warn('[ProviderBalanceService] Failed to query orders for burn rate calculation:', orderErr);
    }

    let totalRub = 0;
    let totalUsd = 0;
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let errorCount = 0;

    for (const p of providerBalances) {
      if (p.status !== 'error') {
        totalRub += p.balanceRub;
        totalUsd += p.balanceUsd;
      }

      if (p.status === 'healthy') healthyCount++;
      else if (p.status === 'warning') warningCount++;
      else if (p.status === 'critical') criticalCount++;
      else if (p.status === 'error') errorCount++;
    }

    const runwayDays = burnRate24hRub > 0 ? Math.floor(totalRub / burnRate24hRub) : null;
    const now = Date.now();

    const summary: GlobalLiquiditySummary = {
      totalRub: Math.round(totalRub * 100) / 100,
      totalUsd: Math.round(totalUsd * 100) / 100,
      activeCount: providerBalances.length,
      healthyCount,
      warningCount,
      criticalCount,
      errorCount,
      burnRate24hRub: Math.round(burnRate24hRub * 100) / 100,
      runwayDays,
      providers: providerBalances,
      cachedAt: now,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(summary), 'EX', this.CACHE_TTL_SECONDS);
    } catch (cacheErr) {
      console.warn(`[ProviderBalanceService] Redis write error for ${cacheKey}:`, cacheErr);
    }

    return summary;
  }
}

export const providerBalanceService = new ProviderBalanceService();
