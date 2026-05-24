"use server";

import { db } from "@/lib/db";
import { requireStaffPermission } from "@/lib/server/rbac";
import { auditAdmin } from "@/lib/admin-audit";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";

const categorySchema = z.object({
  name: z.string().min(1).max(255, "Category name too long"),
  networkId: z.string().min(1, "Network ID required"),
  sort: z.coerce.number().int().default(0)
});

const idSchema = z.string().min(1);

export async function createCategory(rawData: { name: string; networkId: string; sort: number }) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    const data = categorySchema.parse(rawData);
    const cat = await db.category.create({
      data: {
        name: data.name,
        networkId: data.networkId,
        sort: data.sort
      }
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "CATEGORY_CREATE",
      target: cat.id,
      targetType: "SETTINGS",
      newValue: { name: cat.name, networkId: cat.networkId }
    });

    revalidatePath("/admin/catalog/categories");
    (revalidateTag as any)("catalog");
    (revalidateTag as any)("services");
    return { success: true, error: undefined, categoryId: cat.id };
  });
}

export async function updateCategory(rawId: string, rawData: { name: string; networkId: string; sort: number }) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    const id = idSchema.parse(rawId);
    const data = categorySchema.parse(rawData);
    const cat = await db.category.update({
      where: { id },
      data: {
        name: data.name,
        networkId: data.networkId,
        sort: data.sort
      }
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "CATEGORY_UPDATE",
      target: cat.id,
      targetType: "SETTINGS",
      newValue: { name: cat.name, networkId: cat.networkId }
    });

    revalidatePath("/admin/catalog/categories");
    (revalidateTag as any)("catalog");
    (revalidateTag as any)("services");
    return { success: true, error: undefined };
  });
}

export async function deleteCategory(rawId: string) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    const id = idSchema.parse(rawId);
    const count = await db.service.count({ where: { categoryId: id } });
    if (count > 0) {
      return { success: false, error: `Cannot delete category. It contains ${count} services. Delete or move them first.` };
    }

    await db.category.delete({ where: { id } });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "CATEGORY_DELETE",
      target: id,
      targetType: "SETTINGS"
    });

    revalidatePath("/admin/catalog/categories");
    (revalidateTag as any)("catalog");
    (revalidateTag as any)("services");
    return { success: true, error: undefined };
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

    const sourceCat = await db.category.findUnique({ where: { id: sourceCategoryId } });
    if (!sourceCat) {
      return { success: false as const, error: 'Source category not found.' };
    }

    const targetCat = await db.category.findUnique({ where: { id: targetCategoryId } });
    if (!targetCat) {
      return { success: false as const, error: 'Target category not found.' };
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

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CATEGORY_MERGE',
      target: sourceCategoryId,
      targetType: 'SETTINGS',
      newValue: { sourceCategoryId, targetCategoryId }
    });

    revalidatePath("/admin/catalog/categories");
    revalidatePath("/admin/catalog");
    (revalidateTag as any)("catalog");
    (revalidateTag as any)("services");

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

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'NETWORK_CREATE',
      target: network.id,
      targetType: 'SETTINGS',
      newValue: { name: network.name, slug: network.slug, sort: network.sort }
    });

    revalidatePath("/admin/catalog/categories");
    revalidatePath("/admin/catalog");
    (revalidateTag as any)("catalog");

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

    auditAdmin({
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
    (revalidateTag as any)("catalog");

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

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'NETWORK_DELETE',
      target: id,
      targetType: 'SETTINGS'
    });

    revalidatePath("/admin/catalog/categories");
    revalidatePath("/admin/catalog");
    (revalidateTag as any)("catalog");

    return { success: true as const };
  });
}

