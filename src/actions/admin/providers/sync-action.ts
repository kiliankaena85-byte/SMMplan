"use server";

/**
 * Admin: Provider Catalog Sync Action
 *
 * Quarantine trigger (per AGENTS.md Safety Floor):
 * - If rate changes > quarantineThreshold (default 20%) → isQuarantined=true
 * - Admin must approve/reject in /admin/catalog/quarantine
 */

import { db } from "@/lib/db";
import { providerService } from "@/services/providers/provider.service";
import { applyBeautifulRounding } from "@/lib/financial-constants";
import { SettingsManager } from "@/lib/settings";
import { requireStaffPermission } from "@/lib/server/rbac";
import { auditAdmin } from "@/lib/admin-audit";
import { applyPostSyncRules } from "@/services/providers/post-sync-rules";
import { MutexManager } from "@/lib/redis-lock";

export async function adminSyncProviderCatalog() {
  return requireStaffPermission('PROVIDERS', 'edit', async (admin) => {
    return MutexManager.withLock('catalog-sync', 60000, 100, async () => {
      try {
        const pDbRecord = await db.provider.findFirst({ where: { isActive: true } });
        if (!pDbRecord) return { success: false, error: "No primary provider found." };
        
        const provider = await providerService.getProviderInstance(pDbRecord);
        const usdToRub = await SettingsManager.getExchangeRateUSD();

        // 1. Fetch External Shadow Catalog (O(1) Network Request)
        const apiServices = await provider.getServices();
        const externalMap = new Map();
        for (const s of apiServices) {
          externalMap.set(String(s.service), s);
        }

        // 2. Fetch OUR Curated Catalog (Only imported services)
        // Note: For Smmplan Lite we fetch all services that have an externalId
        const ourServices = await db.service.findMany({
          where: { externalId: { not: null } },
          select: { id: true, externalId: true, rate: true, markup: true, isActive: true, isQuarantined: true },
        });

        let updatedCount = 0;
        let disabledCount = 0;
        let unchangedCount = 0;
        const updatesBatch: any[] = [];

        // 3. Surgical Iteration (O(M) where M is ~100-500, not 5000)
        for (const myService of ourServices) {
          if (!myService.externalId) continue;
          
          const external = externalMap.get(myService.externalId);

          // 🧟 Zombie Eraser: Provider deleted this service
          if (!external) {
            if (myService.isActive) {
              updatesBatch.push(
                db.service.update({
                  where: { id: myService.id },
                  data: { 
                    isActive: false, 
                    isQuarantined: true, 
                    quarantineReason: 'ZOMBIE: Удалено провайдером из API' 
                  }
                })
              );
              disabledCount++;
            }
            continue;
          }

          // 💰 Auto-Pricing Engine: Price comparison
          const newRate = parseFloat(external.rate) || 0;
          const oldRate = myService.rate;

          if (newRate !== oldRate) {
            // Recalculate retail price in RUB based on current CBR rate and preserved markup
            const retailRub = applyBeautifulRounding(newRate * myService.markup * usdToRub);
            const minInt = parseInt(external.min, 10) || 10;
            const maxInt = parseInt(external.max, 10) || 100000;

            updatesBatch.push(
              db.service.update({
                where: { id: myService.id },
                data: {
                  rate: newRate,
                  pricePer1000Cents: Math.round(retailRub * 100),
                  minQty: minInt,
                  maxQty: maxInt,
                  lastSeenAt: new Date(),
                  isActive: true, // Reactivate if it was previously quarantined due to other reasons
                  isQuarantined: false,
                  quarantineReason: null
                }
              })
            );
            updatedCount++;
          } else {
            unchangedCount++;
          }
        }

        // 🌊 Database Execution in Chunks
        for (let i = 0; i < updatesBatch.length; i += 100) {
          await db.$transaction(updatesBatch.slice(i, i + 100));
        }

        // Apply post-sync rules (blacklist, hide) on the curated set
        const rulesResult = await applyPostSyncRules();

        auditAdmin({
          adminId: admin.id,
          adminEmail: admin.email,
          action: "CATALOG_SURGICAL_SYNC",
          target: "provider",
          targetType: "SERVICE",
          newValue: { updatedCount, disabledCount, unchangedCount, postSyncRules: rulesResult },
        });

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

/** Approve quarantined service — apply pendingRate */
export async function approveQuarantinedService(serviceId: string) {
  return requireStaffPermission('PROVIDERS', 'edit', async (admin) => {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      select: { id: true, rate: true, pendingRate: true, isQuarantined: true },
    });

    if (!service?.isQuarantined || service.pendingRate === null) {
      return { success: false, error: "Service not in quarantine" };
    }

    await db.service.update({
      where: { id: serviceId },
      data: {
        rate: service.pendingRate,
        isQuarantined: false,
        pendingRate: null,
        quarantineReason: null,
        quarantinedAt: null,
      },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "QUARANTINE_APPROVE",
      target: serviceId,
      targetType: "SERVICE",
      oldValue: { rate: service.rate },
      newValue: { rate: service.pendingRate },
    });

    return { success: true };
  });
}

/** Reject quarantined service — keep current rate */
export async function rejectQuarantinedService(serviceId: string) {
  return requireStaffPermission('PROVIDERS', 'edit', async (admin) => {
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
  return requireStaffPermission('PROVIDERS', 'edit', async (admin) => {
    const quarantined = await db.service.findMany({
      where: { isQuarantined: true, pendingRate: { not: null } },
      select: { id: true, pendingRate: true },
    });

    await db.$transaction(async (tx) => {
      for (const s of quarantined) {
        if (s.pendingRate === null) continue;
        await tx.service.update({
          where: { id: s.id },
          data: {
            rate: s.pendingRate,
            isQuarantined: false,
            pendingRate: null,
            quarantineReason: null,
            quarantinedAt: null,
          },
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
