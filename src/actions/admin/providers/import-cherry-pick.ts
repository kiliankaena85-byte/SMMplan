"use server";

import { revalidatePath } from "next/cache";
import { requireStaffPermission } from "@/lib/server/rbac";
import { adminCatalogService } from "@/services/admin/catalog.service";
import { providerService } from "@/services/providers/provider.service";
import { SmartAnalyzerLogic } from "@/services/providers/smart-analyzer.logic";
import { db } from "@/lib/db";
import { handleServerError } from "@/utils/error-handler";

import { redis } from "@/lib/redis";

import { z } from 'zod';
import { SecuritySanitizer } from "@/utils/security-sanitizer";

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
}).strip(); // Remove extra fields

// --- [NEW] Pagination & Filtering API ---
export async function fetchPaginatedExternalServices(
    providerId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filters: any,
    page: number,
    pageSize: number
) {
    return requireStaffPermission('PROVIDERS', 'view', async () => {
        try {
            const cacheKey = `provider:${providerId}:catalog`;
            let cachedStr: string | null = null;
            try {
                cachedStr = await redis.get(cacheKey);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (redisErr: any) {
                console.warn('[import] Redis unavailable:', redisErr.message);
                return { success: false, error: 'Redis недоступен. Нажмите «Загрузить каталог» для синхронизации.', emptyCache: true };
            }
            
            if (!cachedStr) {
                return { success: false, error: 'Теневой каталог пуст. Нажмите «Загрузить каталог».', emptyCache: true };
            }

            let allServices = JSON.parse(cachedStr);

            // 0. Currency Conversion Prep
            const [provider, settings] = await Promise.all([
                db.provider.findUnique({ where: { id: providerId }, select: { balanceCurrency: true } }),
                db.systemSettings.findUnique({ where: { id: "global" }, select: { exchangeRateUSD: true } })
            ]);
            const currency = provider?.balanceCurrency || 'USD';
            const usdRate = settings?.exchangeRateUSD || 90.0;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            allServices = allServices.map((s: any) => {
                const rawRate = parseFloat(s.rate) || 0;
                const rateRub = currency === 'USD' ? rawRate * usdRate : rawRate;
                const pricePerUnitProcurementRub = rateRub / 1000;
                const pricePerUnitProcurementUsd = rawRate / 1000;
                return { ...s, rateRub, pricePerUnitProcurementRub, pricePerUnitProcurementUsd, providerCurrency: currency, usdRate };
            });

            // 2. Fetch imported map for "alreadyImported" status
            const existingServices = await db.service.findMany({
                where: { providerId, externalId: { not: null } },
                select: { id: true, externalId: true }
            });
            const existingMap = new Map(existingServices.map((s: {id: string, externalId: string | null}) => [s.externalId, s.id]));

            // Apply all filters EXCEPT platform filter first to get platform counts:
            let filteredForCounting = allServices;
            
            if (filters.category && filters.category !== 'ALL') {
                const catFilter = filters.category;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filteredForCounting = filteredForCounting.filter((s: any) => 
                     s.metrics?.category === catFilter
                );
            }
            if (filters.geo && filters.geo !== 'ALL') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filteredForCounting = filteredForCounting.filter((s: any) => s.metrics?.geo === filters.geo);
            }
            if (filters.velocity && filters.velocity !== 'ALL') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filteredForCounting = filteredForCounting.filter((s: any) => {
                     const v = s.metrics?.velocity || 0;
                     if (filters.velocity === 'FAST') return v >= 50;
                     if (filters.velocity === 'SLOW') return v <= 10;
                     return v > 10 && v < 50;
                });
            }
            if (filters.hasRefill) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filteredForCounting = filteredForCounting.filter((s: any) => s.refill === true || s.metrics?.warranty > 0);
            }
            if (filters.hasAnomaly) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filteredForCounting = filteredForCounting.filter((s: any) => s.metrics?.anomalyScore > 0);
            }
            if (filters.retailReady) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filteredForCounting = filteredForCounting.filter((s: any) => {
                    const min = parseInt(s.min, 10);
                    return !isNaN(min) && min > 0 && min <= 100;
                });
            }
            if (filters.search) {
                const q = filters.search.toLowerCase();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filteredForCounting = filteredForCounting.filter((s: any) => 
                    s.name.toLowerCase().includes(q) || String(s.service) === q
                );
            }
            if (filters.hideImported) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filteredForCounting = filteredForCounting.filter((s: any) => !existingMap.has(String(s.service)));
            }

            // Compute platform counts based on the filtered list
            const platformCounts = {
                ALL: filteredForCounting.length,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                telegram: filteredForCounting.filter((s: any) => (s.metrics?.platform || '').toLowerCase() === 'telegram').length,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                instagram: filteredForCounting.filter((s: any) => (s.metrics?.platform || '').toLowerCase() === 'instagram').length,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                vk: filteredForCounting.filter((s: any) => (s.metrics?.platform || '').toLowerCase() === 'vk').length,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                youtube: filteredForCounting.filter((s: any) => (s.metrics?.platform || '').toLowerCase() === 'youtube').length,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tiktok: filteredForCounting.filter((s: any) => (s.metrics?.platform || '').toLowerCase() === 'tiktok').length,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                other: filteredForCounting.filter((s: any) => !['telegram', 'instagram', 'vk', 'youtube', 'tiktok'].includes((s.metrics?.platform || '').toLowerCase())).length
            };

            // Now apply platform filter for the active list
            if (filters.platform && filters.platform !== 'ALL') {
                if (filters.platform === 'other') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    allServices = filteredForCounting.filter((s: any) => !['telegram', 'instagram', 'vk', 'youtube', 'tiktok'].includes((s.metrics?.platform || '').toLowerCase()));
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    allServices = filteredForCounting.filter((s: any) => (s.metrics?.platform || '').toLowerCase() === filters.platform);
                }
            } else {
                allServices = filteredForCounting;
            }

            // Mark imported
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            allServices = allServices.map((s: any) => ({
                ...s,
                alreadyImported: existingMap.has(String(s.service)),
                localServiceId: existingMap.get(String(s.service))
            }));

            // 5. Sorting
            if (filters.sortBy === 'price_asc') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allServices.sort((a: any, b: any) => a.rateRub - b.rateRub);
            } else if (filters.sortBy === 'price_desc') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allServices.sort((a: any, b: any) => b.rateRub - a.rateRub);
            } else if (filters.sortBy === 'anomaly_asc') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allServices.sort((a: any, b: any) => (a.metrics?.anomalyScore || 0) - (b.metrics?.anomalyScore || 0));
            } else if (filters.sortBy === 'anomaly_desc' || filters.sortBy === 'anomaly') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allServices.sort((a: any, b: any) => (b.metrics?.anomalyScore || 0) - (a.metrics?.anomalyScore || 0));
            } else if (filters.sortBy === 'min_asc') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allServices.sort((a: any, b: any) => (parseInt(a.min, 10) || 0) - (parseInt(b.min, 10) || 0));
            } else if (filters.sortBy === 'min_desc') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allServices.sort((a: any, b: any) => (parseInt(b.min, 10) || 0) - (parseInt(a.min, 10) || 0));
            } else if (filters.sortBy === 'id_asc') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allServices.sort((a: any, b: any) => {
                    const aId = parseInt(a.service, 10);
                    const bId = parseInt(b.service, 10);
                    if (!isNaN(aId) && !isNaN(bId)) return aId - bId;
                    return String(a.service).localeCompare(String(b.service));
                });
            } else if (filters.sortBy === 'id_desc') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allServices.sort((a: any, b: any) => {
                    const aId = parseInt(a.service, 10);
                    const bId = parseInt(b.service, 10);
                    if (!isNaN(aId) && !isNaN(bId)) return bId - aId;
                    return String(b.service).localeCompare(String(a.service));
                });
            } else if (filters.sortBy === 'name_asc') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allServices.sort((a: any, b: any) => (a.cleanName || a.name || '').localeCompare(b.cleanName || b.name || ''));
            } else if (filters.sortBy === 'name_desc') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allServices.sort((a: any, b: any) => (b.cleanName || b.name || '').localeCompare(a.cleanName || a.name || ''));
            } else if (filters.sortBy === 'category_asc') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allServices.sort((a: any, b: any) => (a.category || '').localeCompare(b.category || ''));
            } else if (filters.sortBy === 'category_desc') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allServices.sort((a: any, b: any) => (b.category || '').localeCompare(b.category || ''));
            } else if (filters.sortBy === 'platform_asc') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allServices.sort((a: any, b: any) => (a.metrics?.platform || '').localeCompare(b.metrics?.platform || ''));
            } else if (filters.sortBy === 'platform_desc') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allServices.sort((a: any, b: any) => (b.metrics?.platform || '').localeCompare(a.metrics?.platform || ''));
            }

            // 6. Pagination
            const total = allServices.length;
            const totalPages = Math.ceil(total / pageSize);
            const start = (page - 1) * pageSize;
            const paginated = allServices.slice(start, start + pageSize);

            return {
                success: true,
                data: paginated,
                platformCounts,
                pagination: {
                    total,
                    totalPages,
                    page,
                    pageSize
                }
            };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            const localized = handleServerError(e);
            return { success: false, error: localized.message };
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
     const cacheKey = `provider:${providerDbId}:catalog`;
     
     let services = [];

     if (!forceRefresh) {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                try {
                    services = JSON.parse(cached);
                } catch(e) {
                    console.error("Failed to parse shadow catalog cache", e);
                }
            }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (redisErr: any) {
            console.warn('[fetchExternalServices] Redis unavailable for cache read:', redisErr.message);
        }
     }

     if (services.length === 0) {
        // Cache miss or force refresh
        const providerInstance = await providerService.getProviderInstance(providerDbRecord);
        const rawServices = await providerInstance.getServices();
        
        // Fetch exchange settings for Anti-Liar dictionary
        const settings = await db.systemSettings.findUnique({ where: { id: "global" }, select: { exchangeRateUSD: true } });
        const usdRate = settings?.exchangeRateUSD || 90.0;
        const currency = providerDbRecord.balanceCurrency || 'USD';
        
        // Filter raw services using Zod Schema
        const validRawServices = [];
        let invalidCount = 0;
        
        if (Array.isArray(rawServices)) {
            for (const s of rawServices) {
                const parsed = rawServiceSchema.safeParse(s);
                if (parsed.success) {
                    validRawServices.push(parsed.data);
                } else {
                    if (invalidCount < 3) {
                        console.warn(`[Provider Sync] Invalid service format (sample):`, parsed.error.issues);
                    }
                    invalidCount++;
                }
            }
        } else {
            throw new Error("Provider did not return an array of services");
        }

        if (invalidCount > 0) {
            console.warn(`[Provider Sync] Ignored ${invalidCount} invalid services from provider ${providerDbRecord.name}`);
        }

        // Data Intelligence: Normalize services using SmartAnalyzerLogic
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        services = validRawServices.map((s: any) => {
            const rawRate = parseFloat(s.rate) || 0;
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
        
        // Save to Shadow Catalog (24 hours TTL)
        try {
            await redis.setex(cacheKey, 86400, JSON.stringify(services));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (redisErr: any) {
            console.warn('[fetchExternalServices] Redis unavailable for cache write:', redisErr.message);
        }
     }
     
     return {
        success: true,
        count: services.length,
        source: services.length > 0 && forceRefresh ? 'api' : 'cache',
        providerId: providerDbId,
     };
  });
}

