"use server";

import { db } from "@/lib/db";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { applyBeautifulRounding } from "@/lib/financial-constants";
import { SettingsProvider } from "@/lib/settings";
import { unstable_cache } from "next/cache";

import { sanitizeServiceDescription } from "@/lib/sanitize";

const getCachedNetworks = unstable_cache(
  async () => {
    return await db.network.findMany({
      where: {
        isActive: true,
        categories: { some: { services: { some: { isActive: true } } } }
      },
      include: {
        categories: {
          where: { services: { some: { isActive: true } } },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { sort: 'asc' }
    });
  },
  ['public-catalog-networks-v2'],
  { revalidate: 60, tags: ['catalog'] }
);

const PAGE_SIZE = 100;

const getCachedServices = (catId: string) => unstable_cache(
  async () => {
    const services = await db.service.findMany({
      where: { categoryId: catId, isActive: true },
      include: { smartConfig: true },
      orderBy: { rate: 'asc' },
      take: PAGE_SIZE + 1
    });
    if (services.length > PAGE_SIZE) {
      console.warn(`[catalog] Category ${catId} has ${services.length} services, truncating tail to ${PAGE_SIZE}`);
    }
    return services.slice(0, PAGE_SIZE);
  },
  ['public-services-by-category-v2', catId],
  { revalidate: 60, tags: ['catalog', 'services'] }
)();

export type PublicService = {
  id: string;
  numericId: number;
  categoryId: string;
  name: string;
  pricePer1kRub: number;
  pricePerUnitRub: number;
  minQty: number;
  maxQty: number;
  description: string | null;
  speed: string;
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

export async function getPublicCatalogAction() {
  try {

    const rawNetworks = SettingsProvider.isTestEnvironment()
      ? await db.network.findMany({
          where: {
            isActive: true,
            categories: { some: { services: { some: { isActive: true } } } }
          },
          include: {
            categories: {
              where: { services: { some: { isActive: true } } },
              orderBy: { name: 'asc' }
            }
          },
          orderBy: { sort: 'asc' }
        })
      : await getCachedNetworks();

    const catalog: PublicNetwork[] = rawNetworks.map(net => {
      let icon = "/brands/web.svg";
      if (net.slug.includes('instagram')) icon = "/brands/instagram.svg";
      if (net.slug.includes('telegram')) icon = "/brands/telegram.svg";
      if (net.slug.includes('vk')) icon = "/brands/vk.svg";
      if (net.slug.includes('youtube')) icon = "/brands/youtube.svg";
      if (net.slug.includes('tiktok')) icon = "/brands/tiktok.svg";

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
          analyzerTags: (cat as any).analyzerTags
        }))
      };
    });

    return { success: true, data: catalog };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Failed to fetch public catalog:", error);
    return { success: false, error: "Failed to load catalog" };
  }
}

export async function getServicesByCategoryAction(categoryId: string): Promise<PublicService[]> {
  try {

    const [services, usdToRub] = await Promise.all([
      SettingsProvider.isTestEnvironment()
        ? db.service.findMany({
            where: { categoryId: categoryId, isActive: true },
            include: { smartConfig: true },
            orderBy: { rate: 'asc' },
            take: 100
          })
        : getCachedServices(categoryId),
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

       return {
          id: s.id,
          numericId: s.numericId,
          categoryId: s.categoryId,
          name: s.name,
          description: sanitizeServiceDescription(s.description),
          pricePer1kRub,
          pricePerUnitRub,
          minQty: s.minQty,
          maxQty: s.maxQty,
          speed: s.name.toLowerCase().includes('быстр') ? 'Сразу' : 'В течение часа',
          badge,
          isDripFeedEnabled: s.isDripFeedEnabled,
          isRefillEnabled: s.isRefillEnabled,
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
