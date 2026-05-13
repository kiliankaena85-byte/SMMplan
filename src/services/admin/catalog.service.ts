import { db } from '@/lib/db';
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
  category: { id: string; name: string };
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
        category: { select: { id: true, name: true } },
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
   * Import selected services from a provider into our catalog.
   * Cherry-pick: only imports the selected IDs.
   */
  async importServices(
    externalIds: string[],
    categoryId: string,
    defaultMarkup: number,
    admin: { id: string; email: string }
  ) {
    const providerServices = await this.getProviderServices();
    const toImport = providerServices.filter(s => externalIds.includes(s.service.toString()));

    if (toImport.length === 0) throw new Error('Не найдены услуги для импорта');

    let importedCount = 0;
    const usdToRub = await SettingsProvider.getExchangeRateUSD();
    
    for (const ext of toImport) {
      // Skip if already exists
      const existing = await db.service.findFirst({
        where: { externalId: ext.service.toString() },
      });

      if (existing) continue;

      const rawRate = parseFloat(ext.rate);
      let effectiveMarkup = defaultMarkup;
      if (defaultMarkup <= 0) {
        const retailFromLadder = applyPricingLadder(rawRate * usdToRub);
        effectiveMarkup = rawRate > 0 ? Math.round((retailFromLadder / (rawRate * usdToRub)) * 100) / 100 : 3.0;
      }

      await db.service.create({
        data: {
          name: ext.name,
          externalId: ext.service.toString(),
          categoryId,
          rate: rawRate,
          markup: effectiveMarkup,
          pricePer1000Cents: Math.round(applyBeautifulRounding(rawRate * effectiveMarkup * usdToRub) * 100),
          minQty: parseInt(ext.min, 10) || 10,
          maxQty: parseInt(ext.max, 10) || 100000,
          isActive: true,
          isDripFeedEnabled: ext.dripfeed ?? false,
          isRefillEnabled: ext.refill ?? false,
          isCancelEnabled: ext.cancel ?? false,
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
      newValue: { importedCount, externalIds },
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
