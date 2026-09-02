import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { marketingService } from '@/services/marketing.service';
import { servicesLifecycleService } from '@/services/admin/services-lifecycle.service';
import { getServicesByCategoryAction } from '@/actions/order/catalog';
import { verifySession } from '@/lib/session';

vi.mock('@/lib/session', () => ({
  verifySession: vi.fn(),
}));

describe('Private Catalog Access & Customer Groups Suite', () => {
  let vipGroup: any;
  let wholesaleGroup: any;
  let category: any;
  let publicService: any;
  let vipOnlyService: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    category = await db.category.create({
      data: {
        name: `Test Category ${Date.now()}`,
        slug: `test-cat-${Date.now()}`,
        tenantId: 'smmplan',
      },
    });

    vipGroup = await db.customerGroup.create({
      data: {
        name: 'VIP Club',
        slug: `vip-${Date.now()}`,
        discountPercent: 10.0,
        tenantId: 'smmplan',
      },
    });

    wholesaleGroup = await db.customerGroup.create({
      data: {
        name: 'Wholesale B2B',
        slug: `wholesale-${Date.now()}`,
        discountPercent: 0.0,
        tenantId: 'smmplan',
      },
    });

    publicService = await db.service.create({
      data: {
        name: 'Public Telegram Members',
        categoryId: category.id,
        rate: 1.0,
        providerCurrency: 'RUB',
        markup: 2.0,
        minQty: 10,
        maxQty: 10000,
        tenantId: 'smmplan',
        isActive: true,
      },
    });

    vipOnlyService = await db.service.create({
      data: {
        name: 'VIP Telegram Instant Members (Secret)',
        categoryId: category.id,
        rate: 2.0,
        providerCurrency: 'RUB',
        markup: 3.0,
        minQty: 10,
        maxQty: 50000,
        tenantId: 'smmplan',
        isActive: true,
      },
    });

    await db.serviceCustomerAccess.create({
      data: {
        serviceId: vipOnlyService.id,
        customerGroupId: vipGroup.id,
        isCustomPrice: true,
        customPriceRub: 4.50,
      },
    });
  });

  it('allows guests to see only public services and hides private services from the catalog', async () => {
    vi.mocked(verifySession).mockResolvedValue(null as any);

    const catalog = await getServicesByCategoryAction(category.id, 'smmplan');

    const publicItem = catalog.find((s) => s.id === publicService.id);
    const privateItem = catalog.find((s) => s.id === vipOnlyService.id);

    expect(publicItem).toBeDefined();
    expect(privateItem).toBeUndefined();
  });

  it('hides private services from users belonging to a different group', async () => {
    const wholesaleUser = await db.user.create({
      data: {
        email: `wholesale_${Date.now()}@smmplan.pro`,
        customerGroupId: wholesaleGroup.id,
        tenantId: 'smmplan',
      },
    });

    vi.mocked(verifySession).mockResolvedValue({
      userId: wholesaleUser.id,
      sessionId: 'sess_wholesale',
      role: 'USER',
      sessionVer: 1,
    } as any);

    const catalog = await getServicesByCategoryAction(category.id, 'smmplan');

    const publicItem = catalog.find((s) => s.id === publicService.id);
    const privateItem = catalog.find((s) => s.id === vipOnlyService.id);

    expect(publicItem).toBeDefined();
    expect(privateItem).toBeUndefined();
  });

  it('shows private services with custom price and EXCLUSIVE badge to authorized group members', async () => {
    const vipUser = await db.user.create({
      data: {
        email: `vip_user_${Date.now()}@smmplan.pro`,
        customerGroupId: vipGroup.id,
        tenantId: 'smmplan',
      },
    });

    vi.mocked(verifySession).mockResolvedValue({
      userId: vipUser.id,
      sessionId: 'sess_vip',
      role: 'USER',
      sessionVer: 1,
    } as any);

    const catalog = await getServicesByCategoryAction(category.id, 'smmplan');

    const publicItem = catalog.find((s) => s.id === publicService.id);
    const privateItem = catalog.find((s) => s.id === vipOnlyService.id);

    expect(publicItem).toBeDefined();
    expect(privateItem).toBeDefined();
    expect(privateItem?.badge).toBe('ЭКСКЛЮЗИВ');
    expect(privateItem?.isExclusive).toBe(true);
    expect(privateItem?.pricePer1kRub).toBe(4.5);
    expect(privateItem?.pricePerUnitRub).toBe(0.0045);
  });

  it('blocks price calculation and checkout for guests on private services', async () => {
    await expect(
      marketingService.calculatePrice(null, vipOnlyService.id, 100)
    ).rejects.toThrow(/Услуга недоступна для вашего аккаунта/i);
  });

  it('blocks price calculation and checkout for users outside the authorized group', async () => {
    const regularUser = await db.user.create({
      data: {
        email: `regular_${Date.now()}@smmplan.pro`,
        tenantId: 'smmplan',
      },
    });

    await expect(
      marketingService.calculatePrice(regularUser.id, vipOnlyService.id, 100)
    ).rejects.toThrow(/Услуга недоступна для вашего аккаунта/i);
  });

  it('accurately calculates custom price and applies discounts for authorized group members', async () => {
    const vipUser = await db.user.create({
      data: {
        email: `vip_pricing_${Date.now()}@smmplan.pro`,
        customerGroupId: vipGroup.id,
        tenantId: 'smmplan',
      },
    });

    // 1000 units of vipOnlyService:
    // base custom price = 4.50 RUB = 450 cents
    // VIP group has 10% discount -> 405 cents
    const pricing = await marketingService.calculatePrice(vipUser.id, vipOnlyService.id, 1000);

    expect(pricing.originalTotalCents).toBe(450);
    expect(pricing.totalCents).toBe(405);
    expect(pricing.discountPercent).toBe(10);
  });

  it('assigns and revokes customer groups via lifecycle service correctly', async () => {
    const mockAdmin = { id: 'admin_test_1', email: 'admin@smmplan.pro' };

    const newGroup = await servicesLifecycleService.createCustomerGroup(
      {
        name: 'Alpha Testers',
        slug: `alpha-${Date.now()}`,
        discountPercent: 15,
        tenantId: 'smmplan',
      },
      mockAdmin
    );

    expect(newGroup.id).toBeDefined();

    const clientUser = await db.user.create({
      data: {
        email: `client_alpha_${Date.now()}@smmplan.pro`,
        tenantId: 'smmplan',
      },
    });

    await servicesLifecycleService.setUserCustomerGroup(clientUser.id, newGroup.id, mockAdmin);

    const updated = await db.user.findUnique({ where: { id: clientUser.id } });
    expect(updated?.customerGroupId).toBe(newGroup.id);

    await servicesLifecycleService.setUserCustomerGroup(clientUser.id, null, mockAdmin);
    const revoked = await db.user.findUnique({ where: { id: clientUser.id } });
    expect(revoked?.customerGroupId).toBeNull();
  });
});