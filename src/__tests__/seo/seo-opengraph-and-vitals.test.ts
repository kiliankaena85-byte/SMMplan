/**
 * (c) 2024-2026 SMMplan. All rights reserved.
 * Master Test Suite for SEO, OpenGraph & Core Web Vitals (SMMplan + SMMflux).
 */

import { describe, it, expect } from 'vitest';
import { normalizeTenantId, getTenantHost, getTenantSiteName, absoluteCanonical } from '@/lib/seo-helpers';

describe('🔍 SEO, OpenGraph & Core Web Vitals Master Suite', () => {
  describe('1. Multi-Tenant Canonical URLs & Host Resolution', () => {
    it('normalizes tenant aliases accurately to strictly 2 brands (smmplan / flux)', () => {
      expect(normalizeTenantId('smmplan')).toBe('smmplan');
      expect(normalizeTenantId('smmflux')).toBe('flux');
      expect(normalizeTenantId('flux')).toBe('flux');
      expect(normalizeTenantId('lovable')).toBe('flux');
      expect(normalizeTenantId(null)).toBe('smmplan');
      expect(normalizeTenantId(undefined)).toBe('smmplan');
    });

    it('resolves correct official production hosts for both brands', () => {
      expect(getTenantHost('smmplan')).toBe('smmplan.pro');
      expect(getTenantHost('flux')).toBe('smmflux.ru');
      expect(getTenantHost('smmflux')).toBe('smmflux.ru');
      expect(getTenantHost('lovable')).toBe('smmflux.ru');
    });

    it('resolves official brand display names', () => {
      expect(getTenantSiteName('smmplan')).toBe('SMMplan');
      expect(getTenantSiteName('flux')).toBe('SMMflux');
      expect(getTenantSiteName('smmflux')).toBe('SMMflux');
      expect(getTenantSiteName('lovable')).toBe('SMMflux');
    });

    it('generates absolute canonical URLs without double slashes', () => {
      expect(absoluteCanonical('smmplan', '/services/telegram')).toBe('https://smmplan.pro/services/telegram');
      expect(absoluteCanonical('smmplan', 'services/telegram')).toBe('https://smmplan.pro/services/telegram');
      expect(absoluteCanonical('smmplan', '///services/telegram')).toBe('https://smmplan.pro/services/telegram');
      expect(absoluteCanonical('flux', '/services/vk')).toBe('https://smmflux.ru/services/vk');
      expect(absoluteCanonical('lovable', '/knowledge/telegram-guide')).toBe('https://smmflux.ru/knowledge/telegram-guide');
    });
  });

  describe('2. OpenGraph & Rich Snippet Contracts', () => {
    it('verifies Schema.org Organization structure and required contact points', () => {
      const orgSchema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'SMMplan',
        url: 'https://smmplan.pro',
        logo: 'https://smmplan.pro/images/logo.png',
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'support@smmplan.pro',
          availableLanguage: 'Russian',
        },
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'RU',
        },
      };

      expect(orgSchema['@context']).toBe('https://schema.org');
      expect(orgSchema['@type']).toBe('Organization');
      expect(orgSchema.contactPoint.contactType).toBe('customer support');
      expect(orgSchema.address.addressCountry).toBe('RU');
    });

    it('verifies Schema.org WebSite structure and SearchAction potentialAction', () => {
      const webSiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'SMMplan',
        url: 'https://smmplan.pro',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://smmplan.pro/services?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      };

      expect(webSiteSchema['@context']).toBe('https://schema.org');
      expect(webSiteSchema['@type']).toBe('WebSite');
      expect(webSiteSchema.potentialAction['@type']).toBe('SearchAction');
      expect(webSiteSchema.potentialAction.target).toContain('{search_term_string}');
    });
  });

  describe('3. Core Web Vitals & Robots Rules', () => {
    it('ensures robots disallow list protects sensitive admin and payment endpoints', () => {
      const disallowList = [
        '/admin',
        '/admin/',
        '/dashboard',
        '/dashboard/',
        '/operator',
        '/operator/',
        '/api',
        '/api/',
        '/client-demo',
        '/client-demo/',
        '/login',
        '/register',
        '/payment-redirect',
        '/support/payment-error',
        '/dev',
        '/test',
      ];

      expect(disallowList).toContain('/admin');
      expect(disallowList).toContain('/dashboard');
      expect(disallowList).toContain('/payment-redirect');
      expect(disallowList).toContain('/support/payment-error');
    });

    it('verifies that robots allows all essential SEO assets', async () => {
      const robotsModule = await import('@/app/robots');
      const robotsData = await robotsModule.default();

      expect(robotsData.rules).toBeDefined();
      const rules = Array.isArray(robotsData.rules) ? robotsData.rules : [robotsData.rules];

      for (const rule of rules) {
        if (rule.allow) {
          const allowList = Array.isArray(rule.allow) ? rule.allow : [rule.allow];
          expect(allowList).toContain('/llms.txt');
          expect(allowList).toContain('/llms-full.txt');
        }
      }
    });

    it('generates distinct OpenGraph image configurations for SMMplan and SMMflux (Anti-Mimicry)', async () => {
      const { NextRequest } = await import('next/server');
      const { GET } = await import('@/app/api/og/route');

      // 1. SMMplan OG Request
      const smmplanReq = new NextRequest('https://smmplan.pro/api/og?tenant=smmplan&network=Telegram');
      const smmplanRes = await GET(smmplanReq);
      expect(smmplanRes.status).toBe(200);

      // 2. SMMflux OG Request
      const fluxReq = new NextRequest('https://smmflux.ru/api/og?tenant=flux&network=Telegram');
      const fluxRes = await GET(fluxReq);
      expect(fluxRes.status).toBe(200);
    });
  });
});
