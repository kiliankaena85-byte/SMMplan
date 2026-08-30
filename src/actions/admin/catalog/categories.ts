'use server';

import { db } from "@/lib/db";
import { requireStaffPermission } from "@/lib/server/rbac";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { auditAdmin, auditAdminAwaitable } from "@/lib/admin-audit";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";

const categorySchema = z.object({
  name: z.string().min(1, "Название категории обязательно").max(255, "Category name too long"),
  networkId: z.string().min(1, "Network ID required"),
  sort: z.coerce.number().int().default(0),
  tenantId: z.string().optional().nullable(),
  activityType: z.string().optional().nullable(),
  requireWarning: z.coerce.boolean().default(false),
  warningMessage: z.string().max(1000, "Предупреждение слишком длинное").optional().nullable(),
  analyzerTags: z.string().max(255).optional().nullable()
}).refine(data => !data.requireWarning || (typeof data.warningMessage === 'string' && data.warningMessage.trim().length > 0), {
  message: "Укажите текст предупреждения при включённой опции предупреждения",
  path: ["warningMessage"]
});

const idSchema = z.string().min(1);

export async function createCategory(rawData: { name: string; networkId: string; sort: number; tenantId?: string | null; activityType?: string | null; requireWarning?: boolean; warningMessage?: string | null; analyzerTags?: string | null }) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    const data = categorySchema.parse(rawData);
    const cat = await db.category.create({
      data: {
        name: data.name,
        networkId: data.networkId,
        sort: data.sort,
        tenantId: data.tenantId || 'all',
        activityType: data.activityType,
        requireWarning: data.requireWarning,
        warningMessage: data.warningMessage,
        analyzerTags: data.analyzerTags
      }
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "CATEGORY_CREATE",
      target: cat.id,
      targetType: "SETTINGS",
      newValue: { name: cat.name, networkId: cat.networkId, tenantId: cat.tenantId, activityType: cat.activityType, requireWarning: cat.requireWarning, warningMessage: cat.warningMessage, analyzerTags: cat.analyzerTags }
    });

    revalidatePath("/admin/catalog/categories");
    revalidatePath("/admin/catalog");
    revalidateTag("catalog", 'default');
    revalidateTag("services", 'default');
    revalidateTag("catalog-smmplan", 'default');
    revalidateTag("catalog-flux", 'default');
    revalidateTag("services-smmplan", 'default');
    revalidateTag("services-flux", 'default');
    return { success: true, error: undefined, categoryId: cat.id, category: cat };
  });
}

export async function updateCategory(rawId: string, rawData: { name: string; networkId: string; sort: number; tenantId?: string | null; activityType?: string | null; requireWarning?: boolean; warningMessage?: string | null; analyzerTags?: string | null }) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    const id = idSchema.parse(rawId);
    const data = categorySchema.parse(rawData);
    const cat = await db.category.update({
      where: { id },
      data: {
        name: data.name,
        networkId: data.networkId,
        sort: data.sort,
        ...(data.tenantId ? { tenantId: data.tenantId } : {}),
        activityType: data.activityType,
        requireWarning: data.requireWarning,
        warningMessage: data.warningMessage,
        analyzerTags: data.analyzerTags
      }
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "CATEGORY_UPDATE",
      target: cat.id,
      targetType: "SETTINGS",
      newValue: { name: cat.name, networkId: cat.networkId, tenantId: cat.tenantId, requireWarning: cat.requireWarning, warningMessage: cat.warningMessage, analyzerTags: cat.analyzerTags }
    });

    revalidatePath("/admin/catalog/categories");
    revalidatePath("/admin/catalog");
    revalidateTag("catalog", 'default');
    revalidateTag("services", 'default');
    revalidateTag("catalog-smmplan", 'default');
    revalidateTag("catalog-flux", 'default');
    revalidateTag("services-smmplan", 'default');
    revalidateTag("services-flux", 'default');
    return { success: true, error: undefined };
  });
}

