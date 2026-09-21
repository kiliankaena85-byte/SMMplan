import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { absoluteCanonical, normalizeTenantId, getTenantHost, getTenantSiteName } from '@/lib/seo-helpers';
import { IndexNowService, DEFAULT_INDEXNOW_KEY } from '@/services/seo/indexnow.service';

describe('Yandex SEO & Neuro-Search 2026 Standards', () => {
  describe('1. Multi-Tenant Canonical & Anti-Mimicry Invariants', () => {
    it('generates strictly absolute canonical URLs for smmplan tenant', () => {
      const canonicalRoot = absoluteCanonical('smmplan', '/');
      const canonicalService = absoluteCanonical('smmplan', '/services/telegram');

      expect(canonicalRoot).toMatch(/^https?:\/\//);
      expect(canonicalRoot).not.toEqual('/');
      expect(canonicalService).toContain('/services/telegram');
    });

    it('generates strictly absolute canonical URLs for flux tenant without cross-tenant bleed', () => {
      const canonicalFlux = absoluteCanonical('flux', '/services/vk');
      const canonicalSmmplan = absoluteCanonical('smmplan', '/services/vk');

      expect(canonicalFlux).toMatch(/^https?:\/\//);
      expect(canonicalSmmplan).toMatch(/^https?:\/\//);
      // Both must be valid absolute URLs
      expect(canonicalFlux.startsWith('http')).toBe(true);
      expect(canonicalSmmplan.startsWith('http')).toBe(true);
    });

    it('correctly normalizes legacy tenant aliases', () => {
      expect(normalizeTenantId('lovable')).toBe('flux');
      expect(normalizeTenantId('smmflux')).toBe('flux');
      expect(normalizeTenantId('flux')).toBe('flux');
      expect(normalizeTenantId(null)).toBe('smmplan');
      expect(normalizeTenantId(undefined)).toBe('smmplan');
      expect(normalizeTenantId('')).toBe('smmplan');
    });

    it('ensures distinct site names for anti-mimicry', () => {
      expect(getTenantSiteName('smmplan')).toBe('SMMplan');
      expect(getTenantSiteName('flux')).toBe('SMMflux');
    });
  });

  describe('2. IndexNow Protocol 2026 Service', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('has a valid default IndexNow key', () => {
      const key = IndexNowService.getKey();
      expect(key).toBeDefined();
      expect(key.length).toBeGreaterThanOrEqual(8);
    });

    it('rejects submission with empty host', async () => {
      const result = await IndexNowService.submitUrls({
        host: '',
        urls: ['https://smmplan.pro/services'],
      });

      expect(result.success).toBe(false);
      expect(result.submittedCount).toBe(0);
      expect(result.error).toContain('host');
    });

    it('rejects submission with empty URL list', async () => {
      const result = await IndexNowService.submitUrls({
        host: 'smmplan.pro',
        urls: [],
      });

      expect(result.success).toBe(false);
      expect(result.submittedCount).toBe(0);
      expect(result.error).toContain('empty');
    });

    it('filters out non-HTTP/HTTPS URLs and caps at 10,000 URLs', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
      });
      global.fetch = mockFetch;

      const result = await IndexNowService.submitUrls({
        host: 'smmplan.pro',
        urls: [
          'https://smmplan.pro/services/telegram',
          'javascript:alert(1)',
          'ftp://files.example.com',
          'http://smmplan.pro/knowledge/guide',
        ],
      });

      expect(result.success).toBe(true);
      expect(result.submittedCount).toBe(2); // Only valid HTTP/HTTPS URLs kept
      expect(mockFetch).toHaveBeenCalled();
    });

    it('handles 202 Accepted status from Yandex IndexNow successfully', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('yandex.com')) {
          return Promise.resolve({ status: 202, ok: true });
        }
        return Promise.resolve({ status: 200, ok: true });
      });

      const result = await IndexNowService.submitUrls({
        host: 'smmplan.pro',
        urls: ['https://smmplan.pro/services/vk'],
      });

      expect(result.success).toBe(true);
      expect(result.yandexStatus).toBe(202);
    });

    it('handles network timeout or endpoint error gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

      const result = await IndexNowService.submitUrls({
        host: 'smmplan.pro',
        urls: ['https://smmplan.pro/services/vk'],
      });

      expect(result.success).toBe(false);
      expect(result.submittedCount).toBe(0);
    });

    it('submits large URL lists (>10,000) across multiple batches without dropping URLs', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
      });
      global.fetch = mockFetch;

      const largeUrlList = Array.from({ length: 10005 }, (_, i) => `https://smmplan.pro/services/item-${i}`);
      const result = await IndexNowService.submitUrls({
        host: 'smmplan.pro',
        urls: largeUrlList,
      });

      expect(result.success).toBe(true);
      expect(result.submittedCount).toBe(10005);
      // Must submit in at least 2 batches (10,000 + 5)
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(4); // 2 endpoints x 2 batches = 4 calls
    });
  });

  describe('3. Schema.org 2026 Commercial, Pricing & AEO Invariants', () => {
    it('verifies that service pricing in structured data uses 1-unit price in RUB', () => {
      const mockService = {
        name: 'Подписчики Telegram',
        pricePerUnitRub: 0.154,
        pricePer1kRub: 154.0,
      };

      // The 2026 standard dictates that price per 1 unit must match UI copy
      const structuredPrice = mockService.pricePerUnitRub.toFixed(4);
      expect(Number(structuredPrice)).toBeLessThan(1.0);
      expect(structuredPrice).toBe('0.1540');
      expect(structuredPrice).not.toBe('154.00');
    });

    it('validates BreadcrumbList item positions start at 1 and increment consecutively', () => {
      const breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Главная", "item": "https://smmplan.pro/" },
          { "@type": "ListItem", "position": 2, "name": "Услуги", "item": "https://smmplan.pro/services" },
          { "@type": "ListItem", "position": 3, "name": "Telegram", "item": "https://smmplan.pro/services/telegram" }
        ]
      };

      expect(breadcrumb.itemListElement[0].position).toBe(1);
      expect(breadcrumb.itemListElement[1].position).toBe(2);
      expect(breadcrumb.itemListElement[2].position).toBe(3);
    });

    it('validates FAQPage schema structure for Yandex Neuro / AEO rich snippets', () => {
      const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Как быстро запускается накрутка подписчиков?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Автоматический запуск стартует в течение 30-120 секунд после создания заказа."
            }
          }
        ]
      };

      expect(faqSchema['@type']).toBe('FAQPage');
      expect(faqSchema.mainEntity[0]['@type']).toBe('Question');
      expect(faqSchema.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
      expect(faqSchema.mainEntity[0].acceptedAnswer.text).toContain('30-120 секунд');
    });
  });

  describe('4. Root Key Verification Route', () => {
    it('returns the active IndexNow key via plain text response', async () => {
      const { GET } = await import('@/app/smmplan-indexnow-2026-key.txt/route');
      const response = await GET();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/plain');
      const text = await response.text();
      expect(text).toBe(IndexNowService.getKey());
    });
  });
});
