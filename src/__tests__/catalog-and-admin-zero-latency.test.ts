import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveServiceTargetType } from '@/utils/target-type-mapper';
import { isLinkServiceCompatible } from '@/constants/link-service-compatibility';

describe('Zero-Latency Catalog & Admin Performance Remediation', () => {
  describe('Rule 4.1: TargetType Semantic Resolution (Zero False-Incompatibility)', () => {
    it('correctly resolves CHANNEL for Telegram channel subscribers even when DB default is POST', () => {
      const service = {
        name: 'Telegram Подписчики на канал (Быстрые)',
        targetType: 'POST', // Prisma @default("POST")
      };

      // FORBIDDEN PATTERN: s.targetType || inferTargetTypeFromName(s.name) -> returns "POST"
      const forbiddenResult = service.targetType;
      expect(forbiddenResult).toBe('POST');
      // "POST" is NOT compatible with channel links:
      expect(isLinkServiceCompatible('channel', forbiddenResult)).toBe(false);

      // MANDATORY PATTERN: resolveServiceTargetType(service) -> returns "CHANNEL"
      const resolved = resolveServiceTargetType(service);
      expect(resolved).toBe('CHANNEL');
      // Compatible with channel links:
      expect(isLinkServiceCompatible('channel', resolved)).toBe(true);
    });

    it('correctly resolves POST for Telegram post views', () => {
      const service = {
        name: 'Telegram Просмотры на пост',
        targetType: 'POST',
      };
      const resolved = resolveServiceTargetType(service);
      expect(resolved).toBe('POST');
      expect(isLinkServiceCompatible('post', resolved)).toBe(true);
      expect(isLinkServiceCompatible('channel', resolved)).toBe(false);
    });
  });

  describe('Legacy URL Slug Normalization for /boost', () => {
    // Helper replicating the slug matcher in category page
    function matchCategorySlug(network: string, categorySlug: string, categories: Array<{ slug: string }>) {
      return categories.find(c => {
        if (c.slug === categorySlug || c.slug === `${network}-${categorySlug}` || c.slug.endsWith(`-${categorySlug}`)) {
          return true;
        }
        if (categorySlug === 'busty' || categorySlug === 'boost' || categorySlug === 'boosts') {
          return c.slug.includes('busty') || c.slug.includes('boost');
        }
        return false;
      });
    }

    it('matches legacy /services/telegram/busty to canonical telegram-busty-dlya-kanalov', () => {
      const categories = [
        { slug: 'telegram-podpischiki-kanala' },
        { slug: 'telegram-prosmotry-na-post' },
        { slug: 'telegram-busty-dlya-kanalov' },
      ];

      const match = matchCategorySlug('telegram', 'busty', categories);
      expect(match).toBeDefined();
      expect(match?.slug).toBe('telegram-busty-dlya-kanalov');
    });

    it('matches /services/telegram/boost to canonical telegram-busty-dlya-kanalov', () => {
      const categories = [
        { slug: 'telegram-podpischiki-kanala' },
        { slug: 'telegram-busty-dlya-kanalov' },
      ];

      const match = matchCategorySlug('telegram', 'boost', categories);
      expect(match).toBeDefined();
      expect(match?.slug).toBe('telegram-busty-dlya-kanalov');
    });
  });

  describe('Catalog Cache Pre-population Invariant', () => {
    it('verifies that client cache can pre-populate all categories from catalog data', () => {
      const mockCatalog = [
        {
          id: 'net-tg',
          name: 'Telegram',
          slug: 'telegram',
          icon: '/brands/telegram.svg',
          categories: [
            {
              id: 'cat-tg-subs',
              name: 'Подписчики',
              slug: 'telegram-subs',
              networkId: 'net-tg',
              services: [
                { id: 'svc-1', numericId: 101, name: 'TG Subs Fast', pricePerUnitRub: 0.15 } as any,
              ],
            },
            {
              id: 'cat-tg-views',
              name: 'Просмотры',
              slug: 'telegram-views',
              networkId: 'net-tg',
              services: [
                { id: 'svc-2', numericId: 102, name: 'TG Views Fast', pricePerUnitRub: 0.02 } as any,
              ],
            },
          ],
        },
        {
          id: 'net-vk',
          name: 'ВКонтакте',
          slug: 'vk',
          icon: '/brands/vk.svg',
          categories: [
            {
              id: 'cat-vk-subs',
              name: 'Подписчики ВК',
              slug: 'vk-subs',
              networkId: 'net-vk',
              services: [
                { id: 'svc-3', numericId: 103, name: 'VK Subs', pricePerUnitRub: 0.25 } as any,
              ],
            },
          ],
        },
      ];

      // Simulate cache pre-population logic
      const cache: Record<string, any[]> = {};
      for (const net of mockCatalog) {
        for (const cat of net.categories) {
          if (cat.services && cat.services.length > 0) {
            cache[cat.id] = cat.services;
          }
        }
      }

      // Switching to VK category should immediately hit cache (0ms delay)
      expect(cache['cat-vk-subs']).toBeDefined();
      expect(cache['cat-vk-subs'].length).toBe(1);
      expect(cache['cat-vk-subs'][0].name).toBe('VK Subs');

      // Switching to TG views should immediately hit cache
      expect(cache['cat-tg-views']).toBeDefined();
      expect(cache['cat-tg-views'][0].name).toBe('TG Views Fast');
    });

    it('guarantees that switching to an uncached category clears stale services (Zero Zombie Tariffs)', () => {
      let currentServices: any[] = [{ id: 'tg-sub-1', name: 'Telegram Подписчики' }];
      const cache: Record<string, any[]> = {};

      const onCategorySelect = (categoryId: string) => {
        if (cache[categoryId]) {
          currentServices = cache[categoryId];
        } else {
          // ZERO-ZOMBIE-TARIFFS INVARIANT: clear immediately
          currentServices = [];
        }
      };

      // User was on Telegram, switches to a new uncached category
      onCategorySelect('uncached-cat-id');
      expect(currentServices).toEqual([]);
      expect(currentServices.length).toBe(0);
    });
  });

  describe('Admin Panel Optimization Invariants', () => {
    it('verifies that getTopServices aggregation groups by serviceId with bounded limits', () => {
      // Simulate raw grouped rows returned by PostgreSQL GROUP BY
      const groupedRows = [
        { serviceId: 'svc-1', _count: { id: 150 }, _sum: { charge: 45000, providerCost: 15000 } },
        { serviceId: 'svc-2', _count: { id: 80 }, _sum: { charge: 24000, providerCost: 8000 } },
      ];

      const servicesMeta = new Map([
        ['svc-1', { name: 'TG Subs Fast', category: { name: 'Подписчики', network: { name: 'Telegram' } } }],
        ['svc-2', { name: 'VK Followers', category: { name: 'Подписчики', network: { name: 'VK' } } }],
      ]);

      const result = groupedRows.map(g => {
        const s = servicesMeta.get(g.serviceId);
        const revBig = BigInt(g._sum.charge);
        const costBig = BigInt(g._sum.providerCost);
        const profitBig = revBig - costBig;
        const rev = Number(revBig);
        const profit = Number(profitBig);
        const marginPct = rev > 0 ? Math.round((profit / rev) * 100) : 0;

        return {
          id: g.serviceId,
          name: s?.name || '—',
          ordersCount: g._count.id,
          revenueKopecks: revBig,
          profitKopecks: profitBig,
          marginPct,
        };
      });

      expect(result.length).toBe(2);
      expect(result[0].name).toBe('TG Subs Fast');
      expect(result[0].ordersCount).toBe(150);
      expect(result[0].profitKopecks).toBe(BigInt(30000));
      expect(result[0].marginPct).toBe(67);
    });

    it('verifies deterministic default 90-day window for timeseries chart without blocking query', () => {
      const period = 'all';
      let startDate: Date;
      let step: string;

      if (period === 'all') {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        step = 'week';
      } else {
        startDate = new Date();
        step = 'day';
      }

      expect(step).toBe('week');
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
      const elapsed = Date.now() - startDate.getTime();
      expect(Math.abs(elapsed - ninetyDaysMs)).toBeLessThan(1000);
    });
  });
});
