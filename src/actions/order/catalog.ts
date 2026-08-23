'use server';

import { db } from "@/lib/db";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { applyBeautifulRounding } from "@/lib/financial-constants";
import { SettingsProvider } from "@/lib/settings";
import { unstable_cache } from "next/cache";
import { tenantVisibilityFilter } from "@/lib/tenant-scope";

import { sanitizeServiceDescription } from "@/lib/sanitize";
import { logger } from "@/lib/logger";
import { SmartAnalyzerLogic } from "@/services/providers/smart-analyzer.logic";

/**
 * AUD-05 (3.1): shared visibility condition for storefront taxonomy.
 * A network shows a category only if the category AND at least one of its
 * active services belong to the current tenant (or are shared as 'all').
 * Without the tenant check on both levels the tree shows "ghost" categories
 * that open into an empty services list.
 */
function storefrontCategoryVisibility(tenantId: string) {
  const tenant = tenantVisibilityFilter(tenantId);
  return {
    tenantId: tenant,
    services: { some: { isActive: true, isQuarantined: false, tenantId: tenant } },
  };
}

export async function getCachedNetworks(tenantId: string) {
  return unstable_cache(
    async () => {
      return await db.network.findMany({
        where: {
          isActive: true,
          tenantId: tenantVisibilityFilter(tenantId),
          categories: { some: storefrontCategoryVisibility(tenantId) },
        },
        include: {
          categories: {
            where: storefrontCategoryVisibility(tenantId),
            orderBy: { name: 'asc' }
          }
        },
        orderBy: { sort: 'asc' }
      });
    },
    [`public-catalog-networks-v3-${tenantId}`],
    { revalidate: 60, tags: ['catalog', `catalog-${tenantId}`, `networks-${tenantId}`] }
  )();
}

/**
 * AUD-07 (3.2): hard limit raised from 100 to 500 — realistic provider catalogs
 * fit without silent truncation; anything above is logged loudly and the
 * storefront renders progressively (client-side "show more").
 */
const CATEGORY_SERVICES_HARD_LIMIT = 500;

export async function getCachedServicesByCategory(categoryId: string, tenantId: string = 'smmplan') {
  return unstable_cache(
    async () => {
      const services = await db.service.findMany({
        where: {
          categoryId: categoryId,
          isActive: true,
          isQuarantined: false,
          tenantId: tenantVisibilityFilter(tenantId),
          OR: [{ cooldownUntil: null }, { cooldownUntil: { lt: new Date() } }]
        },
        include: { smartConfig: true },
        orderBy: { rate: 'asc' },
        take: CATEGORY_SERVICES_HARD_LIMIT + 1
      });
      if (services.length > CATEGORY_SERVICES_HARD_LIMIT) {
        logger.warn(`[catalog] AUD-07: category ${categoryId} exceeds ${CATEGORY_SERVICES_HARD_LIMIT} services (${services.length}); storefront shows the cheapest ${CATEGORY_SERVICES_HARD_LIMIT} — consider splitting the category`, { categoryId, tenantId, count: services.length });
      }
      return services.slice(0, CATEGORY_SERVICES_HARD_LIMIT);
    },
    [`public-services-by-category-v3-${categoryId}-${tenantId}`],
    { revalidate: 60, tags: ['catalog', 'services', `catalog-${tenantId}`, `category-${categoryId}-${tenantId}`] }
  )();
}

export async function getCachedServices(categoryId: string, tenantId: string = 'smmplan') {
  return getCachedServicesByCategory(categoryId, tenantId);
}

export type PublicService = {
  id: string;
  numericId: number;
  slug?: string | null;
  categoryId: string;
  name: string;
  pricePer1kRub: number;
  pricePerUnitRub: number;
  minQty: number;
  maxQty: number;
  description: string | null;
  speed: string;
  speedDisplay?: string | null;
  startTime?: string | null;
  warrantyDays?: number | null;
  qualityLabel?: string | null;
  badge: string;
  isDripFeedEnabled: boolean;
  isRefillEnabled?: boolean;
  targetType?: string | null;
  customDataType?: string | null;
  customDataLabel?: string | null;
  clientRequirement?: string | null;
  clientConfirmation?: string | null;
  etaP50Seconds?: number | null;
  etaP90Seconds?: number | null;
  etaSpeedClass?: string | null;
  features?: unknown;
  cooldownUntil?: string | null;
  smartConfig?: {
    isEnabled: boolean;
    isTestMode: boolean;
    minChunk: number;
    maxChunk: number;
    markup: number;
    useInviteBuffer?: boolean;
    autoCompensate?: boolean;
    checkIntervalMins?: number;
  } | null;
  requireWarning?: boolean;
  warningMessage?: string | null;
};

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  networkId: string | null;
  requireWarning?: boolean;
  warningMessage?: string | null;
  analyzerTags?: string | null;
};

