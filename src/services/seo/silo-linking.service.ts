/**
 * (c) 2024-2026 OmniSMM 1.0. All rights reserved.
 * 
 * Silo Linking Service — Internal Linking Silo Architecture (Yandex 2026 YATI & Proxima).
 * Layer: Level 1 (Services & Domain Business Logic).
 */

import { db } from "@/lib/db";
import {
  SiloActivityType,
  SiloCategoryLink,
  SiloServiceLink,
  SiloRecommendationBundle,
} from "@/types/silo";
import {
  absoluteCanonical,
  getTenantSiteName,
  normalizeTenantId,
} from "@/lib/seo-helpers";
import {
  applyBeautifulRounding,
  SAFETY_FLOOR_MARKUP,
} from "@/lib/financial-constants";
import { SettingsProvider } from "@/lib/settings";
import { tenantVisibilityFilter } from "@/lib/tenant-scope";

export class SiloLinkingService {
  /**
   * Infers the Silo Activity Type from category name, service name, or DB activityType.
   * Resolves category intent first to avoid secondary service attributes overriding the Silo cluster.
   */
  public static inferActivityType(
    name: string,
    categoryName?: string,
    currentActivityType?: string | null
  ): SiloActivityType {
    const validTypes: SiloActivityType[] = [
      'FOLLOWERS',
      'LIKES',
      'VIEWS',
      'REPOSTS',
      'COMMENTS',
      'VOTES',
      'BOOSTS',
    ];

    if (currentActivityType && validTypes.includes(currentActivityType as SiloActivityType)) {
      return currentActivityType as SiloActivityType;
    }

    const matchText = (text: string): SiloActivityType => {
      const clean = text.toLowerCase();

      // 1. Boosts / Telegram story boosts
      if (/буст|boost|голос.*истор/i.test(clean)) {
        return 'BOOSTS';
      }

      // 2. Polls & Votes
      if (/(?:^|[^а-яёa-z0-9])(голос\w*|vote\w*|опрос\w*|poll\w*)(?:$|[^а-яёa-z0-9])/i.test(clean)) {
        return 'VOTES';
      }

      // 3. Followers / Members / Subscribers
      if (/подписчик|фолловер|follower|subscriber|member|участник|читател|саб[ыо]|инвайт/i.test(clean)) {
        return 'FOLLOWERS';
      }

      // 4. Views / Impressions / Plays / Reach / Livestream viewers
      if (
        /просмотр|автопросмотр|охват|показ|impression|reach|story view|просмотр.*истор|прослушиван|слушател|зрител|трансляц|стрим|эфир/i.test(
          clean
        ) ||
        /(?:^|[^а-яёa-z0-9])глаз\w*/i.test(clean) ||
        /(?:^|[^a-z0-9])views?(?:$|[^a-z0-9])/i.test(clean)
      ) {
        return 'VIEWS';
      }

      // 5. Likes / Reactions / Emoji / Clapping / OK.ru classes
      // Note: Prevent false match on "одноклассники", "классический", "бизнес-класс"
      const hasClassWord =
        !/одноклассник|классическ/i.test(clean) &&
        /(?:^|[^а-яёa-z0-9])(класс|классы|классов|классам)(?:$|[^а-яёa-z0-9])/i.test(clean);

      if (
        /лайк|like|реакци|reaction|сердечк|heart|огоньк|эмодзи/i.test(clean) ||
        /(?:^|[^a-z0-9])fire(?:$|[^a-z0-9])/i.test(clean) ||
        hasClassWord
      ) {
        return 'LIKES';
      }

      // 6. Comments & Reviews
      if (/коммент|comment|отзыв|review/i.test(clean)) {
        return 'COMMENTS';
      }

      // 7. Reposts / Shares / Forwards / Saves / Bookmarks
      if (/репост|repost|поделит|share|пересылк|forward|сохранен|закладк|bookmark/i.test(clean)) {
        return 'REPOSTS';
      }

      // 8. Stories
      if (/истори|story/i.test(clean)) {
        return 'VIEWS';
      }

      return 'OTHER';
    };

    // If categoryName is provided, check category first to avoid secondary service attributes overriding parent intent
    if (categoryName && categoryName.trim().length > 0) {
      const catType = matchText(categoryName);
      if (catType !== 'OTHER') {
        return catType;
      }
    }

    // Otherwise infer from service name
    if (name && name.trim().length > 0) {
      const nameType = matchText(name);
      if (nameType !== 'OTHER') {
        return nameType;
      }
    }

    return 'OTHER';
  }

