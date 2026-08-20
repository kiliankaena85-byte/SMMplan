'use server';

import { db } from "@/lib/db";
import { requireStaffPermission } from "@/lib/server/rbac";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { auditAdmin, auditAdminAwaitable } from "@/lib/admin-audit";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { SettingsProvider } from "@/lib/settings";
import { applyBeautifulRounding } from "@/lib/financial-constants";
import { inferTargetTypeFromCategory } from "@/utils/target-type";

export async function ensureTaxonomyTenantAccess(categoryId: string) {
  return requireStaffPermission('CATALOG', 'edit', async () => {
    const category = await db.category.findUnique({
      where: { id: categoryId },
      select: { id: true, tenantId: true, networkId: true }
    });
    if (category && category.tenantId !== 'all') {
      await db.category.update({
        where: { id: categoryId },
        data: { tenantId: 'all' }
      });
      if (category.networkId) {
        await db.network.update({
          where: { id: category.networkId },
          data: { tenantId: 'all' }
        });
      }
    }
  });
}

// Validation schema for manual Service CRUD operations
const serviceSchema = z.object({
  tenantId: z.enum(["smmplan", "flux"]).default("smmplan"),
  name: z.string().min(1, "Название услуги обязательно").max(255, "Название слишком длинное"),
  description: z.string().optional().nullable(),
  categoryId: z.string().min(1, "Категория обязательна"),
  providerId: z.string().optional().nullable(),
  rate: z.coerce.number().min(0, "Тариф провайдера должен быть больше или равен 0"),
  markup: z.coerce.number().min(1.0, "Наценка должна быть не менее 1.0"),
  minQty: z.coerce.number().int().min(1, "Минимальное количество должно быть не менее 1"),
  maxQty: z.coerce.number().int().min(1, "Максимальное количество должно быть не менее 1"),
  externalId: z.string().optional().nullable(),
  targetType: z.string().optional().nullable(),
  qualityTier: z.enum(["ECONOMY", "STANDARD", "PREMIUM", "VIP", "AUTO"]).default("STANDARD"),
  customDataType: z.string().default("NONE"),
  customDataLabel: z.string().max(100, "Название подсказки не должно превышать 100 символов").optional().nullable(),
  isMediaGroupAware: z.coerce.boolean().default(false),
  linkValidatorRegex: z.string().optional().nullable(),
  linkPlaceholder: z.string().max(255, "Пример ссылки слишком длинный").optional().nullable(),
  linkHint: z.string().max(500, "Подсказка слишком длинная").optional().nullable(),
  requiresBotAdmin: z.coerce.boolean().default(false),
  isDripFeedEnabled: z.coerce.boolean().default(true),
  isRefillEnabled: z.coerce.boolean().default(false),
  isCancelEnabled: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
  requireWarning: z.coerce.boolean().default(false),
  warningMessage: z.string().max(1000, "Предупреждение слишком длинное").optional().nullable(),
  clientRequirement: z.string().max(2000, "Требование слишком длинное").optional().nullable(),
  clientConfirmation: z.string().max(200, "Текст подтверждения слишком длинный").optional().nullable()
});

/**
 * Manually create a new catalog Service
 */
export async function createServiceAction(rawData: unknown) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    const parsed = serviceSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.errors[0]?.message || 'Неверные данные услуги' };
    }
    const data = parsed.data;

    // Verify category exists and ensure taxonomy is accessible to all tenants
    const category = await db.category.findUnique({
      where: { id: data.categoryId }
    });
    if (!category) {
      return { success: false as const, error: 'Указанная категория не найдена' };
    }
    await ensureTaxonomyTenantAccess(data.categoryId);

    const slugCandidate = data.name.toLowerCase().trim().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '') || `service-${Date.now()}`;
    const existingSlugService = await db.service.findFirst({
      where: { tenantId: data.tenantId, slug: slugCandidate }
    });
    if (existingSlugService) {
      return { success: false as const, error: 'Услуга уже существует для выбранного сайта' };
    }

    // Verify provider exists if provided
    let providerCurrency = 'USD';
    if (data.providerId) {
      const provider = await db.provider.findUnique({
        where: { id: data.providerId }
      });
      if (!provider) {
        return { success: false as const, error: 'Указанный провайдер SMM не найден' };
      }
      providerCurrency = provider.balanceCurrency;
    }

    // Infer targetType if not provided
    let targetType = data.targetType;
    if (!targetType) {
      targetType = inferTargetTypeFromCategory(category.name);
    }

    // Calculate pricePer1000Cents dynamically using CBR exchange rate
    const usdToRub = await SettingsProvider.getExchangeRateUSD();
    const exchangeRate = providerCurrency === 'RUB' ? 1.0 : usdToRub;
    const pricePer1000Cents = Math.round(applyBeautifulRounding(data.rate * data.markup * exchangeRate) * 100);

    // Atomically create the service
    const service = await db.$transaction(async (tx) => {
      return await tx.service.create({
        data: {
          tenantId: data.tenantId,
          slug: slugCandidate,
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          providerId: data.providerId,
          rate: data.rate,
          markup: data.markup,
          minQty: data.minQty,
          maxQty: data.maxQty,
          externalId: data.externalId,
          targetType: targetType,
          qualityTier: data.qualityTier,
          customDataType: data.customDataType,
          customDataLabel: data.customDataLabel,
          isMediaGroupAware: data.isMediaGroupAware,
          linkValidatorRegex: data.linkValidatorRegex,
          linkPlaceholder: data.linkPlaceholder,
          linkHint: data.linkHint,
          requiresBotAdmin: data.requiresBotAdmin,
          isDripFeedEnabled: data.isDripFeedEnabled,
          isRefillEnabled: data.isRefillEnabled,
          isCancelEnabled: data.isCancelEnabled,
          isActive: data.isActive,
          requireWarning: data.requireWarning,
          warningMessage: data.warningMessage,
          clientRequirement: data.clientRequirement,
          clientConfirmation: data.clientConfirmation,
          providerCurrency,
          pricePer1000Cents
        }
      });
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SERVICE_MANUAL_CREATE',
      target: service.id,
      targetType: 'SERVICE',
      newValue: {
        name: service.name,
        categoryId: service.categoryId,
        rate: service.rate,
        markup: service.markup,
        pricePer1000Cents: service.pricePer1000Cents,
        requireWarning: service.requireWarning,
        warningMessage: service.warningMessage,
        clientRequirement: service.clientRequirement,
        clientConfirmation: service.clientConfirmation
      }
    });

    revalidatePath("/admin/catalog");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)("catalog");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)("services");

    return { success: true as const, serviceId: service.id };
  });
}

