"use server";

/**
 * Admin: Provider Catalog Sync Action
 *
 * Quarantine trigger (per AGENTS.md Safety Floor):
 * - If rate changes > quarantineThreshold (default 20%) → isQuarantined=true
 * - Admin must approve/reject in /admin/catalog/quarantine
 */

import { db } from "@/lib/db";
import { applyBeautifulRounding, SAFETY_FLOOR_MARKUP } from "@/lib/financial-constants";
import { SettingsManager } from "@/lib/settings";
import { requireStaffPermission } from "@/lib/server/rbac";
import { auditAdmin } from "@/lib/admin-audit";
import { MutexManager } from "@/lib/redis-lock";
import { adminCatalogService } from "@/services/admin/catalog.service";

export async function adminSyncProviderCatalog() {
  return requireStaffPermission('catalog', 'edit', async (admin) => {
    return MutexManager.withLock('catalog-sync', 60000, 100, async () => {
      try {
        const pDbRecord = await db.provider.findFirst({ where: { isActive: true } });
        if (!pDbRecord) return { success: false, error: "No primary provider found." };
        
        const stats = await adminCatalogService.syncProviderCatalog(pDbRecord.id, admin);
        
        const updatedCount = stats.priceUpdatedSilent;
        const disabledCount = stats.priceAnomalies + stats.zombiesDisabled;
        const unchangedCount = 0;

        return {
          success: true,
          message: `Синхронизация Бутика завершена: 🔄${updatedCount} цен обновлено, 🧟${disabledCount} мертвых душ отключено, ⚡${unchangedCount} без изменений.`,
          stats: { updatedCount, disabledCount, unchangedCount },
        };
      } catch (err: unknown) {
        console.error("Critical Sync Error:", err);
        return { success: false, error: err instanceof Error ? err.message : "Unknown sync error" };
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
    const targetRate = service.pendingRate !== null ? service.pendingRate : service.rate;
    
    if (targetRate <= 0) {
      return { success: false, error: "Cannot approve quarantine: target rate is invalid (<= 0)" };
    }

    const newPricePer1000Cents = Math.round(
      applyBeautifulRounding(targetRate * Math.max(service.markup, SAFETY_FLOOR_MARKUP) * exchangeRate) * 100
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

    await db.$transaction(async (tx) => {
      for (const s of quarantined) {
        const targetRate = s.pendingRate !== null ? s.pendingRate : s.rate;
        if (targetRate <= 0) {
          continue;
        }
        const exchangeRate = s.providerCurrency === 'RUB' ? 1.0 : usdToRub;
        const newPricePer1000Cents = Math.round(
          applyBeautifulRounding(targetRate * Math.max(s.markup, SAFETY_FLOOR_MARKUP) * exchangeRate) * 100
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

    return { success: true };
  });
}
