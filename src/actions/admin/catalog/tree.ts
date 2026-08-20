'use server';

import { db } from "@/lib/db";
import { requireStaffPermission } from "@/lib/server/rbac";
import { auditAdmin } from "@/lib/admin-audit";
import { revalidatePath } from "next/cache";

/**
 * Toggle single service active status
 */
export async function toggleServiceStatusAction(serviceId: string, isActive: boolean) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      select: { id: true, name: true, categoryId: true }
    });

    if (!service) {
      return { success: false as const, error: 'Услуга не найдена' };
    }

    await db.service.update({
      where: { id: serviceId },
      data: { isActive }
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: isActive ? 'SERVICE_ENABLE' : 'SERVICE_DISABLE',
      target: serviceId,
      targetType: 'SERVICE',
      newValue: { isActive }
    });

    revalidatePath('/admin/catalog/tree');
    revalidatePath('/admin/catalog');
    return { success: true as const };
  });
}

/**
 * Bulk update markup for all services in a category
 */
export async function bulkUpdateCategoryMarkupAction(categoryId: string, markup: number) {
  return requireStaffPermission('FINANCE', 'edit', async (admin) => {
    if (markup < 1.0 || markup > 100.0) {
      return { success: false as const, error: 'Наценка должна быть от 1.0 до 100.0' };
    }

    const services = await db.service.findMany({
      where: { categoryId },
      select: { id: true, rate: true }
    });

    if (services.length === 0) {
      return { success: false as const, error: 'В категории нет услуг для обновления' };
    }

    // Update all services
    await db.$transaction(
      services.map(s => {
        const pricePer1000Cents = Math.round(s.rate * markup * 10000);
        return db.service.update({
          where: { id: s.id },
          data: { markup, pricePer1000Cents }
        });
      })
    );

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'BULK_MARKUP_UPDATE',
      target: categoryId,
      targetType: 'CATEGORY',
      newValue: { markup, count: services.length }
    });

    revalidatePath('/admin/catalog/tree');
    revalidatePath('/admin/catalog');
    return { success: true as const, count: services.length };
  });
}

/**
 * Toggle all services in a category on/off
 */
export async function toggleCategoryServicesAction(categoryId: string, isActive: boolean) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    const updated = await db.service.updateMany({
      where: { categoryId },
      data: { isActive }
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: isActive ? 'CATEGORY_ENABLE_ALL' : 'CATEGORY_DISABLE_ALL',
      target: categoryId,
      targetType: 'CATEGORY',
      newValue: { isActive, count: updated.count }
    });

    revalidatePath('/admin/catalog/tree');
    revalidatePath('/admin/catalog');
    return { success: true as const, count: updated.count };
  });
}

/**
 * Quick update service fields
 */
export async function quickUpdateServiceAction(serviceId: string, data: {
  name?: string;
  rate?: number;
  markup?: number;
  minQty?: number;
  maxQty?: number;
  externalId?: string;
  providerId?: string;
  targetType?: string;
  isActive?: boolean;
}) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    const service = await db.service.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      return { success: false as const, error: 'Услуга не найдена' };
    }

    const rate = data.rate !== undefined ? data.rate : service.rate;
    const markup = data.markup !== undefined ? data.markup : service.markup;
    const pricePer1000Cents = Math.round(rate * markup * 10000);

    await db.service.update({
      where: { id: serviceId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.rate !== undefined && { rate: data.rate }),
        ...(data.markup !== undefined && { markup: data.markup }),
        ...(data.minQty !== undefined && { minQty: data.minQty }),
        ...(data.maxQty !== undefined && { maxQty: data.maxQty }),
        ...(data.externalId !== undefined && { externalId: data.externalId.trim() || null }),
        ...(data.providerId ? { provider: { connect: { id: data.providerId } } } : (data.providerId === '' ? { provider: { disconnect: true } } : {})),
        ...(data.targetType ? { targetType: data.targetType } : {}),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        pricePer1000Cents
      }
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SERVICE_UPDATE',
      target: serviceId,
      targetType: 'SERVICE',
      newValue: data
    });

    revalidatePath('/admin/catalog/tree');
    revalidatePath('/admin/catalog');
    return { success: true as const };
  });
}

/**
 * Delete service from catalog
 */
export async function deleteServiceTreeAction(serviceId: string) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      include: { _count: { select: { orders: true } } }
    });

    if (!service) {
      return { success: false as const, error: 'Услуга не найдена' };
    }

    if (service._count.orders > 0) {
      // Soft-disable instead of hard delete to preserve foreign keys
      await db.service.update({
        where: { id: serviceId },
        data: { isActive: false }
      });
      return { success: true as const, message: 'Услуга отключена (сохранена для истории заказов)' };
    }

    await db.service.delete({
      where: { id: serviceId }
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SERVICE_DELETE',
      target: serviceId,
      targetType: 'SERVICE'
    });

    revalidatePath('/admin/catalog/tree');
    revalidatePath('/admin/catalog');
    return { success: true as const };
  });
}
