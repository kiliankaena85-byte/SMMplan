import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/yandex-feed.xml/route';
import { invalidateYandexFeedCache } from '@/services/seo/yandex-feed-cache.service';
import { getPublicCatalogAction, getServicesByCategoryAction } from '@/actions/order/catalog';
import { redis } from '@/lib/redis';
import { headers } from 'next/headers';

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

vi.mock('@/actions/order/catalog', () => ({
  getPublicCatalogAction: vi.fn(),
  getServicesByCategoryAction: vi.fn(),
}));

vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

describe('Yandex YML Feed Redis Caching & Invalidation (SPEC-2026-09-21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const mockHeaders = new Map<string, string>();
    mockHeaders.set('host', 'smmplan.pro');
    (headers as any).mockResolvedValue(mockHeaders);

    (getPublicCatalogAction as any).mockResolvedValue({
      success: true,
      data: [
        {
          name: 'Telegram',
          slug: 'telegram',
          categories: [
            { id: 'cat-1', name: 'Подписчики', slug: 'subscribers' },
          ],
        },
      ],
    });

    (getServicesByCategoryAction as any).mockResolvedValue([
      { id: 's1', numericId: 101, name: 'Подписчики RU', slug: 'subs-ru', pricePerUnitRub: 0.15, minQty: 10, maxQty: 1000 },
      { id: 's2', numericId: 102, name: 'Подписчики Живые', slug: 'subs-live', pricePerUnitRub: 0.25, minQty: 10, maxQty: 1000 },
      { id: 's3', numericId: 103, name: 'Подписчики Премиум', slug: 'subs-prem', pricePerUnitRub: 0.35, minQty: 10, maxQty: 1000 },
    ]);
  });

  it('1. Cache MISS: queries database catalog, sets Redis key with 3600s TTL, and returns X-Cache: MISS', async () => {
    (redis.get as any).mockResolvedValue(null);
    (redis.set as any).mockResolvedValue('OK');

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/xml');
    expect(response.headers.get('X-Cache')).toBe('MISS');

    const text = await response.text();
    expect(text).toContain('<yml_catalog');
    expect(text).toContain('Подписчики RU');

    expect(getPublicCatalogAction).toHaveBeenCalledWith('smmplan');
    expect(redis.set).toHaveBeenCalledWith(
      'seo:yandex-feed:smmplan',
      expect.stringContaining('<yml_catalog'),
      'EX',
      3600
    );
  });

  it('2. Cache HIT: returns cached XML directly from Redis in <5ms without querying catalog DB', async () => {
    const cachedXml = '<?xml version="1.0" encoding="UTF-8"?><yml_catalog date="cached"><shop><name>Cached Shop</name></shop></yml_catalog>';
    (redis.get as any).mockResolvedValue(cachedXml);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/xml');
    expect(response.headers.get('X-Cache')).toBe('HIT');

    const text = await response.text();
    expect(text).toBe(cachedXml);

    // Catalog queries MUST NOT be called on cache hit!
    expect(getPublicCatalogAction).not.toHaveBeenCalled();
    expect(getServicesByCategoryAction).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('3. Fail-Open Resilience: if Redis throws an error, gracefully falls back to generating XML from DB', async () => {
    (redis.get as any).mockRejectedValue(new Error('Redis connection timeout (ETIMEDOUT)'));

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/xml');
    expect(response.headers.get('X-Cache')).toBe('MISS');

    const text = await response.text();
    expect(text).toContain('<yml_catalog');
    expect(getPublicCatalogAction).toHaveBeenCalledWith('smmplan');
  });

  it('4. Invalidation: invalidateYandexFeedCache clears specific tenant key or both tenant keys', async () => {
    (redis.del as any).mockResolvedValue(1);

    // Single tenant invalidation
    await invalidateYandexFeedCache('smmplan');
    expect(redis.del).toHaveBeenCalledWith('seo:yandex-feed:smmplan');

    vi.clearAllMocks();

    // Global invalidation
    await invalidateYandexFeedCache();
    expect(redis.del).toHaveBeenCalledWith('seo:yandex-feed:smmplan', 'seo:yandex-feed:flux');
  });
});
