"use server";

import { db } from "@/lib/db";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { applyBeautifulRounding } from "@/lib/financial-constants";
import { SettingsProvider } from "@/lib/settings";
import { unstable_cache } from "next/cache";

export type PublicService = {
  id: string;
  numericId: number;
  categoryId: string;
  name: string;
  pricePer1kRub: number;
  minQty: number;
  maxQty: number;
  description: string | null;
  speed: string;
  badge: string;
  targetType?: string | null;
  features?: any;
  cooldownUntil?: string | null;
};

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  networkId: string | null;
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
      ['public-catalog-networks'],
      { revalidate: 60, tags: ['catalog'] }
    );

    const rawNetworks = await getCachedNetworks();

    const catalog: PublicNetwork[] = rawNetworks.map(net => {
      let icon = "/brands/web.svg";
      if (net.slug.includes('instagram')) icon = "/brands/instagram.svg";
      if (net.slug.includes('telegram')) icon = "/brands/telegram.svg";
      if (net.slug.includes('vk')) icon = "/brands/vk.svg";
      if (net.slug.includes('youtube')) icon = "/brands/youtube.svg";
      if (net.slug.includes('tiktok')) icon = "/brands/tiktok.svg";

      return {
        id: net.id,
        name: net.name,
        slug: net.slug,
        icon: net.icon && (net.icon.startsWith('/') || net.icon.startsWith('http')) ? net.icon : icon, // prefer valid absolute/relative SVG custom icons or fallback
        categories: net.categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          networkId: cat.networkId
        }))
      };
    });

    return { success: true, data: catalog };
  } catch (error: any) {
    console.error("Failed to fetch public catalog:", error);
    return { success: false, error: "Failed to load catalog" };
  }
}

export async function getServicesByCategoryAction(categoryId: string): Promise<PublicService[]> {
  try {
    const getCachedServices = unstable_cache(
      async (catId: string) => {
        return await db.service.findMany({
          where: { categoryId: catId, isActive: true },
          orderBy: { rate: 'asc' },
          take: 100
        });
      },
      ['public-services-by-category'],
      { revalidate: 60, tags: ['catalog', 'services'] }
    );

    const [services, usdToRub] = await Promise.all([
      getCachedServices(categoryId),
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

       return {
          id: s.id,
          numericId: s.numericId,
          categoryId: s.categoryId,
          name: s.name,
          description: s.description,
          pricePer1kRub: applyBeautifulRounding(s.rate * s.markup * usdToRub),
          minQty: s.minQty,
          maxQty: s.maxQty,
          speed: s.name.toLowerCase().includes('быстр') ? 'Сразу' : 'В течение часа',
          badge,
          targetType: s.targetType,
          features: s.features,
          cooldownUntil: s.cooldownUntil ? s.cooldownUntil.toISOString() : null
       };
    });
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return [];
  }
}
