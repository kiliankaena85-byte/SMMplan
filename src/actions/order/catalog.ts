"use server";

import { db } from "@/lib/db";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { applyBeautifulRounding } from "@/lib/financial-constants";
import { SettingsProvider } from "@/lib/settings";
import { unstable_cache } from "next/cache";

import { sanitizeServiceDescription } from "@/lib/sanitize";
import { logger } from "@/lib/logger";
import { SmartAnalyzerLogic } from "@/services/providers/smart-analyzer.logic";

const getCachedNetworks = (tenantId: string) => unstable_cache(
  async () => {
    return await db.network.findMany({
      where: {
        isActive: true,
        tenantId: { in: [tenantId, 'all'] },
        categories: { some: { services: { some: { isActive: true, isQuarantined: false } } } }
      },
      include: {
        categories: {
          where: { services: { some: { isActive: true, isQuarantined: false } } },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { sort: 'asc' }
    });
  },
  [`public-catalog-networks-v3-${tenantId}`],
  { revalidate: 60, tags: ['catalog', `catalog-${tenantId}`] }
)();

const PAGE_SIZE = 100;

const getCachedServices = (catId: string, tenantId: string = 'smmplan') => unstable_cache(
  async () => {
    const services = await db.service.findMany({
      where: { 
        categoryId: catId, 
        isActive: true, 
        isQuarantined: false,
        tenantId: { in: [tenantId, 'all'] },
        OR: [{ cooldownUntil: null }, { cooldownUntil: { lt: new Date() } }]
      },
      include: { smartConfig: true },
      orderBy: { rate: 'asc' },
      take: PAGE_SIZE + 1
    });
    if (services.length > PAGE_SIZE) {
      console.warn(`[catalog] Category ${catId} has ${services.length} services, truncating tail to ${PAGE_SIZE}`);
    }
    return services.slice(0, PAGE_SIZE);
  },
  [`public-services-by-category-v3-${catId}-${tenantId}`],
  { revalidate: 60, tags: ['catalog', 'services', `catalog-${tenantId}`] }
)();

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  features?: any;
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
            tenantId: { in: [tenantId, 'all'] },
            categories: { some: { services: { some: { isActive: true, isQuarantined: false } } } }
          },
          include: {
            categories: {
              where: { services: { some: { isActive: true, isQuarantined: false } } },
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
              tenantId: { in: [tenantId, 'all'] },
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
            take: 100
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
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       const feat = (s.features || {}) as any;
       const fallbackAnalysis = (!feat.speedText || !feat.startTime)
         ? SmartAnalyzerLogic.detectSync(s.name, s.description || '')
         : null;

       const startTime = feat.startTime || fallbackAnalysis?.startTime || '5–15 мин';
       const speedDisplay = feat.speedText || fallbackAnalysis?.speedText || (s.name.toLowerCase().includes('быстр') ? 'Быстрая' : 'Стандартная');
       const warrantyDays = feat.warrantyDays ?? fallbackAnalysis?.warranty ?? (s.isRefillEnabled ? 30 : null);
       const qualityLabel = feat.qualityLabel || fallbackAnalysis?.qualityLabel || (badge || 'Стандарт');

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

