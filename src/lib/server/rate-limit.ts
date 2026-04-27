import { redis } from '@/lib/redis';

/**
 * Basic Fixed-Window Rate Limiter using ioredis.
 * @param ip Client IP Address
 * @param limit Max requests per window
 * @param windowSec Window size in seconds
 * @returns { success: boolean, remaining: number }
 */
export async function rateLimit(
  ip: string,
  limit: number = 60,
  windowSec: number = 60
): Promise<{ success: boolean; remaining: number }> {
  try {
    const currentWindow = Math.floor(Date.now() / (windowSec * 1000));
    const key = `ratelimit:${ip}:${currentWindow}`;

    const currentCount = await redis.incr(key);

    if (currentCount === 1) {
      await redis.expire(key, windowSec * 2);
    }

    const remaining = Math.max(0, limit - currentCount);

    return {
      success: currentCount <= limit,
      remaining
    };
  } catch (error) {
    console.warn('[RateLimit] Error connecting to Redis, bypassing limiter:', error);
    // Fail-open if Redis is down, so we don't break the whole app
    return { success: true, remaining: 1 };
  }
}