export type PublicNetwork = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  categories: PublicCategory[];
};

/** @public Public catalog fetching action for storefront */
export async function getPublicCatalogAction(tenantId: string = 'smmplan') {
  try {

    const rawNetworks = SettingsProvider.isTestEnvironment()
      ? await db.network.findMany({
          where: {
            isActive: true,
            tenantId: tenantVisibilityFilter(tenantId),
            categories: { some: storefrontCategoryVisibility(tenantId) }
          },
          include: {
            categories: {
              where: storefrontCategoryVisibility(tenantId),
              orderBy: { name: 'asc' }
            }
          },
          orderBy: { sort: 'asc' }
        })
      : await getCachedNetworks(tenantId);

    const catalog: PublicNetwork[] = rawNetworks.map(net => {
      let icon = `/brands/${net.slug}.svg`;
      let finalIcon = net.icon && (net.icon.startsWith('/') || net.icon.startsWith('http')) ? net.icon : icon;
      if (finalIcon.startsWith('/icons/')) {
        finalIcon = finalIcon.replace('/icons/', '/brands/');
      }

      return {
        id: net.id,
        name: net.name,
        slug: net.slug,
        icon: finalIcon, // prefer valid absolute/relative SVG custom icons or fallback
        categories: net.categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          networkId: cat.networkId,
          requireWarning: cat.requireWarning,
          warningMessage: cat.warningMessage,
          analyzerTags: 'analyzerTags' in cat ? (cat as { analyzerTags?: string | null }).analyzerTags : null
        }))
      };
    });

    return { success: true, data: catalog };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error("getPublicCatalogAction failed", { tenantId, error: errMsg });

    import('@/lib/notifications').then(({ sendAdminAlert }) => {
      try {
        sendAdminAlert(`🚨 Hero catalog fetch failed (tenant=${tenantId}): ${errMsg}`, 'CRITICAL');
      // eslint-disable-next-line no-empty
      } catch {}
    }).catch(() => {});

    return { success: false, error: "Failed to load catalog" };
  }
}

/**
 * @public Public catalog endpoint for category services
 */
