'use server';

/**
 * Server Actions: Batch catalog operations
 *
 * batchToggleServicesAction — bulk enable/disable
 * batchSetMarkupAction — set fixed markup for a selection
 *
 * Security: requireAdmin guard on all actions.
 * All changes recorded in AdminAuditLog (awaited for financial integrity).
 */

import { requireStaffPermission } from '@/lib/server/rbac';
import { db } from '@/lib/db';
import { auditAdmin, auditAdminAwaitable } from '@/lib/admin-audit';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { applyBeautifulRounding, applyPricingLadder, SAFETY_FLOOR_MARKUP } from '@/lib/financial-constants';
import { SettingsProvider } from '@/lib/settings';

const MIN_MARKUP = 1.0;

const batchIdsSchema = z.array(z.string().min(1)).min(1).max(200);
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

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: isActive ? 'BATCH_SERVICE_ENABLE' : 'BATCH_SERVICE_DISABLE',
      target: ids.data.join(','),
      targetType: 'SERVICE',
      newValue: { count: ids.data.length, isActive },
    });

    revalidatePath('/admin/catalog');
    revalidatePath('/services', 'layout');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)('catalog');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)('services');
    return { success: true as const, count: ids.data.length };
  });
}

/** Bulk set fixed markup for a list of service IDs */
export async function batchSetMarkupAction(
  serviceIds: string[],
  markup: number
) {
  return requireStaffPermission('finance', 'edit', async (admin) => {
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
      select: { id: true, rate: true, providerCurrency: true }
    });

    await db.$transaction(
      services.map(s => db.service.update({
        where: { id: s.id },
        data: { 
          markup: m,
          pricePer1000Cents: Math.round(applyBeautifulRounding(s.rate * m * (s.providerCurrency === 'RUB' ? 1 : usdToRub)) * 100)
        }
      }))
    );

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'BATCH_MARKUP_SET',
      target: ids.data.join(','),
      targetType: 'SERVICE',
      newValue: { count: ids.data.length, markup: m },
    });

    revalidatePath('/admin/catalog');
    revalidatePath('/services', 'layout');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)('catalog');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)('services');
    return { success: true as const, count: ids.data.length };
  });
}

/** Preview price changes before applying batch markup */
export async function previewBatchMarkupAction(
  serviceIds: string[],
  newMarkup: number
) {
  return requireStaffPermission('catalog', 'view', async () => {
    const ids = batchIdsSchema.safeParse(serviceIds);
    if (!ids.success) return { success: false as const, error: 'Invalid service IDs' };

    const markupValidation = markupSchema.safeParse(newMarkup);
    if (!markupValidation.success) {
      return { success: false as const, error: `Минимальная маржа ${MIN_MARKUP.toFixed(2)}x` };
    }

    const m = markupValidation.data;
    const usdToRub = await SettingsProvider.getExchangeRateUSD();

    const services = await db.service.findMany({
      where: { id: { in: ids.data } },
      select: { id: true, name: true, rate: true, markup: true, pricePer1000Cents: true, providerCurrency: true },
      take: 10
    });

    const samples = services.map(s => {
      const oldPriceRub = s.pricePer1000Cents / 100;
      const rateRub = s.providerCurrency === 'RUB' ? s.rate : s.rate * usdToRub;
      const newPriceRub = applyBeautifulRounding(rateRub * m);
      return {
        id: s.id,
        name: s.name,
        oldMarkup: s.markup,
        newMarkup: m,
        oldPriceRub,
        newPriceRub,
        diffPercent: Math.round(((newPriceRub - oldPriceRub) / (oldPriceRub || 1)) * 100)
      };
    });

    return { success: true as const, samples, totalCount: ids.data.length };
  });
}

