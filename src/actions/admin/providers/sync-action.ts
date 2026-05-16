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
import { SmartAnalyzerLogic, CATEGORY_LABELS } from "@/services/providers/smart-analyzer.logic";
import { applyPricingLadder, applyBeautifulRounding } from "@/lib/financial-constants";
import { SettingsManager } from "@/lib/settings";
import { requireStaffPermission } from "@/lib/server/rbac";
import { auditAdmin } from "@/lib/admin-audit";
import { applyPostSyncRules } from "@/services/providers/post-sync-rules";
import { MutexManager } from "@/lib/redis-lock";

export async function adminSyncProviderCatalog() {
  return requireStaffPermission('PROVIDERS', 'edit', async (admin) => {
    return MutexManager.withLock('catalog-sync', 60000, 100, async () => {
      try {
      const provider = await providerService.getDefaultProvider();
      if (!provider) {
        return { success: false, error: "No primary provider found." };
      }

      const settings = await db.systemSettings.findUnique({ where: { id: "global" } });
      const quarantineThreshold = settings?.quarantineThreshold ?? 0.20;
      const usdToRub = await SettingsManager.getExchangeRateUSD();

      const apiServices = await provider.getServices();

      let createdCats = 0;
      let newServices = 0;
      let updatedServices = 0;
      let quarantinedServices = 0;

      const existingCats = await db.category.findMany({ include: { network: true } });
      const catMap = new Map(existingCats.map(c => [`${c.network?.slug || "unknown"}__${c.name}`, c.id]));

      const existingServices = await db.service.findMany({
        select: { id: true, externalId: true, rate: true, isQuarantined: true, markup: true },
      });
      const serviceMap = new Map(existingServices.map(s => [s.externalId, s]));

      // 🌊 WAVE 4: Batch Arrays for Transactions
      const updatesBatch: any[] = [];
      const createsBatch: any[] = [];
      const newCategoriesMap = new Map<string, { networkId: string; name: string }>();
      const createdNetworkSlugs = new Set<string>();

      for (const apiService of apiServices) {
        if (apiService.type !== "Default") continue;

        const analysis = SmartAnalyzerLogic.detectSync(apiService.name, "", apiService.category);
        const platform = analysis.platform;
        const catName = CATEGORY_LABELS[analysis.category] || analysis.category;
        const canonicalSlug = platform.toLowerCase() || "unknown";
        const mapKey = `${canonicalSlug}__${catName}`;
        let categoryId = catMap.get(mapKey);

        if (!categoryId) {
          // Pre-compute network/category to create them in batch or first step
          if (!createdNetworkSlugs.has(canonicalSlug)) {
             await db.network.upsert({
               where: { slug: canonicalSlug },
               update: {},
               create: { name: platform, slug: canonicalSlug, sort: 0 },
             });
             createdNetworkSlugs.add(canonicalSlug);
          }
          
          const network = await db.network.findUnique({ where: { slug: canonicalSlug } });
          if (network) {
              const newCat = await db.category.create({
                data: { networkId: network.id, name: catName, sort: 0 },
              });
              categoryId = newCat.id;
              catMap.set(mapKey, categoryId);
              createdCats++;
          }
        }

        const externalId = String(apiService.service);
        const newRate = parseFloat(apiService.rate) || 0;
        const minInt = parseInt(apiService.min, 10) || 10;
        const maxInt = parseInt(apiService.max, 10) || 100000;
        const existing = serviceMap.get(externalId);

        if (existing) {
          const oldRate = existing.rate;
          const priceDelta = oldRate > 0 ? Math.abs(newRate - oldRate) / oldRate : 0;

          if (priceDelta > quarantineThreshold && !existing.isQuarantined) {
            const direction = newRate > oldRate ? "📈 Рост" : "📉 Падение";
            const pct = (priceDelta * 100).toFixed(1);
            const reason = `${direction} цены на ${pct}%: ${oldRate.toFixed(4)} → ${newRate.toFixed(4)}`;

            updatesBatch.push(
              db.service.update({
                where: { id: existing.id },
                data: {
                  isQuarantined: true,
                  pendingRate: newRate,
                  quarantineReason: reason,
                  quarantinedAt: new Date(),
                  minQty: minInt,
                  maxQty: maxInt,
                  lastSeenAt: new Date(),
                },
              })
            );
            quarantinedServices++;
          } else if (!existing.isQuarantined) {
            // 🌊 WAVE 4.1: FIX MARGIN DESTRUCTION
            // Do NOT recalculate markup. Keep existing markup exactly as is!
            const retailRub = applyBeautifulRounding(newRate * existing.markup * usdToRub);

            updatesBatch.push(
              db.service.update({
                where: { id: existing.id },
                data: { 
                  rate: newRate, 
                  pricePer1000Cents: Math.round(retailRub * 100),
                  minQty: minInt, 
                  maxQty: maxInt, 
                  isActive: true, 
                  lastSeenAt: new Date() 
                },
              })
            );
            updatedServices++;
          }
        } else {
          const rawRetail = applyPricingLadder(newRate * usdToRub);
          const retailFromLadder = applyBeautifulRounding(rawRetail);
          const calculatedMarkup =
            newRate > 0 ? Math.round((retailFromLadder / (newRate * usdToRub)) * 100) / 100 : 3.0;

          if (categoryId) {
             createsBatch.push({
                name: analysis.suggestedName || apiService.name,
                categoryId,
                rate: newRate,
                markup: calculatedMarkup,
                pricePer1000Cents: Math.round(retailFromLadder * 100),
                minQty: minInt,
                maxQty: maxInt,
                externalId,
                isActive: true,
                isDripFeedEnabled: !!apiService.dripfeed,
                isRefillEnabled: !!apiService.refill,
                isCancelEnabled: !!apiService.cancel,
                lastSeenAt: new Date(),
             });
          }
          newServices++;
        }
      }

      // 🌊 WAVE 4.2: Execute Updates in Transactions
      for (let i = 0; i < updatesBatch.length; i += 100) {
        await db.$transaction(updatesBatch.slice(i, i + 100));
      }

      // 🌊 WAVE 4.3: Execute Creates in Bulk
      if (createsBatch.length > 0) {
        await db.service.createMany({
           data: createsBatch,
           skipDuplicates: true
        });
      }

      // Apply post-sync rules (blacklist, hide, reclassify, cap maxQty)
      const rulesResult = await applyPostSyncRules();

      auditAdmin({
        adminId: admin.id,
        adminEmail: admin.email,
        action: "CATALOG_SYNC",
        target: "provider",
        targetType: "SERVICE",
        newValue: { createdCats, newServices, updatedServices, quarantinedServices, postSyncRules: rulesResult },
      });

      return {
        success: true,
        message: `Синхронизация: +${newServices} новых, ✓${updatedServices} обновлено, ⚠️${quarantinedServices} в карантине. Правила: ${rulesResult.reclassified} переклассифицировано, ${rulesResult.hidden} скрыто.`,
        stats: { createdCats, newServices, updatedServices, quarantinedServices, postSyncRules: rulesResult },
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
