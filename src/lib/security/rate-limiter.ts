/**
 * (c) 2026 SMMplan.
 * Distributed Sliding Window Rate Limiter (2026 Anti-Brute-Force Standard).
 *
 * Protects critical endpoints:
 * - Auth (/login, /register, magic links): 5 req / 60s
 * - Order checkout: 10 req / 60s
 * - Password reset / SMS: 3 req / 900s
 * - Public APIs: 120 req / 60s
 */

import { redis } from '@/lib/redis';

export interface RateLimitConfig {
  limit: number;      // Maximum allowed requests in window
  windowSeconds: number; // Duration of window in seconds
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

// In-memory fallback sliding window for test / offline environments
const inMemoryStore = new Map<string, number[]>();

export async function checkRateLimit(
  identifier: string,
  prefix: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = config;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const clearBefore = now - windowMs;
  const key = `ratelimit:${prefix}:${identifier}`;

  try {
    if (redis && typeof redis.zadd === 'function') {
      // Redis Sliding Window implementation via Sorted Sets (ZSET)
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, clearBefore);
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      pipeline.zcard(key);
      pipeline.expire(key, windowSeconds);

      const results = await pipeline.exec();
      const currentCount = (results?.[2]?.[1] as number) || 1;

      const success = currentCount <= limit;
      const remaining = Math.max(0, limit - currentCount);

      return {
        success,
        limit,
        remaining,
        resetSeconds: windowSeconds,
      };
    }
  } catch (err) {
    console.warn('[RateLimiter] Redis unavailable, falling back to memory store:', err);
  }

  // Fallback: In-memory sliding window
  const timestamps = (inMemoryStore.get(key) || []).filter((ts) => ts > clearBefore);
  timestamps.push(now);
  inMemoryStore.set(key, timestamps);

  const currentCount = timestamps.length;
  const success = currentCount <= limit;
  const remaining = Math.max(0, limit - currentCount);

  return {
    success,
    limit,
    remaining,
    resetSeconds: windowSeconds,
  };
}

export const RATE_LIMIT_PRESETS = {
  AUTH: { limit: 5, windowSeconds: 60 },
  ORDER: { limit: 10, windowSeconds: 60 },
  PASSWORD_RESET: { limit: 3, windowSeconds: 900 },
  PUBLIC_API: { limit: 120, windowSeconds: 60 },
} as const;
