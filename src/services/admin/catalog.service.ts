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
    const where: Record<string, unknown> = {};

    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      const numId = parseInt(q, 10);

      if (!isNaN(numId) && q === String(numId)) {
        where.numericId = numId;
      } else {
        where.name = { contains: q, mode: 'insensitive' };
      }
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

    await db.service.update({
      where: { id: serviceId },
      data: { 
        markup: newMarkup,
        pricePer1000Cents: Math.round(applyBeautifulRounding(service.rate * newMarkup * usdToRub) * 100)
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

    const liveMap = new Map(liveServices.map((s: any) => [String(s.service), s]));
    
    const ourServices = await db.service.findMany({
      where: { providerId }
    });

    let zombiesDisabled = 0;
    let resurrected = 0;
    let priceAnomalies = 0;

    const usdToRub = await SettingsProvider.getExchangeRateUSD();
    const QUARANTINE_THRESHOLD = 0.2; // 20% price increase tolerance

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
        if (!s.isActive && s.cooldownReason === 'ZOMBIE_AUTO_DISABLED') {
          // Check Price Spike before resurrecting
          const rawRate = parseFloat(liveExt.rate);
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
                pricePer1000Cents: Math.round(applyBeautifulRounding(rawRate * s.markup * usdToRub) * 100)
              }
            });
            resurrected++;
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
      newValue: { zombiesDisabled, resurrected, priceAnomalies },
    });

    return { zombiesDisabled, resurrected, priceAnomalies };
  }

  async importServices(
    externalIds: string[],
    categoryId: string,
    defaultMarkup: number,
    admin: { id: string; email: string },
    providerId: string
  ) {
    // 1. Fetch from Shadow Catalog (Redis) to get the AI-normalized names and metrics
    const cacheKey = `provider:${providerId}:shadow_catalog`;
    const cached = await redis.get(cacheKey);
    let shadowServices: any[] = [];
    if (cached) {
      try { shadowServices = JSON.parse(cached); } catch(e) {}
    }

    const toImportShadow = shadowServices.filter(s => externalIds.includes(s.service.toString()));
    if (toImportShadow.length === 0) throw new Error('Не найдены услуги для импорта в теневом каталоге (Обновите каталог)');

    // 2. LIVE-CHECK: Fetch fresh prices from Provider API to prevent Cache Poisoning
    const providerDbRecord = await db.provider.findUnique({ where: { id: providerId } });
    if (!providerDbRecord) throw new Error('Провайдер не найден');
    const providerInstance = await providerService.getProviderInstance(providerDbRecord);
    const liveServices = await providerInstance.getServices();
    
    // Map live services for O(1) lookup
    const liveMap = new Map(liveServices.map((s: any) => [s.service.toString(), s]));

    let importedCount = 0;
    const globalUsdToRub = await SettingsProvider.getExchangeRateUSD();
    
    for (const shadowExt of toImportShadow) {
      // Skip if already exists
      const existing = await db.service.findFirst({
        where: { externalId: shadowExt.service.toString() },
      });

      if (existing) continue;

      // 3. Live Price Check
      const liveExt = liveMap.get(shadowExt.service.toString());
      if (!liveExt) {
        // Service was removed by provider between caching and importing!
        console.warn(`[Live-Check] Service ${shadowExt.service} was removed by provider. Skipping.`);
        continue;
      }

      // Use the LIVE rate, not the cached one
      const rawRate = parseFloat(liveExt.rate);
      
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

      await db.service.create({
        data: {
          name: shadowExt.cleanName || liveExt.name, // Use AI Clean Name
          description: liveExt.description || shadowExt.description,
          externalId: liveExt.service.toString(),
          categoryId,
          providerId: providerDbRecord.id,
          providerCurrency: providerCurrency,
          rate: rawRate, // Live provider rate
          markup: effectiveMarkup,
          pricePer1000Cents: Math.round(applyBeautifulRounding(rawRate * effectiveMarkup * exchangeRate) * 100),
          minQty: parseInt(liveExt.min, 10) || 10,
          maxQty: parseInt(liveExt.max, 10) || 10000,
          features: shadowExt.metrics || {}, // Store AI ProcurementMetrics in JSON
          anomalyScore: shadowExt.metrics?.anomalyScore || 0,
          targetType: shadowExt.metrics?.targetType || 'POST',
          customDataType: shadowExt.metrics?.customDataType || 'NONE',
          isMediaGroupAware: shadowExt.metrics?.isMediaGroupAware || false,
          isActive: true,
          isDripFeedEnabled: liveExt.dripfeed ?? false,
          isRefillEnabled: liveExt.refill ?? false,
          isCancelEnabled: liveExt.cancel ?? false,
          lastSeenAt: new Date(),
        },
      });

      importedCount++;
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

    let updatedCount = 0;
    const usdToRub = await SettingsProvider.getExchangeRateUSD();

    if (newMarkup <= 0) {
      const services = await db.service.findMany({ where, select: { id: true, rate: true } });
      const updates = services.map(s => {
         const retailFromLadder = applyPricingLadder(s.rate * usdToRub);
         const calculatedMarkup = s.rate > 0 ? Math.round((retailFromLadder / (s.rate * usdToRub)) * 100) / 100 : 3.0;
         return db.service.update({
            where: { id: s.id },
            data: { 
              markup: calculatedMarkup,
              pricePer1000Cents: Math.round(applyBeautifulRounding(s.rate * calculatedMarkup * usdToRub) * 100)
            }
         });
      });

      for (let i = 0; i < updates.length; i += 50) {
         await db.$transaction(updates.slice(i, i + 50));
      }
      updatedCount = services.length;
    } else {
      const services = await db.service.findMany({ where, select: { id: true, rate: true } });
      const updates = services.map(s => {
         return db.service.update({
            where: { id: s.id },
            data: { 
              markup: newMarkup,
              pricePer1000Cents: Math.round(applyBeautifulRounding(s.rate * newMarkup * usdToRub) * 100)
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
      select: { id: true, rate: true, markup: true }
    });

    console.log(`[AdminCatalogService] Syncing prices for ${allServices.length} services with rate ${usdToRub}...`);

    for (let i = 0; i < allServices.length; i += 100) {
      const batch = allServices.slice(i, i + 100);
      const updates = batch.map(s => db.service.update({
        where: { id: s.id },
        data: { pricePer1000Cents: Math.round(applyBeautifulRounding(s.rate * s.markup * usdToRub) * 100) }
      }));
      await db.$transaction(updates);
    }

    console.log(`[AdminCatalogService] Price sync completed.`);
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
        _count: { select: { services: true } },
      },
      orderBy: { name: 'asc' },
    });

    return rows.map(c => ({
      id: c.id,
      name: c.name,
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
