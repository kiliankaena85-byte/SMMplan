import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { db } from '@/lib/db';
import { adminCatalogService } from '../catalog.service';
import { adminSyncProviderCatalog } from '@/actions/admin/providers/sync-action';
import { providerService } from '@/services/providers/provider.service';

vi.mock('@/lib/notifications', () => ({
  sendAdminAlert: vi.fn(),
}));

vi.mock('@/lib/server/rbac', () => ({
  requireStaffPermission: vi.fn((section, action, cb) => cb({ id: 'admin-1', email: 'admin@test.com' })),
}));

vi.mock('@/lib/redis-lock', () => ({
  MutexManager: {
    withLock: vi.fn((key, ttl, retry, cb) => cb()),
  },
}));

describe('Active Service Price Drift Detection', () => {
  let provider: any;
  let category: any;
  let service: any;
  let mockRate = 1.0;
  
  beforeEach(async () => {
    // Seed settings in DB
    await db.systemSettings.upsert({
      where: { id: 'global' },
      update: { quarantineThreshold: 0.20, exchangeRateUSD: 90.0 },
      create: { id: 'global', quarantineThreshold: 0.20, exchangeRateUSD: 90.0 },
    });

    const network = await db.network.create({
      data: { name: 'Instagram', slug: 'instagram' },
    });
    
    category = await db.category.create({
      data: { name: 'Likes', networkId: network.id },
    });
    
    provider = await db.provider.create({
      data: {
        name: 'Test SMM Provider',
        apiUrl: 'https://api.testprovider.com',
        apiKey: 'encrypted-key',
        isActive: true,
        balanceCurrency: 'USD',
      },
    });

    service = await db.service.create({
      data: {
        name: 'Instagram Likes Drift Test',
        rate: 1.0,
        markup: 3.0,
        categoryId: category.id,
        providerId: provider.id,
        externalId: '101',
        providerCurrency: 'USD',
        pricePer1000Cents: 300,
        isActive: true,
      },
    });

    // Mock the providerInstance
    vi.spyOn(providerService, 'getProviderInstance').mockImplementation(() => {
      return {
        getServices: async () => [
          {
            service: '101',
            name: 'Instagram Likes Drift Test',
            rate: mockRate.toString(),
            min: '10',
            max: '10000',
            category: 'Likes',
          }
        ]
      } as any;
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  it('should not quarantine on a single small price change and should log history', async () => {
    mockRate = 1.05; // +5% drift

    const result = await adminCatalogService.syncProviderCatalog(provider.id, { id: 'admin-1', email: 'admin@test.com' });
    expect(result.priceAnomalies).toBe(0);
    expect(result.priceUpdatedSilent).toBe(1);

    // Verify rate in service table updated
    const updatedService = await db.service.findUniqueOrThrow({ where: { id: service.id } });
    expect(updatedService.rate).toBe(1.05);
    expect(updatedService.isQuarantined).toBe(false);

    // Verify history logs
    const history = await db.servicePriceHistory.findMany({
      where: { serviceId: service.id },
      orderBy: { createdAt: 'asc' },
    });
    // First record was auto-created for the old rate ($1.00), and second record for the new rate ($1.05)
    expect(history).toHaveLength(2);
    expect(history[0].rate).toBe(1.0);
    expect(history[1].rate).toBe(1.05);
  });

  it('should prevent database bloat by not creating history records if the price is unchanged', async () => {
    mockRate = 1.0; // unchanged

    const result = await adminCatalogService.syncProviderCatalog(provider.id, { id: 'admin-1', email: 'admin@test.com' });
    expect(result.priceUpdatedSilent).toBe(0);

    const history = await db.servicePriceHistory.findMany({
      where: { serviceId: service.id },
    });
    expect(history).toHaveLength(0);
  });

  it('should quarantine service when cumulative price drift over 30 days exceeds 20%', async () => {
    // Week 1: +5% price increase
    mockRate = 1.05;
    let syncRes = await adminCatalogService.syncProviderCatalog(provider.id, { id: 'admin-1', email: 'admin@test.com' });
    expect(syncRes.priceAnomalies).toBe(0);

    // Manipulate history timestamps to simulate rolling 30-day window
    const firstHistory = await db.servicePriceHistory.findFirst({
      where: { serviceId: service.id, rate: 1.0 }
    });
    if (firstHistory) {
      await db.servicePriceHistory.update({
        where: { id: firstHistory.id },
        data: { createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) } // 31 days ago
      });
    }

    // Week 2: another +5% (rate: 1.10)
    mockRate = 1.10;
    syncRes = await adminCatalogService.syncProviderCatalog(provider.id, { id: 'admin-1', email: 'admin@test.com' });
    expect(syncRes.priceAnomalies).toBe(0);

    // Week 3: another +5% (rate: 1.15)
    mockRate = 1.15;
    syncRes = await adminCatalogService.syncProviderCatalog(provider.id, { id: 'admin-1', email: 'admin@test.com' });
    expect(syncRes.priceAnomalies).toBe(0);

    // Week 4: +6% (rate: 1.21). Total cumulative drift is 21% from the baseline ($1.00)
    mockRate = 1.21;
    syncRes = await adminCatalogService.syncProviderCatalog(provider.id, { id: 'admin-1', email: 'admin@test.com' });
    expect(syncRes.priceAnomalies).toBe(1);

    // Service should be quarantined
    const quarantinedService = await db.service.findUniqueOrThrow({ where: { id: service.id } });
    expect(quarantinedService.isQuarantined).toBe(true);
    expect(quarantinedService.rate).toBe(1.15); // Rate remains at last approved rate
    expect(quarantinedService.pendingRate).toBe(1.21);
    expect(quarantinedService.quarantineReason).toContain('Cumulative Price Drift');
    expect(quarantinedService.quarantineReason).toContain('+21.0%');
  });

  it('should not quarantine on price drops', async () => {
    // Price drops to 0.80 (-20%)
    mockRate = 0.80;

    const result = await adminCatalogService.syncProviderCatalog(provider.id, { id: 'admin-1', email: 'admin@test.com' });
    expect(result.priceAnomalies).toBe(0);

    const updatedService = await db.service.findUniqueOrThrow({ where: { id: service.id } });
    expect(updatedService.rate).toBe(0.80);
    expect(updatedService.isQuarantined).toBe(false);

    const history = await db.servicePriceHistory.findMany({
      where: { serviceId: service.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(history[0].rate).toBe(0.80);
  });

  it('should quarantine and record history in manual adminSyncProviderCatalog action', async () => {
    mockRate = 1.25; // instant 25% spike
    
    const actionResult = await adminSyncProviderCatalog();
    expect(actionResult.success).toBe(true);
    if (!actionResult.success) throw new Error('Action failed');
    expect(actionResult.stats?.disabledCount).toBe(1); // flagged as quarantined (disabled)

    const updatedService = await db.service.findUniqueOrThrow({ where: { id: service.id } });
    expect(updatedService.isQuarantined).toBe(true);
    expect(updatedService.pendingRate).toBe(1.25);
  });
});
