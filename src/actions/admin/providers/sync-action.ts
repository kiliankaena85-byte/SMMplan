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
import { applyBeautifulRounding, SAFETY_FLOOR_MARKUP } from "@/lib/financial-constants";
import { SettingsManager } from "@/lib/settings";
import { requireStaffPermission } from "@/lib/server/rbac";
import { auditAdmin } from "@/lib/admin-audit";
import { applyPostSyncRules } from "@/services/providers/post-sync-rules";
import { MutexManager } from "@/lib/redis-lock";
import { ServiceAuditEngine } from "@/services/admin/audit-engine";

export async function adminSyncProviderCatalog() {
  return requireStaffPermission('catalog', 'edit', async (admin) => {
    return MutexManager.withLock('catalog-sync', 60000, 100, async () => {
      try {
        const pDbRecord = await db.provider.findFirst({ where: { isActive: true } });
        if (!pDbRecord) return { success: false, error: "No primary provider found." };
        
        const provider = await providerService.getProviderInstance(pDbRecord);
        const settings = await SettingsManager.get();
        const usdToRub = settings.exchangeRateUSD || 95.0;
        const quarantineThreshold = settings.quarantineThreshold || 0.20;

        // 1. Fetch External Shadow Catalog (O(1) Network Request)
        const apiServices = await provider.getServices();
        const externalMap = new Map();
        for (const s of apiServices) {
          externalMap.set(String(s.service), s);
        }

        // 2. Fetch OUR Curated Catalog (Only imported services)
        // Note: For SMMplan we fetch all services that have an externalId
        const ourServices = await db.service.findMany({
          where: { externalId: { not: null } },
          select: {
            id: true,
            externalId: true,
            rate: true,
            markup: true,
            isActive: true,
            isQuarantined: true,
            pricePer1000Cents: true,
            providerCurrency: true,
            name: true,
            description: true,
            quarantineReason: true,
            quarantinedAt: true,
          },
        });

        let updatedCount = 0;
        let disabledCount = 0;
        let unchangedCount = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

          if (myService.isQuarantined) {
            // Skip sync if already quarantined to avoid bypassing admin review state
            unchangedCount++;
            continue;
          }

          const newRate = parseFloat(external.rate) || 0;
          const providerCurrency = pDbRecord.balanceCurrency || 'USD';
          let oldRate = myService.rate;

          let providerCurrencyChanged = false;
          // Self-heal mismatch between service providerCurrency and current provider balanceCurrency on the fly
          if (myService.providerCurrency !== providerCurrency) {
            const conversionFactor = (myService.providerCurrency === 'USD' && providerCurrency === 'RUB')
              ? usdToRub
              : (myService.providerCurrency === 'RUB' && providerCurrency === 'USD')
              ? (1.0 / usdToRub)
              : 1.0;
            oldRate = oldRate * conversionFactor;
            providerCurrencyChanged = true;
          }

          const serviceExchangeRate = providerCurrency === 'RUB' ? 1.0 : usdToRub;
          const auditPayloads = ServiceAuditEngine.auditAndFixService(myService, external, serviceExchangeRate);
          updatesBatch.push(...auditPayloads);

          const newCostCents = newRate * serviceExchangeRate * 100;
          const actualMarkup = newCostCents > 0 ? (myService.pricePer1000Cents / newCostCents) : myService.markup;

          // Check for Margin Floor breach -> Quarantine (align with catalog.service.ts)
          if (oldRate > 0 && newRate !== oldRate && actualMarkup < SAFETY_FLOOR_MARKUP) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updateData: any = {
              isQuarantined: true,
              quarantineReason: `Margin Floor Breach: Наценка упала до ${actualMarkup.toFixed(2)}x (Min: ${SAFETY_FLOOR_MARKUP}x)`,
              isActive: false,
              pendingRate: newRate,
              quarantinedAt: new Date()
            };
            if (providerCurrencyChanged) {
              updateData.providerCurrency = providerCurrency;
            }
            updatesBatch.push(
              db.service.update({
                where: { id: myService.id },
                data: updateData
              })
            );

            const alertMsg = `🚨 [Margin Floor Breach] Услуга ${myService.id} ушла в карантин из-за падения наценки до ${actualMarkup.toFixed(2)}x (Min: ${SAFETY_FLOOR_MARKUP}x).`;
            console.warn(alertMsg);
            const { sendAdminAlert } = await import('@/lib/notifications');
            await sendAdminAlert(alertMsg, 'WARNING');

            disabledCount++;
            continue;
          }

          let markupChanged = false;

          // Check for Elastic Quarantine or Price Absorption
          if (oldRate > 0 && newRate > oldRate) {
            const increaseRatio = newRate / oldRate;

            if (increaseRatio > (1.0 + quarantineThreshold)) { // Скачок > порога
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const updateData: any = {
                isQuarantined: true,
                quarantineReason: `Ценовой скачок у провайдера (> ${(quarantineThreshold * 100).toFixed(0)}%)`,
                isActive: false,
                pendingRate: newRate,
                quarantinedAt: new Date()
              };
              if (providerCurrencyChanged) {
                updateData.providerCurrency = providerCurrency;
              }
              updatesBatch.push(
                db.service.update({
                  where: { id: myService.id },
                  data: updateData
                })
              );
              
              const currencySymbol = providerCurrency === 'RUB' ? '₽' : '$';
              const alertMsg = `🚨 [Elastic Quarantine] Услуга ${myService.id} ушла в карантин из-за ценового скачка > ${(quarantineThreshold * 100).toFixed(0)}% (${currencySymbol}${oldRate.toFixed(4)} -> ${currencySymbol}${newRate.toFixed(4)}).`;
              console.warn(alertMsg);
              const { sendAdminAlert } = await import('@/lib/notifications');
              await sendAdminAlert(alertMsg, 'WARNING');
              
              disabledCount++;
              continue;
            } else {
              // Рост <= порога. Берем процент на себя (абсорбируем), снижая markup
              const serviceExchangeRateLocal = providerCurrency === 'RUB' ? 1.0 : usdToRub;
              const newCostCentsLocal = newRate * serviceExchangeRateLocal * 100;
              if (newCostCentsLocal > 0) {
                myService.markup = myService.pricePer1000Cents / newCostCentsLocal;
                markupChanged = true;
              }
            }
          }

          const pricePer1kRub = newRate * myService.markup * serviceExchangeRate;
          const pricePer1kRubRounded = applyBeautifulRounding(pricePer1kRub);
          const pricePerUnitRub = pricePer1kRubRounded / 1000;
          const purchaseCostPerUnitRub = (newRate * serviceExchangeRate) / 1000;

          // Check for Loss Prevention: retail price per unit < purchase cost per unit
          if (pricePerUnitRub < purchaseCostPerUnitRub) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updateData: any = {
              isActive: false,
              lastSeenAt: new Date()
            };
            if (providerCurrencyChanged) {
              updateData.providerCurrency = providerCurrency;
            }
            updatesBatch.push(
              db.service.update({
                where: { id: myService.id },
                data: updateData
              })
            );

            const alertMsg = `🚨 [Loss Prevention] Услуга ${myService.id} автоматически отключена! Розничная цена ${pricePerUnitRub.toFixed(4)} ₽/шт меньше себестоимости закупки ${purchaseCostPerUnitRub.toFixed(4)} ₽/шт.`;
            console.error(alertMsg);

            await db.routingAuditLog.create({
              data: {
                serviceId: myService.id,
                action: 'LOSS_PREVENTION_BLOCK',
                reason: `Retail price ${pricePerUnitRub.toFixed(4)} < Cost ${purchaseCostPerUnitRub.toFixed(4)}`
              }
            });

            const { sendAdminAlert } = await import('@/lib/notifications');
            await sendAdminAlert(alertMsg, 'CRITICAL');

            disabledCount++;
            continue;
          }

          // Normal sync: Price update
          const newPriceCents = Math.round(pricePer1kRubRounded * 100);

          if (newRate !== oldRate || newPriceCents !== myService.pricePer1000Cents || providerCurrencyChanged || markupChanged) {
            const minInt = parseInt(external.min, 10) || 10;
            const maxInt = parseInt(external.max, 10) || 100000;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updateData: any = {
              rate: newRate,
              pricePer1000Cents: newPriceCents,
              minQty: minInt,
              maxQty: maxInt,
              lastSeenAt: new Date(),
            };
            if (!myService.isQuarantined) {
              updateData.isQuarantined = false;
              updateData.quarantineReason = null;
            }
            if (markupChanged) {
              updateData.markup = myService.markup;
            }
            if (providerCurrencyChanged) {
              updateData.providerCurrency = providerCurrency;
            }

            updatesBatch.push(
              db.service.update({
                where: { id: myService.id },
                data: updateData
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
    const newPricePer1000Cents = Math.round(
      applyBeautifulRounding(targetRate * Math.max(service.markup, SAFETY_FLOOR_MARKUP) * exchangeRate) * 100
    );

    await db.service.update({
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
