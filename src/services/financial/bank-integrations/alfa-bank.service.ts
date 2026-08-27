import { getRedisConnection } from '@/lib/queue-manager';
import { logger } from '@/lib/logger';
import Decimal from 'decimal.js';

const log = logger.child({ component: 'AlfaBankService' });

export interface AlfaBankAccountBalance {
  accountNumber: string;
  maskedAccountNumber: string;
  currency: string;
  authorizedBalanceRub: number;
  availableBalanceRub: number;
  lastSyncedAt: string;
  isSandbox: boolean;
  status: 'ACTIVE' | 'BLOCKED' | 'RESTRICTED';
}

export interface AlfaBankSyncResult {
  success: boolean;
  bank?: 'ALFA_BANK';
  account?: AlfaBankAccountBalance;
  error?: string;
  isCached?: boolean;
}

export class AlfaBankService {
  private static readonly REDIS_CACHE_PREFIX = 'bank:balance:alfa';
  private static readonly CACHE_TTL_SECONDS = 3600; // 1 hour cache to prevent rate-limiting

  /**
   * Masks a bank account number (e.g. 40802810900000001234 -> 40802810****1234)
   */
  public static maskAccountNumber(accountNumber: string): string {
    if (!accountNumber || accountNumber.length < 12) {
      return accountNumber || '40802810****0000';
    }
    return `${accountNumber.slice(0, 8)}****${accountNumber.slice(-4)}`;
  }

  /**
   * Retrieves live balance for a tenant from Alfa-Bank Open API or Redis cache.
   */
  public static async getLiveBalance(
    tenantId: string = 'smmplan',
    forceRefresh: boolean = false
  ): Promise<AlfaBankSyncResult> {
    const cacheKey = `${this.REDIS_CACHE_PREFIX}:${tenantId}`;
    const redis = getRedisConnection();

    // 1. Check Redis cache if forceRefresh is false
    if (!forceRefresh) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as AlfaBankAccountBalance;
          return {
            success: true,
            bank: 'ALFA_BANK',
            account: parsed,
            isCached: true,
          };
        }
      } catch (err) {
        log.warn('Failed to read Alfa-Bank balance from Redis cache, proceeding to API', { err });
      }
    }

    // 2. Read credentials from environment variables
    const apiKey = process.env.ALFA_BANK_API_KEY;
    const clientSecret = process.env.ALFA_BANK_CLIENT_SECRET;
    const accountNumber = process.env.ALFA_BANK_ACCOUNT_NUMBER || '40802810500001234567';
    const isSandbox = process.env.ALFA_BANK_IS_SANDBOX !== 'false'; // Default to sandbox/mock if not explicitly disabled

    // 3. Fetch from Alfa-Bank Open API or Sandbox Mock
    try {
      let balanceData: AlfaBankAccountBalance;

      if (!apiKey || isSandbox) {
        // Sandbox Mock Mode for development & testing
        balanceData = {
          accountNumber,
          maskedAccountNumber: this.maskAccountNumber(accountNumber),
          currency: 'RUB',
          authorizedBalanceRub: 1450000.0,
          availableBalanceRub: 1450000.0,
          lastSyncedAt: new Date().toISOString(),
          isSandbox: true,
          status: 'ACTIVE',
        };
      } else {
        // Production Alfa-Bank Open API Request
        const baseUrl = process.env.ALFA_BANK_API_BASE_URL || 'https://business.alfabank.ru/ext-api/v1';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${baseUrl}/accounts`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'X-Client-Secret': clientSecret || '',
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Alfa-Bank API HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as any;
        const matchingAccount = Array.isArray(data.accounts)
          ? data.accounts.find((acc: any) => acc.accountNumber === accountNumber) || data.accounts[0]
          : data;

        if (!matchingAccount) {
          throw new Error(`Account ${accountNumber} not found in Alfa-Bank response`);
        }

        const rawBalance = matchingAccount.balance?.authorizedBalance ?? matchingAccount.balance?.availableBalance ?? 0;
        const cleanBalance = new Decimal(rawBalance).toDecimalPlaces(2).toNumber();

        balanceData = {
          accountNumber: matchingAccount.accountNumber || accountNumber,
          maskedAccountNumber: this.maskAccountNumber(matchingAccount.accountNumber || accountNumber),
          currency: matchingAccount.currency || 'RUB',
          authorizedBalanceRub: cleanBalance,
          availableBalanceRub: cleanBalance,
          lastSyncedAt: new Date().toISOString(),
          isSandbox: false,
          status: matchingAccount.status || 'ACTIVE',
        };
      }

      // 4. Cache in Redis
      try {
        await redis.setex(cacheKey, this.CACHE_TTL_SECONDS, JSON.stringify(balanceData));
      } catch (cacheErr) {
        log.warn('Failed to persist Alfa-Bank balance to Redis cache', { cacheErr });
      }

      log.info(
        `Alfa-Bank account balance synchronized successfully (${balanceData.authorizedBalanceRub} RUB)`,
        { tenantId, balance: balanceData.authorizedBalanceRub, isSandbox: balanceData.isSandbox }
      );

      return {
        success: true,
        bank: 'ALFA_BANK',
        account: balanceData,
        isCached: false,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown Alfa-Bank API Error';
      log.error('Alfa-Bank balance synchronization failed', { err, tenantId });

      return {
        success: false,
        bank: 'ALFA_BANK',
        error: errorMessage,
      };
    }
  }
}
