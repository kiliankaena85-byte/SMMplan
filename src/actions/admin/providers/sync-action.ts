'use server';

/**
 * Admin: Provider Catalog Sync Action
 *
 * Quarantine trigger (per AGENTS.md Safety Floor):
 * - If rate changes > quarantineThreshold (default 20%) → isQuarantined=true
 * - Admin must approve/reject in /admin/catalog/quarantine
 */

import { revalidateTag, revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { applyBeautifulRounding, SAFETY_FLOOR_MARKUP } from "@/lib/financial-constants";
import { SettingsManager } from "@/lib/settings";
import { requireStaffPermission } from "@/lib/server/rbac";
import { auditAdmin } from "@/lib/admin-audit";
import { MutexManager } from "@/lib/redis-lock";
import { adminCatalogService } from "@/services/admin/catalog.service";

function revalidateQuarantineAndAnomalies() {
  try {
    revalidateTag('anomaly-count', 'default');
    revalidateTag('catalog', 'default');
    revalidatePath('/admin/catalog/quarantine');
    revalidatePath('/admin', 'layout');
  } catch (err) {
    console.warn('[Quarantine] Revalidation warning:', err);
  }
}

export async function adminSyncProviderCatalog() {
  return requireStaffPermission('catalog', 'edit', async (admin) => {
    return MutexManager.withLock('catalog-sync', 60000, 100, async () => {
      try {
        const activeProviders = await db.provider.findMany({ where: { isActive: true } });
        if (!activeProviders.length) return { success: false, error: "Нет активных провайдеров." };
        
        let updatedCount = 0;
        let disabledCount = 0;

        for (const provider of activeProviders) {
          try {
            const stats = await adminCatalogService.syncProviderCatalog(provider.id, admin);
            updatedCount += stats.priceUpdatedSilent;
            disabledCount += stats.priceAnomalies + stats.zombiesDisabled;
          } catch (pErr: unknown) {
            const errMsg = pErr instanceof Error ? pErr.message : String(pErr);
            console.error(`[CatalogSync] Provider ${provider.name} (${provider.id}) sync error:`, pErr);
            const { sendAdminAlert } = await import('@/lib/notifications');
            await sendAdminAlert(`⚠️ Sync провайдера "${provider.name}" не удался: ${errMsg}`, 'WARNING');
          }
        }

        revalidateQuarantineAndAnomalies();
        return {
          success: true,
          message: `Синхронизация Бутика завершена (${activeProviders.length} провайд.): 🔄${updatedCount} цен обновлено, 🧟${disabledCount} мертвых душ отключено.`,
          stats: { updatedCount, disabledCount, unchangedCount: 0 },
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("Critical Sync Error:", err);
        const { sendAdminAlert } = await import('@/lib/notifications');
        await sendAdminAlert(`🚨 Критический сбой синхронизации каталога: ${errMsg}`, 'CRITICAL');
        return { success: false, error: errMsg };
      }
    });
  });
}

export async function approveQuarantinedService(serviceId: string) {
  return requireStaffPermission('catalog', 'edit', async (admin) => {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      select: { 
        id: true, 
        rate: true, 
        markup: true, 
        pendingRate: true, 
        isQuarantined: true, 
        providerCurrency: true 
      },
    });

    if (!service?.isQuarantined) {
      return { success: false, error: "Service not in quarantine" };
    }

    const usdToRub = await SettingsManager.getExchangeRateUSD();
    const exchangeRate = service.providerCurrency === 'RUB' ? 1.0 : usdToRub;
    if (service.pendingRate === null) {
      return { success: false, error: "Невозможно одобрить карантин: отсутствует новый тариф (ошибка невалидного тарифа от провайдера)" };
    }
    const targetRate = service.pendingRate;
    
    const settings = await SettingsManager.get();
    const effectiveMarkup = service.markup > 0 ? service.markup : (settings.globalMarkup || 3.0);
    const newPricePer1000Cents = Math.round(
      applyBeautifulRounding(targetRate * effectiveMarkup * exchangeRate) * 100
    );

    await db.$transaction(async (tx) => {
      await tx.service.update({
        where: { id: serviceId },
        data: {
          rate: targetRate,
          pricePer1000Cents: newPricePer1000Cents,
          isQuarantined: false,
          pendingRate: null,
          quarantineReason: null,
          quarantinedAt: null,
        },
      });

      await tx.servicePriceHistory.create({
        data: {
          serviceId,
          rate: targetRate,
        }
      });
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "QUARANTINE_APPROVE",
      target: serviceId,
      targetType: "SERVICE",
      oldValue: { rate: service.rate },
      newValue: { rate: targetRate, pricePer1000Cents: newPricePer1000Cents },
    });

    revalidateQuarantineAndAnomalies();
    return { success: true };
  });
}