export async function deleteCategory(rawId: string) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    const id = idSchema.parse(rawId);
    const category = await db.category.findUnique({
      where: { id },
      include: {
        _count: { select: { services: true } }
      }
    });

    if (!category) {
      return { success: false, error: 'Категория не найдена' };
    }

    if (category._count.services > 0) {
      return { 
        success: false, 
        hasServices: true,
        serviceCount: category._count.services,
        error: `Категория содержит ${category._count.services} услуг. Вы можете скрыть все услуги или объединить категорию с другой.` 
      };
    }

    await db.category.delete({ where: { id } });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "CATEGORY_DELETE",
      target: id,
      targetType: "SETTINGS",
      oldValue: { name: category.name, networkId: category.networkId, tenantId: category.tenantId, sort: category.sort }
    });

    revalidatePath("/admin/catalog/categories");
    revalidatePath("/admin/catalog/tree");
    revalidateTag("catalog", 'default');
    revalidateTag("services", 'default');
    revalidateTag("catalog-smmplan", 'default');
    revalidateTag("catalog-flux", 'default');
    revalidateTag("services-smmplan", 'default');
    revalidateTag("services-flux", 'default');
    return { success: true, error: undefined };
  });
}

/**
 * Hides all services in a category (isActive = false)
 */
export async function hideCategoryAndServicesAction(categoryId: string) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    const id = idSchema.parse(categoryId);
    const category = await db.category.findUnique({
      where: { id },
      select: { id: true, name: true, _count: { select: { services: true } } }
    });

    if (!category) {
      return { success: false as const, error: 'Категория не найдена' };
    }

    await db.service.updateMany({
      where: { categoryId: id },
      data: { isActive: false }
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "CATEGORY_HIDE_ALL_SERVICES",
      target: id,
      targetType: "SETTINGS",
      newValue: { categoryName: category.name, hiddenServicesCount: category._count.services }
    });

    revalidatePath("/admin/catalog/categories");
    revalidatePath("/admin/catalog/tree");
    revalidatePath("/admin/catalog");
    revalidateTag("catalog", 'default');
    revalidateTag("services", 'default');
    revalidateTag("catalog-smmplan", 'default');
    revalidateTag("catalog-flux", 'default');
    revalidateTag("services-smmplan", 'default');
    revalidateTag("services-flux", 'default');

    return { 
      success: true as const, 
      count: category._count.services,
      message: `Все услуги категории «${category.name}» (${category._count.services} шт.) скрыты с витрины.` 
    };
  });
}

/**
 * Merges source category into target category:
 * moves all services from source to target, then deletes source category.
 */
export async function mergeCategoriesAction(sourceCategoryId: string, targetCategoryId: string) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    if (!sourceCategoryId || !targetCategoryId) {
      return { success: false as const, error: 'Source and target category IDs are required.' };
    }

    if (sourceCategoryId === targetCategoryId) {
      return { success: false as const, error: 'Source and target categories cannot be the same.' };
    }

    const sourceCat = await db.category.findUnique({ 
      where: { id: sourceCategoryId },
      include: { services: { select: { id: true, name: true } } }
    });
    if (!sourceCat) {
      return { success: false as const, error: 'Source category not found.' };
    }

    const targetCat = await db.category.findUnique({ where: { id: targetCategoryId } });
    if (!targetCat) {
      return { success: false as const, error: 'Target category not found.' };
    }

    // Invariant: cannot merge categories across different networks (e.g. Instagram into TikTok)
    if (sourceCat.networkId !== targetCat.networkId) {
      return { success: false as const, error: 'Нельзя объединять категории из разных соцсетей.' };
    }

    // Invariant: cannot merge categories across conflicting tenants
    if (
      sourceCat.tenantId && 
      targetCat.tenantId && 
      sourceCat.tenantId !== 'all' && 
      targetCat.tenantId !== 'all' && 
      sourceCat.tenantId !== targetCat.tenantId
    ) {
      return { success: false as const, error: `Нельзя объединять категории из разных сайтов (${sourceCat.tenantId} и ${targetCat.tenantId}).` };
    }

    await db.$transaction(async (tx) => {
      // 1. Move all services from source to target
      await tx.service.updateMany({
        where: { categoryId: sourceCategoryId },
        data: { categoryId: targetCategoryId }
      });

      // 2. Delete source category
      await tx.category.delete({
        where: { id: sourceCategoryId }
      });
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CATEGORY_MERGE',
      target: sourceCategoryId,
      targetType: 'SETTINGS',
      oldValue: { 
        sourceName: sourceCat.name, 
        sourceNetworkId: sourceCat.networkId,
        sourceTenantId: sourceCat.tenantId,
        movedServicesCount: sourceCat.services.length,
        movedServiceIds: sourceCat.services.map(s => s.id)
      },
      newValue: { targetCategoryId, targetName: targetCat.name, targetNetworkId: targetCat.networkId }
    });

    revalidatePath("/admin/catalog/categories");
    revalidatePath("/admin/catalog");
    revalidateTag("catalog", 'default');
    revalidateTag("services", 'default');

    return { success: true as const };
  });
}

const networkSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  slug: z.string().min(1, "Slug is required").max(255, "Slug too long").regex(/^[a-z0-9-_]+$/, "Slug must be lowercase alphanumeric, dashes or underscores"),
  sort: z.coerce.number().int().default(0)
});

/** Create a new network with Zod validation and unique constraint check */
export async function createNetworkAction(rawData: { name: string; slug: string; sort: number }) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    const parsed = networkSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.errors[0]?.message || 'Invalid network data' };
    }
    const data = parsed.data;

    // Check uniqueness of name and slug
    const existing = await db.network.findFirst({
      where: {
        OR: [
          { name: data.name },
          { slug: data.slug }
        ]
      }
    });
    if (existing) {
      return { success: false as const, error: 'Сеть с таким названием или slug уже существует' };
    }

    const network = await db.network.create({
      data: {
        name: data.name,
        slug: data.slug,
        sort: data.sort
      }
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'NETWORK_CREATE',
      target: network.id,
      targetType: 'SETTINGS',
      newValue: { name: network.name, slug: network.slug, sort: network.sort }
    });

    revalidatePath("/admin/catalog/categories");
    revalidatePath("/admin/catalog");
    revalidateTag("catalog", 'default');

    return { success: true as const, networkId: network.id };
  });
}

/** Update an existing network with Zod validation and unique constraint check */
export async function updateNetworkAction(id: string, rawData: { name: string; slug: string; sort: number }) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    if (!id || typeof id !== 'string') {
      return { success: false as const, error: 'Network ID is required' };
    }

    const parsed = networkSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.errors[0]?.message || 'Invalid network data' };
    }
    const data = parsed.data;

    // Check network exists
    const network = await db.network.findUnique({ where: { id } });
    if (!network) {
      return { success: false as const, error: 'Network not found' };
    }

    // Check uniqueness of name and slug for other networks
    const existing = await db.network.findFirst({
      where: {
        OR: [
          { name: data.name },
          { slug: data.slug }
        ],
        NOT: { id }
      }
    });
    if (existing) {
      return { success: false as const, error: 'Сеть с таким названием или slug уже существует' };
    }

    const updatedNetwork = await db.network.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        sort: data.sort
      }
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'NETWORK_UPDATE',
      target: id,
      targetType: 'SETTINGS',
      oldValue: { name: network.name, slug: network.slug, sort: network.sort },
      newValue: { name: updatedNetwork.name, slug: updatedNetwork.slug, sort: updatedNetwork.sort }
    });

    revalidatePath("/admin/catalog/categories");
    revalidatePath("/admin/catalog");
    revalidateTag("catalog", 'default');

    return { success: true as const };
  });
}

/** Delete a network if it has no associated categories */
export async function deleteNetworkAction(id: string) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    if (!id || typeof id !== 'string') {
      return { success: false as const, error: 'Network ID is required' };
    }

    const network = await db.network.findUnique({ where: { id } });
    if (!network) {
      return { success: false as const, error: 'Network not found' };
    }

    // Check if network has categories
    const categoryCount = await db.category.count({
      where: { networkId: id }
    });
    if (categoryCount > 0) {
      return {
        success: false as const,
        error: `Невозможно удалить сеть. Она содержит ${categoryCount} категорий. Удалите или переместите их сначала.`
      };
    }

    await db.network.delete({ where: { id } });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'NETWORK_DELETE',
      target: id,
      targetType: 'SETTINGS',
      oldValue: { name: network.name, slug: network.slug, sort: network.sort }
    });

    revalidatePath("/admin/catalog/categories");
    revalidatePath("/admin/catalog");
    revalidateTag("catalog", 'default');

    return { success: true as const };
  });
}

