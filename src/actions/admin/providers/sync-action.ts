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
            numericId: true,
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
                    isQuarantined: false,
                    cooldownReason: 'ZOMBIE_AUTO_DISABLED',
                    cooldownUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    quarantineReason: null
                  }
                })
              );

              updatesBatch.push(
                db.routingAuditLog.create({
                  data: {
                    serviceId: myService.id,
                    adminId: admin.id,
                    action: 'ZOMBIE_AUTO_DISABLED',
                    reason: 'Услуга удалена провайдером из API'
                  }
                })
              );

              const alertMsg = `🧟 [Zombie Eraser] Услуга #${myService.numericId} - "${myService.name}" автоматически отключена, так как она была удалена провайдером из API.`;
              const { sendAdminAlert } = await import('@/lib/notifications');
              await sendAdminAlert(alertMsg, 'WARNING');

              disabledCount++;
            }
            continue;
          }

          if (myService.isQuarantined) {
            // Skip sync if already quarantined to avoid bypassing admin review state
            unchangedCount++;
            continue;
          }

          const rawRate = parseFloat(external.rate);
          if (isNaN(rawRate) || rawRate <= 0) {
            if (!myService.isQuarantined && myService.isActive) {
              updatesBatch.push(
                db.service.update({
                  where: { id: myService.id },
                  data: {
                    isQuarantined: true,
                    quarantineReason: `Invalid Provider Rate: ${external.rate}. Парсинг вернул NaN или <= 0.`,
                    quarantinedAt: new Date(),
                    pendingRate: null
                  }
                })
              );
              const alertMsg = `🚨 [Invalid Rate] Услуга ${myService.id} ушла в карантин из-за некорректной цены провайдера: ${external.rate}.`;
              console.warn(alertMsg);
              const { sendAdminAlert } = await import('@/lib/notifications');
              await sendAdminAlert(alertMsg);
              disabledCount++;
            } else {
              unchangedCount++;
            }
            continue;
          }
          const newRate = rawRate;
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

          // Retrieve history and check cumulative price drift
          let cumulativeDriftExceeded = false;
          let cumulativeDrift = 0;
          let historicalRate = oldRate;
          
          if (oldRate > 0 && newRate !== oldRate) {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            let baselineRecord = await db.servicePriceHistory.findFirst({
              where: {
                serviceId: myService.id,
                createdAt: { lte: thirtyDaysAgo }
              },
              orderBy: { createdAt: 'desc' }
            });

            if (!baselineRecord) {
              baselineRecord = await db.servicePriceHistory.findFirst({
                where: { serviceId: myService.id },
                orderBy: { createdAt: 'asc' }
              });
            }

            historicalRate = baselineRecord ? baselineRecord.rate : oldRate;

            if (!baselineRecord) {
              updatesBatch.push(
                db.servicePriceHistory.create({
                  data: {
                    serviceId: myService.id,
                    rate: oldRate,
                    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
                  }
                })
              );
              historicalRate = oldRate;
            }

            cumulativeDrift = (newRate - historicalRate) / historicalRate;
            if (cumulativeDrift > quarantineThreshold) {
              cumulativeDriftExceeded = true;
            }
          }



          let markupChanged = false;

          // Check for Elastic Quarantine and price drift
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
            } else if (cumulativeDriftExceeded) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const updateData: any = {
                isQuarantined: true,
                quarantineReason: `Cumulative Price Drift: Цена выросла с ${providerCurrency === 'RUB' ? '₽' : '$'}${historicalRate.toFixed(4)} до ${providerCurrency === 'RUB' ? '₽' : '$'}${newRate.toFixed(4)} (+${(cumulativeDrift * 100).toFixed(1)}% за последние 30 дней)`,
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
              const alertMsg = `🚨 [Price Drift Quarantine] Услуга ${myService.id} ушла в карантин из-за накопленного дрейфа цены > ${(quarantineThreshold * 100).toFixed(0)}% за 30 дней (${currencySymbol}${historicalRate.toFixed(4)} -> ${currencySymbol}${newRate.toFixed(4)}).`;
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
                const targetRetailCents = myService.pricePer1000Cents; // сохраняем старую розничную цену
                const newMarkup = targetRetailCents / newCostCentsLocal;
                if (newMarkup >= SAFETY_FLOOR_MARKUP) {
                  myService.markup = newMarkup;
                  markupChanged = true;
                }
              }
            }
          } else if (cumulativeDriftExceeded) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updateData: any = {
              isQuarantined: true,
              quarantineReason: `Cumulative Price Drift: Цена выросла с ${providerCurrency === 'RUB' ? '₽' : '$'}${historicalRate.toFixed(4)} до ${providerCurrency === 'RUB' ? '₽' : '$'}${newRate.toFixed(4)} (+${(cumulativeDrift * 100).toFixed(1)}% за последние 30 дней)`,
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
            const alertMsg = `🚨 [Price Drift Quarantine] Услуга ${myService.id} ушла в карантин из-за накопленного дрейфа цены > ${(quarantineThreshold * 100).toFixed(0)}% за 30 дней (${currencySymbol}${historicalRate.toFixed(4)} -> ${currencySymbol}${newRate.toFixed(4)}).`;
            console.warn(alertMsg);
            const { sendAdminAlert } = await import('@/lib/notifications');
            await sendAdminAlert(alertMsg, 'WARNING');
            
            disabledCount++;
            continue;
          }

          // Normal sync: Price update
          const newPriceCents = Math.round(applyBeautifulRounding(newRate * myService.markup * serviceExchangeRate) * 100);

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
            if (newRate !== oldRate) {
              updatesBatch.push(
                db.servicePriceHistory.create({
                  data: {
                    serviceId: myService.id,
                    rate: newRate
                  }
                })
              );
            }
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
