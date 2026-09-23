import React from 'react';
import { describe, it, expect } from 'vitest';
import {
  SiloLinkingService,
} from '@/services/seo/silo-linking.service';
import type { SiloActivityType } from '@/types/silo';

describe('Silo Internal Linking Architecture (Yandex 2026 YATI & Proxima)', () => {
  describe('1. Semantic Activity Type Inference (inferActivityType)', () => {
    it('infers FOLLOWERS from various Russian and English phrases', () => {
      expect(SiloLinkingService.inferActivityType('Живые подписчики для канала', 'Подписчики')).toBe('FOLLOWERS');
      expect(SiloLinkingService.inferActivityType('Real Telegram Subscribers', 'Subscribers')).toBe('FOLLOWERS');
      expect(SiloLinkingService.inferActivityType('Качественные участники в группу')).toBe('FOLLOWERS');
      expect(SiloLinkingService.inferActivityType('Новые фолловеры')).toBe('FOLLOWERS');
      expect(SiloLinkingService.inferActivityType('Инвайты в закрытый чат')).toBe('FOLLOWERS');
    });

    it('prioritizes categoryName over secondary features in service titles', () => {
      // Secondary perks like "+ бонус просмотры" or "автопросмотры" must not hijack the primary FOLLOWERS intent
      expect(
        SiloLinkingService.inferActivityType('1000 Подписчиков в канал (+ бонус 100 просмотров)', 'Подписчики')
      ).toBe('FOLLOWERS');
      expect(
        SiloLinkingService.inferActivityType('Живые подписчики с автопросмотрами последних постов', 'Подписчики')
      ).toBe('FOLLOWERS');
      expect(
        SiloLinkingService.inferActivityType('Лайки на публикации с бонусом просмотров', 'Лайки')
      ).toBe('LIKES');
    });

    it('prevents false regex collisions on Одноклассники, классический, and бизнес-класс', () => {
      // "Одноклассники" contains "класс", but services inside it must resolve to their real activity, not LIKES
      expect(
        SiloLinkingService.inferActivityType('Репосты записей в группы', 'Одноклассники')
      ).toBe('REPOSTS');
      expect(
        SiloLinkingService.inferActivityType('Классические комментарии для постов', 'Комментарии')
      ).toBe('COMMENTS');
      // Standalone "классы" in OK.ru are indeed LIKES
      expect(SiloLinkingService.inferActivityType('Классы на запись')).toBe('LIKES');
      expect(SiloLinkingService.inferActivityType('Быстрые классы на фото')).toBe('LIKES');
    });

    it('infers LIKES from Russian and English phrases', () => {
      expect(SiloLinkingService.inferActivityType('Быстрые реакции огоньки 🔥', 'Реакции')).toBe('LIKES');
      expect(SiloLinkingService.inferActivityType('Лайки на фото и посты', 'Лайки')).toBe('LIKES');
      expect(SiloLinkingService.inferActivityType('Instagram Heart Likes')).toBe('LIKES');
      expect(SiloLinkingService.inferActivityType('Классы на запись')).toBe('LIKES');
    });

    it('infers VIEWS from Russian and English phrases, including live stream viewers', () => {
      expect(SiloLinkingService.inferActivityType('Автопросмотры на 20 постов', 'Просмотры')).toBe('VIEWS');
      expect(SiloLinkingService.inferActivityType('Telegram Post Views', 'Views')).toBe('VIEWS');
      expect(SiloLinkingService.inferActivityType('Охват и показы историй')).toBe('VIEWS');
      expect(SiloLinkingService.inferActivityType('Глазики на публикации')).toBe('VIEWS');
      expect(SiloLinkingService.inferActivityType('Зрители на прямой эфир Twitch')).toBe('VIEWS');
      expect(SiloLinkingService.inferActivityType('Прослушивания плейлиста VK')).toBe('VIEWS');
    });

    it('infers COMMENTS from Russian and English phrases', () => {
      expect(SiloLinkingService.inferActivityType('Позитивные комментарии со своим текстом', 'Комментарии')).toBe('COMMENTS');
      expect(SiloLinkingService.inferActivityType('Custom English Comments')).toBe('COMMENTS');
      expect(SiloLinkingService.inferActivityType('Отзывы на профиль')).toBe('COMMENTS');
    });

    it('infers REPOSTS from Russian and English phrases and bookmarks', () => {
      expect(SiloLinkingService.inferActivityType('Репосты в открытые группы', 'Репосты')).toBe('REPOSTS');
      expect(SiloLinkingService.inferActivityType('Post shares and forwards')).toBe('REPOSTS');
      expect(SiloLinkingService.inferActivityType('Пересылки сообщений в ЛС')).toBe('REPOSTS');
      expect(SiloLinkingService.inferActivityType('Сохранения в закладки Instagram')).toBe('REPOSTS');
    });

    it('infers BOOSTS from phrases', () => {
      expect(SiloLinkingService.inferActivityType('Бусты для открытия историй', 'Бусты')).toBe('BOOSTS');
      expect(SiloLinkingService.inferActivityType('Telegram Channel Boosts')).toBe('BOOSTS');
      expect(SiloLinkingService.inferActivityType('Голоса для публикации историй в канал')).toBe('BOOSTS');
    });

    it('infers VOTES from phrases', () => {
      expect(SiloLinkingService.inferActivityType('Голосование в опрос Telegram', 'Опросы')).toBe('VOTES');
      expect(SiloLinkingService.inferActivityType('Poll votes with custom answer')).toBe('VOTES');
    });

    it('preserves existing valid database activityType if provided', () => {
      expect(SiloLinkingService.inferActivityType('Непонятная услуга XYZ', 'Категория', 'FOLLOWERS')).toBe('FOLLOWERS');
      expect(SiloLinkingService.inferActivityType('Любой текст', undefined, 'LIKES')).toBe('LIKES');
    });

    it('falls back to OTHER when no keywords match', () => {
      expect(SiloLinkingService.inferActivityType('Неизвестная услуга 12345', 'Без категории')).toBe('OTHER');
      expect(SiloLinkingService.inferActivityType('', '')).toBe('OTHER');
    });
  });

  describe('2. Complementary Activity Types Pairing (getComplementaryActivityTypes)', () => {
    it('returns complementary services for FOLLOWERS (Views, Likes, Boosts, Comments)', () => {
      const complementary = SiloLinkingService.getComplementaryActivityTypes('FOLLOWERS');
      expect(complementary).toContain('VIEWS');
      expect(complementary).toContain('LIKES');
      expect(complementary).not.toContain('FOLLOWERS');
    });

    it('returns complementary services for VIEWS (Likes, Reposts, Comments, Followers)', () => {
      const complementary = SiloLinkingService.getComplementaryActivityTypes('VIEWS');
      expect(complementary).toContain('LIKES');
      expect(complementary).toContain('REPOSTS');
      expect(complementary).not.toContain('VIEWS');
    });

    it('returns complementary services for LIKES (Views, Comments, Reposts, Followers)', () => {
      const complementary = SiloLinkingService.getComplementaryActivityTypes('LIKES');
      expect(complementary).toContain('VIEWS');
      expect(complementary).not.toContain('LIKES');
    });

    it('always returns a non-empty array of complementary types for all types', () => {
      const allTypes: SiloActivityType[] = [
        'FOLLOWERS', 'LIKES', 'VIEWS', 'REPOSTS', 'COMMENTS', 'VOTES', 'BOOSTS', 'OTHER'
      ];
      for (const t of allTypes) {
        const comp = SiloLinkingService.getComplementaryActivityTypes(t);
        expect(comp.length).toBeGreaterThan(0);
        expect(comp).not.toContain(t);
      }
    });
  });

  describe('3. Rationale & Topical Cluster Headlines (getActivityTypeRationale)', () => {
    it('generates topical context for FOLLOWERS', () => {
      const rationale = SiloLinkingService.getActivityTypeRationale('FOLLOWERS');
      expect(rationale.headline).toContain('подписчиками');
      expect(rationale.subheadline.toLowerCase()).toContain('реакци');
    });

    it('generates topical context for VIEWS', () => {
      const rationale = SiloLinkingService.getActivityTypeRationale('VIEWS');
      expect(rationale.headline).toContain('просмотрами');
      expect(rationale.subheadline.toLowerCase()).toContain('лайк');
    });

    it('generates topical context for LIKES', () => {
      const rationale = SiloLinkingService.getActivityTypeRationale('LIKES');
      expect(rationale.headline).toContain('реакциями');
      expect(rationale.subheadline.toLowerCase()).toContain('просмотр');
    });
  });

  describe('4. Multi-Tenant Canonical Links & Anti-Mimicry Invariant', () => {
    it('generates strictly SMMplan canonical links and branding for smmplan tenant', () => {
      const bundle = SiloLinkingService.buildBundle({
        targetActivityType: 'FOLLOWERS',
        tenantId: 'smmplan',
        networkSlug: 'telegram',
        networkName: 'Telegram',
        categories: [
          {
            id: 'cat-views',
            name: 'Просмотры Telegram',
            slug: 'telegram-views',
            networkSlug: 'telegram',
            networkName: 'Telegram',
            activityType: 'VIEWS',
            minPricePerUnitRub: 0.005,
            servicesCount: 12,
          }
        ],
        services: [
          {
            id: 'srv-views-1',
            numericId: 101,
            name: 'Быстрые автопросмотры',
            slug: 'fast-autoviews',
            networkSlug: 'telegram',
            networkName: 'Telegram',
            categorySlug: 'telegram-views',
            categoryName: 'Просмотры Telegram',
            activityType: 'VIEWS',
            pricePerUnitRub: 0.005,
            minQty: 100,
            maxQty: 50000,
            speedClass: 'Быстрая',
            hasRefill: true,
          }
        ]
      });

      expect(bundle.siteName).toBe('SMMplan');
      expect(bundle.tenantId).toBe('smmplan');
      expect(bundle.complementaryCategories[0].canonicalUrl).toContain('smmplan.pro');
      expect(bundle.complementaryCategories[0].canonicalUrl).not.toContain('smmflux');
      expect(bundle.complementaryServices[0].canonicalUrl).toContain('smmplan.pro');
      expect(bundle.complementaryServices[0].canonicalUrl).not.toContain('smmflux');
    });

    it('generates strictly SMMflux canonical links and branding for flux tenant (Anti-Mimicry)', () => {
      const bundle = SiloLinkingService.buildBundle({
        targetActivityType: 'FOLLOWERS',
        tenantId: 'flux',
        networkSlug: 'telegram',
        networkName: 'Telegram',
        categories: [
          {
            id: 'cat-views',
            name: 'Просмотры Telegram',
            slug: 'telegram-views',
            networkSlug: 'telegram',
            networkName: 'Telegram',
            activityType: 'VIEWS',
            minPricePerUnitRub: 0.005,
            servicesCount: 12,
          }
        ],
        services: [
          {
            id: 'srv-views-1',
            numericId: 101,
            name: 'Быстрые автопросмотры',
            slug: 'fast-autoviews',
            networkSlug: 'telegram',
            networkName: 'Telegram',
            categorySlug: 'telegram-views',
            categoryName: 'Просмотры Telegram',
            activityType: 'VIEWS',
            pricePerUnitRub: 0.005,
            minQty: 100,
            maxQty: 50000,
            speedClass: 'Быстрая',
            hasRefill: true,
          }
        ]
      });

      expect(bundle.siteName).toBe('SMMflux');
      expect(bundle.tenantId).toBe('flux');
      expect(bundle.complementaryCategories[0].canonicalUrl).toContain('smmflux.ru');
      expect(bundle.complementaryCategories[0].canonicalUrl).not.toContain('smmplan');
      expect(bundle.complementaryServices[0].canonicalUrl).toContain('smmflux.ru');
      expect(bundle.complementaryServices[0].canonicalUrl).not.toContain('smmplan');
    });
  });

  describe('5. Pricing Discipline & Safety Floor (1-Unit Price Invariant)', () => {
    it('verifies prices in links are strictly positive and per 1 unit', () => {
      const bundle = SiloLinkingService.buildBundle({
        targetActivityType: 'FOLLOWERS',
        tenantId: 'smmplan',
        networkSlug: 'telegram',
        networkName: 'Telegram',
        categories: [],
        services: [
          {
            id: 'srv-1',
            numericId: 501,
            name: 'Реакции Telegram',
            slug: 'telegram-reactions',
            networkSlug: 'telegram',
            networkName: 'Telegram',
            categorySlug: 'reactions',
            categoryName: 'Реакции',
            activityType: 'LIKES',
            pricePerUnitRub: 0.0125,
            minQty: 10,
            maxQty: 10000,
          }
        ]
      });

      expect(bundle.complementaryServices[0].pricePerUnitRub).toBe(0.0125);
      expect(bundle.complementaryServices[0].pricePerUnitRub).toBeGreaterThan(0);
      expect(bundle.complementaryServices[0].pricePerUnitRub).toBeLessThan(100);
    });

    it('enforces safety floor >= 0.0001 RUB in calculateUnitRateRub', () => {
      const floorRate = SiloLinkingService.calculateUnitRateRub(
        { rate: 0.000001, providerCurrency: 'RUB', markup: 1.0 },
        90
      );
      expect(floorRate).toBeGreaterThanOrEqual(0.0001);
    });
  });

  describe('6. Empty and Missing Input Guards', () => {
    it('returns null immediately when serviceId and serviceSlug are missing', async () => {
      const result = await SiloLinkingService.getComplementaryServicesForService({
        tenantId: 'smmplan',
      });
      expect(result).toBeNull();
    });

    it('returns null immediately when categoryId and categorySlug are missing', async () => {
      const result = await SiloLinkingService.getComplementaryCategoriesForCategory({
        tenantId: 'smmplan',
      });
      expect(result).toBeNull();
    });
  });

  describe('7. UI Component Rendering, Accessibility & Anti-Mimicry (SiloCrossLinking)', () => {
    it('returns null when bundle is null or has no services/categories', async () => {
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { SiloCrossLinking } = await import('@/components/seo/SiloCrossLinking');

      const htmlNull = renderToStaticMarkup(React.createElement(SiloCrossLinking, { bundle: null }));
      expect(htmlNull).toBe('');

      const emptyBundle = SiloLinkingService.buildBundle({
        targetActivityType: 'FOLLOWERS',
        tenantId: 'smmplan',
        networkSlug: 'telegram',
        networkName: 'Telegram',
        categories: [],
        services: [],
      });
      const htmlEmpty = renderToStaticMarkup(React.createElement(SiloCrossLinking, { bundle: emptyBundle }));
      expect(htmlEmpty).toBe('');
    });

    it('renders full Silo recommendations with 1-unit price and accessible attributes for SMMplan', async () => {
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { SiloCrossLinking } = await import('@/components/seo/SiloCrossLinking');

      const bundle = SiloLinkingService.buildBundle({
        targetActivityType: 'FOLLOWERS',
        tenantId: 'smmplan',
        networkSlug: 'telegram',
        networkName: 'Telegram',
        categories: [
          {
            id: 'cat-1',
            name: 'Реакции Telegram',
            slug: 'reactions',
            networkSlug: 'telegram',
            networkName: 'Telegram',
            activityType: 'LIKES',
          }
        ],
        services: [
          {
            id: 'srv-1',
            numericId: 1042,
            name: 'Быстрые реакции огоньки',
            slug: 'fast-fire-reactions',
            networkSlug: 'telegram',
            networkName: 'Telegram',
            categorySlug: 'reactions',
            categoryName: 'Реакции Telegram',
            activityType: 'LIKES',
            pricePerUnitRub: 0.015,
            minQty: 10,
            maxQty: 5000,
            speedClass: 'Мгновенно',
            hasRefill: true,
          }
        ]
      });

      const html = renderToStaticMarkup(React.createElement(SiloCrossLinking, { bundle, tenantId: 'smmplan' }));

      // Heading and topical rationale
      expect(html).toContain('С подписчиками часто заказывают');
      expect(html).toContain('Комплексное продвижение • Silo 2026');

      // Category quick pill link with WCAG 2.2 AA touch target
      expect(html).toContain('/services/telegram/reactions');
      expect(html).toContain('Реакции Telegram');
      expect(html).toContain('min-h-[44px]');
      expect(html).not.toContain('min-h-[36px]');

      // Service card details
      expect(html).toContain('Быстрые реакции огоньки');
      expect(html).toContain('1042'); // Service ID
      expect(html).toContain('0.0150 ₽'); // Price formatted in rubles
      expect(html).toContain('/ шт'); // 1-unit price invariant
      expect(html).not.toContain('/ 1000 шт'); // Strictly forbidden in UI

      // Badges
      expect(html).toContain('Гарантия');
      expect(html).toContain('Мгновенно');

      // Accessibility, Schema.org microdata & link
      expect(html).toContain('aria-label="Сопутствующие услуги и рекомендации"');
      expect(html).toContain('itemScope=""');
      expect(html).toContain('itemType="https://schema.org/ItemList"');
      expect(html).toContain('itemType="https://schema.org/Product"');
      expect(html).toContain('itemType="https://schema.org/Offer"');
      expect(html).toContain('/services/telegram/reactions/fast-fire-reactions');
      expect(html).toContain('Заказать');
    });

    it('renders distinct theme styling for SMMflux even when tenantId prop is omitted', async () => {
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { SiloCrossLinking } = await import('@/components/seo/SiloCrossLinking');

      const bundle = SiloLinkingService.buildBundle({
        targetActivityType: 'VIEWS',
        tenantId: 'flux',
        networkSlug: 'vk',
        networkName: 'ВКонтакте',
        categories: [
          {
            id: 'cat-vk-likes',
            name: 'Лайки ВКонтакте',
            slug: 'vk-likes',
            networkSlug: 'vk',
            networkName: 'ВКонтакте',
            activityType: 'LIKES',
          }
        ],
        services: [
          {
            id: 'srv-vk-1',
            numericId: 2050,
            name: 'Живые лайки на посты',
            slug: 'real-post-likes',
            networkSlug: 'vk',
            networkName: 'ВКонтакте',
            categorySlug: 'vk-likes',
            categoryName: 'Лайки ВКонтакте',
            activityType: 'LIKES',
            pricePerUnitRub: 0.08,
            minQty: 25,
            maxQty: 10000,
            speedClass: 'Быстрая',
            hasRefill: false,
          }
        ]
      });

      // Pass without explicit tenantId prop; must correctly derive from bundle.tenantId
      const html = renderToStaticMarkup(React.createElement(SiloCrossLinking, { bundle }));

      // Flux-specific purple theme tokens
      expect(html).toContain('text-purple-600');
      expect(html).toContain('bg-purple-600');

      // Content verification
      expect(html).toContain('С просмотрами также заказывают');
      expect(html).toContain('Лайки ВКонтакте');
      expect(html).toContain('Живые лайки на посты');
      expect(html).toContain('0.0800 ₽');
      expect(html).toContain('/ шт');
      expect(html).not.toContain('/ 1000 шт');
    });
  });
});