const importServicesSchema = z.object({
  externalIds: z.array(z.string().min(1)).min(1, "Выберите хотя бы одну услугу"),
  categoryId: z.string().min(1, "Категория обязательна"),
  defaultMarkup: z.coerce.number().min(1.0, "Наценка не может быть менее 1.0 (0%)").max(10.0, "Максимальная наценка - 10.0 (900%)"),
  providerId: z.string().min(1, "ID провайдера обязателен"),
  categoryIdMap: z.record(z.string()).optional(),
});

export async function importSelectedServices(
  externalIds: string[], 
  categoryId: string, 
  defaultMarkup: number, 
  providerId: string,
  categoryIdMap?: Record<string, string>
) {
    return requireStaffPermission('PROVIDERS', 'edit', async (admin) => {
        try {
            const parsed = importServicesSchema.safeParse({ externalIds, categoryId, defaultMarkup, providerId, categoryIdMap });
            if (!parsed.success) {
                return { success: false, error: 'Ошибка валидации: ' + parsed.error.errors.map(e => e.message).join(', ') };
            }

            const res = await adminCatalogService.importServices(
                parsed.data.externalIds,
                parsed.data.categoryId,
                parsed.data.defaultMarkup,
                admin,
                parsed.data.providerId,
                parsed.data.categoryIdMap
            );
            
            // SDLC Gate 4: Обязательная инвалидация кэша после мутации
            revalidatePath('/admin/providers/import');
            revalidatePath('/admin/services');
            
            return { success: true, imported: res.importedCount };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
             const localized = handleServerError(e);
             return { success: false, error: localized.message };
        }
    });
}


