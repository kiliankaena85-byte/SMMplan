"use server";

import { revalidatePath } from "next/cache";
import { requireStaffPermission } from "@/lib/server/rbac";
import { adminCatalogService } from "@/services/admin/catalog.service";
import { providerService } from "@/services/providers/provider.service";
import { NameTokenizerService } from "@/services/providers/name-tokenizer.service";
import { SmartAnalyzerLogic } from "@/services/providers/smart-analyzer.logic";
import { db } from "@/lib/db";

import { redis } from "@/lib/redis";

// --- [NEW] Pagination & Filtering API ---
export async function fetchPaginatedExternalServices(
    providerId: string,
    filters: any,
    page: number,
    pageSize: number
) {
    return requireStaffPermission('PROVIDERS', 'view', async () => {
        try {
            const cacheKey = `provider:${providerId}:shadow_catalog`;
            const cachedStr = await redis.get(cacheKey);
            
            if (!cachedStr) {
                return { success: false, error: 'Теневой каталог пуст. Нажмите "Синхронизировать прайс".', emptyCache: true };
            }

            let allServices = JSON.parse(cachedStr);

            // 0. Currency Conversion Prep
            const [provider, settings] = await Promise.all([
                db.provider.findUnique({ where: { id: providerId }, select: { balanceCurrency: true } }),
                db.systemSettings.findUnique({ where: { id: "global" }, select: { exchangeRateUSD: true } })
            ]);
            const currency = provider?.balanceCurrency || 'USD';
            const usdRate = settings?.exchangeRateUSD || 90.0;

            allServices = allServices.map((s: any) => {
                const rawRate = parseFloat(s.rate) || 0;
                const rateRub = currency === 'USD' ? rawRate * usdRate : rawRate;
                return { ...s, rateRub, providerCurrency: currency, usdRate };
            });

            // 1. Filtering
            if (filters.platform && filters.platform !== 'ALL') {
                allServices = allServices.filter((s: any) => s.metrics?.platform === filters.platform);
            }
            if (filters.category && filters.category !== 'ALL') {
                const term = filters.category.toLowerCase();
                allServices = allServices.filter((s: any) => 
                     (s.category && s.category.toLowerCase().includes(term)) || 
                     (s.name && s.name.toLowerCase().includes(term))
                );
            }
            if (filters.geo && filters.geo !== 'ALL') {
                allServices = allServices.filter((s: any) => s.metrics?.geo === filters.geo);
            }
            if (filters.velocity && filters.velocity !== 'ALL') {
                allServices = allServices.filter((s: any) => {
                     const v = s.metrics?.velocity || 0;
                     if (filters.velocity === 'FAST') return v >= 50;
                     if (filters.velocity === 'SLOW') return v <= 10;
                     return v > 10 && v < 50;
                });
            }
            if (filters.hasRefill) {
                allServices = allServices.filter((s: any) => s.refill === true || s.metrics?.warranty > 0);
            }
            if (filters.hasAnomaly) {
                allServices = allServices.filter((s: any) => s.metrics?.anomalyScore > 0);
            }
            if (filters.retailReady) {
                allServices = allServices.filter((s: any) => {
                    const min = parseInt(s.min, 10);
                    return !isNaN(min) && min > 0 && min <= 100;
                });
            }
            if (filters.search) {
                const q = filters.search.toLowerCase();
                allServices = allServices.filter((s: any) => 
                    s.name.toLowerCase().includes(q) || String(s.service) === q
                );
            }
            
            // 2. Fetch imported map for "alreadyImported" status
            const existingServices = await db.service.findMany({
                where: { providerId, externalId: { not: null } },
                select: { id: true, externalId: true }
            });
            const existingMap = new Map(existingServices.map((s: {id: string, externalId: string | null}) => [s.externalId, s.id]));

            // 3. Mark imported
            allServices = allServices.map((s: any) => ({
                ...s,
                alreadyImported: existingMap.has(String(s.service)),
                localServiceId: existingMap.get(String(s.service))
            }));

            // 4. Hide already imported if requested
            if (filters.hideImported) {
                allServices = allServices.filter((s: any) => !s.alreadyImported);
            }

            // 5. Sorting
            if (filters.sortBy === 'price_asc') {
                allServices.sort((a: any, b: any) => a.rateRub - b.rateRub);
            } else if (filters.sortBy === 'price_desc') {
                allServices.sort((a: any, b: any) => b.rateRub - a.rateRub);
            } else if (filters.sortBy === 'anomaly_asc') {
                allServices.sort((a: any, b: any) => (a.metrics?.anomalyScore || 0) - (b.metrics?.anomalyScore || 0));
            } else if (filters.sortBy === 'anomaly_desc' || filters.sortBy === 'anomaly') {
                allServices.sort((a: any, b: any) => (b.metrics?.anomalyScore || 0) - (a.metrics?.anomalyScore || 0));
            }

            // 6. Pagination
            const total = allServices.length;
            const totalPages = Math.ceil(total / pageSize);
            const start = (page - 1) * pageSize;
            const paginated = allServices.slice(start, start + pageSize);

            return {
                success: true,
                data: paginated,
                pagination: {
                    total,
                    totalPages,
                    page,
                    pageSize
                }
            };

        } catch (e: any) {
            return { success: false, error: e.message };
        }
    });
}

