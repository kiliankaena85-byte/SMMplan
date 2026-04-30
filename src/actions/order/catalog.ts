"use server";

import { db } from "@/lib/db";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { applyBeautifulRounding } from "@/lib/financial-constants";
import { SettingsProvider } from "@/lib/settings";

export type PublicService = {
  id: string;
  numericId: number;
  categoryId: string;
  name: string;
  pricePer1kRub: number;
  minQty: number;
  description: string | null;
  speed: string;
  badge: string;
};

export type PublicCategory = {
  id: string;
  name: string;
  icon: string;
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
    const rawNetworks = await db.network.findMany({
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
        categories: net.categories.map(c => ({
          id: c.id,
          name: c.name,
          icon: "/icons/list.svg" // fallback
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
    const [services, usdToRub] = await Promise.all([
      db.service.findMany({
        where: { categoryId, isActive: true },
        orderBy: { rate: 'asc' },
        take: 100
      }),
      SettingsProvider.getExchangeRateUSD()
    ]);

    return services.map(s => {
       let badge = "";
       const nameLower = s.name.toLowerCase();
       if (nameLower.includes('гарант') && !nameLower.includes('без гарант')) badge = "ГАРАНТИЯ";
       else if (s.rate < 0.1) badge = "ХИТ";
       else if (s.rate > 2.0) badge = "ПРЕМИУМ";

       return {
          id: s.id,
          numericId: s.numericId,
          categoryId: s.categoryId,
          name: s.name,
          description: s.description,
          pricePer1kRub: applyBeautifulRounding(s.rate * s.markup * usdToRub),
          minQty: s.minQty,
          speed: s.name.toLowerCase().includes('быстр') ? 'Сразу' : 'В течение часа',
          badge
       };
    });
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return [];
  }
}
