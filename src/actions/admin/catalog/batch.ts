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

import { requireStaffPermission } from '@/lib/server/rbac';
import { db } from '@/lib/db';
import { auditAdmin } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { SAFETY_FLOOR_MARKUP, TOTAL_MANDATORY_DEDUCTIONS, applyBeautifulRounding } from '@/lib/financial-constants';
import { SettingsProvider } from '@/lib/settings';

// Minimum allowed markup — Safety Floor (covers taxes + 100% margin)
const MIN_MARKUP = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

const batchIdsSchema = z.array(z.string().min(1)).min(1).max(500);
const markupSchema = z.number().min(MIN_MARKUP).max(150);

/** Bulk toggle isActive for a list of service IDs */
export async function batchToggleServicesAction(
  serviceIds: string[],
  isActive: boolean
) {
  return requireStaffPermission('catalog', 'edit', async (admin) => {
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
  return requireStaffPermission('catalog', 'edit', async (admin) => {
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

    const m = markupValidation.data;
    const usdToRub = await SettingsProvider.getExchangeRateUSD();

    // We can't use updateMany with calculated fields in Prisma easily,
    // so we iterate or use a raw query. For 500 items, iteration is safe.
    const services = await db.service.findMany({
      where: { id: { in: ids.data } },
      select: { id: true, rate: true }
    });

    await db.$transaction(
      services.map(s => db.service.update({
        where: { id: s.id },
        data: { 
          markup: m,
          pricePer1000Cents: Math.round(applyBeautifulRounding(s.rate * m * usdToRub) * 100)
        }
      }))
    );

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'BATCH_MARKUP_SET',
      target: ids.data.join(','),
      targetType: 'SERVICE',
      newValue: { count: ids.data.length, markup: m },
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
  return requireStaffPermission('catalog', 'edit', async (admin) => {
    const markupValidation = markupSchema.safeParse(markup);
    if (!markupValidation.success) {
      return {
        success: false as const,
        error: `Минимальная маржа ${MIN_MARKUP.toFixed(2)}x`,
      };
    }

    const m = markupValidation.data;
    const usdToRub = await SettingsProvider.getExchangeRateUSD();

    const service = await db.service.findUnique({
      where: { id: serviceId },
      select: { markup: true, rate: true },
    });

    if (!service) return { success: false as const, error: 'Service not found' };

    await db.service.update({
      where: { id: serviceId },
      data: { 
        markup: m,
        pricePer1000Cents: Math.round(applyBeautifulRounding(service.rate * m * usdToRub) * 100)
      },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SERVICE_MARKUP_UPDATE',
      target: serviceId,
      targetType: 'SERVICE',
      oldValue: { markup: service.markup },
      newValue: { markup: m },
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
  return requireStaffPermission('catalog', 'edit', async (admin) => {
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
