'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { adminCatalogService } from '@/services/admin/catalog.service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { updateMarkupSchema, toggleServiceSchema, bulkUpdateMarkupSchema } from '@/validators/admin.validators';
import { auditAdmin } from '@/lib/admin-audit';

import { requireStaffPermission } from '@/lib/server/rbac';

async function updateMarkupAction(formData: FormData) {
  const result = await requireStaffPermission('catalog', 'edit', async (admin) => {
    const parsed = updateMarkupSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) throw new Error('serviceId и markup обязательны');
    const { serviceId, markup } = parsed.data;

    await adminCatalogService.updateMarkup(serviceId, markup, {
      id: admin.id,
      email: admin.email,
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SERVICE_MARKUP_UPDATE',
      target: serviceId,
      targetType: 'SERVICE',
      newValue: { markup },
    });

    revalidatePath('/admin/catalog');
  });

  if (result && typeof result === 'object' && 'success' in result && !result.success) {
    throw new Error(result.error);
  }
}

async function toggleServiceAction(formData: FormData) {
  const result = await requireStaffPermission('catalog', 'edit', async (admin) => {
    const parsed = toggleServiceSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) throw new Error('Missing serviceId');
    const { serviceId, isActive } = parsed.data;

    await adminCatalogService.toggleService(serviceId, isActive, {
      id: admin.id,
      email: admin.email,
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: isActive ? 'SERVICE_ENABLE' : 'SERVICE_DISABLE',
      target: serviceId,
      targetType: 'SERVICE',
    });

    revalidatePath('/admin/catalog');
  });

  if (result && typeof result === 'object' && 'success' in result && !result.success) {
    throw new Error(result.error);
  }
}

/**
 * Bulk update markup for all services in a category or platform.
 * Pass markup=0 to auto-calculate from Pricing Ladder.
 */
export async function bulkUpdateMarkupAction(formData: FormData) {
  const result = await requireStaffPermission('catalog', 'edit', async (admin) => {
    const parsed = bulkUpdateMarkupSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      throw new Error('Наценка должна быть в диапазоне 1.0–151.0');
    }
    const { categoryId, platform, markup } = parsed.data;

    const filter: { categoryId?: string; platform?: string } = {};
    if (categoryId) filter.categoryId = categoryId;
    if (platform) filter.platform = platform;

    await adminCatalogService.bulkUpdateMarkup(filter, markup, {
      id: admin.id,
      email: admin.email,
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'BULK_MARKUP_UPDATE',
      target: categoryId || platform || 'ALL',
      targetType: 'SERVICE',
      newValue: { markup, filter },
    });

    revalidatePath('/admin/catalog');
  });

  if (result && typeof result === 'object' && 'success' in result && !result.success) {
    throw new Error(result.error);
  }
}

/**
 * Returns markup distribution analytics for the admin dashboard.
 */
async function getMarkupAnalyticsAction() {
  const result = await requireStaffPermission('catalog', 'view', async () => {
    return adminCatalogService.getMarkupAnalytics();
  });

  if (result && typeof result === 'object' && 'success' in result && !result.success) {
    throw new Error(result.error);
  }
  return result;
}