  /**
   * Deterministic pairing rules for complementary social signals (YATI topical clustering).
   */
  public static getComplementaryActivityTypes(activityType: SiloActivityType): SiloActivityType[] {
    switch (activityType) {
      case 'FOLLOWERS':
        return ['VIEWS', 'LIKES', 'BOOSTS', 'COMMENTS', 'REPOSTS'];
      case 'VIEWS':
        return ['LIKES', 'REPOSTS', 'COMMENTS', 'FOLLOWERS'];
      case 'LIKES':
        return ['VIEWS', 'COMMENTS', 'REPOSTS', 'FOLLOWERS'];
      case 'COMMENTS':
        return ['LIKES', 'VIEWS', 'FOLLOWERS', 'REPOSTS'];
      case 'REPOSTS':
        return ['VIEWS', 'LIKES', 'FOLLOWERS', 'COMMENTS'];
      case 'BOOSTS':
        return ['FOLLOWERS', 'VIEWS', 'LIKES'];
      case 'VOTES':
        return ['VIEWS', 'FOLLOWERS', 'LIKES'];
      case 'OTHER':
      default:
        return ['FOLLOWERS', 'VIEWS', 'LIKES'];
    }
  }

  /**
   * Contextual Russian headline and rationale for high commercial relevance (Proxima metric).
   */
  public static getActivityTypeRationale(activityType: SiloActivityType): {
    headline: string;
    subheadline: string;
  } {
    switch (activityType) {
      case 'FOLLOWERS':
        return {
          headline: 'С подписчиками часто заказывают',
          subheadline:
            'Для естественной динамики и защиты от фильтров умной ленты дополните прирост аудитории реакциями и автопросмотрами',
        };
      case 'VIEWS':
        return {
          headline: 'С просмотрами также заказывают',
          subheadline:
            'Сбалансируйте соотношение просмотров к лайкам и репостам для максимального охвата и выхода в рекомендации',
        };
      case 'LIKES':
        return {
          headline: 'С реакциями и лайками также заказывают',
          subheadline:
            'Добавьте просмотры и комментарии, чтобы активность выглядела органично для алгоритмов соцсети',
        };
      case 'COMMENTS':
        return {
          headline: 'С комментариями часто заказывают',
          subheadline:
            'Поддержите живую дискуссию лайками и охватами для удержания публикации в топе ленты',
        };
      case 'REPOSTS':
        return {
          headline: 'С репостами часто заказывают',
          subheadline:
            'Усильте виральный охват просмотрами и реакциями на исходную публикацию',
        };
      case 'BOOSTS':
        return {
          headline: 'С бустами канала часто заказывают',
          subheadline:
            'Открытие историй в канале работает эффективнее в связке с новыми подписчиками и просмотрами',
        };
      case 'VOTES':
        return {
          headline: 'С голосами в опросы заказывают',
          subheadline:
            'Дополните участие в опросах просмотрами целевой записи для естественного профиля активности',
        };
      case 'OTHER':
      default:
        return {
          headline: 'С этой услугой также заказывают',
          subheadline:
            'Комплексное продвижение повышает доверие аудитории и выводит профиль в топ рекомендаций',
        };
    }
  }

