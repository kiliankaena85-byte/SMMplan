import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db';
import catalogProcessor from '@/workers/processors/catalog.processor';
import { UPPER_SANITY_LIMIT_RUB } from '@/lib/financial-constants';

vi.mock('@/lib/revalidate-cache', () => ({
  triggerCacheRevalidation: vi.fn().mockResolvedValue(true),
}));

describe('Price Reconciler Engine (P-D Unit Tests)', () => {
  beforeEach(async () => {
    // Set system exchange rate to 100.0
    await db.systemSettings.upsert({
      where: { id: 'smmplan' },
      update: { isTestMode: true, exchangeRateUSD: 100.0 },
      create: { id: 'smmplan', isTestMode: true, exchangeRateUSD: 100.0 },
    });
  });

  async function createFixtures() {
    const ts = Date.now() + Math.floor(Math.random() * 1000000);
    const network = await db.network.create({
      data: { name: `Reconciler Net ${ts}`, slug: `rec-net-${ts}` },
    });
    const category = await db.category.create({
      data: { name: `Reconciler Cat ${ts}`, networkId: network.id },
    });
    const provider = await db.provider.create({
      data: {
        name: `Reconciler Provider ${ts}`,
        apiUrl: `http://localhost/api/prov-rec-${ts}`,
        apiKey: `key-rec-${ts}`,
        balanceCurrency: 'RUB',
        isActive: true,
      },
    });
    return { network, category, provider };
  }

  it('1. Updates costPer1kRub when cost drifts > 2% without changing retail price', async () => {
    const { category, provider } = await createFixtures();
    // Service has old cost 100.0, but rate is 110.0 (+10% drift)
    const service = await db.service.create({
      data: {
        name: 'Drifting Cost Service',
        categoryId: category.id,
        providerId: provider.id,
        providerCurrency: 'RUB',
        rate: 110.0,
        costPer1kRub: 100.0,
        markup: 3.0,
        pricePer1000Cents: 33000, // 330.00 RUB
        minQty: 10,
        maxQty: 1000,
        isActive: true,
        isQuarantined: false,
      },
    });

    await catalogProcessor({
      id: 'job-rec-1',
      data: { type: 'RECONCILE_PRICES', batchSize: 100 },
    } as any);

    const updated = await db.service.findUniqueOrThrow({ where: { id: service.id } });
    expect(updated.costPer1kRub).toBe(110.0); // Cost cache fixed to 110.0
    expect(updated.pricePer1000Cents).toBe(33000); // Retail UNCHANGED
    expect(updated.isActive).toBe(true);
    expect(updated.isQuarantined).toBe(false);
  });

  it('2. Quarantines service when retail price per 1k is below purchase cost (Loss Prevention)', async () => {
    const { category, provider } = await createFixtures();
    // Rate is 500.0 RUB, but retail price is only 300.0 RUB (30000 cents) -> Loss!
    const service = await db.service.create({
      data: {
        name: 'Loss Making Service',
        categoryId: category.id,
        providerId: provider.id,
        providerCurrency: 'RUB',
        rate: 500.0,
        costPer1kRub: 500.0,
        markup: 0.6,
        pricePer1000Cents: 30000, // 300.00 RUB < 500.00 RUB cost
        minQty: 10,
        maxQty: 1000,
        isActive: true,
        isQuarantined: false,
      },
    });

    await catalogProcessor({
      id: 'job-rec-2',
      data: { type: 'RECONCILE_PRICES', batchSize: 100 },
    } as any);

    const updated = await db.service.findUniqueOrThrow({ where: { id: service.id } });
    expect(updated.isQuarantined).toBe(true);
    expect(updated.isActive).toBe(false);
    expect(updated.quarantineReason).toContain('Loss Prevention');
  });

  it('3. Quarantines service when retail price exceeds UPPER_SANITY_LIMIT_RUB (50,000 ₽)', async () => {
    const { category, provider } = await createFixtures();
    // Retail is 60,000 RUB (6,000,000 cents)
    const service = await db.service.create({
      data: {
        name: 'Insane Price Service',
        categoryId: category.id,
        providerId: provider.id,
        providerCurrency: 'RUB',
        rate: 20000.0,
        costPer1kRub: 20000.0,
        markup: 3.0,
        pricePer1000Cents: 6000000, // 60,000.00 RUB > 50,000 limit
        minQty: 10,
        maxQty: 1000,
        isActive: true,
        isQuarantined: false,
      },
    });

    await catalogProcessor({
      id: 'job-rec-3',
      data: { type: 'RECONCILE_PRICES', batchSize: 100 },
    } as any);

    const updated = await db.service.findUniqueOrThrow({ where: { id: service.id } });
    expect(updated.isQuarantined).toBe(true);
    expect(updated.isActive).toBe(false);
    expect(updated.quarantineReason).toContain('Upper Sanity Limit Exceeded');
  });

  it('4. Quarantines service when provider currency is invalid', async () => {
    const { category, provider } = await createFixtures();
    const service = await db.service.create({
      data: {
        name: 'Invalid Currency Service',
        categoryId: category.id,
        providerId: provider.id,
        providerCurrency: 'UNKNOWN_CURR',
        rate: 100.0,
        costPer1kRub: 100.0,
        markup: 3.0,
        pricePer1000Cents: 30000,
        minQty: 10,
        maxQty: 1000,
        isActive: true,
        isQuarantined: false,
      },
    });

    await catalogProcessor({
      id: 'job-rec-4',
      data: { type: 'RECONCILE_PRICES', batchSize: 100 },
    } as any);

    const updated = await db.service.findUniqueOrThrow({ where: { id: service.id } });
    expect(updated.isQuarantined).toBe(true);
    expect(updated.isActive).toBe(false);
    expect(updated.quarantineReason).toContain('Invalid Currency');
  });
});
