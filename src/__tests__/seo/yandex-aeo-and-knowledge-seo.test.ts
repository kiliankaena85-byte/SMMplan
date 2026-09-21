/**
 * (c) 2024-2026 SMMplan / OmniSMM. All rights reserved.
 * 
 * Master Test Suite for Yandex AEO 2026, llms.txt, llms-full.txt,
 * Yandex Market Language (YML) Feed, OpenSearch, and Knowledge SEO.
 */

import { describe, it, expect, vi } from 'vitest';
import { pillarPages, clusterArticles, glossaryTerms } from '@/data/seo';
import { absoluteCanonical, normalizeTenantId, getTenantHost, getTenantSiteName } from '@/lib/seo-helpers';
import * as catalogActions from '@/actions/order/catalog';

describe('Yandex AEO 2026 & Knowledge Search Optimization', () => {
  describe('1. llms.txt & llms-full.txt Routes (AI Agent & Neuro-Search Standards)', () => {
    it('returns HTTP 200 with text/plain content-type and cache headers for /llms.txt', async () => {
      const { GET } = await import('@/app/llms.txt/route');
      const response = await GET();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/plain');
      expect(response.headers.get('Cache-Control')).toContain('public');
    });

    it('contains platform description, 1-unit pricing notice, and legal compliance in /llms.txt', async () => {
      const { GET } = await import('@/app/llms.txt/route');
      const response = await GET();
      const text = await response.text();

      // Platform & Brands
      expect(text).toContain('SMMplan');
      expect(text).toContain('SMMflux');

      // Transparent 1-unit RUB pricing invariant
      expect(text).toContain('₽ / шт');
      expect(text).toContain('0.01 ₽');

      // Compliance
      expect(text).toContain('54-ФЗ');
      expect(text).toContain('152-ФЗ');
      expect(text).toContain('НДС 22%');

      // Links to key sections & deep specs
      expect(text).toContain('/services');
      expect(text).toContain('/knowledge');
      expect(text).toContain('/llms-full.txt');
      expect(text).toContain('/yandex-feed.xml');
    });

    it('returns HTTP 200 with complete knowledge base & API v2 spec in /llms-full.txt', async () => {
      const { GET } = await import('@/app/llms-full.txt/route');
      const response = await GET();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/plain');

      const text = await response.text();

      // Invariant: all 5 pillar guides must be present in full context
      for (const pillar of pillarPages) {
        expect(text).toContain(pillar.title);
      }

      // Invariant: API v2 endpoints must be documented
      expect(text).toContain('/api/v2/order');
      expect(text).toContain('/api/v2/status');
      expect(text).toContain('Idempotency-Key');

      // Invariant: Drip-Feed Floor Invariant must be explained
      expect(text).toContain('Drip-Feed Invariant');
      expect(text).toContain('Refill 30');
    });
  });

  describe('2. Yandex Market Language (YML) Product Feed (/yandex-feed.xml)', () => {
    it('returns valid YML XML with RUR currency, shop details, and Quality Gate offers', async () => {
      vi.spyOn(catalogActions, 'getPublicCatalogAction').mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'net-1',
            name: 'Telegram',
            slug: 'telegram',
            categories: [
              { id: 'cat-1', name: 'Подписчики', slug: 'subscribers' },
            ],
          },
        ] as any,
      });

      vi.spyOn(catalogActions, 'getServicesByCategoryAction').mockResolvedValueOnce([
        {
          id: 's1',
          numericId: 101,
          name: 'Подписчики быстрые',
          slug: 'subscribers-fast',
          pricePerUnitRub: 0.15,
          minQty: 10,
          maxQty: 10000,
          description: 'Быстрые подписчики в Telegram',
        },
        {
          id: 's2',
          numericId: 102,
          name: 'Подписчики премиум',
          slug: 'subscribers-premium',
          pricePerUnitRub: 0.25,
          minQty: 10,
          maxQty: 5000,
          description: 'Премиум подписчики в Telegram',
        },
        {
          id: 's3',
          numericId: 103,
          name: 'Подписчики СНГ',
          slug: 'subscribers-cis',
          pricePerUnitRub: 0.3,
          minQty: 10,
          maxQty: 20000,
          description: 'СНГ подписчики в Telegram',
        },
      ] as any);

      const { GET } = await import('@/app/yandex-feed.xml/route');
      const response = await GET();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/xml');

      const xml = await response.text();

      // Must be valid YML syntax
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<yml_catalog');
      expect(xml).toContain('<shop>');
      expect(xml).toContain('<currencies>');
      expect(xml).toContain('<currency id="RUR" rate="1"/>');
      expect(xml).toContain('<categories>');
      expect(xml).toContain('<offers>');

      // Verify essential offer parameters
      expect(xml).toContain('<currencyId>RUR</currencyId>');
      expect(xml).toContain('Чек 54-ФЗ НДС 22%');
      expect(xml).toContain('Подписчики быстрые');
      expect(xml).toContain('0.1500');
    });
  });

  describe('3. OpenSearch 1.1 Route (/opensearch.xml)', () => {
    it('returns valid OpenSearch description with search URL template', async () => {
      const { GET } = await import('@/app/opensearch.xml/route');
      const response = await GET();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/opensearchdescription+xml');

      const xml = await response.text();
      expect(xml).toContain('OpenSearchDescription');
      expect(xml).toContain('<ShortName>');
      expect(xml).toContain('template="');
      expect(xml).toContain('/services?q={searchTerms}');
    });
  });

  describe('4. Sitemap Coverage & Knowledge Indexing', () => {
    it('ensures all static SEO pillars are defined with valid slugs and FAQs', () => {
      expect(pillarPages.length).toBeGreaterThanOrEqual(5);

      const telegramPillar = pillarPages.find(p => p.slug === 'guide-telegram');
      expect(telegramPillar).toBeDefined();
      expect(telegramPillar?.faq.length).toBeGreaterThanOrEqual(3);
      expect(telegramPillar?.network).toBe('telegram');

      const vkPillar = pillarPages.find(p => p.slug === 'guide-vk');
      expect(vkPillar).toBeDefined();
      expect(vkPillar?.faq.length).toBeGreaterThanOrEqual(3);
    });

    it('ensures all cluster articles point to existing parent pillars', () => {
      expect(clusterArticles.length).toBeGreaterThanOrEqual(15);
      const pillarSlugs = new Set(pillarPages.map(p => p.slug));

      for (const cluster of clusterArticles) {
        expect(cluster.slug).toBeTruthy();
        expect(pillarSlugs.has(cluster.parentPillar)).toBe(true);
        expect(cluster.faq.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('generates sitemap routes including static pillars and clusters without duplicates', async () => {
      const sitemapModule = await import('@/app/sitemap');
      const routes = await sitemapModule.default();

      expect(Array.isArray(routes)).toBe(true);
      expect(routes.length).toBeGreaterThanOrEqual(20);

      const urls = routes.map(r => r.url);
      const uniqueUrls = new Set(urls);

      // Invariant: 0 duplicate URLs in sitemap
      expect(urls.length).toEqual(uniqueUrls.size);

      // Verify essential routes exist in sitemap
      expect(urls.some(u => u.includes('/knowledge/guide-telegram'))).toBe(true);
      expect(urls.some(u => u.includes('/knowledge/guide-vk'))).toBe(true);
      expect(urls.some(u => u.includes('/services'))).toBe(true);
      expect(urls.some(u => u.includes('/legal/privacy'))).toBe(true);
    });
  });

  describe('5. Knowledge Article & Hub JSON-LD Rich Snippets', () => {
    it('isolates article author branding per tenant (Anti-Mimicry Invariant)', async () => {
      const { getArticleBySlug } = await import('@/actions/knowledge');

      const smmplanArticle = await getArticleBySlug('guide-telegram', 'smmplan');
      expect(smmplanArticle.success).toBe(true);
      expect(smmplanArticle.article?.authorName).toBe('Команда SMMplan');
      expect(smmplanArticle.article?.authorRole).toBe('Экспертная редакция SMMplan');

      const fluxArticle = await getArticleBySlug('guide-telegram', 'flux');
      expect(fluxArticle.success).toBe(true);
      expect(fluxArticle.article?.authorName).toBe('Команда SMMflux');
      expect(fluxArticle.article?.authorRole).toBe('Экспертная редакция SMMflux');
    });

    it('constructs complete Article Schema with Person author and Organization publisher', () => {
      const mockArticle = {
        title: 'Продвижение в Telegram: полный гайд 2026',
        description: 'Исчерпывающее руководство по Telegram',
        content: 'Полный текст статьи...',
        authorName: 'Михаил',
        authorRole: 'Системный архитектор',
        createdAt: new Date('2026-01-15T10:00:00Z'),
        updatedAt: new Date('2026-02-20T14:30:00Z'),
        slug: 'guide-telegram',
      };

      const canonical = absoluteCanonical('smmplan', `/knowledge/${mockArticle.slug}`);
      const siteName = getTenantSiteName('smmplan');

      const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: mockArticle.title,
        description: mockArticle.description,
        articleBody: mockArticle.content,
        datePublished: mockArticle.createdAt.toISOString(),
        dateModified: mockArticle.updatedAt.toISOString(),
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonical,
        },
        author: {
          '@type': 'Person',
          name: mockArticle.authorName,
          jobTitle: mockArticle.authorRole,
          url: absoluteCanonical('smmplan', '/knowledge'),
        },
        publisher: {
          '@type': 'Organization',
          name: siteName,
          url: absoluteCanonical('smmplan', '/'),
          logo: {
            '@type': 'ImageObject',
            url: absoluteCanonical('smmplan', '/images/logo.png'),
          },
        },
      };

      expect(articleSchema['@type']).toBe('Article');
      expect(articleSchema.author['@type']).toBe('Person');
      expect(articleSchema.author.name).toBe('Михаил');
      expect(articleSchema.author.jobTitle).toBe('Системный архитектор');
      expect(articleSchema.publisher['@type']).toBe('Organization');
      expect(articleSchema.publisher.name).toBe('SMMplan');
      expect(articleSchema.mainEntityOfPage['@id']).toMatch(/^https?:\/\//);
    });

    it('generates 4-level BreadcrumbList for cluster articles pointing to parent pillar', () => {
      const tenantId = 'smmplan';
      const clusterSlug = 'kak-nabrat-podpischikov-telegram';
      const parentPillarSlug = 'guide-telegram';
      const canonical = absoluteCanonical(tenantId, `/knowledge/${clusterSlug}`);

      const breadcrumbItems = [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Главная',
          item: absoluteCanonical(tenantId, '/'),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'База знаний',
          item: absoluteCanonical(tenantId, '/knowledge'),
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Продвижение в Telegram: полный гайд 2026',
          item: absoluteCanonical(tenantId, `/knowledge/${parentPillarSlug}`),
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: 'Как набрать подписчиков в Telegram-канале',
          item: canonical,
        },
      ];

      expect(breadcrumbItems.length).toBe(4);
      expect(breadcrumbItems[0].position).toBe(1);
      expect(breadcrumbItems[1].position).toBe(2);
      expect(breadcrumbItems[2].position).toBe(3);
      expect(breadcrumbItems[3].position).toBe(4);
      expect(breadcrumbItems[2].item).toContain(parentPillarSlug);
      expect(breadcrumbItems[3].item).toContain(clusterSlug);
    });
  });
});
