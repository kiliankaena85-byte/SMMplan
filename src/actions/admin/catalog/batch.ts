'use server';

/**
 * Server Actions: Batch catalog operations
 *
 * batchToggleServicesAction — bulk enable/disable
 * batchSetMarkupAction — set fixed markup for a selection
 *
 * Security: requireAdmin guard on all actions.
 * All changes recorded in AdminAuditLog (fire-and-forget).
 */

import { requireAdmin } from '@/lib/server/rbac';
import { db } from '@/lib/db';
import { auditAdmin } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { SAFETY_FLOOR_MARKUP, TOTAL_MANDATORY_DEDUCTIONS } from '@/lib/financial-constants';

// Minimum allowed markup — Safety Floor (covers taxes + 100% margin)
const MIN_MARKUP = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

const batchIdsSchema = z.array(z.string().min(1)).min(1).max(500);
const markupSchema = z.number().min(MIN_MARKUP).max(150);

/** Bulk toggle isActive for a list of service IDs */
export async function batchToggleServicesAction(
  serviceIds: string[],
  isActive: boolean
) {
  return requireAdmin(async (admin) => {
    const ids = batchIdsSchema.safeParse(serviceIds);
    if (!ids.success) {
      return { success: false as const, error: 'Invalid service IDs' };
    }

    await db.service.updateMany({
      where: { id: { in: ids.data } },
      data: { isActive },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: isActive ? 'BATCH_SERVICE_ENABLE' : 'BATCH_SERVICE_DISABLE',
      target: ids.data.join(','),
      targetType: 'SERVICE',
      newValue: { count: ids.data.length, isActive },
    });

    revalidatePath('/admin/catalog');
    return { success: true as const, count: ids.data.length };
  });
}

/** Bulk set fixed markup for a list of service IDs */
export async function batchSetMarkupAction(
  serviceIds: string[],
  markup: number
) {
  return requireAdmin(async (admin) => {
    const ids = batchIdsSchema.safeParse(serviceIds);
    if (!ids.success) {
      return { success: false as const, error: 'Invalid service IDs' };
    }

    const markupValidation = markupSchema.safeParse(markup);
    if (!markupValidation.success) {
      return {
        success: false as const,
        error: `Минимальная маржа ${MIN_MARKUP.toFixed(2)}x (Safety Floor)`,
      };
    }

    await db.service.updateMany({
      where: { id: { in: ids.data } },
      data: { markup: markupValidation.data },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'BATCH_MARKUP_SET',
      target: ids.data.join(','),
      targetType: 'SERVICE',
      newValue: { count: ids.data.length, markup: markupValidation.data },
    });

    revalidatePath('/admin/catalog');
    return { success: true as const, count: ids.data.length };
  });
}

/** Update single service markup (inline edit) */
export async function updateServiceMarkupAction(
  serviceId: string,
  markup: number
) {
  return requireAdmin(async (admin) => {
    const markupValidation = markupSchema.safeParse(markup);
    if (!markupValidation.success) {
      return {
        success: false as const,
        error: `Минимальная маржа ${MIN_MARKUP.toFixed(2)}x`,
      };
    }

    const old = await db.service.findUnique({
      where: { id: serviceId },
      select: { markup: true },
    });

    await db.service.update({
      where: { id: serviceId },
      data: { markup: markupValidation.data },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SERVICE_MARKUP_UPDATE',
      target: serviceId,
      targetType: 'SERVICE',
      oldValue: { markup: old?.markup },
      newValue: { markup: markupValidation.data },
    });

    revalidatePath('/admin/catalog');
    return { success: true as const };
  });
}

/** Toggle single service active status */
export async function toggleServiceActiveAction(
  serviceId: string,
  isActive: boolean
) {
  return requireAdmin(async (admin) => {
    await db.service.update({
      where: { id: serviceId },
      data: { isActive },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: isActive ? 'SERVICE_ENABLE' : 'SERVICE_DISABLE',
      target: serviceId,
      targetType: 'SERVICE',
      newValue: { isActive },
    });

    revalidatePath('/admin/catalog');
    return { success: true as const };
  });
}