/** Update single service markup (inline edit) */
export async function updateServiceMarkupAction(
  serviceId: string,
  markup: number
) {
  return requireStaffPermission('finance', 'edit', async (admin) => {
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
      select: { markup: true, rate: true, providerCurrency: true },
    });

    if (!service) return { success: false as const, error: 'Service not found' };

    await db.service.update({
      where: { id: serviceId },
      data: { 
        markup: m,
        pricePer1000Cents: Math.round(applyBeautifulRounding(service.rate * m * (service.providerCurrency === 'RUB' ? 1 : usdToRub)) * 100)
      },
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SERVICE_MARKUP_UPDATE',
      target: serviceId,
      targetType: 'SERVICE',
      oldValue: { markup: service.markup },
      newValue: { markup: m },
    });

    revalidatePath('/admin/catalog');
    revalidatePath('/services', 'layout');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)('catalog');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)('services');
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

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: isActive ? 'SERVICE_ENABLE' : 'SERVICE_DISABLE',
      target: serviceId,
      targetType: 'SERVICE',
      newValue: { isActive },
    });

    revalidatePath('/admin/catalog');
    revalidatePath('/services', 'layout');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)('catalog');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)('services');
    return { success: true as const };
  });
}

/** Bulk reassign services to a target category */
export async function batchReassignServicesCategoryAction(
  serviceIds: string[],
  targetCategoryId: string
) {
  return requireStaffPermission('catalog', 'edit', async (admin) => {
    const ids = batchIdsSchema.safeParse(serviceIds);
    if (!ids.success) {
      return { success: false as const, error: 'Invalid service IDs' };
    }

    if (!targetCategoryId || typeof targetCategoryId !== 'string') {
      return { success: false as const, error: 'Invalid target category ID' };
    }

    // Verify target category exists
    const targetCategory = await db.category.findUnique({
      where: { id: targetCategoryId },
    });
    if (!targetCategory) {
      return { success: false as const, error: 'Target category not found' };
    }

    // Update all matching services inside db query
    const updateResult = await db.service.updateMany({
      where: { id: { in: ids.data } },
      data: { categoryId: targetCategoryId },
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'BATCH_SERVICE_REASSIGN',
      target: ids.data.join(','),
      targetType: 'SERVICE',
      newValue: { count: updateResult.count, targetCategoryId },
    });

    revalidatePath('/admin/catalog');
    revalidatePath('/services', 'layout');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)('catalog');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)('services');
    return { success: true as const, count: updateResult.count };
  });
}

/** Bulk reset markup of selected services based on the pricing ladder */
export async function batchResetMarkupAction(
  serviceIds: string[]
) {
  return requireStaffPermission('finance', 'edit', async (admin) => {
    const ids = batchIdsSchema.safeParse(serviceIds);
    if (!ids.success) {
      return { success: false as const, error: 'Invalid service IDs' };
    }

    const usdToRub = await SettingsProvider.getExchangeRateUSD();

    const services = await db.service.findMany({
      where: { id: { in: ids.data } },
      select: { id: true, rate: true, providerCurrency: true }
    });

    const updates = services.map(s => {
      const exchangeRate = s.providerCurrency === 'RUB' ? 1.0 : usdToRub;
      const retailFromLadder = applyPricingLadder(s.rate * exchangeRate);
      let calculatedMarkup = s.rate > 0 ? Math.round((retailFromLadder / (s.rate * exchangeRate)) * 100) / 100 : 3.0;
      
      // Safety Floor Check
      if (calculatedMarkup < SAFETY_FLOOR_MARKUP) {
        calculatedMarkup = SAFETY_FLOOR_MARKUP;
      }

      return db.service.update({
        where: { id: s.id },
        data: { 
          markup: calculatedMarkup,
          pricePer1000Cents: Math.round(applyBeautifulRounding(s.rate * calculatedMarkup * exchangeRate) * 100)
        }
      });
    });

    await db.$transaction(updates);

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'BATCH_MARKUP_RESET',
      target: ids.data.join(','),
      targetType: 'SERVICE',
      newValue: { count: ids.data.length },
    });

    revalidatePath('/admin/catalog');
    revalidatePath('/services', 'layout');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)('catalog');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)('services');
    return { success: true as const, count: ids.data.length };
  });
}

