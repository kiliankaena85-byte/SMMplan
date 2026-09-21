/**
 * (c) 2024-2026 SMMplan / OmniSMM. All rights reserved.
 * 
 * Master Test Suite for Yandex AEO 2026, llms.txt & Knowledge SEO.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pillarPages, clusterArticles } from '@/data/seo';
import { absoluteCanonical, normalizeTenantId, getTenantHost, getTenantSiteName } from '@/lib/seo-helpers';

describe('Yandex AEO 2026 & Knowledge Search Optimization', () => {
  describe('1. llms.txt Route (AI Agent & Neuro-Search Standard 2026)', () => {
    it('returns HTTP 200 with text/plain content-type and cache headers', async () => {
      const { GET } = await import('@/app/llms.txt/route');
      const response = await GET();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/plain');
      expect(response.headers.get('Cache-Control')).toContain('public');
    });

    it('contains platform description, 1-unit pricing notice, and legal compliance', async () => {
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

      // Markdown links to key sections
      expect(text).toContain('/services');
      expect(text).toContain('/knowledge');
      expect(text).toContain('/legal/privacy');
    });
  });

  describe('2. Sitemap Coverage & Knowledge Indexing', () => {
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

  describe('3. Knowledge Article & Hub JSON-LD Rich Snippets', () => {
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
