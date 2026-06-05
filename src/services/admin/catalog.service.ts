import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { paginatedQuery, type PaginatedResult } from '@/lib/pagination';
import { auditAdmin } from '@/lib/admin-audit';
import { sendAdminAlert } from '@/lib/notifications';
import { providerService } from '@/services/providers/provider.service';
import { SettingsProvider } from '@/lib/settings';
import {
  SYNC_ANOMALY_THRESHOLD,
  applyPricingLadder,
  SAFETY_FLOOR_MARKUP,
  TOTAL_MANDATORY_DEDUCTIONS,
  applyBeautifulRounding
} from '@/lib/financial-constants';
import { inferTargetTypeFromCategory } from '@/utils/target-type';

// ── Types ──

type CatalogRow = {
  id: string;
  numericId: number;
  name: string;
  description: string | null;
  externalId: string | null;
  providerId: string | null;
  rate: number;       // provider cost per 1000 (USD)
  markup: number;     // multiplier (e.g. 3.0 = 300%)
  pricePer1000Cents: number; // denormalized price for sorting
  minQty: number;
  maxQty: number;
  isActive: boolean;
  isDripFeedEnabled: boolean;
  isRefillEnabled: boolean;
  category: { id: string; name: string; network?: { name: string; slug: string } | null };
  _count: { orders: number };
};

type ProviderExternalService = {
  service: string;
  name: string;
  rate: string;
  min: string;
  max: string;
  category: string;
  dripfeed?: boolean;
  refill?: boolean;
  cancel?: boolean;
};

// ── Service ──

class AdminCatalogService {

  /**
   * Paginated service list with category, markup, and order count.
   */
  async listServices(params: {
    cursor?: string;
    search?: string;
    categoryId?: string;
    pageSize?: number;
  }): Promise<PaginatedResult<CatalogRow>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      const lowerQ = q.toLowerCase();
      const numId = parseInt(q, 10);
      const isPureNumber = !isNaN(numId) && q === String(numId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orConditions: any[] = [];

      // Vector 1: Numeric ID Match
      if (isPureNumber) {
        orConditions.push({ numericId: numId });
      }

      // Vector 2: Name Contains Match (Case-Insensitive)
      orConditions.push({ name: { contains: q, mode: 'insensitive' } });

      // Vector 3: External Provider Service ID Match
      orConditions.push({ externalId: q });
      if (isPureNumber) {
        orConditions.push({ externalId: String(numId) });
      }

      // Vector 4: Active Provider Recognition (ID or Name match)
      const providers = await db.provider.findMany({ select: { id: true, name: true } });
      const matchedProvider = providers.find(p => p.id === q || p.name.toLowerCase() === lowerQ);
      if (matchedProvider) {
        orConditions.push({ providerId: matchedProvider.id });
      }

      // Vector 5: Social Network Recognition (slug contains query)
      const networks = await db.network.findMany({ select: { id: true, slug: true } });
      const matchedNetwork = networks.find(n => n.slug === lowerQ || lowerQ.includes(n.slug));
      if (matchedNetwork) {
        orConditions.push({ category: { networkId: matchedNetwork.id } });
      }

      where.OR = orConditions;
    }