export async function getServicesByCategoryAction(categoryId: string, tenantId: string = 'smmplan'): Promise<PublicService[]> {
  try {

    const [services, usdToRub] = await Promise.all([
      SettingsProvider.isTestEnvironment()
        ? db.service.findMany({
            where: { 
              categoryId: categoryId, 
              isActive: true,
              isQuarantined: false,
              tenantId: tenantVisibilityFilter(tenantId),
              OR: [{ cooldownUntil: null }, { cooldownUntil: { lt: new Date() } }]
            },
            select: {
              id: true,

              numericId: true,
              slug: true,
              categoryId: true,
              name: true,
              description: true,
              minQty: true,
              maxQty: true,
              isDripFeedEnabled: true,
              isRefillEnabled: true,
              targetType: true,
              customDataType: true,
              customDataLabel: true,
              clientRequirement: true,
              clientConfirmation: true,
              features: true,
              cooldownUntil: true,
              etaP50Seconds: true,
              etaP90Seconds: true,
              etaSpeedClass: true,
              requireWarning: true,
              warningMessage: true,
              providerCurrency: true,
              markup: true,
              rate: true,
              smartConfig: {
                select: {
                  isEnabled: true,
                  isTestMode: true,
                  minChunk: true,
                  maxChunk: true,
                  markup: true,
                  useInviteBuffer: true,
                  autoCompensate: true,
                  checkIntervalMins: true
                }
              }
            },
            orderBy: { rate: 'asc' },
            take: CATEGORY_SERVICES_HARD_LIMIT
          })
        : getCachedServices(categoryId, tenantId),
      SettingsProvider.getExchangeRateUSD()
    ]);

    return services.map(s => {
       let badge = "";
       // Names are strictly "Category Name • Tier"
       const parts = s.name.split('•');
       const tierName = parts.length > 1 ? parts[parts.length - 1].trim().toLowerCase() : "";

       if (tierName === 'премиум') badge = "ПРЕМИУМ";
       else if (tierName === 'эконом') badge = "ЭКОНОМ";
       else if (tierName === 'живые') badge = "ЖИВЫЕ";
       else if (tierName === 'стандарт') badge = "СТАНДАРТ";
       else if (s.name.toLowerCase().includes('гарант')) badge = "ГАРАНТИЯ";
       else if (s.rate < 0.1) badge = "ХИТ";

       const pricePer1kRub = applyBeautifulRounding(s.rate * s.markup * (s.providerCurrency === 'RUB' ? 1.0 : usdToRub));
       const pricePerUnitRub = pricePer1kRub / 1000;

        // 4-Tier Hybrid Execution Metrics
        const feat = (s.features && typeof s.features === 'object' ? s.features : {}) as Record<string, unknown>;
        const fallbackAnalysis = (!feat.speedText || !feat.startTime)
          ? SmartAnalyzerLogic.detectSync(s.name, s.description || '')
          : null;

        const startTime = (feat.startTime as string | undefined) || fallbackAnalysis?.startTime || '5–15 мин';
        const speedDisplay = (feat.speedText as string | undefined) || fallbackAnalysis?.speedText || (s.name.toLowerCase().includes('быстр') ? 'Быстрая' : 'Стандартная');
        const warrantyDays = (typeof feat.warrantyDays === 'number' ? feat.warrantyDays : undefined) ?? fallbackAnalysis?.warranty ?? (s.isRefillEnabled ? 30 : null);
        const qualityLabel = (feat.qualityLabel as string | undefined) || fallbackAnalysis?.qualityLabel || (badge || 'Стандарт');

       return {
          id: s.id,
          numericId: s.numericId,
          slug: s.slug,
          categoryId: s.categoryId,
          name: s.name,
          description: sanitizeServiceDescription(s.description),
          pricePer1kRub,
          pricePerUnitRub,
          minQty: s.minQty,
          maxQty: s.maxQty,
          speed: startTime, // Backwards-compatible speed field (e.g. 'Мгновенно', '0-1 час')
          speedDisplay,
          startTime,
          warrantyDays,
          qualityLabel,
          badge,
          isDripFeedEnabled: s.isDripFeedEnabled,
          isRefillEnabled: Boolean(s.isRefillEnabled || (warrantyDays && warrantyDays > 0)),
          targetType: s.targetType,
          customDataType: s.customDataType,
          customDataLabel: s.customDataLabel,
          features: s.features,
          cooldownUntil: s.cooldownUntil && !isNaN(new Date(s.cooldownUntil).getTime()) ? new Date(s.cooldownUntil).toISOString() : null,
          smartConfig: s.smartConfig ? {
            isEnabled: s.smartConfig.isEnabled,
            isTestMode: s.smartConfig.isTestMode,
            minChunk: s.smartConfig.minChunk,
            maxChunk: s.smartConfig.maxChunk,
            markup: s.smartConfig.markup,
            useInviteBuffer: s.smartConfig.useInviteBuffer,
            autoCompensate: s.smartConfig.autoCompensate,
            checkIntervalMins: s.smartConfig.checkIntervalMins
          } : null,
          requireWarning: s.requireWarning,
          warningMessage: s.warningMessage,
          clientRequirement: s.clientRequirement,
          clientConfirmation: s.clientConfirmation,
          etaP50Seconds: s.etaP50Seconds,
          etaP90Seconds: s.etaP90Seconds,
          etaSpeedClass: s.etaSpeedClass
       };
    });
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return [];
  }
}

/**
 * @public Public catalog lookup by service slug
 */
export async function getServiceBySlugAction(slug: string, tenantId: string = 'smmplan') {
  try {
    const usdToRub = await SettingsProvider.getExchangeRateUSD();
    const service = await db.service.findFirst({
      where: {
        slug,
        tenantId: { in: [tenantId, 'all'] },
        isActive: true,
        isQuarantined: false,
        OR: [{ cooldownUntil: null }, { cooldownUntil: { lt: new Date() } }],
        category: {
          network: { isActive: true }
        }
      },
      include: {
        category: {
          include: { network: true }
        },
        provider: {
          select: { name: true, ticketUrl: true }
        }
      }
    });

    if (!service) return null;

    const pricePer1kRub = applyBeautifulRounding(service.rate * service.markup * (service.providerCurrency === 'RUB' ? 1.0 : usdToRub));
    const pricePerUnitRub = pricePer1kRub / 1000;

    return {
      ...service,
      pricePer1kRub,
      pricePerUnitRub,
    };
  } catch (error) {
    console.error("Failed to fetch service by slug:", error);
    return null;
  }
}