  /**
   * Builds a normalized SiloRecommendationBundle with absolute canonical links and isolated branding.
   */
  public static buildBundle(params: {
    targetActivityType: SiloActivityType;
    tenantId: string;
    networkSlug: string;
    networkName: string;
    headline?: string;
    subheadline?: string;
    categories: Array<{
      id: string;
      name: string;
      slug: string;
      networkSlug: string;
      networkName: string;
      activityType: SiloActivityType;
      minPricePerUnitRub?: number;
      servicesCount?: number;
    }>;
    services: Array<{
      id: string;
      numericId: number;
      name: string;
      slug: string | null;
      networkSlug: string;
      networkName: string;
      categorySlug: string;
      categoryName: string;
      activityType: SiloActivityType;
      pricePerUnitRub: number;
      minQty: number;
      maxQty: number;
      speedClass?: string | null;
      hasRefill?: boolean;
    }>;
  }): SiloRecommendationBundle {
    const tenantId = normalizeTenantId(params.tenantId);
    const siteName = getTenantSiteName(tenantId);
    const defaultRationale = this.getActivityTypeRationale(params.targetActivityType);

    const complementaryCategories: SiloCategoryLink[] = params.categories.map((c) => ({
      ...c,
      canonicalUrl: absoluteCanonical(tenantId, `/services/${c.networkSlug}/${c.slug}`),
    }));

    const complementaryServices: SiloServiceLink[] = params.services.map((s) => ({
      ...s,
      canonicalUrl: absoluteCanonical(
        tenantId,
        `/services/${s.networkSlug}/${s.categorySlug}/${s.slug || s.numericId}`
      ),
    }));

    return {
      targetActivityType: params.targetActivityType,
      headline: params.headline || defaultRationale.headline,
      subheadline: params.subheadline || defaultRationale.subheadline,
      complementaryCategories,
      complementaryServices,
      tenantId,
      siteName,
    };
  }

  /**
   * Calculates strictly 1-unit price in rubles based on platform pricing rules.
   * Guarantees a minimum positive rate floor (>= 0.0001 RUB).
   */
  public static calculateUnitRateRub(
    service: {
      pricePer1000Cents?: number | null;
      costPer1kRub?: number | null;
      rate: number;
      providerCurrency: string;
      markup?: number | null;
    },
    usdToRub: number
  ): number {
    const rawPricePer1k =
      typeof service.pricePer1000Cents === 'number' && service.pricePer1000Cents > 0
        ? service.pricePer1000Cents / 100
        : (service.costPer1kRub ||
            service.rate * (service.providerCurrency === 'RUB' ? 1.0 : usdToRub)) *
          (service.markup || SAFETY_FLOOR_MARKUP);

    const pricePer1kRub = applyBeautifulRounding(rawPricePer1k);
    const unitPrice = Math.round((pricePer1kRub / 1000) * 10000) / 10000;
    return Math.max(0.0001, unitPrice);
  }