export async function fetchExternalServices(providerId?: string, forceRefresh = false) {
  return requireStaffPermission('PROVIDERS', 'view', async () => {
     let providerDbRecord;
     if (providerId) {
        providerDbRecord = await db.provider.findUnique({ where: { id: providerId } });
        if (!providerDbRecord) throw new Error("Provider not found");
     } else {
        providerDbRecord = await db.provider.findFirst({ where: { isActive: true } });
        if (!providerDbRecord) throw new Error("No active provider found");
     }

     const providerDbId = providerDbRecord.id;
     const cacheKey = `provider:${providerDbId}:shadow_catalog`;
     
     let services = [];

     if (!forceRefresh) {
        const cached = await redis.get(cacheKey);
        if (cached) {
            try {
                services = JSON.parse(cached);
            } catch(e) {
                console.error("Failed to parse shadow catalog cache", e);
            }
        }
     }

     if (services.length === 0) {
        // Cache miss or force refresh
        const providerInstance = await providerService.getProviderInstance(providerDbRecord);
        const rawServices = await providerInstance.getServices();
        
        // Data Intelligence: Normalize services using SmartAnalyzerLogic
        services = rawServices.map((s: any) => {
            const analyzed = SmartAnalyzerLogic.detectSync(s.name, s.description || '', s.category || '');
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
                    isPrivate: analyzed.isPrivate
                }
            };
        });
        
        // Save to Shadow Catalog (24 hours TTL)
        await redis.setex(cacheKey, 86400, JSON.stringify(services));
     }
     
     // Also fetch existing externalIds to denote which ones are already imported
     const existing = await db.service.findMany({
         select: { externalId: true, id: true, name: true }
     });

     const existingMap = new Map(existing.map(s => [s.externalId, s]));

     return {
        success: true,
        source: services.length > 0 && forceRefresh ? 'api' : 'cache',
        providerId: providerDbId,
        services: services.map((s: any) => ({
            ...s,
            alreadyImported: existingMap.has(String(s.service)),
            localServiceId: existingMap.get(String(s.service))?.id
        }))
     };
  });
}

export async function importSelectedServices(externalIds: string[], categoryId: string, defaultMarkup: number, providerId: string) {
    return requireStaffPermission('PROVIDERS', 'edit', async (admin) => {
        try {
            const res = await adminCatalogService.importServices(externalIds, categoryId, defaultMarkup, admin, providerId);
            
            // SDLC Gate 4: Обязательная инвалидация кэша после мутации
            revalidatePath('/admin/providers/import');
            revalidatePath('/admin/services');
            
            return { success: true, imported: res.importedCount };
        } catch (e: any) {
             return { success: false, error: e.message };
        }
    });
}
