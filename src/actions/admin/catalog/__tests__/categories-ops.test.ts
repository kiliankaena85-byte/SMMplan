import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { batchReassignServicesCategoryAction } from '@/actions/admin/catalog/batch';
import { mergeCategoriesAction, createNetworkAction, updateNetworkAction, deleteNetworkAction } from '@/actions/admin/catalog/categories';
import { createServiceAction, updateServiceAction } from '@/actions/admin/catalog/services';
import { revalidatePath, revalidateTag } from 'next/cache';

// Mock cookies and headers
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

const mockHeadersStore = new Headers({
  'x-forwarded-for': '127.0.0.1',
  'user-agent': 'vitest',
});

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => mockHeadersStore),
  cookies: vi.fn(async () => mockCookieStore),
}));

// Mock verifySession to control it per test
vi.mock('@/lib/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/session')>();
  return {
    ...actual,
    verifySession: vi.fn(),
  };
});

// Helper to poll for audit logs since they are written fire-and-forget asynchronously
async function getAuditLog(action: string) {
  for (let i = 0; i < 25; i++) {
    const log = await db.adminAuditLog.findFirst({ where: { action } });
    if (log) return log;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  return null;
}

describe('Milestone 5: Catalog CRUD & Categories Operations Test Suite', () => {
  let adminUser: any;
  let regularUser: any;

  beforeEach(async () => {
    // 1. Clean up database tables explicitly as requested
    await db.service.deleteMany();
    await db.category.deleteMany();
    await db.network.deleteMany();
    await db.provider.deleteMany();
    await db.adminAuditLog.deleteMany();
    await db.auditLog.deleteMany();
    await db.user.deleteMany();

    // 2. Enable test mode in systemSettings
    await db.systemSettings.upsert({
      where: { id: 'global' },
      update: { isTestMode: true, exchangeRateUSD: 95.0 },
      create: { id: 'global', isTestMode: true, exchangeRateUSD: 95.0 },
    });

    // 3. Create Admin/Owner user for RBAC testing
    adminUser = await db.user.create({
      data: {
        email: 'admin_test@smmplan.local',
        role: 'OWNER',
        isActive: true,
      },
    });

    // 4. Create standard user for RBAC violation testing
    regularUser = await db.user.create({
      data: {
        email: 'regular_test@smmplan.local',
        role: 'USER',
        isActive: true,
      },
    });

    vi.clearAllMocks();
  });

  describe('Service Batch Reassignment', () => {
    it('should successfully move a list of service IDs to a target category and record audit log', async () => {
      // Mock active admin session
      vi.mocked(verifySession).mockResolvedValue({ userId: adminUser.id });

      // Create network & categories
      const network = await db.network.create({
        data: { name: 'Telegram', slug: 'telegram' },
      });
      const catA = await db.category.create({
        data: { name: 'Category A', networkId: network.id },
      });
      const catB = await db.category.create({
        data: { name: 'Category B', networkId: network.id },
      });

      // Create services in Category A
      const s1 = await db.service.create({
        data: { name: 'Service 1', categoryId: catA.id, rate: 1.0, markup: 2.0 },
      });
      const s2 = await db.service.create({
        data: { name: 'Service 2', categoryId: catA.id, rate: 1.5, markup: 2.0 },
      });

      // Call action
      const result = await batchReassignServicesCategoryAction([s1.id, s2.id], catB.id);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.count).toBe(2);
      }

      // Verify services moved
      const updatedS1 = await db.service.findUnique({ where: { id: s1.id } });
      const updatedS2 = await db.service.findUnique({ where: { id: s2.id } });
      expect(updatedS1!.categoryId).toBe(catB.id);
      expect(updatedS2!.categoryId).toBe(catB.id);

      // Verify audit log
      const auditLog = await getAuditLog('BATCH_SERVICE_REASSIGN');
      expect(auditLog).toBeDefined();
      expect(auditLog!.adminId).toBe(adminUser.id);
      expect(auditLog!.target).toContain(s1.id);
      expect(auditLog!.target).toContain(s2.id);

      // Verify revalidations called
      expect(revalidatePath).toHaveBeenCalledWith('/admin/catalog');
      expect(revalidateTag).toHaveBeenCalledWith('catalog');
      expect(revalidateTag).toHaveBeenCalledWith('services');
    });

    it('should fail if service IDs are invalid', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: adminUser.id });

      const result = await batchReassignServicesCategoryAction([], 'target-id');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid service IDs');
      }
    });

    it('should fail if target category does not exist', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: adminUser.id });

      const network = await db.network.create({
        data: { name: 'Telegram', slug: 'telegram' },
      });
      const catA = await db.category.create({
        data: { name: 'Category A', networkId: network.id },
      });
      const s1 = await db.service.create({
        data: { name: 'Service 1', categoryId: catA.id, rate: 1.0, markup: 2.0 },
      });

      const result = await batchReassignServicesCategoryAction([s1.id], 'non-existent-cat-id');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Target category not found');
      }
    });

    it('should fail due to RBAC/permission violation for non-admin user', async () => {
      // Mock active regular user session
      vi.mocked(verifySession).mockResolvedValue({ userId: regularUser.id });

      const result = await batchReassignServicesCategoryAction(['some-id'], 'target-id');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Forbidden: Administrator/Staff context required');
      }
    });
  });

  describe('Category Merge', () => {
    it('should successfully merge category A into category B and delete A atomically', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: adminUser.id });

      const network = await db.network.create({
        data: { name: 'Telegram', slug: 'telegram' },
      });
      const catA = await db.category.create({
        data: { name: 'Category A', networkId: network.id },
      });
      const catB = await db.category.create({
        data: { name: 'Category B', networkId: network.id },
      });

      // Services in category A
      const s1 = await db.service.create({
        data: { name: 'Service 1', categoryId: catA.id, rate: 1.0, markup: 2.0 },
      });
      const s2 = await db.service.create({
        data: { name: 'Service 2', categoryId: catA.id, rate: 1.5, markup: 2.0 },
      });

      // Call action
      const result = await mergeCategoriesAction(catA.id, catB.id);
      expect(result.success).toBe(true);

      // Verify all services reassigned to catB
      const updatedS1 = await db.service.findUnique({ where: { id: s1.id } });
      const updatedS2 = await db.service.findUnique({ where: { id: s2.id } });
      expect(updatedS1!.categoryId).toBe(catB.id);
      expect(updatedS2!.categoryId).toBe(catB.id);

      // Verify source category A is deleted
      const deletedCat = await db.category.findUnique({ where: { id: catA.id } });
      expect(deletedCat).toBeNull();

      // Verify audit log
      const auditLog = await getAuditLog('CATEGORY_MERGE');
      expect(auditLog).toBeDefined();
      expect(auditLog!.target).toBe(catA.id);

      // Verify revalidations
      expect(revalidatePath).toHaveBeenCalledWith('/admin/catalog/categories');
      expect(revalidatePath).toHaveBeenCalledWith('/admin/catalog');
      expect(revalidateTag).toHaveBeenCalledWith('catalog');
      expect(revalidateTag).toHaveBeenCalledWith('services');
    });

    it('should fail if source and target category IDs are same', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: adminUser.id });

      const result = await mergeCategoriesAction('cat-id', 'cat-id');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Source and target categories cannot be the same.');
      }
    });

    it('should fail if source category does not exist', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: adminUser.id });

      const network = await db.network.create({
        data: { name: 'Telegram', slug: 'telegram' },
      });
      const catB = await db.category.create({
        data: { name: 'Category B', networkId: network.id },
      });

      const result = await mergeCategoriesAction('non-existent-cat', catB.id);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Source category not found.');
      }
    });

    it('should fail if target category does not exist', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: adminUser.id });

      const network = await db.network.create({
        data: { name: 'Telegram', slug: 'telegram' },
      });
      const catA = await db.category.create({
        data: { name: 'Category A', networkId: network.id },
      });

      const result = await mergeCategoriesAction(catA.id, 'non-existent-cat');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Target category not found.');
      }
    });

    it('should fail due to RBAC violation', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: regularUser.id });

      const result = await mergeCategoriesAction('cat-a', 'cat-b');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Forbidden: Administrator/Staff context required');
      }
    });
  });

  describe('Network CRUD Operations', () => {
    it('should successfully create a new network and verify validations & audit logs', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: adminUser.id });

      const payload = { name: 'Instagram', slug: 'instagram', sort: 10 };
      const result = await createNetworkAction(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.networkId).toBeDefined();
      }

      // Verify in DB
      const network = await db.network.findFirst({ where: { slug: 'instagram' } });
      expect(network).toBeDefined();
      expect(network!.name).toBe('Instagram');
      expect(network!.sort).toBe(10);

      // Verify audit log
      const auditLog = await getAuditLog('NETWORK_CREATE');
      expect(auditLog).toBeDefined();
      expect(auditLog!.target).toBe(network!.id);

      // Verify revalidations
      expect(revalidatePath).toHaveBeenCalledWith('/admin/catalog/categories');
      expect(revalidatePath).toHaveBeenCalledWith('/admin/catalog');
      expect(revalidateTag).toHaveBeenCalledWith('catalog');
    });

    it('should enforce slug format validation in createNetworkAction', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: adminUser.id });

      // Slug with spaces or uppercase should fail
      const result = await createNetworkAction({ name: 'Instagram', slug: 'Instagram Slug', sort: 0 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Slug must be lowercase alphanumeric');
      }
    });

    it('should enforce uniqueness check in createNetworkAction', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: adminUser.id });

      await db.network.create({
        data: { name: 'Telegram', slug: 'telegram' },
      });

      // Try creating with duplicate name
      const resName = await createNetworkAction({ name: 'Telegram', slug: 'telegram-new', sort: 0 });
      expect(resName.success).toBe(false);
      if (!resName.success) {
        expect(resName.error).toBe('Сеть с таким названием или slug уже существует');
      }

      // Try creating with duplicate slug
      const resSlug = await createNetworkAction({ name: 'Telegram New', slug: 'telegram', sort: 0 });
      expect(resSlug.success).toBe(false);
      if (!resSlug.success) {
        expect(resSlug.error).toBe('Сеть с таким названием или slug уже существует');
      }
    });

    it('should successfully update a network and verify unique constraint and audit logs', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: adminUser.id });

      const network = await db.network.create({
        data: { name: 'Telegram', slug: 'telegram', sort: 1 },
      });

      const result = await updateNetworkAction(network.id, {
        name: 'Telegram Updated',
        slug: 'telegram-new',
        sort: 2,
      });
      expect(result.success).toBe(true);

      // Verify in DB
      const updated = await db.network.findUnique({ where: { id: network.id } });
      expect(updated!.name).toBe('Telegram Updated');
      expect(updated!.slug).toBe('telegram-new');
      expect(updated!.sort).toBe(2);

      // Verify audit log
      const auditLog = await getAuditLog('NETWORK_UPDATE');
      expect(auditLog).toBeDefined();
      expect(auditLog!.target).toBe(network.id);
      expect(auditLog!.oldValue).toContain('Telegram');
      expect(auditLog!.newValue).toContain('Telegram Updated');
    });

    it('should prevent deleting a network with associated categories', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: adminUser.id });

      const network = await db.network.create({
        data: { name: 'Telegram', slug: 'telegram' },
      });
      await db.category.create({
        data: { name: 'Telegram Members', networkId: network.id },
      });

      const result = await deleteNetworkAction(network.id);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Невозможно удалить сеть. Она содержит');
      }

      // Verify network still exists
      const check = await db.network.findUnique({ where: { id: network.id } });
      expect(check).toBeDefined();
    });

    it('should successfully delete an empty network', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: adminUser.id });

      const network = await db.network.create({
        data: { name: 'Telegram', slug: 'telegram' },
      });

      const result = await deleteNetworkAction(network.id);
      expect(result.success).toBe(true);

      // Verify in DB
      const check = await db.network.findUnique({ where: { id: network.id } });
      expect(check).toBeNull();

      // Verify audit log
      const auditLog = await getAuditLog('NETWORK_DELETE');
      expect(auditLog).toBeDefined();
      expect(auditLog!.target).toBe(network.id);
    });
  });

  describe('Service CRUD Operations', () => {
    it('should manually create a service, verify price conversion, targetType auto-inference, and provider binding', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: adminUser.id });

      // Create category under network
      const network = await db.network.create({
        data: { name: 'Telegram', slug: 'telegram' },
      });
      // Name includes 'подписчик' to test targetType auto-inference -> CHANNEL
      const category = await db.category.create({
        data: { name: 'Подписчики Telegram', networkId: network.id },
      });

      // Create provider
      const provider = await db.provider.create({
        data: { name: 'VexBoost', apiUrl: 'http://localhost/api', apiKey: 'api-key-123' },
      });

      const payload = {
        name: 'Manual TG Members service',
        description: 'Quality members for TG channel',
        categoryId: category.id,
        providerId: provider.id,
        rate: 0.5, // 0.5 USD per 1k
        markup: 3.0, // 3.0x markup
        minQty: 100,
        maxQty: 10000,
        externalId: 'ext-tg-members',
      };

      const result = await createServiceAction(payload);
      expect(result.success).toBe(true);
      let serviceId = '';
      if (result.success) {
        serviceId = result.serviceId;
        expect(serviceId).toBeDefined();
      }

      // Verify in DB
      const service = await db.service.findUnique({ where: { id: serviceId } });
      expect(service).toBeDefined();
      expect(service!.name).toBe('Manual TG Members service');
      expect(service!.providerId).toBe(provider.id);
      expect(service!.externalId).toBe('ext-tg-members');

      // Verify targetType auto-inference -> CHANNEL because category name contains 'Подписчики'
      expect(service!.targetType).toBe('CHANNEL');

      // Verify pricePer1000Cents dynamic conversion using 95.0 USD exchange rate
      // rate (0.5) * markup (3.0) * rateUSD (95) = 142.5
      // applyBeautifulRounding(142.5) -> since < 1000, ceil to nearest 10 -> 150
      // pricePer1000Cents = 150 * 100 = 15000
      expect(service!.pricePer1000Cents).toBe(15000);

      // Verify audit log
      const auditLog = await getAuditLog('SERVICE_MANUAL_CREATE');
      expect(auditLog).toBeDefined();
      expect(auditLog!.target).toBe(serviceId);
    });

    it('should successfully update service parameters and write correct audit logging', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: adminUser.id });

      const network = await db.network.create({
        data: { name: 'Telegram', slug: 'telegram' },
      });
      const category = await db.category.create({
        data: { name: 'Лайки ВК', networkId: network.id }, // falls back to POST targetType
      });

      const service = await db.service.create({
        data: {
          name: 'BK Likes Service',
          categoryId: category.id,
          rate: 1.0,
          markup: 2.0,
          minQty: 10,
          maxQty: 100,
          targetType: 'POST',
        },
      });

      const payload = {
        name: 'BK Likes Service Updated',
        description: 'New Description',
        categoryId: category.id,
        rate: 1.5,
        markup: 3.5,
        minQty: 20,
        maxQty: 200,
      };

      const result = await updateServiceAction(service.id, payload);
      expect(result.success).toBe(true);

      // Verify DB
      const updated = await db.service.findUnique({ where: { id: service.id } });
      expect(updated!.name).toBe('BK Likes Service Updated');
      expect(updated!.rate).toBe(1.5);
      expect(updated!.markup).toBe(3.5);
      expect(updated!.minQty).toBe(20);
      expect(updated!.maxQty).toBe(200);

      // Verify audit log Old & New values
      const auditLog = await getAuditLog('SERVICE_MANUAL_UPDATE');
      expect(auditLog).toBeDefined();
      expect(auditLog!.target).toBe(service.id);
      expect(auditLog!.oldValue).toContain('BK Likes Service');
      expect(auditLog!.newValue).toContain('BK Likes Service Updated');
    });
  });
});