    return paginatedQuery<CatalogRow>(db.service, {
      cursor: params.cursor,
      pageSize: params.pageSize || 50,
      where,
      orderBy: { numericId: 'asc' },
      include: {
        category: { select: { id: true, name: true, network: { select: { name: true, slug: true } } } },
        _count: { select: { orders: true } },
      },
    });
  }

  /**
   * Update markup for a service. Recalculates selling price.
   */
  async updateMarkup(
    serviceId: string,
    newMarkup: number,
    admin: { id: string; email: string }
  ) {
    if (newMarkup < 1.0) throw new Error('Наценка не может быть меньше 1.0 (множитель x1)');
    if (newMarkup > 151.0) throw new Error('Наценка не может быть больше 151.0 (15000%)');

    const service = await db.service.findUniqueOrThrow({ where: { id: serviceId } });
    const oldMarkup = service.markup;
    const usdToRub = await SettingsProvider.getExchangeRateUSD();
    const exchangeRate = service.providerCurrency === 'RUB' ? 1.0 : usdToRub;

    await db.service.update({
      where: { id: serviceId },
      data: { 
        markup: newMarkup,
        pricePer1000Cents: Math.round(applyBeautifulRounding(service.rate * newMarkup * exchangeRate) * 100)
      },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SERVICE_MARKUP_CHANGE',
      target: serviceId,
      targetType: 'SERVICE',
      oldValue: { markup: oldMarkup },
      newValue: { markup: newMarkup },
    });

    return { name: service.name, oldMarkup, newMarkup };
  }

  /**
   * Toggle service active/inactive.
   */
  async toggleService(
    serviceId: string,
    isActive: boolean,
    admin: { id: string; email: string }
  ) {
    const service = await db.service.findUniqueOrThrow({ where: { id: serviceId } });

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
      oldValue: { isActive: service.isActive },
      newValue: { isActive },
    });
  }

  /**
   * Fetch available services from a provider for cherry-pick import.
   */
  async getProviderServices(): Promise<ProviderExternalService[]> {
    try {
      const provider = await providerService.getDefaultProvider();
      const services = await provider.getServices();
      return services as ProviderExternalService[];
    } catch {
      return [];
    }
  }

  /**
   * Zombie Eraser & Catalog Synchronization
   * Finds services that were deleted by the provider and marks them inactive.
   * Auto-restores services that reappeared.
   */
  async syncProviderCatalog(providerId: string, admin: { id: string; email: string }) {
    const providerDbRecord = await db.provider.findUnique({ where: { id: providerId } });
    if (!providerDbRecord) throw new Error('Провайдер не найден');
    if (providerDbRecord.syncLock) throw new Error('Синхронизация отключена (syncLock)');

    const providerInstance = await providerService.getProviderInstance(providerDbRecord);
    const liveServices = await providerInstance.getServices();
    
    if (!Array.isArray(liveServices) || liveServices.length === 0) {
      throw new Error('API провайдера вернуло пустой список или ошибку. Синхронизация прервана (защита).');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const liveMap = new Map(liveServices.map((s: any) => [String(s.service), s]));
    
    const ourServices = await db.service.findMany({
      where: { providerId }
    });

    let zombiesDisabled = 0;
    let resurrected = 0;
    let priceAnomalies = 0;
    let priceUpdatedSilent = 0;
    let marginFloorBreaches = 0;

    const usdToRub = await SettingsProvider.getExchangeRateUSD();
    const QUARANTINE_THRESHOLD = 0.2; // 20% price increase tolerance
    const providerCurrency = providerDbRecord.balanceCurrency || 'USD';
    const exchangeRate = providerCurrency === 'RUB' ? 1.0 : usdToRub;

    for (const s of ourServices) {
      if (!s.externalId) continue;
      
      const liveExt = liveMap.get(s.externalId);
      
      if (!liveExt) {
        // ZOMBIE DETECTION
        if (s.isActive) {
          await db.service.update({
            where: { id: s.id },
            data: { 
              isActive: false, 
              cooldownReason: 'ZOMBIE_AUTO_DISABLED',
              cooldownUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
          });
          zombiesDisabled++;
        }
      } else {
        // LIVE SERVICE
        const rawRate = parseFloat(liveExt.rate);
        
        if (isNaN(rawRate) || rawRate <= 0) {
           if (!s.isQuarantined && s.isActive) {
             await db.service.update({
               where: { id: s.id },
               data: {
                 isQuarantined: true,
                 quarantineReason: `Invalid Provider Rate: ${liveExt.rate}. Парсинг вернул NaN или <= 0.`,
                 quarantinedAt: new Date()
               }
             });
             priceAnomalies++;
           }
           continue;
        }

        if (!s.isActive && s.cooldownReason === 'ZOMBIE_AUTO_DISABLED') {
          // Check Price Spike before resurrecting
          const oldRate = s.rate;
          
          if (oldRate > 0 && rawRate > oldRate * (1 + QUARANTINE_THRESHOLD)) {
            // Price spiked! Quarantine it
            await db.service.update({
              where: { id: s.id },
              data: {
                isQuarantined: true,
                pendingRate: rawRate,
                quarantineReason: `Zombie Resurrection: Цена выросла с $${oldRate} до $${rawRate}`,
                quarantinedAt: new Date()
              }
            });
            priceAnomalies++;
          } else {
            // Safe to resurrect
            await db.service.update({
              where: { id: s.id },
              data: {
                isActive: true,
                cooldownReason: null,
                cooldownUntil: null,
                rate: rawRate,
                pricePer1000Cents: Math.round(applyBeautifulRounding(rawRate * s.markup * exchangeRate) * 100)
              }
            });
            resurrected++;
          }
        } else if (s.isActive && !s.isQuarantined) {
          // Active Service Price Drift Detection
          let oldRate = s.rate;
          const newRate = rawRate;
          const providerCurrency = providerDbRecord.balanceCurrency || 'USD';

          // Self-heal mismatch between service providerCurrency and current provider balanceCurrency on the fly
          if (s.providerCurrency !== providerCurrency) {
            const conversionFactor = (s.providerCurrency === 'USD' && providerCurrency === 'RUB')
              ? usdToRub
              : (s.providerCurrency === 'RUB' && providerCurrency === 'USD')
              ? (1.0 / usdToRub)
              : 1.0;
            oldRate = oldRate * conversionFactor;
            
            // permanently align in DB
            await db.service.update({
              where: { id: s.id },
              data: { providerCurrency }
            });
          }

          if (oldRate > 0 && newRate !== oldRate) {
            const driftPercent = (newRate - oldRate) / oldRate;
            
            const currentRetailCents = s.pricePer1000Cents;
            const newCostCents = newRate * exchangeRate * 100;
            const actualMarkup = newCostCents > 0 ? (currentRetailCents / newCostCents) : s.markup;

            if (actualMarkup < SAFETY_FLOOR_MARKUP) {
              // 1. Margin Floor breach -> Quarantine
              await db.service.update({
                where: { id: s.id },
                data: {
                  isQuarantined: true,
                  pendingRate: newRate,
                  quarantineReason: `Margin Floor Breach: Наценка упала до ${actualMarkup.toFixed(2)}x (Min: ${SAFETY_FLOOR_MARKUP}x)`,
                  quarantinedAt: new Date()
                }
              });
              marginFloorBreaches++;
              priceAnomalies++;
            } else if (driftPercent > QUARANTINE_THRESHOLD) {
              // 2. Quarantine threshold > 20%
              await db.service.update({
                where: { id: s.id },
                data: {
                  isQuarantined: true,
                  pendingRate: newRate,
                  quarantineReason: `Price Spike: Цена выросла с ${providerCurrency === 'RUB' ? '₽' : '$'}${oldRate.toFixed(4)} до ${providerCurrency === 'RUB' ? '₽' : '$'}${newRate.toFixed(4)} (+${(driftPercent * 100).toFixed(1)}%)`,
                  quarantinedAt: new Date()
                }
              });
              priceAnomalies++;
            } else {
              // 3, 4, 5. Silent update (Drift 5-20%, Drift < 5%, or Drop)
              const newPriceCents = Math.round(applyBeautifulRounding(newRate * s.markup * exchangeRate) * 100);
              await db.service.update({
                where: { id: s.id },
                data: {
                  rate: newRate,
                  providerCurrency: providerCurrency,
                  pricePer1000Cents: newPriceCents
                }
              });
              priceUpdatedSilent++;

              if (driftPercent >= 0.05 && driftPercent <= QUARANTINE_THRESHOLD) {
                await db.routingAuditLog.create({
                  data: {
                    serviceId: s.id,
                    adminId: admin.id,
                    action: 'PRICE_DRIFT',
                    reason: `Drift +${(driftPercent * 100).toFixed(1)}%: $${oldRate} -> $${newRate}`
                  }
                });

                if (driftPercent > 0.15) {
                  sendAdminAlert(`⚠️ [Price Drift] Услуга ${s.id} (${s.name}): цена выросла на ${(driftPercent * 100).toFixed(1)}% ($${oldRate} -> $${newRate}). Розница не изменилась, наценка снизилась.`, 'WARNING');
                }
              }
            }
          }
        }
      }
    }

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'PROVIDER_CATALOG_SYNC',
      target: providerId,
      targetType: 'PROVIDER',
      newValue: { zombiesDisabled, resurrected, priceAnomalies, priceUpdatedSilent, marginFloorBreaches },
    });

    return { zombiesDisabled, resurrected, priceAnomalies, priceUpdatedSilent, marginFloorBreaches };
  }

  async importServices(
    externalIds: string[],
    categoryId: string,
    defaultMarkup: number,
    admin: { id: string; email: string },
    providerId: string,
    categoryIdMap?: Record<string, string>
  ) {
    // 1. Fetch from Shadow Catalog (Redis) to get the AI-normalized names and metrics
    const cacheKey = `provider:${providerId}:catalog`;
    const cached = await redis.get(cacheKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let shadowServices: any[] = [];
    if (cached) {
      try { shadowServices = JSON.parse(cached); } catch { /* ignore */ }
    }

    const toImportShadow = shadowServices.filter(s => externalIds.includes(s.service.toString()));
    if (toImportShadow.length === 0) throw new Error('Не найдены услуги для импорта в теневом каталоге (Обновите каталог)');

    // 2. LIVE-CHECK: Fetch fresh prices from Provider API to prevent Cache Poisoning
    const providerDbRecord = await db.provider.findUnique({ where: { id: providerId } });
    if (!providerDbRecord) throw new Error('Провайдер не найден');
    const providerInstance = await providerService.getProviderInstance(providerDbRecord);
    const liveServices = await providerInstance.getServices();
    
    // Map live services for O(1) lookup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const liveMap = new Map(liveServices.map((s: any) => [s.service.toString(), s]));

    // Fetch all existing external IDs for this provider in one query
    const existingServices = await db.service.findMany({
      where: { providerId: providerDbRecord.id, externalId: { in: toImportShadow.map(s => s.service.toString()) } },
      select: { externalId: true }
    });
    const existingSet = new Set(existingServices.map(s => s.externalId));

    // Fetch category names for target type inference
    const uniqueCategoryIds = new Set<string>();
    if (categoryId) uniqueCategoryIds.add(categoryId);
    if (categoryIdMap) {
      Object.values(categoryIdMap).forEach(id => uniqueCategoryIds.add(id));
    }
    const categoriesDb = await db.category.findMany({
      where: { id: { in: Array.from(uniqueCategoryIds) } },
      select: { id: true, name: true }
    });
    const categoryNameMap = new Map(categoriesDb.map(c => [c.id, c.name]));

    const servicesToCreate = [];
    const globalUsdToRub = await SettingsProvider.getExchangeRateUSD();
    
    for (const shadowExt of toImportShadow) {
      const extId = shadowExt.service.toString();
      
      // Skip if already exists
      if (existingSet.has(extId)) continue;

      // 3. Live Price Check
      const liveExt = liveMap.get(extId);
      if (!liveExt) {
        // Service was removed by provider between caching and importing!
        console.warn(`[Live-Check] Service ${shadowExt.service} was removed by provider. Skipping.`);
        continue;
      }

      // Use the LIVE rate, not the cached one
      const rawRate = parseFloat(liveExt.rate);
      
      if (isNaN(rawRate) || rawRate <= 0) {
        console.warn(`[Live-Check] Service ${shadowExt.service} has invalid rate: ${liveExt.rate}. Skipping import.`);
        continue;
      }
      
      // Handle Currency Conversion (Avoid double-conversion for RUB providers)
      const providerCurrency = providerDbRecord.balanceCurrency || 'USD';
      const exchangeRate = providerCurrency === 'RUB' ? 1.0 : globalUsdToRub;

      let effectiveMarkup = defaultMarkup;
      
      // Auto-pricing engine
      if (defaultMarkup <= 0) {
        const retailFromLadder = applyPricingLadder(rawRate * exchangeRate);
        effectiveMarkup = rawRate > 0 ? Math.round((retailFromLadder / (rawRate * exchangeRate)) * 100) / 100 : 3.0;
      }
      
      // Safety Floor Check
      if (effectiveMarkup < SAFETY_FLOOR_MARKUP) {
        effectiveMarkup = SAFETY_FLOOR_MARKUP;
      }

      servicesToCreate.push({
        name: shadowExt.cleanName || liveExt.name, // Use AI Clean Name
        description: liveExt.description || shadowExt.description || null,
        externalId: extId,
        categoryId: categoryIdMap?.[extId] || categoryId,
        providerId: providerDbRecord.id,
        providerCurrency: providerCurrency,
        rate: rawRate, // Live provider rate
        markup: effectiveMarkup,
        pricePer1000Cents: Math.round(applyBeautifulRounding(rawRate * effectiveMarkup * exchangeRate) * 100),
        minQty: parseInt(liveExt.min, 10) || 10,
        maxQty: parseInt(liveExt.max, 10) || 10000,
        features: shadowExt.metrics || {}, // Store AI ProcurementMetrics in JSON
        anomalyScore: shadowExt.metrics?.anomalyScore || 0,
        targetType: shadowExt.metrics?.targetType || inferTargetTypeFromCategory(categoryNameMap.get(categoryIdMap?.[extId] || categoryId)),
        customDataType: shadowExt.metrics?.customDataType || 'NONE',
        isMediaGroupAware: shadowExt.metrics?.isMediaGroupAware || false,
        isActive: true,
        isDripFeedEnabled: liveExt.dripfeed ?? false,
        isRefillEnabled: liveExt.refill ?? false,
        isCancelEnabled: liveExt.cancel ?? false,
        lastSeenAt: new Date(),
      });
    }

    let importedCount = 0;
    if (servicesToCreate.length > 0) {
       const result = await db.service.createMany({
           data: servicesToCreate,
           skipDuplicates: true
       });
       importedCount = result.count;
    }

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SERVICES_IMPORT',
      target: categoryId,
      targetType: 'SERVICE',
      newValue: { importedCount, externalIds, providerId },
    });

    return { importedCount, totalRequested: externalIds.length };
  }

  /**
   * Anomaly Detector: checks for large price changes after catalog sync.
   * Called after sync-catalog worker runs.
   */
  async detectAnomalies(
    oldRates: Map<string, number>,
    newRates: Map<string, number>
  ): Promise<string[]> {
    const anomalies: string[] = [];

    for (const [serviceId, oldRate] of oldRates) {
      const newRate = newRates.get(serviceId);
      if (newRate === undefined || oldRate === 0) continue;

      const change = Math.abs((newRate - oldRate) / oldRate);
      if (change >= SYNC_ANOMALY_THRESHOLD) {
        const direction = newRate > oldRate ? '📈' : '📉';
        const msg = `${direction} Услуга ${serviceId}: $${oldRate} → $${newRate} (${(change * 100).toFixed(0)}%)`;
        anomalies.push(msg);
      }
    }

    if (anomalies.length > 0) {
      sendAdminAlert(
        `⚡ Price Anomaly Detected\n\n${anomalies.join('\n')}`,
        'WARNING'
      );
    }

    return anomalies;
  }

  /**
   * Catalog stats for the header.
   */
  async getCatalogStats() {
    const [totalServices, activeServices, categories] = await Promise.all([
      db.service.count(),
      db.service.count({ where: { isActive: true } }),
      db.category.count(),
    ]);

    return { totalServices, activeServices, categories };
  }

  /**
   * Bulk update markup for multiple services matching a filter.
   * Supports: by category, by platform, or all services.
   */
  async bulkUpdateMarkup(
    filter: { categoryId?: string; platform?: string },
    newMarkup: number,
    admin: { id: string; email: string }
  ): Promise<{ updatedCount: number }> {
    if (newMarkup !== 0 && (newMarkup < 1.0 || newMarkup > 151.0)) {
      throw new Error('Наценка должна быть в диапазоне 1.0–151.0 или 0 (автокалькуляция)');
    }

    const where: Record<string, unknown> = {};
    if (filter.categoryId) {
      where.categoryId = filter.categoryId;
    }
    if (filter.platform) {
      where.category = { network: { slug: filter.platform } };
    }

    let updatedCount: number;
    const usdToRub = await SettingsProvider.getExchangeRateUSD();

    if (newMarkup <= 0) {
      const services = await db.service.findMany({ where, select: { id: true, rate: true, providerCurrency: true } });
      const updates = services.map(s => {
         const exchangeRate = s.providerCurrency === 'RUB' ? 1.0 : usdToRub;
         const retailFromLadder = applyPricingLadder(s.rate * exchangeRate);
         const calculatedMarkup = s.rate > 0 ? Math.round((retailFromLadder / (s.rate * exchangeRate)) * 100) / 100 : 3.0;
         return db.service.update({
            where: { id: s.id },
            data: { 
              markup: calculatedMarkup,
              pricePer1000Cents: Math.round(applyBeautifulRounding(s.rate * calculatedMarkup * exchangeRate) * 100)
            }
         });
      });

      for (let i = 0; i < updates.length; i += 50) {
         await db.$transaction(updates.slice(i, i + 50));
      }
      updatedCount = services.length;
    } else {
      const services = await db.service.findMany({ where, select: { id: true, rate: true, providerCurrency: true } });
      const updates = services.map(s => {
         const exchangeRate = s.providerCurrency === 'RUB' ? 1.0 : usdToRub;
         return db.service.update({
            where: { id: s.id },
            data: { 
              markup: newMarkup,
              pricePer1000Cents: Math.round(applyBeautifulRounding(s.rate * newMarkup * exchangeRate) * 100)
            }
         });
      });

      for (let i = 0; i < updates.length; i += 50) {
         await db.$transaction(updates.slice(i, i + 50));
      }
      updatedCount = services.length;
    }

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'BULK_MARKUP_UPDATE',
      target: filter.categoryId || filter.platform || 'ALL',
      targetType: 'SERVICE',
      newValue: { markup: newMarkup <= 0 ? 'AUTO' : newMarkup, filter, updatedCount },
    });

    return { updatedCount };
  }

  /**
   * Wave 2: Atomic Re-pricing logic.
   * Updates all denormalized prices in the background when the exchange rate changes.
   */
  async syncDenormalizedPrices(usdToRub: number) {
    const allServices = await db.service.findMany({
      select: { id: true, name: true, rate: true, markup: true, isActive: true, providerCurrency: true }
    });

    console.info(`[AdminCatalogService] Syncing prices for ${allServices.length} services with rate ${usdToRub}...`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatesBatch: any[] = [];
    for (const s of allServices) {
      const exchangeRate = s.providerCurrency === 'RUB' ? 1.0 : usdToRub;
      const pricePer1kRubRounded = applyBeautifulRounding(s.rate * s.markup * exchangeRate);
      const pricePerUnitRub = pricePer1kRubRounded / 1000;
      const purchaseCostPerUnitRub = (s.rate * exchangeRate) / 1000;

      if (pricePerUnitRub < purchaseCostPerUnitRub) {
        // Loss prevention breach! Deactivate service
        updatesBatch.push(
          db.service.update({
            where: { id: s.id },
            data: { isActive: false }
          })
        );

        const alertMsg = `🚨 [Loss Prevention] Услуга ${s.id} автоматически отключена из-за колебаний курса ЦБ! Розничная цена ${pricePerUnitRub.toFixed(4)} ₽/шт меньше себестоимости закупки ${purchaseCostPerUnitRub.toFixed(4)} ₽/шт.`;
        console.error(alertMsg);

        await db.routingAuditLog.create({
          data: {
            serviceId: s.id,
            action: 'LOSS_PREVENTION_BLOCK',
            reason: `Exchange rate fluctuation: Retail price ${pricePerUnitRub.toFixed(4)} < Cost ${purchaseCostPerUnitRub.toFixed(4)}`
          }
        });

        const { sendAdminAlert } = await import('@/lib/notifications');
        await sendAdminAlert(alertMsg, 'CRITICAL');
      } else {
        const newPriceCents = Math.round(pricePer1kRubRounded * 100);
        updatesBatch.push(
          db.service.update({
            where: { id: s.id },
            data: { pricePer1000Cents: newPriceCents }
          })
        );
      }
    }

    for (let i = 0; i < updatesBatch.length; i += 100) {
      await db.$transaction(updatesBatch.slice(i, i + 100));
    }

    console.info(`[AdminCatalogService] Price sync completed.`);
  }

  /**
   * Markup Analytics: returns distribution of markups across all services.
   */
  async getMarkupAnalytics(): Promise<{
    stats: { total: number; loss: number; thin: number; normal: number; high: number; extreme: number };
    worstServices: { id: string; name: string; rate: number; markup: number; category: string }[];
    averageMarkup: number;
  }> {
    const services = await db.service.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        rate: true,
        markup: true,
        category: { select: { name: true } },
      },
    });

    const safetyMultiplier = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);
    const stats = { total: services.length, loss: 0, thin: 0, normal: 0, high: 0, extreme: 0 };
    const lossList: { id: string; name: string; rate: number; markup: number; category: string }[] = [];
    let totalMarkup = 0;

    for (const s of services) {
      totalMarkup += s.markup;
      if (s.markup < safetyMultiplier) {
        stats.loss++;
        lossList.push({ id: s.id, name: s.name, rate: s.rate, markup: s.markup, category: s.category.name });
      } else if (s.markup < 3) {
        stats.thin++;
      } else if (s.markup < 8) {
        stats.normal++;
      } else if (s.markup < 20) {
        stats.high++;
      } else {
        stats.extreme++;
      }
    }

    const averageMarkup = services.length > 0 ? totalMarkup / services.length : 0;

    return { stats, worstServices: lossList.slice(0, 20), averageMarkup };
  }

  async listCategories() {
    const rows = await db.category.findMany({
      select: {
        id: true,
        name: true,
        network: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        _count: { select: { services: true } },
      },
      orderBy: { name: 'asc' },
    });

    return rows.map(c => ({
      id: c.id,
      name: c.name,
      network: c.network ? {
        id: c.network.id,
        name: c.network.name,
        slug: c.network.slug
      } : null,
      serviceCount: c._count.services,
    }));
  }

  async softDeleteService(
    serviceId: string,
    admin: { id: string; email: string }
  ) {
    const service = await db.service.findUniqueOrThrow({
      where: { id: serviceId },
      select: { id: true, numericId: true, name: true, isActive: true },
    });

    await db.service.update({
      where: { id: serviceId },
      data: {
        isActive: false,
        name: service.name.startsWith('[ARCHIVED] ')
          ? service.name
          : `[ARCHIVED] ${service.name}`,
      },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SERVICE_SOFT_DELETE',
      target: serviceId,
      targetType: 'SERVICE',
      oldValue: { name: service.name, isActive: service.isActive },
      newValue: { archived: true },
    });
  }

  async getQuarantineCount(): Promise<number> {
    return db.service.count({ where: { isQuarantined: true } });
  }
}

export const adminCatalogService = new AdminCatalogService();



