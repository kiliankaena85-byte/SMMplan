/**
 * (c) 2024-2026 SMMplan / OmniSMM. All rights reserved.
 * 
 * Vector 3 Knowledge Hub Hardening & Verification Suite:
 * - Static pillar recommended services & fallback matching
 * - Related articles resolution for static categories
 * - TargetType semantic compatibility (Rule 4.1)
 * - Safe HTML sanitization for SMMflux
 * - Knowledge hub tree & articles integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { SettingsProvider } from '@/lib/settings';
import { 
  getArticles, 
  getGroupedArticlesForTree, 
  getArticleBySlug, 
  getRecommendedServicesForArticle,
  getRelatedArticles
} from '@/actions/knowledge';
import { isTargetTypeCompatible, resolveServiceTargetType } from '@/utils/target-type-mapper';
import { sanitizeArticleHtml } from '@/lib/sanitize';
import { pillarPages } from '@/data/seo';

describe.sequential('Vector 3: Knowledge Hub & Inbound Pre-landers Hardening', () => {
  beforeEach(async () => {
    // Ensure test settings
    await db.systemSettings.upsert({
      where: { id: 'global' },
      update: { isTestMode: true, exchangeRateUSD: 100.0 },
      create: { id: 'global', isTestMode: true, exchangeRateUSD: 100.0 },
    });
  });

  describe('1. Static Pillar Recommended Services Resolution', () => {
    it('resolves recommended services for static blogger guide by network', async () => {
      const services = await getRecommendedServicesForArticle('static-guide-bloggers-telega-in-tgstat');
      expect(Array.isArray(services)).toBe(true);
      // All returned services must have unit pricing strictly formatted
      for (const s of services) {
        expect(s.pricePerUnitRub).toBeGreaterThan(0);
        expect(s.name).toBeTruthy();
        expect(s.categoryName).toBeTruthy();
      }
    });

    it('resolves recommended services for static marketer guide by network', async () => {
      const services = await getRecommendedServicesForArticle('static-guide-marketers-kpi-drip-feed-54fz');
      expect(Array.isArray(services)).toBe(true);
      for (const s of services) {
        expect(s.pricePerUnitRub).toBeGreaterThan(0);
      }
    });

    it('resolves recommended services for static agency guide by fallback', async () => {
      const services = await getRecommendedServicesForArticle('static-guide-agencies-beznal-nds22-wholesale');
      expect(Array.isArray(services)).toBe(true);
      for (const s of services) {
        expect(s.pricePerUnitRub).toBeGreaterThan(0);
      }
    });
  });

  describe('2. Related Articles with Static Inclusion', () => {
    it('supplements related articles with static pillars when includeStatic is true', async () => {
      const result = await getRelatedArticles(
        'static-guide-bloggers-telega-in-tgstat',
        'Блогерам и Авторам',
        { includeStatic: true }
      );
      expect(result.success).toBe(true);
      expect(result.articles.length).toBeGreaterThanOrEqual(1);
      expect(result.articles.every(a => a.slug !== 'guide-bloggers-telega-in-tgstat')).toBe(true);
    });

    it('only returns DB articles when includeStatic is omitted or false', async () => {
      const result = await getRelatedArticles(
        'static-guide-bloggers-telega-in-tgstat',
        'Блогерам и Авторам'
      );
      expect(result.success).toBe(true);
      // DB has no articles in this category, so must be empty without static
      expect(result.articles.length).toBe(0);
    });
  });

  describe('3. Rule 4.1: TargetType Semantic Resolution and Link Compatibility', () => {
    it('correctly resolves service target type from service object and infer from name', () => {
      const mockServiceWithDefaultPost = {
        name: 'Telegram Подписчики в канал быстрые',
        targetType: 'POST', // corrupted/default schema value
        category: { name: 'Подписчики Telegram' },
      };

      const resolved = resolveServiceTargetType(mockServiceWithDefaultPost);
      expect(resolved).toBe('CHANNEL');
    });

    it('allows channel links to match channel services via isTargetTypeCompatible', () => {
      expect(isTargetTypeCompatible('CHANNEL', 'CHANNEL')).toBe(true);
      expect(isTargetTypeCompatible('CHANNEL', 'CHANNEL_POSTS')).toBe(true);
      expect(isTargetTypeCompatible('CHANNEL', 'PROFILE')).toBe(true);
      expect(isTargetTypeCompatible('CHANNEL', 'CUSTOM')).toBe(true);

      // Incompatible
      expect(isTargetTypeCompatible('CHANNEL', 'POST')).toBe(false);
    });

    it('allows post links to match post services via isTargetTypeCompatible', () => {
      expect(isTargetTypeCompatible('POST', 'POST')).toBe(true);
      expect(isTargetTypeCompatible('POST', 'VIDEO')).toBe(true);
      expect(isTargetTypeCompatible('POST', 'COMMENTS')).toBe(true);

      // Incompatible
      expect(isTargetTypeCompatible('POST', 'CHANNEL')).toBe(false);
    });
  });

  describe('4. SMMflux Safe HTML Rendering', () => {
    it('sanitizes static pillar HTML preserving AEO direct answers, tables, and headings', () => {
      const bloggerGuide = pillarPages.find(p => p.slug === 'guide-bloggers-telega-in-tgstat');
      expect(bloggerGuide).toBeDefined();

      const sanitized = sanitizeArticleHtml(bloggerGuide?.contentHtml);
      expect(sanitized).toContain('aeo-direct-answer');
      expect(sanitized).toContain('<table>');
      expect(sanitized).toContain('<th>');
      expect(sanitized).toContain('<td>');
      expect(sanitized).toContain('<h2>');
      expect(sanitized).not.toContain('<script');
    });
  });

  describe('5. Knowledge Hub Global Fetching with Static SEO Pillars', () => {
    it('fetches static articles and categories when includeStatic is passed', async () => {
      const res = await getArticles('Все', '', { includeStatic: true, tenantId: 'flux' });
      expect(res.success).toBe(true);
      expect(res.articles.some(a => a.slug === 'guide-bloggers-telega-in-tgstat')).toBe(true);
      expect(res.articles.some(a => a.slug === 'guide-marketers-kpi-drip-feed-54fz')).toBe(true);
      expect(res.articles.some(a => a.slug === 'guide-agencies-beznal-nds22-wholesale')).toBe(true);
      expect(res.categories).toContain('Блогерам и Авторам');
      expect(res.categories).toContain('Маркетологам и KPI');
      expect(res.categories).toContain('SMM-агентствам и B2B');

      const tree = await getGroupedArticlesForTree({ includeStatic: true });
      expect(tree.success).toBe(true);
      expect(tree.grouped['Блогерам и Авторам'].length).toBeGreaterThanOrEqual(1);
      expect(tree.grouped['Маркетологам и KPI'].length).toBeGreaterThanOrEqual(1);
      expect(tree.grouped['SMM-агентствам и B2B'].length).toBeGreaterThanOrEqual(1);
    });
  });
});
