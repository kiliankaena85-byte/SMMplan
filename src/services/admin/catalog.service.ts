import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';
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
import { ServiceAuditEngine } from './audit-engine';
import { z } from 'zod';

export async function ensureTaxonomyTenantAccess(categoryId: string) {
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
}
import { SecuritySanitizer } from '@/utils/security-sanitizer';
import { SmartAnalyzerLogic } from '@/services/providers/smart-analyzer.logic';
import { sanitizeServiceDescription } from '@/lib/sanitize';

const rawServiceSchema = z.object({
  service: z.union([z.string(), z.number()]),
  name: z.string().transform(v => SecuritySanitizer.sanitizePromptInjection(v)),
  type: z.string().optional(),
  category: z.string().optional(),
  rate: z.union([z.string(), z.number()]),
  min: z.union([z.string(), z.number()]),
  max: z.union([z.string(), z.number()]),
  refill: z.boolean().optional(),
  cancel: z.boolean().optional(),
  dripfeed: z.boolean().optional(),
  desc: z.string().optional().transform(v => SecuritySanitizer.sanitizePromptInjection(v)),
  description: z.string().optional().transform(v => SecuritySanitizer.sanitizePromptInjection(v)),
}).strip();

// ── Types ──

export type CatalogRow = {
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
  isQuarantined?: boolean;
  quarantineReason?: string | null;
  isCancelEnabled?: boolean;
  targetType?: string | null;
  customDataType?: string | null;
  customDataLabel?: string | null;
  isMediaGroupAware?: boolean;
  requireWarning?: boolean;
  warningMessage?: string | null;
  cooldownReason?: string | null;
  clientRequirement?: string | null;
  clientConfirmation?: string | null;
  qualityTier?: string | null;
  createdAt?: Date | string | null;
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
    providerId?: string;
    isActive?: boolean;
    hideDeleted?: boolean;
    providerStatus?: string;
    externalId?: string;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    networkSlug?: string;
    tenantId?: string;
  }): Promise<PaginatedResult<CatalogRow>> {
    const where: Prisma.ServiceWhereInput = {};

    if (params.tenantId) {
      where.tenantId = { in: [params.tenantId, 'all'] };
    }

    if (params.categoryId) {
      where.categoryId = params.categoryId;
    } else if (params.networkSlug) {
      where.category = { network: { slug: params.networkSlug } };
    }

    if (params.providerId) {
      where.providerId = params.providerId === 'none' ? null : params.providerId;
    }

    if (params.hideDeleted) {
      where.isActive = true;
      where.cooldownReason = { notIn: ['ZOMBIE_AUTO_DISABLED', 'ZOMBIE_ARCHIVED'] };
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params.providerStatus) {
      if (params.providerStatus === 'active') {
        where.providerId = { not: null };
        where.cooldownReason = null;
      } else if (params.providerStatus === 'zombie') {
        where.cooldownReason = { in: ['ZOMBIE_AUTO_DISABLED', 'ZOMBIE_ARCHIVED'] };
      } else if (params.providerStatus === 'manual') {
        where.providerId = null;
      }
    }

    if (params.externalId?.trim()) {
      where.externalId = params.externalId.trim();
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      const lowerQ = q.toLowerCase();
      const numId = parseInt(q, 10);
      const isPureNumber = !isNaN(numId) && q === String(numId);
            const orConditions: Prisma.ServiceWhereInput[] = [];

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

    let orderBy: Record<string, 'asc' | 'desc'> = { numericId: 'asc' };
    if (params.sortBy) {
      const order = params.sortOrder || 'asc';
      switch (params.sortBy) {
        case 'id':
          orderBy = { numericId: order };
          break;
        case 'name':
          orderBy = { name: order };
          break;
        case 'rate':
          orderBy = { rate: order };
          break;
        case 'markup':
          orderBy = { markup: order };
          break;
        case 'price':
          orderBy = { pricePer1000Cents: order };
          break;
        default:
          orderBy = { numericId: order };
          break;
      }
    }

    return paginatedQuery<CatalogRow>(db.service, {
      cursor: params.cursor,
      pageSize: params.pageSize || 50,
      where,
      orderBy,
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
    } catch (err) {
      console.warn('[CatalogService] getProviderServices failed:', err);
      return [];
    }
  }

  /**
   * Zombie Eraser & Catalog Synchronization
   * Finds services that were deleted by the provider and marks them inactive.
   * Auto-restores services that reappeared.
   */
  /**
   * Refreshes the local ShadowService staging catalog by fetching the latest services from the provider API.
   * Clears existing records for this provider and populates new ones.
   * This is session-agnostic and safe to use in background workers.
   */
  async refreshShadowCatalog(providerId: string): Promise<number> {
    const providerDbRecord = await db.provider.findUnique({ where: { id: providerId } });
    if (!providerDbRecord) throw new Error("Provider not found");

    const providerInstance = await providerService.getProviderInstance(providerDbRecord);
    const rawServices = await providerInstance.getServices();

    if (!Array.isArray(rawServices) || rawServices.length === 0) {
      throw new Error("API провайдера вернуло пустой список или ошибку. Синхронизация прервана (защита).");
    }

    // 0. Content-Hash Check (smm-cost-cache-optimizer): Skip heavy DB wipe & re-write if raw catalog is unchanged
    const catalogHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(rawServices))
      .digest('hex');

    const cacheKey = `provider:${providerId}:catalog:hash`;
    try {
      const cachedHash = await redis.get(cacheKey);
      const currentShadowCount = await db.shadowService.count({ where: { providerId: providerDbRecord.id } });
      if (cachedHash === catalogHash && currentShadowCount > 0) {
        logger.debug('Shadow catalog unchanged (hash match), skipping heavy DB re-creation', {
          providerId,
          hash: catalogHash.slice(0, 12),
          count: currentShadowCount
        });
        return currentShadowCount;
      }
    } catch (cacheErr) {
      // Non-blocking: continue if Redis is temporarily offline
      console.warn('[CatalogService] Redis hash cache lookup error:', cacheErr);
    }

    // Fetch exchange settings
    const settings = await db.systemSettings.findUnique({ where: { id: "global" }, select: { exchangeRateUSD: true } });
    const usdRate = settings?.exchangeRateUSD || 90.0;
    const currency = providerDbRecord.balanceCurrency || 'USD';

    // Filter raw services using Zod Schema
    const validRawServices: z.infer<typeof rawServiceSchema>[] = [];
    let invalidCount = 0;

    for (const s of rawServices) {
      const parsed = rawServiceSchema.safeParse(s);
      if (parsed.success) {
        validRawServices.push(parsed.data);
      } else {
        invalidCount++;
      }
    }

    if (invalidCount > 0) {
      console.warn(`[Provider Sync] Ignored ${invalidCount} invalid services from provider ${providerDbRecord.name}`);
    }

    // Data Intelligence: Normalize services using SmartAnalyzerLogic
    const services = validRawServices.map((s) => {
      const rawRate = typeof s.rate === "number" ? s.rate : parseFloat(String(s.rate)) || 0;
      const basePriceUsd = currency === 'RUB' ? rawRate / usdRate : rawRate;
      const analyzed = SmartAnalyzerLogic.detectSync(s.name, s.description || '', s.category || '', undefined, basePriceUsd);
      return {
        ...s,
        cleanName: analyzed.cleanName,
        metrics: {
          ...analyzed.metrics,
          platform: analyzed.platform,
          category: analyzed.category,
          targetType: analyzed.targetType,
          customDataType: analyzed.customDataType,
          isMediaGroupAware: analyzed.isMediaGroupAware,
          isPrivate: analyzed.isPrivate,
          warranty: analyzed.warranty
        }
      };
    });

    const servicesToCreate = services.map((s) => {
      const rawRate = typeof s.rate === "number" ? s.rate : parseFloat(String(s.rate)) || 0;
      const rateRub = currency === 'USD' ? rawRate * usdRate : rawRate;

      return {
        providerId: providerDbRecord.id,
        externalId: String(s.service),
        name: s.name,
        type: s.type || null,
        category: s.category || null,
        rate: rawRate,
        rateRub,
        min: typeof s.min === "number" ? s.min : parseInt(String(s.min), 10) || 0,
        max: typeof s.max === "number" ? s.max : parseInt(String(s.max), 10) || 0,
        refill: s.refill || false,
        cancel: s.cancel || false,
        dripfeed: s.dripfeed || false,
        cleanName: s.cleanName || null,
        platform: (s.metrics?.platform || 'other').toLowerCase(),
        normalizedCategory: s.metrics?.category || null,
        targetType: s.metrics?.targetType || inferTargetTypeFromCategory(s.category || s.name),
        customDataType: s.metrics?.customDataType || 'NONE',
        isMediaGroupAware: s.metrics?.isMediaGroupAware || false,
        isPrivate: s.metrics?.isPrivate || false,
        warranty: s.metrics?.warranty || 0,
        geo: s.metrics?.geo || 'WORLDWIDE',
        velocity: s.metrics?.velocity || 0,
        anomalyScore: s.metrics?.anomalyScore || 0.0
      };
    });

    const MIN_PREVIOUS_FOR_SHRINK_CHECK = 20;
    const SHRINK_THRESHOLD = 0.5;

    const previousCount = await db.shadowService.count({ where: { providerId: providerDbRecord.id } });
    const fetchedCount = validRawServices.length;

    if (fetchedCount === 0 && previousCount > 0) {
      await db.routingAuditLog.create({
        data: {
          serviceId: 'SYSTEM',
          action: 'PROVIDER_SYNC_ABORTED_EMPTY',
          reason: `Sync aborted: Provider returned 0 valid services, previous shadow count was ${previousCount}`
        }
      });
      throw new Error('PROVIDER_RETURNED_EMPTY_CATALOG');
    }

    if (previousCount >= MIN_PREVIOUS_FOR_SHRINK_CHECK && fetchedCount < previousCount * SHRINK_THRESHOLD) {
      await db.routingAuditLog.create({
        data: {
          serviceId: 'SYSTEM',
          action: 'PROVIDER_SYNC_ABORTED_SHRINK',
          reason: `Sync aborted: Provider returned ${fetchedCount} services, abnormally shrunk from previous ${previousCount}`
        }
      });
      throw new Error('PROVIDER_CATALOG_SHRUNK_ABNORMALLY');
    }

    // Perform atomic wipe and write in chunks
    await db.shadowService.deleteMany({ where: { providerId: providerDbRecord.id } });

    const chunkSize = 1000;
    for (let i = 0; i < servicesToCreate.length; i += chunkSize) {
      const chunk = servicesToCreate.slice(i, i + chunkSize);
      await db.shadowService.createMany({
        data: chunk,
        skipDuplicates: true
      });
    }

    // Cache the successful catalog content-hash in Redis (TTL 24 hours)
    try {
      await redis.set(cacheKey, catalogHash, 'EX', 86400);
    } catch {
      // Ignore cache write error
    }

    return servicesToCreate.length;
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

    logger.debug('syncProviderCatalog started', { providerId });

    // 1. Refresh shadow catalog in database (chunked and memory-safe)
    await this.refreshShadowCatalog(providerId);

    // 2. Fetch our curated services
    const ourServices = await db.service.findMany({
      where: { providerId }
    });
    logger.debug('ourServices fetched', { count: ourServices.length, ids: ourServices.map(s => s.id) });

    // 3. Query only corresponding staging services from ShadowService table
    const activeExternalIds = ourServices.map(s => s.externalId).filter(Boolean) as string[];
    const stagingServices = await db.shadowService.findMany({
      where: {
        providerId,
        externalId: { in: activeExternalIds }
      }
    });

    // Map by externalId for fast O(1) lookup
    const stagingMap = new Map(stagingServices.map((s) => [s.externalId, s]));
    logger.debug('stagingServices fetched', { count: stagingServices.length, keys: Array.from(stagingMap.keys()) });

    let zombiesDisabled = 0;
    let resurrected = 0;
    let priceAnomalies = 0;
    let priceUpdatedSilent = 0;
    const marginFloorBreaches = 0;

    const settings = await SettingsProvider.get();
    const usdToRub = settings.exchangeRateUSD || 95.0;
    const QUARANTINE_THRESHOLD = settings.quarantineThreshold || 0.2;
    const providerCurrency = providerDbRecord.balanceCurrency || 'USD';
    const exchangeRate = providerCurrency === 'RUB' ? 1.0 : usdToRub;

    const zombieIds: string[] = [];

        let pendingUpdates: Array<{ id: string; data: Prisma.ServiceUpdateInput; oldRate: number; newRate: number }> = [];

    const executeUpdatesChunk = async (chunk: typeof pendingUpdates) => {
      await db.$transaction(async (tx) => {
        for (const item of chunk) {
          await tx.service.update({
            where: { id: item.id },
            data: item.data,
          });

          if (item.newRate !== item.oldRate) {
            await tx.servicePriceHistory.create({
              data: {
                serviceId: item.id,
                rate: item.newRate,
              },
            });
          }
        }
      });
    };

    for (const s of ourServices) {
      if (!s.externalId) continue;

      const stagingExt = stagingMap.get(s.externalId);

      if (!stagingExt) {
        // ZOMBIE DETECTION: Service was deleted by the provider
        logger.debug('Zombie candidate detected', { externalId: s.externalId, isActive: s.isActive });
        if (s.isActive) {
          zombieIds.push(s.id);
          zombiesDisabled++;
        }
      } else {
        // LIVE SERVICE
        const rawRate = stagingExt.rate;

        if (isNaN(rawRate) || rawRate <= 0) {
           if (!s.isQuarantined && s.isActive) {
             await db.service.update({
               where: { id: s.id },
               data: {
                 isQuarantined: true,
                 quarantineReason: `Invalid Provider Rate: ${rawRate}. Парсинг вернул NaN или <= 0.`,
                 quarantinedAt: new Date()
               }
             });
             priceAnomalies++;
           }
           continue;
        }

        // Clean name/description and fix markup/price if needed
        const auditPayloads = ServiceAuditEngine.auditAndFixService(s, { rate: rawRate }, exchangeRate);
        if (auditPayloads.length > 0) {
                    await db.$transaction(auditPayloads as Prisma.PrismaPromise<unknown>[]);
        }

        if (!s.isActive && s.cooldownReason === 'ZOMBIE_AUTO_DISABLED') {
          // Check Price Spike before resurrecting
          const oldRate = s.rate;
          const EPSILON_RATE = 0.001;

          if (oldRate > 0 && rawRate > (oldRate * (1 + QUARANTINE_THRESHOLD) + EPSILON_RATE)) {
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

          // Calculate actual markup and check for Loss Prevention breach (unprofitable prices)
          const currentRetailCents = s.pricePer1000Cents;
          const newCostCents = newRate * exchangeRate * 100;
          const actualMarkup = newCostCents > 0 ? (currentRetailCents / newCostCents) : s.markup;

          const pricePerUnitRub = (currentRetailCents / 100) / 1000;
          const purchaseCostPerUnitRub = (newRate * exchangeRate) / 1000;

          // Price Spike Detection (> 30% increase)
          const rateDiff = oldRate > 0 ? (newRate - oldRate) / oldRate : 0;
          if (oldRate > 0 && rateDiff > 0.30) {
            await db.service.update({
              where: { id: s.id },
              data: {
                isActive: false, // Immediately take off storefront
                isQuarantined: true,
                pendingRate: newRate,
                quarantineReason: `Price Spike (+${(rateDiff * 100).toFixed(0)}%): c $${oldRate} до $${newRate}`,
                quarantinedAt: new Date()
              }
            });

            const alertMsg = `🚨 Price spike: услуга "${s.name}" (id=${s.id}) — рост цены ${(rateDiff * 100).toFixed(0)}%. Автоматически снята с витрины.`;
            logger.warn(alertMsg, { serviceId: s.id, oldRate, newRate, rateDiff });
            await sendAdminAlert(alertMsg, 'WARNING');
            priceAnomalies++;
          } else if (pricePerUnitRub < purchaseCostPerUnitRub || actualMarkup < 1.0) {
            // Loss prevention breach! Deactivate service immediately
            await db.service.update({
              where: { id: s.id },
              data: {
                isActive: false,
                lastSeenAt: new Date()
              }
            });

            const alertMsg = `🚨 [Loss Prevention] Услуга ${s.id} автоматически отключена! Розничная цена ${pricePerUnitRub.toFixed(4)} ₽/шт меньше себестоимости закупки ${purchaseCostPerUnitRub.toFixed(4)} ₽/шт.`;
            console.error(alertMsg);

            await db.routingAuditLog.create({
              data: {
                serviceId: s.id,
                action: 'LOSS_PREVENTION_BLOCK',
                reason: `Retail price ${pricePerUnitRub.toFixed(4)} < Cost ${purchaseCostPerUnitRub.toFixed(4)}`
              }
            });

            await sendAdminAlert(alertMsg, 'CRITICAL');
            priceAnomalies++;
          } else {
            // Owner Directive: "Мы перерасчитываем сразу" & "Минимальную маржу устанавливает овнер (по стандарту 200% / 3.0x)"
            const minMarkup = settings.globalMarkup || 3.0;
            const effectiveMarkup = Math.max(s.markup, minMarkup);
            const calculatedPriceCents = Math.round(applyBeautifulRounding(newRate * effectiveMarkup * exchangeRate) * 100);

            // Respect custom fields if set
            const updateData: Record<string, unknown> = {
              rate: newRate,
              providerCurrency: providerCurrency,
              pricePer1000Cents: calculatedPriceCents,
              markup: effectiveMarkup,
              minQty: stagingExt.min,
              maxQty: stagingExt.max,
              lastSeenAt: new Date(),
              isQuarantined: false,
              quarantineReason: null
            };

                        if (!(s as unknown as { isCustomName?: boolean }).isCustomName) {
              updateData.name = stagingExt.name || s.name;
            }
                        if (!(s as unknown as { isCustomDescription?: boolean }).isCustomDescription && stagingExt.name) {
              // keep description intact unless specified
            }

            pendingUpdates.push({
              id: s.id,
              data: updateData,
              oldRate,
              newRate
            });

            if (pendingUpdates.length >= 50) {
              await executeUpdatesChunk(pendingUpdates);
              priceUpdatedSilent += pendingUpdates.filter(u => u.newRate !== u.oldRate).length;
              pendingUpdates = [];
            }
          }
        }
      }
    }

    if (pendingUpdates.length > 0) {
      await executeUpdatesChunk(pendingUpdates);
      priceUpdatedSilent += pendingUpdates.filter(u => u.newRate !== u.oldRate).length;
      pendingUpdates = [];
    }

    // SAFETY GATE: If zombie count is abnormally high (> 30% of our services and > 3 services),
    // it indicates a temporary provider API outage or mapping anomaly. Abort mass deactivation to protect storefront.
    if (ourServices.length >= 5 && zombieIds.length > ourServices.length * 0.3) {
      const alertMsg = `🚨 [Zombie Eraser Safety Gate] Массовое отключение заблокировано! Провайдер не вернул ${zombieIds.length} из ${ourServices.length} услуг (${((zombieIds.length / ourServices.length) * 100).toFixed(0)}%). Витрина защищена от блэкаута.`;
      logger.warn(alertMsg, { providerId, totalServices: ourServices.length, zombieCount: zombieIds.length });
      await sendAdminAlert(alertMsg, 'CRITICAL');
      zombieIds.length = 0;
    }

    // Process zombies in batches of 500 to avoid N+1 query spam and connection pool exhaustion
    const ZOMBIE_BATCH_SIZE = 500;
    for (let i = 0; i < zombieIds.length; i += ZOMBIE_BATCH_SIZE) {
      const batchIds = zombieIds.slice(i, i + ZOMBIE_BATCH_SIZE);
      
      await db.service.updateMany({
        where: { id: { in: batchIds } },
        data: {
          isActive: false,
          cooldownReason: 'ZOMBIE_AUTO_DISABLED',
          cooldownUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });

      await db.routingAuditLog.createMany({
        data: batchIds.map(id => ({
          serviceId: id,
          adminId: admin.id,
          action: 'ZOMBIE_AUTO_DISABLED',
          reason: 'Услуга удалена провайдером из API'
        }))
      });

      const alertMsg = `🧟 [Zombie Eraser] Автоматически отключено ${batchIds.length} мертвых услуг (Пакет ${Math.floor(i / ZOMBIE_BATCH_SIZE) + 1}).`;
      await sendAdminAlert(alertMsg, 'WARNING');
    }

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'PROVIDER_CATALOG_SYNC',
      target: providerId,
      targetType: 'PROVIDER',
      newValue: { zombiesDisabled, resurrected, priceAnomalies, priceUpdatedSilent, marginFloorBreaches },
    });

    let smmplanCount = 0;
    let fluxCount = 0;
    for (const s of ourServices) {
      if (s.tenantId === 'flux') fluxCount++;
      else smmplanCount++;
    }

    const syncResult = { zombiesDisabled, resurrected, priceAnomalies, priceUpdatedSilent, marginFloorBreaches, smmplanCount, fluxCount };
    logger.info(`Rate sync: ${smmplanCount} smmplan + ${fluxCount} flux updated for provider ${providerId}`, { result: syncResult });
    return syncResult;
  }

  async importServices(
    externalIds: string[],
    categoryId: string,
    defaultMarkup: number,
    admin: { id: string; email: string },
    providerId: string,
    categoryIdMap?: Record<string, string>,
    targetTenantId: 'smmplan' | 'flux' | 'both' = 'smmplan'
  ) {
    // 1. Fetch from Shadow Catalog (ShadowService staging table) to get the AI-normalized names and metrics
    const shadowServices = await db.shadowService.findMany({
      where: {
        providerId,
        externalId: { in: externalIds.map(String) }
      }
    });

    const toImportShadow = shadowServices.map((s) => ({
      service: s.externalId,
      name: s.name,
      type: s.type || undefined,
      category: s.category || undefined,
      rate: s.rate,
      min: String(s.min),
      max: String(s.max),
      refill: s.refill,
      cancel: s.cancel,
      dripfeed: s.dripfeed,
      cleanName: s.cleanName || undefined,
      metrics: {
        platform: s.platform,
        category: s.normalizedCategory,
        targetType: s.targetType,
        customDataType: s.customDataType,
        isMediaGroupAware: s.isMediaGroupAware,
        isPrivate: s.isPrivate,
        warranty: s.warranty,
        geo: s.geo,
        velocity: s.velocity,
        anomalyScore: s.anomalyScore
      }
    }));

    if (toImportShadow.length === 0) throw new Error('Не найдены услуги для импорта в теневом каталоге (Обновите каталог)');

    // 2. LIVE-CHECK: Fetch fresh prices from Provider API to prevent Cache Poisoning
    const providerDbRecord = await db.provider.findUnique({ where: { id: providerId } });
    if (!providerDbRecord) throw new Error('Провайдер не найден');
    const providerInstance = await providerService.getProviderInstance(providerDbRecord);
    const liveServices = await providerInstance.getServices();
    
    // Map live services for O(1) lookup
        const liveMap = new Map(liveServices.map((s) => [s.service.toString(), s]));

    const tenantsToImport: ('smmplan' | 'flux')[] = targetTenantId === 'both' ? ['smmplan', 'flux'] : [targetTenantId];

    // Fetch existing services for target tenants in one query
    const existingServices = await db.service.findMany({
      where: {
        providerId: providerDbRecord.id,
        externalId: { in: toImportShadow.map(s => s.service.toString()) },
        tenantId: { in: tenantsToImport }
      },
      select: { externalId: true, tenantId: true }
    });
    const existingSet = new Set(existingServices.map(s => `${s.tenantId}:${s.externalId}`));

    // Fetch category names for target type inference and ensure tenant access taxonomy
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

    for (const catId of Array.from(uniqueCategoryIds)) {
      await ensureTaxonomyTenantAccess(catId);
    }

    const servicesToCreate = [];
    const globalUsdToRub = await SettingsProvider.getExchangeRateUSD();
    
    for (const shadowExt of toImportShadow) {
      const extId = shadowExt.service.toString();
      
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

      const importedName = shadowExt.cleanName || liveExt.name;
      const importedDesc = liveExt.desc || null;
      const stableSlug = importedName.toLowerCase().trim().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '') || `service-${extId}`;

      for (const tId of tenantsToImport) {
        // Skip if already exists for this tenant
        if (existingSet.has(`${tId}:${extId}`)) continue;

        servicesToCreate.push({
          tenantId: tId,
          slug: stableSlug,
          name: ServiceAuditEngine.cleanText(importedName), // Use AI Clean Name with sanitization
          description: importedDesc ? sanitizeServiceDescription(ServiceAuditEngine.cleanText(importedDesc)) : null,
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
          isDripFeedEnabled: Boolean(liveExt.dripfeed),
          isRefillEnabled: Boolean(liveExt.refill),
          isCancelEnabled: Boolean(liveExt.cancel),
          lastSeenAt: new Date(),
        });
      }
    }

    let importedCount = 0;
    if (servicesToCreate.length > 0) {
       const result = await db.service.createMany({
           data: servicesToCreate,
           skipDuplicates: true
       });
       importedCount = result.count;

       // Record initial price history for newly imported services
       const createdServices = await db.service.findMany({
         where: {
           providerId: providerDbRecord.id,
           externalId: { in: servicesToCreate.map(s => s.externalId) }
         },
         select: { id: true, rate: true }
       });
       if (createdServices.length > 0) {
         await db.servicePriceHistory.createMany({
           data: createdServices.map(cs => ({
             serviceId: cs.id,
             rate: cs.rate
           }))
         });
       }
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
  async getCatalogStats(tenantId?: string, startDate?: Date, endDate?: Date) {
        const where: Prisma.ServiceWhereInput = {};
    if (tenantId) where.tenantId = { in: [tenantId, 'all'] };
    if (startDate && endDate) {
      where.createdAt = { gte: startDate, lte: endDate };
    }

        const categoryWhere: Prisma.CategoryWhereInput = {};
    if (tenantId) categoryWhere.tenantId = { in: [tenantId, 'all'] };
    if (startDate && endDate) {
      categoryWhere.createdAt = { gte: startDate, lte: endDate };
    }

    const [totalServices, activeServices, categories] = await Promise.all([
      db.service.count({ where }),
      db.service.count({ where: { ...where, isActive: true } }),
      db.category.count({ where: categoryWhere }),
    ]);

    return { totalServices, activeServices, categories };
  }

  /**
   * Bulk update markup for multiple services matching a filter.
   * Supports: by category, by platform, or all services.
   */
  async bulkUpdateMarkup(
    filter: { categoryId?: string; platform?: string; tenantId?: string },
    newMarkup: number,
    admin: { id: string; email: string }
  ): Promise<{ updatedCount: number }> {
    if (newMarkup !== 0 && (newMarkup < 1.0 || newMarkup > 151.0)) {
      throw new Error('Наценка должна быть в диапазоне 1.0–151.0 или 0 (автокалькуляция)');
    }

    const where: Record<string, unknown> = {
      isQuarantined: false
    };
    if (filter.tenantId) {
      where.tenantId = filter.tenantId;
    }
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

        const updatesBatch: Prisma.PrismaPromise<unknown>[] = [];
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
  async getMarkupAnalytics(tenantId?: string): Promise<{
    stats: { total: number; loss: number; thin: number; normal: number; high: number; extreme: number };
    worstServices: { id: string; name: string; rate: number; markup: number; category: string }[];
    averageMarkup: number;
  }> {
        const where: Prisma.ServiceWhereInput = { isActive: true };
    if (tenantId) where.tenantId = { in: [tenantId, 'all'] };

    const services = await db.service.findMany({
      where,
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

  async getQuarantineCount(tenantId?: string): Promise<number> {
        const where: Prisma.ServiceWhereInput = { isQuarantined: true };
    if (tenantId) where.tenantId = { in: [tenantId, 'all'] };
    return db.service.count({ where });
  }
}

export const adminCatalogService = new AdminCatalogService();



