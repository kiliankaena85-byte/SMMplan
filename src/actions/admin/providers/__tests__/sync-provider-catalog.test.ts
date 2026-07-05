import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { adminCatalogService } from '@/services/admin/catalog.service';
import { providerService } from '@/services/providers/provider.service';
import { SettingsProvider } from '@/lib/settings';

// Mock verifySession to control roles per test
vi.mock('@/lib/session', async (importOriginal: any) => {
  const actual = await importOriginal();
  return {
    ...actual,
    verifySession: vi.fn(),
  };
});

// Mock provider instance
const mockGetServices = vi.fn();
vi.mock('@/services/providers/provider.service', () => ({
  providerService: {
    getProviderInstance: vi.fn().mockImplementation(() => ({
      getServices: mockGetServices
    })),
    getDefaultProvider: vi.fn().mockImplementation(() => ({
      getServices: mockGetServices
    })),
    getServicesWithCache: vi.fn().mockImplementation(async (config: any, providerInstance: any) => {
      return providerInstance.getServices();
    })
  }
}));

describe.sequential('Zombie Eraser & Pricing Auto-recalculation / Quarantine Tests', () => {
  let adminUser: any;
  let provider: any;
  let category: any;
  let serviceA: any;
  let serviceB: any;

  beforeEach(async () => {
    // 2. Setup systemSettings with exchange rates
    await db.systemSettings.upsert({
      where: { id: 'global' },
      update: { isTestMode: true, exchangeRateUSD: 100.0 },
      create: { id: 'global', isTestMode: true, exchangeRateUSD: 100.0 },
    });

    // 3. Create Admin
    adminUser = {
      id: 'admin-id',
      email: 'admin_sync@smmplan.local',
      role: 'SUPERADMIN',
    };

    // 4. Create provider
    provider = await db.provider.create({
      data: {
        name: 'Sync Test Provider',
        apiUrl: 'http://localhost/api/sync',
        apiKey: 'key-sync',
        balanceCurrency: 'USD',
        isActive: true,
        syncLock: false
      }
    });

    // 5. Create social network and category
    const network = await db.network.create({
      data: { name: 'Telegram', slug: 'telegram' }
    });

    category = await db.category.create({
      data: { name: 'TG Views', networkId: network.id }
    });

    // 6. Pre-create active services
    // Service A: rate = 0.50 USD/1k, markup = 6.0 (x6), retail price = 300 RUB
    serviceA = await db.service.create({
      data: {
        name: 'TG Views Fast',
        categoryId: category.id,
        providerId: provider.id,
        rate: 0.50,
        markup: 6.0,
        pricePer1000Cents: 30000, // 0.5 * 6 * 100 * 100
        minQty: 10,
        maxQty: 10000,
        externalId: 'ext-303',
        isActive: true
      }
    });

    // Service B: rate = 1.00 USD/1k, markup = 1.2 (very low markup), retail price = 120 RUB
    serviceB = await db.service.create({
      data: {
        name: 'TG Views High Quality',
        categoryId: category.id,
        providerId: provider.id,
        rate: 1.00,
        markup: 1.2,
        pricePer1000Cents: 12000, // 1 * 1.2 * 100 * 100
        minQty: 10,
        maxQty: 10000,
        externalId: 'ext-404',
        isActive: true
      }
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should mark services deleted by the provider as inactive (Zombie Eraser)', async () => {
    // Provider catalog does NOT contain ext-303 (Service A is now a Zombie!)
    // But does contain ext-404
    mockGetServices.mockResolvedValue([
      { service: 'ext-404', name: 'TG Views High Quality', rate: '1.00', min: '10', max: '10000', category: 'TG Views' }
    ]);

    const res = await adminCatalogService.syncProviderCatalog(provider.id, adminUser);
    expect(res.zombiesDisabled).toBe(1);
    expect(res.resurrected).toBe(0);

    // Verify Service A (Zombie) is deactivated in DB
    const serviceADb = await db.service.findUnique({ where: { id: serviceA.id } });
    expect(serviceADb?.isActive).toBe(false);
    expect(serviceADb?.cooldownReason).toBe('ZOMBIE_AUTO_DISABLED');

    // Service B should remain active
    const serviceBDb = await db.service.findUnique({ where: { id: serviceB.id } });
    expect(serviceBDb?.isActive).toBe(true);
  });

  it('should auto-fix margin floor breaches (markup < 5.0) to 5.0 and recalculate pricing instead of quarantining', async () => {
    // Provider catalog contains ext-404 but price hiked from $1.00 to $1.25
    // With rate = $1.25, markup = 1.2, retail = 1.2 * 1.0 * 100 = 120 RUB per 1k.
    // Since markup is 1.2 (which is < 5.0), the engine auto-fixes the markup to 5.0
    // and updates retail price using rate $1.25, exchange rate 100.0, markup 5.0:
    // Retail = 1.25 * 5.0 * 100 = 625 RUB per 1k -> beautiful rounded to 630 RUB -> 63000 cents.
    mockGetServices.mockResolvedValue([
      { service: 'ext-303', name: 'TG Views Fast', rate: '0.50', min: '10', max: '10000', category: 'TG Views' },
      { service: 'ext-404', name: 'TG Views High Quality', rate: '1.25', min: '10', max: '10000', category: 'TG Views' }
    ]);

    const res = await adminCatalogService.syncProviderCatalog(provider.id, adminUser);
    expect(res.marginFloorBreaches).toBe(0);
    expect(res.priceAnomalies).toBe(1); // Service B still quarantines for Price Spike (>20%) after auto-fix

    // Service B should be quarantined for Price Spike, not Margin Floor Breach
    const serviceBDb = await db.service.findUnique({ where: { id: serviceB.id } });
    expect(serviceBDb?.isQuarantined).toBe(true);
    expect(serviceBDb?.quarantineReason).toContain('Price Spike');
    expect(serviceBDb?.pendingRate).toBe(1.25);
    expect(serviceBDb?.markup).toBe(5.0);
    expect(serviceBDb?.pricePer1000Cents).toBe(63000);

    // Verify AdminAuditLog entry was created for the auto-fix
    const autoFixLog = await db.adminAuditLog.findFirst({
      where: {
        action: 'SERVICE_AUTO_FIX',
        target: serviceB.id,
      },
    });
    expect(autoFixLog).toBeDefined();
    expect(autoFixLog?.adminEmail).toBe('system@smmplan.pro');
    const oldVal = JSON.parse(autoFixLog?.oldValue || '{}');
    const newVal = JSON.parse(autoFixLog?.newValue || '{}');
    expect(oldVal.markup).toBe(1.2);
    expect(newVal.markup).toBe(5.0);
  });

  it('should detect a price spike anomaly (>20% increase) and quarantine the service safely', async () => {
    // Provider catalog contains ext-303, but price hiked from $0.50 to $0.65 (+30% increase)
    mockGetServices.mockResolvedValue([
      { service: 'ext-303', name: 'TG Views Fast', rate: '0.65', min: '10', max: '10000', category: 'TG Views' },
      { service: 'ext-404', name: 'TG Views High Quality', rate: '1.00', min: '10', max: '10000', category: 'TG Views' }
    ]);

    const res = await adminCatalogService.syncProviderCatalog(provider.id, adminUser);
    expect(res.priceAnomalies).toBe(1);

    // Service A should be quarantined for price spike!
    const serviceADb = await db.service.findUnique({ where: { id: serviceA.id } });
    expect(serviceADb?.isQuarantined).toBe(true);
    expect(serviceADb?.quarantineReason).toContain('Price Spike');
    expect(serviceADb?.pendingRate).toBe(0.65);
  });

  it('should safely auto-update pricing silently if price drift is minor and positive', async () => {
    // Provider catalog contains ext-303, price drift is minor: $0.50 to $0.53 (+6% increase, below 20% anomaly threshold)
    mockGetServices.mockResolvedValue([
      { service: 'ext-303', name: 'TG Views Fast', rate: '0.53', min: '10', max: '10000', category: 'TG Views' },
      { service: 'ext-404', name: 'TG Views High Quality', rate: '1.00', min: '10', max: '10000', category: 'TG Views' }
    ]);

    const res = await adminCatalogService.syncProviderCatalog(provider.id, adminUser);
    expect(res.priceUpdatedSilent).toBe(1);

    // Service A price should be silently updated: rate = 0.53, retail price: 0.53 * 6.0 * 100 = 318 -> beautiful rounding to 320 RUB -> 32000 cents
    const serviceADb = await db.service.findUnique({ where: { id: serviceA.id } });
    expect(serviceADb?.rate).toBe(0.53);
    expect(serviceADb?.pricePer1000Cents).toBe(32000);
    expect(serviceADb?.isQuarantined).toBe(false);
  });
});
