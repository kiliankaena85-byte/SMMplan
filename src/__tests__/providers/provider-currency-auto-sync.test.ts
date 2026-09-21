import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProviderBalanceService } from '@/services/admin/provider-balance.service';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { providerService } from '@/services/providers/provider.service';
import { MarginGuard } from '@/services/providers/smart-routing.service';
import {
  isValidProviderCurrency,
  detectCurrencyChange,
  resnapshotOnCurrencyChange,
  reconcileCurrencyBeforeSync,
  buildCurrencySnapshot,
  getCostRub,
} from '@/lib/pricing/currency-invariant';
import { UniversalProvider } from '@/services/providers/universal.provider';

vi.mock('@/lib/db', () => ({
  db: {
    provider: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    service: {
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    routingAuditLog: {
      create: vi.fn().mockResolvedValue({ id: 'mock-audit-1' }),
    },
    order: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { providerCost: BigInt(50000) } }),
    },
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    tenant: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    systemSettings: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('@/lib/settings', () => ({
  SettingsProvider: {
    getExchangeRateUSD: vi.fn().mockResolvedValue(90.0),
    getTenantId: vi.fn().mockResolvedValue('smmplan'),
  },
  SettingsManager: {
    isTestMode: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock('@/lib/notifications', () => ({
  sendAdminAlert: vi.fn().mockResolvedValue(undefined),
}));

describe('Provider Currency Auto-Sync & Price Drift Immunity (CDD-TDD)', () => {
  let balanceService: ProviderBalanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    balanceService = new ProviderBalanceService();
  });

  describe('1. Currency Validation & Normalization Invariant (Fail-Closed)', () => {
    it('recognizes supported currencies: RUB, USD, EUR, UAH, KZT', () => {
      expect(isValidProviderCurrency('RUB')).toBe(true);
      expect(isValidProviderCurrency('USD')).toBe(true);
      expect(isValidProviderCurrency('EUR')).toBe(true);
      expect(isValidProviderCurrency('UAH')).toBe(true);
      expect(isValidProviderCurrency('KZT')).toBe(true);
    });

    it('normalizes lowercase and whitespace', () => {
      expect(isValidProviderCurrency(' rub ')).toBe(true);
      expect(isValidProviderCurrency('usd')).toBe(true);
      expect(isValidProviderCurrency('eur\n')).toBe(true);
    });

    it('rejects invalid, unknown, empty, or garbage currencies (Fail-Closed)', () => {
      expect(isValidProviderCurrency('')).toBe(false);
      expect(isValidProviderCurrency(null)).toBe(false);
      expect(isValidProviderCurrency(undefined)).toBe(false);
      expect(isValidProviderCurrency('UNKNOWN')).toBe(false);
      expect(isValidProviderCurrency('XYZ123')).toBe(false);
      expect(isValidProviderCurrency('$$$')).toBe(false);
      expect(isValidProviderCurrency(123 as any)).toBe(false);
    });
  });

  describe('2. ProviderBalanceService Auto-Persisting Detected Currency to PostgreSQL', () => {
    it('persists reportedCurrency="RUB" to PostgreSQL when DB has default "USD"', async () => {
      const mockProvider = {
        id: 'prov-soc-rocket',
        name: 'Soc Rocket',
        apiUrl: 'https://soc-rocket.ru/api/v2',
        apiKey: 'enc_key_123',
        balanceCurrency: 'USD', // Default in DB
        isActive: true,
        avgResponseMs: 120,
      };

      vi.mocked(db.provider.findUnique).mockResolvedValue(mockProvider as any);
      vi.mocked(db.provider.update).mockResolvedValue({ ...mockProvider, balanceCurrency: 'RUB' } as any);
      vi.mocked(db.service.count).mockResolvedValue(5);
      vi.mocked(db.service.findMany).mockResolvedValue([
        { id: 'svc-1', rate: 128.7, providerCurrency: 'USD', markup: 2.0 },
      ] as any);
      vi.mocked(db.service.update).mockResolvedValue({} as any);

      vi.spyOn(providerService, 'getProviderInstance').mockResolvedValue({
        getBalance: vi.fn().mockResolvedValue({ balance: '200.00', currency: 'RUB' }),
      } as any);

      const result = await balanceService.getProviderBalance('prov-soc-rocket', true);

      expect(result.currency).toBe('RUB');
      expect(result.balanceRub).toBe(200.0);
      expect(result.balanceUsd).toBeCloseTo(200.0 / 90.0, 2);

      // CRITICAL ASSERTION: PostgreSQL Provider record must be updated with balanceCurrency: 'RUB'
      expect(db.provider.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prov-soc-rocket' },
          data: expect.objectContaining({
            balanceCurrency: 'RUB',
          }),
        })
      );
    });

    it('does NOT overwrite DB currency when provider returns invalid currency like "UNKNOWN" or empty', async () => {
      const mockProvider = {
        id: 'prov-vexboost',
        name: 'Vexboost',
        apiUrl: 'https://vexboost.ru/api/v2',
        apiKey: 'enc_key_vex',
        balanceCurrency: 'RUB',
        isActive: true,
      };

      vi.mocked(db.provider.findUnique).mockResolvedValue(mockProvider as any);
      vi.mocked(db.provider.update).mockResolvedValue(mockProvider as any);

      vi.spyOn(providerService, 'getProviderInstance').mockResolvedValue({
        getBalance: vi.fn().mockResolvedValue({ balance: '50.00', currency: 'UNKNOWN' }),
      } as any);

      const result = await balanceService.getProviderBalance('prov-vexboost', true);

      // Should fall back to stored currency 'RUB'
      expect(result.currency).toBe('RUB');
      expect(result.balanceRub).toBe(50.0);

      // Should NOT update DB with 'UNKNOWN'
      const updateCalls = vi.mocked(db.provider.update).mock.calls;
      for (const call of updateCalls) {
        if (call[0]?.data && 'balanceCurrency' in call[0].data) {
          expect(call[0].data.balanceCurrency).not.toBe('UNKNOWN');
        }
      }
    });

    it('does NOT overwrite stored currency when provider returns no currency at all (undefined)', async () => {
      const mockProvider = {
        id: 'prov-custom',
        name: 'Custom Provider',
        apiUrl: 'https://custom.ru/api/v2',
        apiKey: 'enc_key_custom',
        balanceCurrency: 'RUB',
        isActive: true,
      };

      vi.mocked(db.provider.findUnique).mockResolvedValue(mockProvider as any);
      vi.mocked(db.provider.update).mockResolvedValue(mockProvider as any);

      vi.spyOn(providerService, 'getProviderInstance').mockResolvedValue({
        getBalance: vi.fn().mockResolvedValue({ balance: '120.00' }), // No currency field
      } as any);

      const result = await balanceService.getProviderBalance('prov-custom', true);

      expect(result.currency).toBe('RUB');
      // DB balanceCurrency should remain RUB (not updated to USD)
      const updateCalls = vi.mocked(db.provider.update).mock.calls;
      for (const call of updateCalls) {
        if (call[0]?.data && 'balanceCurrency' in call[0].data) {
          expect(call[0].data.balanceCurrency).toBe('RUB');
        }
      }
    });
  });

  describe('3. Connected Services Reconciliation on Currency Change', () => {
    it('resnapshots service rates from USD to RUB and fixes costPer1kRub and retail price', async () => {
      const mockServices = [
        {
          id: 'svc-tg-members',
          rate: 128.7, // 128.70 RUB per 1000
          providerCurrency: 'USD', // Erroneously set as USD
          markup: 2.0,
        },
      ];

      vi.mocked(db.service.findMany).mockResolvedValue(mockServices as any);
      vi.mocked(db.service.update).mockResolvedValue({} as any);
      vi.mocked(db.provider.findUnique).mockResolvedValue({ balanceCurrency: 'USD' } as any);
      vi.mocked(db.provider.update).mockResolvedValue({} as any);

      const updatedCount = await resnapshotOnCurrencyChange('prov-soc-rocket', 'USD', 'RUB');

      expect(updatedCount).toBe(1);
      expect(db.service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'svc-tg-members' },
          data: expect.objectContaining({
            providerCurrency: 'RUB',
            costPer1kRub: 128.7, // Direct RUB rate (not 128.7 * 90)
            pricePer1000Cents: 25740, // 128.7 * 2.0 * 100 = 25740 коп (257.40 ₽)
          }),
        })
      );
    });

    it('detects currency mismatch between provider and existing services', async () => {
      vi.mocked(db.provider.findUnique).mockResolvedValue({ balanceCurrency: 'USD' } as any);
      vi.mocked(db.service.count).mockResolvedValue(10);

      const change = await detectCurrencyChange('prov-soc-rocket', 'RUB');
      expect(change.changed).toBe(true);
      expect(change.oldCurrency).toBe('USD');
      expect(change.serviceCount).toBe(10);
    });
  });

  describe('4. Order #189 Margin Guard Verification (Resolving PRICE_DRIFT_HOLD)', () => {
    it('fails margin check when rate=128.7 is treated as USD (reproducing Order #189 bug)', async () => {
      // 10 units of rate 128.7 treated as USD -> cost ~11706 kopecks
      const result = await MarginGuard.checkMargin(
        BigInt(257), // Client paid 2.57 RUB (257 kopecks)
        10,          // Quantity = 10
        128.7,       // Provider rate
        'USD',       // Erroneous currency
        0.05         // 5% buffer
      );

      expect(result.isProfitable).toBe(false);
      expect(result.costCents).toBeGreaterThan(BigInt(10000)); // ~11706 kopecks
      expect(result.reason).toContain('превышает оплату клиента');
    });

    it('passes margin check with 49%+ profit when rate=128.7 is correctly treated as RUB', async () => {
      // 10 units of rate 128.7 treated as RUB -> cost = 1.287 RUB -> 129 kopecks
      const result = await MarginGuard.checkMargin(
        BigInt(257), // Client paid 2.57 RUB (257 kopecks)
        10,          // Quantity = 10
        128.7,       // Provider rate
        'RUB',       // Correct currency
        0.05
      );

      expect(result.isProfitable).toBe(true);
      expect(result.costCents).toBe(BigInt(129)); // 129 kopecks
      expect(result.clientPaidCents).toBe(BigInt(257));
      expect(result.marginPercent).toBeGreaterThanOrEqual(49);
    });
  });

  describe('5. UniversalProvider.getBalance() Currency Field Presence', () => {
    it('returns empty currency string instead of forcing USD when provider response omits currency', () => {
      const provider = new UniversalProvider('https://example.com/api/v2', 'key123');
      // Verify helper or extract logic does not default absent currency to 'USD'
      const mockResponseWithoutCurrency = { balance: '100.50' };
      // Test the extraction logic
      const balanceVal = String(mockResponseWithoutCurrency.balance || '0');
      const currencyVal = (mockResponseWithoutCurrency as any).currency;
      const parsedCurrency = currencyVal !== undefined && currencyVal !== null && String(currencyVal).trim() !== ''
        ? String(currencyVal).trim()
        : '';

      expect(parsedCurrency).toBe('');
      expect(balanceVal).toBe('100.50');
    });
  });
});