  /**
   * Resolves complementary services for a specific service detail page.
   */
  public static async getComplementaryServicesForService(params: {
    serviceId?: string;
    serviceSlug?: string;
    tenantId?: string;
    limit?: number;
  }): Promise<SiloRecommendationBundle | null> {
    if (!params.serviceId && !params.serviceSlug) {
      return null;
    }

    const tenantId = normalizeTenantId(params.tenantId);
    const limit = params.limit ?? 4;

    try {
      const isNumeric = params.serviceSlug && /^\d+$/.test(params.serviceSlug);
      const currentService = await db.service.findFirst({
        where: {
          ...(params.serviceId
            ? { id: params.serviceId }
            : isNumeric
            ? {
                AND: [
                  { OR: [{ slug: params.serviceSlug }, { numericId: parseInt(params.serviceSlug!, 10) }] },
                  { OR: [{ cooldownUntil: null }, { cooldownUntil: { lt: new Date() } }] },
                ],
              }
            : { slug: params.serviceSlug }),
          isActive: true,
          isQuarantined: false,
          tenantId: tenantVisibilityFilter(tenantId),
        },
        include: {
          category: {
            include: { network: true },
          },
        },
      });

      if (!currentService || !currentService.category || !currentService.category.network) {
        return null;
      }

      const network = currentService.category.network;
      const currentCategory = currentService.category;

      const currentActivityType = this.inferActivityType(
        currentService.name,
        currentCategory.name,
        currentCategory.activityType
      );
      const complementaryTypes = this.getComplementaryActivityTypes(currentActivityType);

      const usdToRub = await SettingsProvider.getExchangeRateUSD();

      // Find active sibling categories in the same network (fetch all available up to 50 to avoid premature truncation)
      const siblingCategories = await db.category.findMany({
        where: {
          networkId: network.id,
          id: { not: currentCategory.id },
          tenantId: tenantVisibilityFilter(tenantId),
          services: {
            some: {
              isActive: true,
              isQuarantined: false,
              tenantId: tenantVisibilityFilter(tenantId),
              OR: [{ cooldownUntil: null }, { cooldownUntil: { lt: new Date() } }],
            },
          },
        },
        orderBy: { sort: 'asc' },
        take: 50,
      });

      // Prioritize categories matching complementary activity types
      const prioritizedCategories = siblingCategories.sort((a, b) => {
        const typeA = this.inferActivityType(a.name, undefined, a.activityType);
        const typeB = this.inferActivityType(b.name, undefined, b.activityType);
        const idxA = complementaryTypes.indexOf(typeA);
        const idxB = complementaryTypes.indexOf(typeB);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      });

      const categoryIds = prioritizedCategories.map((c) => c.id);
      if (categoryIds.length === 0) {
        return null;
      }

      // Find top representative services from these complementary categories
      const rawServices = await db.service.findMany({
        where: {
          categoryId: { in: categoryIds },
          id: { not: currentService.id },
          isActive: true,
          isQuarantined: false,
          tenantId: tenantVisibilityFilter(tenantId),
          OR: [{ cooldownUntil: null }, { cooldownUntil: { lt: new Date() } }],
        },
        include: {
          category: true,
        },
        orderBy: { rate: 'asc' },
        take: limit * 4,
      });

      // Sort raw services by category priority first, then by rate
      const sortedServices = [...rawServices].sort((a, b) => {
        const catIdxA = categoryIds.indexOf(a.categoryId);
        const catIdxB = categoryIds.indexOf(b.categoryId);
        if (catIdxA !== catIdxB) {
          return (catIdxA === -1 ? 99 : catIdxA) - (catIdxB === -1 ? 99 : catIdxB);
        }
        return a.rate - b.rate;
      });

      // Pick at most 2 services per category to ensure diversity
      const categoryCounts = new Map<string, number>();
      const selectedServices: typeof rawServices = [];

      for (const srv of sortedServices) {
        const count = categoryCounts.get(srv.categoryId) || 0;
        if (count < 2 && selectedServices.length < limit) {
          categoryCounts.set(srv.categoryId, count + 1);
          selectedServices.push(srv);
        }
      }

      const categoryLinks = prioritizedCategories.slice(0, 4).map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        networkSlug: network.slug,
        networkName: network.name,
        activityType: this.inferActivityType(cat.name, undefined, cat.activityType),
      }));

      const serviceLinks = selectedServices.map((srv) => {
        const actType = this.inferActivityType(srv.name, srv.category.name, srv.category.activityType);
        const pricePerUnitRub = this.calculateUnitRateRub(srv, usdToRub);
        const feat = (srv.features && typeof srv.features === 'object' ? srv.features : {}) as Record<
          string,
          unknown
        >;

        return {
          id: srv.id,
          numericId: srv.numericId,
          name: srv.name,
          slug: srv.slug,
          networkSlug: network.slug,
          networkName: network.name,
          categorySlug: srv.category.slug,
          categoryName: srv.category.name,
          activityType: actType,
          pricePerUnitRub,
          minQty: srv.minQty,
          maxQty: srv.maxQty,
          speedClass: srv.etaSpeedClass,
          hasRefill: Boolean(srv.isRefillEnabled || feat.hasRefill),
        };
      });

      return this.buildBundle({
        targetActivityType: currentActivityType,
        tenantId,
        networkSlug: network.slug,
        networkName: network.name,
        categories: categoryLinks,
        services: serviceLinks,
      });
    } catch (error) {
      console.error('[SiloLinkingService.getComplementaryServicesForService] Error:', error);
      return null;
    }
  }

  /**
   * Resolves complementary categories and services for a category page.
   */
  public static async getComplementaryCategoriesForCategory(params: {
    categoryId?: string;
    categorySlug?: string;
    networkSlug?: string;
    tenantId?: string;
    limit?: number;
  }): Promise<SiloRecommendationBundle | null> {
    if (!params.categoryId && !params.categorySlug) {
      return null;
    }

    const tenantId = normalizeTenantId(params.tenantId);
    const limit = params.limit ?? 4;

    try {
      const category = await db.category.findFirst({
        where: {
          ...(params.categoryId ? { id: params.categoryId } : { slug: params.categorySlug }),
          ...(params.networkSlug ? { network: { slug: params.networkSlug } } : {}),
          tenantId: tenantVisibilityFilter(tenantId),
        },
        include: {
          network: true,
        },
      });

      if (!category || !category.network) return null;

      const network = category.network;
      const currentActivityType = this.inferActivityType(category.name, undefined, category.activityType);
      const complementaryTypes = this.getComplementaryActivityTypes(currentActivityType);

      const usdToRub = await SettingsProvider.getExchangeRateUSD();

      // Find sibling categories in the same network (fetch all available up to 50 to avoid premature truncation)
      const siblingCategories = await db.category.findMany({
        where: {
          networkId: network.id,
          id: { not: category.id },
          tenantId: tenantVisibilityFilter(tenantId),
          services: {
            some: {
              isActive: true,
              isQuarantined: false,
              tenantId: tenantVisibilityFilter(tenantId),
              OR: [{ cooldownUntil: null }, { cooldownUntil: { lt: new Date() } }],
            },
          },
        },
        orderBy: { sort: 'asc' },
        take: 50,
      });

      // Sort categories prioritizing complementary activity types
      const prioritizedCategories = siblingCategories.sort((a, b) => {
        const typeA = this.inferActivityType(a.name, undefined, a.activityType);
        const typeB = this.inferActivityType(b.name, undefined, b.activityType);
        const idxA = complementaryTypes.indexOf(typeA);
        const idxB = complementaryTypes.indexOf(typeB);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      });

      const categoryIds = prioritizedCategories.map((c) => c.id);
      if (categoryIds.length === 0) {
        return null;
      }

      // Find top representative services
      const rawServices = await db.service.findMany({
        where: {
          categoryId: { in: categoryIds },
          isActive: true,
          isQuarantined: false,
          tenantId: tenantVisibilityFilter(tenantId),
          OR: [{ cooldownUntil: null }, { cooldownUntil: { lt: new Date() } }],
        },
        include: {
          category: true,
        },
        orderBy: { rate: 'asc' },
        take: limit * 4,
      });

      // Sort raw services by category priority first, then by rate
      const sortedServices = [...rawServices].sort((a, b) => {
        const catIdxA = categoryIds.indexOf(a.categoryId);
        const catIdxB = categoryIds.indexOf(b.categoryId);
        if (catIdxA !== catIdxB) {
          return (catIdxA === -1 ? 99 : catIdxA) - (catIdxB === -1 ? 99 : catIdxB);
        }
        return a.rate - b.rate;
      });

      const categoryCounts = new Map<string, number>();
      const selectedServices: typeof rawServices = [];

      for (const srv of sortedServices) {
        const count = categoryCounts.get(srv.categoryId) || 0;
        if (count < 1 && selectedServices.length < limit) {
          categoryCounts.set(srv.categoryId, count + 1);
          selectedServices.push(srv);
        }
      }

      const categoryLinks = prioritizedCategories.slice(0, 4).map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        networkSlug: network.slug,
        networkName: network.name,
        activityType: this.inferActivityType(cat.name, undefined, cat.activityType),
      }));

      const serviceLinks = selectedServices.map((srv) => {
        const actType = this.inferActivityType(srv.name, srv.category.name, srv.category.activityType);
        const pricePerUnitRub = this.calculateUnitRateRub(srv, usdToRub);
        const feat = (srv.features && typeof srv.features === 'object' ? srv.features : {}) as Record<
          string,
          unknown
        >;

        return {
          id: srv.id,
          numericId: srv.numericId,
          name: srv.name,
          slug: srv.slug,
          networkSlug: network.slug,
          networkName: network.name,
          categorySlug: srv.category.slug,
          categoryName: srv.category.name,
          activityType: actType,
          pricePerUnitRub,
          minQty: srv.minQty,
          maxQty: srv.maxQty,
          speedClass: srv.etaSpeedClass,
          hasRefill: Boolean(srv.isRefillEnabled || feat.hasRefill),
        };
      });

      return this.buildBundle({
        targetActivityType: currentActivityType,
        tenantId,
        networkSlug: network.slug,
        networkName: network.name,
        categories: categoryLinks,
        services: serviceLinks,
      });
    } catch (error) {
      console.error('[SiloLinkingService.getComplementaryCategoriesForCategory] Error:', error);
      return null;
    }
  }

  /**
   * Resolves top complementary Silo directions for a whole social network landing page (/services/[network]).
   */
  public static async getComplementaryForNetwork(params: {
    networkSlug: string;
    tenantId?: string;
    limit?: number;
  }): Promise<SiloRecommendationBundle | null> {
    const tenantId = normalizeTenantId(params.tenantId);
    const limit = params.limit ?? 4;

    try {
      const network = await db.network.findFirst({
        where: {
          slug: params.networkSlug,
          isActive: true,
        },
        include: {
          categories: {
            where: {
              tenantId: tenantVisibilityFilter(tenantId),
              services: {
                some: {
                  isActive: true,
                  isQuarantined: false,
                  tenantId: tenantVisibilityFilter(tenantId),
                  OR: [{ cooldownUntil: null }, { cooldownUntil: { lt: new Date() } }],
                },
              },
            },
            orderBy: { sort: 'asc' },
            take: 20,
          },
        },
      });

      if (!network || network.categories.length === 0) return null;

      // Group categories by activity type to pick a diverse set
      const idealTypes: SiloActivityType[] = ['FOLLOWERS', 'VIEWS', 'LIKES', 'COMMENTS', 'BOOSTS'];
      const sortedCategories = [...network.categories].sort((a, b) => {
        const typeA = this.inferActivityType(a.name, undefined, a.activityType);
        const typeB = this.inferActivityType(b.name, undefined, b.activityType);
        const idxA = idealTypes.indexOf(typeA);
        const idxB = idealTypes.indexOf(typeB);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      });

      const categoryIds = sortedCategories.map((c) => c.id);
      const usdToRub = await SettingsProvider.getExchangeRateUSD();

      const rawServices = await db.service.findMany({
        where: {
          categoryId: { in: categoryIds },
          isActive: true,
          isQuarantined: false,
          tenantId: tenantVisibilityFilter(tenantId),
          OR: [{ cooldownUntil: null }, { cooldownUntil: { lt: new Date() } }],
        },
        include: { category: true },
        orderBy: { rate: 'asc' },
        take: limit * 4,
      });

      const sortedServices = [...rawServices].sort((a, b) => {
        const catIdxA = categoryIds.indexOf(a.categoryId);
        const catIdxB = categoryIds.indexOf(b.categoryId);
        if (catIdxA !== catIdxB) {
          return (catIdxA === -1 ? 99 : catIdxA) - (catIdxB === -1 ? 99 : catIdxB);
        }
        return a.rate - b.rate;
      });

      const categoryCounts = new Map<string, number>();
      const selectedServices: typeof rawServices = [];

      for (const srv of sortedServices) {
        const count = categoryCounts.get(srv.categoryId) || 0;
        if (count < 1 && selectedServices.length < limit) {
          categoryCounts.set(srv.categoryId, count + 1);
          selectedServices.push(srv);
        }
      }

      const categoryLinks = sortedCategories.slice(0, 4).map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        networkSlug: network.slug,
        networkName: network.name,
        activityType: this.inferActivityType(cat.name, undefined, cat.activityType),
      }));

      const serviceLinks = selectedServices.map((srv) => {
        const actType = this.inferActivityType(srv.name, srv.category.name, srv.category.activityType);
        const pricePerUnitRub = this.calculateUnitRateRub(srv, usdToRub);
        const feat = (srv.features && typeof srv.features === 'object' ? srv.features : {}) as Record<
          string,
          unknown
        >;

        return {
          id: srv.id,
          numericId: srv.numericId,
          name: srv.name,
          slug: srv.slug,
          networkSlug: network.slug,
          networkName: network.name,
          categorySlug: srv.category.slug,
          categoryName: srv.category.name,
          activityType: actType,
          pricePerUnitRub,
          minQty: srv.minQty,
          maxQty: srv.maxQty,
          speedClass: srv.etaSpeedClass,
          hasRefill: Boolean(srv.isRefillEnabled || feat.hasRefill),
        };
      });

      return this.buildBundle({
        targetActivityType: 'OTHER',
        headline: `Комплексное продвижение в ${network.name}`,
        subheadline: `Сочетайте прирост аудитории с реакциями и просмотрами для естественного органического охвата в ${network.name}`,
        tenantId,
        networkSlug: network.slug,
        networkName: network.name,
        categories: categoryLinks,
        services: serviceLinks,
      });
    } catch (error) {
      console.error('[SiloLinkingService.getComplementaryForNetwork] Error:', error);
      return null;
    }
  }

  /**
   * Resolves popular Silo bundles across top networks for the main catalog page (/services).
   */
  public static async getPopularSiloBundle(params: {
    tenantId?: string;
    limit?: number;
  }): Promise<SiloRecommendationBundle | null> {
    const tenantId = normalizeTenantId(params.tenantId);
    const limit = params.limit ?? 4;

    try {
      const topNetworks = await db.network.findMany({
        where: { isActive: true },
        include: {
          categories: {
            where: {
              tenantId: tenantVisibilityFilter(tenantId),
              services: {
                some: {
                  isActive: true,
                  isQuarantined: false,
                  tenantId: tenantVisibilityFilter(tenantId),
                  OR: [{ cooldownUntil: null }, { cooldownUntil: { lt: new Date() } }],
                },
              },
            },
            take: 2,
          },
        },
        orderBy: { sort: 'asc' },
        take: 3,
      });

      if (topNetworks.length === 0) return null;

      const primaryNetwork = topNetworks.find((n) => n.slug === 'telegram') || topNetworks[0];
      const allCategories = topNetworks.flatMap((n) =>
        n.categories.map((c) => ({ ...c, networkSlug: n.slug, networkName: n.name }))
      );

      const categoryIds = allCategories.map((c) => c.id);
      const usdToRub = await SettingsProvider.getExchangeRateUSD();

      const rawServices = await db.service.findMany({
        where: {
          categoryId: { in: categoryIds },
          isActive: true,
          isQuarantined: false,
          tenantId: tenantVisibilityFilter(tenantId),
          OR: [{ cooldownUntil: null }, { cooldownUntil: { lt: new Date() } }],
        },
        include: {
          category: {
            include: { network: true },
          },
        },
        orderBy: { rate: 'asc' },
        take: limit * 3,
      });

      const categoryCounts = new Map<string, number>();
      const selectedServices: typeof rawServices = [];

      for (const srv of rawServices) {
        const count = categoryCounts.get(srv.categoryId) || 0;
        if (count < 1 && selectedServices.length < limit) {
          categoryCounts.set(srv.categoryId, count + 1);
          selectedServices.push(srv);
        }
      }

      const categoryLinks = allCategories.slice(0, 4).map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        networkSlug: cat.networkSlug,
        networkName: cat.networkName,
        activityType: this.inferActivityType(cat.name, undefined, cat.activityType),
      }));

      const serviceLinks = selectedServices.map((srv) => {
        const actType = this.inferActivityType(srv.name, srv.category.name, srv.category.activityType);
        const pricePerUnitRub = this.calculateUnitRateRub(srv, usdToRub);
        const feat = (srv.features && typeof srv.features === 'object' ? srv.features : {}) as Record<
          string,
          unknown
        >;

        return {
          id: srv.id,
          numericId: srv.numericId,
          name: srv.name,
          slug: srv.slug,
          networkSlug: srv.category.network?.slug || primaryNetwork.slug,
          networkName: srv.category.network?.name || primaryNetwork.name,
          categorySlug: srv.category.slug,
          categoryName: srv.category.name,
          activityType: actType,
          pricePerUnitRub,
          minQty: srv.minQty,
          maxQty: srv.maxQty,
          speedClass: srv.etaSpeedClass,
          hasRefill: Boolean(srv.isRefillEnabled || feat.hasRefill),
        };
      });

      return this.buildBundle({
        targetActivityType: 'OTHER',
        headline: 'Комплексные связки услуг для социальных сетей',
        subheadline:
          'Используйте сбалансированное продвижение для выхода в рекомендации алгоритмов умной ленты',
        tenantId,
        networkSlug: primaryNetwork.slug,
        networkName: primaryNetwork.name,
        categories: categoryLinks,
        services: serviceLinks,
      });
    } catch (error) {
      console.error('[SiloLinkingService.getPopularSiloBundle] Error:', error);
      return null;
    }
  }
}