/** Reject quarantined service — keep current rate */
export async function rejectQuarantinedService(serviceId: string) {
  return requireStaffPermission('catalog', 'edit', async (admin) => {
    await db.service.update({
      where: { id: serviceId },
      data: { isQuarantined: false, pendingRate: null, quarantineReason: null, quarantinedAt: null },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "QUARANTINE_REJECT",
      target: serviceId,
      targetType: "SERVICE",
    });

    revalidateQuarantineAndAnomalies();
    return { success: true };
  });
}

/** Bulk approve all quarantined */
export async function approveAllQuarantined() {
  return requireStaffPermission('catalog', 'edit', async (admin) => {
    const quarantined = await db.service.findMany({
      where: { isQuarantined: true },
      select: { id: true, rate: true, pendingRate: true, markup: true, providerCurrency: true },
    });

    const usdToRub = await SettingsManager.getExchangeRateUSD();
    const settings = await SettingsManager.get();

    await db.$transaction(async (tx) => {
      for (const s of quarantined) {
        if (s.pendingRate === null || s.pendingRate <= 0) {
          continue;
        }
        const targetRate = s.pendingRate;
        const exchangeRate = s.providerCurrency === 'RUB' ? 1.0 : usdToRub;
        const effectiveMarkup = s.markup > 0 ? s.markup : (settings.globalMarkup || 3.0);
        const newPricePer1000Cents = Math.round(
          applyBeautifulRounding(targetRate * effectiveMarkup * exchangeRate) * 100
        );

        await tx.service.update({
          where: { id: s.id },
          data: {
            rate: targetRate,
            pricePer1000Cents: newPricePer1000Cents,
            isQuarantined: false,
            pendingRate: null,
            quarantineReason: null,
            quarantinedAt: null,
          },
        });

        await tx.servicePriceHistory.create({
          data: {
            serviceId: s.id,
            rate: targetRate,
          }
        });
      }
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "QUARANTINE_APPROVE_ALL",
      target: `${quarantined.length} services`,
      targetType: "SERVICE",
      newValue: { count: quarantined.length },
    });

    revalidateQuarantineAndAnomalies();
    return { success: true, count: quarantined.length };
  });
}

/** Archive zombie service */
export async function archiveZombieService(serviceId: string) {
  return requireStaffPermission('catalog', 'edit', async (admin) => {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      select: { id: true, name: true, isActive: true, cooldownReason: true },
    });

    if (!service) return { success: false, error: "Service not found" };

    const newName = service.name.startsWith('[ARCHIVED]') ? service.name : `[ARCHIVED] ${service.name}`;

    await db.service.update({
      where: { id: serviceId },
      data: {
        isActive: false,
        name: newName,
        cooldownReason: 'ZOMBIE_ARCHIVED',
      },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "SERVICE_ARCHIVE_ZOMBIE",
      target: serviceId,
      targetType: "SERVICE",
      oldValue: { name: service.name, isActive: service.isActive, cooldownReason: service.cooldownReason },
      newValue: { name: newName, isActive: false, cooldownReason: 'ZOMBIE_ARCHIVED' },
    });

    revalidateQuarantineAndAnomalies();
    return { success: true };
  });
}

/** Lift API block early */
export async function liftApiBlock(serviceId: string) {
  return requireStaffPermission('catalog', 'edit', async (admin) => {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      select: { id: true }
    });
    
    if (!service) return { success: false, error: 'Service not found' };

    await db.service.update({
      where: { id: serviceId },
      data: {
        cooldownUntil: null,
        cooldownReason: null,
      },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "SERVICE_LIFT_API_BLOCK",
      target: serviceId,
      targetType: "SERVICE",
    });

    revalidateQuarantineAndAnomalies();
    return { success: true };
  });
}
