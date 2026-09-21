/**
 * (c) 2024-2026 SMMplan / OmniSMM. All rights reserved.
 * 
 * Yandex YML Feed Redis Cache & Invalidation Service.
 * Follows Clean Architecture (Domain/Service layer).
 */

import { redis } from '@/lib/redis';
import { normalizeTenantId } from '@/lib/seo-helpers';

export class YandexFeedCacheService {
  static getCacheKey(tenantId: string): string {
    return `seo:yandex-feed:${normalizeTenantId(tenantId)}`;
  }

  static async get(tenantId: string): Promise<string | null> {
    try {
      return await redis.get(this.getCacheKey(tenantId));
    } catch {
      return null;
    }
  }

  static async set(tenantId: string, xml: string, ttlSeconds = 3600): Promise<void> {
    try {
      await redis.set(this.getCacheKey(tenantId), xml, 'EX', ttlSeconds);
    } catch {
      // Fail-open: ignore cache write errors
    }
  }

  static async invalidate(tenantId?: string): Promise<void> {
    try {
      if (tenantId) {
        await redis.del(this.getCacheKey(tenantId));
      } else {
        await redis.del(this.getCacheKey('smmplan'), this.getCacheKey('flux'));
      }
    } catch {
      // Fail-open: ignore cache deletion errors
    }
  }
}

export const invalidateYandexFeedCache = (tenantId?: string) => YandexFeedCacheService.invalidate(tenantId);