/**
 * Manually update an existing catalog Service
 */
export async function updateServiceAction(id: string, rawData: unknown) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    if (!id || typeof id !== 'string') {
      return { success: false as const, error: 'ID услуги обязателен' };
    }

    const parsed = serviceSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.errors[0]?.message || 'Неверные данные услуги' };
    }
    const data = parsed.data;

    // Verify service exists
    const service = await db.service.findUnique({
      where: { id }
    });
    if (!service) {
      return { success: false as const, error: 'Услуга не найдена' };
    }

    // Verify category exists
    const category = await db.category.findUnique({
      where: { id: data.categoryId }
    });
    if (!category) {
      return { success: false as const, error: 'Указанная категория не найдена' };
    }
    await ensureTaxonomyTenantAccess(data.categoryId);

    // Verify provider exists if provided
    let providerCurrency = service.providerCurrency;
    if (data.providerId) {
      const provider = await db.provider.findUnique({
        where: { id: data.providerId }
      });
      if (!provider) {
        return { success: false as const, error: 'Указанный провайдер SMM не найден' };
      }
      providerCurrency = provider.balanceCurrency;
    }

    // Infer targetType if not provided
    let targetType = data.targetType;
    if (!targetType) {
      targetType = inferTargetTypeFromCategory(category.name);
    }

    // Recalculate pricePer1000Cents dynamically using CBR exchange rate
    const usdToRub = await SettingsProvider.getExchangeRateUSD();
    const exchangeRate = providerCurrency === 'RUB' ? 1.0 : usdToRub;
    const pricePer1000Cents = Math.round(applyBeautifulRounding(data.rate * data.markup * exchangeRate) * 100);

    // Check if name or description were customized
    const isCustomName = data.name !== service.name ? true : service.isCustomName;
    const isCustomDescription = data.description !== service.description ? true : service.isCustomDescription;

    // Atomically update the service
    const updatedService = await db.$transaction(async (tx) => {
      return await tx.service.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          isCustomName,
          isCustomDescription,
          categoryId: data.categoryId,
          providerId: data.providerId,
          rate: data.rate,
          markup: data.markup,
          minQty: data.minQty,
          maxQty: data.maxQty,
          externalId: data.externalId,
          targetType: targetType,
          qualityTier: data.qualityTier,
          customDataType: data.customDataType,
          customDataLabel: data.customDataLabel,
          isMediaGroupAware: data.isMediaGroupAware,
          linkValidatorRegex: data.linkValidatorRegex,
          linkPlaceholder: data.linkPlaceholder,
          linkHint: data.linkHint,
          requiresBotAdmin: data.requiresBotAdmin,
          isDripFeedEnabled: data.isDripFeedEnabled,
          isRefillEnabled: data.isRefillEnabled,
          isCancelEnabled: data.isCancelEnabled,
          isActive: data.isActive,
          requireWarning: data.requireWarning,
          warningMessage: data.warningMessage,
          clientRequirement: data.clientRequirement,
          clientConfirmation: data.clientConfirmation,
          providerCurrency,
          pricePer1000Cents
        }
      });
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SERVICE_MANUAL_UPDATE',
      target: id,
      targetType: 'SERVICE',
      oldValue: {
        name: service.name,
        categoryId: service.categoryId,
        rate: service.rate,
        markup: service.markup,
        pricePer1000Cents: service.pricePer1000Cents,
        requireWarning: service.requireWarning,
        warningMessage: service.warningMessage
      },
      newValue: {
        name: updatedService.name,
        categoryId: updatedService.categoryId,
        rate: updatedService.rate,
        markup: updatedService.markup,
        pricePer1000Cents: updatedService.pricePer1000Cents,
        requireWarning: updatedService.requireWarning,
        warningMessage: updatedService.warningMessage,
        clientRequirement: updatedService.clientRequirement,
        clientConfirmation: updatedService.clientConfirmation
      }
    });

    revalidatePath("/admin/catalog");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)("catalog");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)("services");

    return { success: true as const, serviceId: updatedService.id };
  });
}

/**
 * Reset custom metadata flags to allow automatic provider synchronization
 */
export async function resetCustomFlagsAction(id: string) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    if (!id || typeof id !== 'string') {
      return { success: false as const, error: 'ID услуги обязателен' };
    }

    const service = await db.service.update({
      where: { id },
      data: {
        isCustomName: false,
        isCustomDescription: false,
      }
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SERVICE_RESET_CUSTOM_FLAGS',
      target: id,
      targetType: 'SERVICE',
    });

    revalidatePath("/admin/catalog");
    return { success: true as const, serviceId: service.id };
  });
}
