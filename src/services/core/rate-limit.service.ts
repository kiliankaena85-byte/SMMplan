import { db } from "@/lib/db";
import { headers } from "next/headers";
import { redis } from "@/lib/redis";

export class RateLimitService {
  /**
   * Enforces a rate limit for a given action using the request IP.
   * Uses Redis for high-performance distributed rate limiting,
   * falling back to PostgreSQL if Redis is unavailable.
   * 
   * @param endpoint ID of the protected resource
   * @param maxHits Maximum attempts allowed
   * @param windowSeconds Window length in seconds
   * @returns boolean true if allowed, false if blocked
   */
  static async check(
    endpoint: string, 
    maxHits: number = 10, 
    windowSeconds: number = 60,
    failClosed: boolean = true // Secure by default: block traffic if rate limiter fails
  ): Promise<boolean> {
    try {
      const { getClientIp } = await import('@/utils/ip');
      const ip = await getClientIp();
      const now = new Date();
      const redisKey = `ratelimit:${endpoint}:${ip}`;

      // 1. Try Redis First
      try {
        if (redis.status === 'ready' || redis.status === 'connecting') {
          // Lua script for atomic INCR + EXPIRE
          const script = `
            local current = redis.call('INCR', KEYS[1])
            if current == 1 then
              redis.call('EXPIRE', KEYS[1], ARGV[1])
            end
            return current
          `;
          
          const hits = await redis.eval(script, 1, redisKey, windowSeconds) as number;
          
          if (hits > maxHits) {
             console.warn(`[RATE_LIMIT:REDIS] Blocked ${ip} on ${endpoint} (${hits}/${maxHits})`);
             return false;
          }
          return true;
        }
      } catch (redisError: any) {
        console.warn("[RATE_LIMIT:REDIS] Redis check failed, falling back to PostgreSQL:", (redisError as Error).message);
      }

      // 2. Fallback to Postgres (if Redis is down or not configured)
      db.rateLimit.deleteMany({
        where: { expiresAt: { lte: now } }
      }).catch((e: any) => console.error("RateLimit cleanup error:", e));

      const existingRecord = await db.rateLimit.findUnique({
        where: { ip_endpoint: { ip, endpoint } }
      });

      let record;
      const newExpiry = new Date(now.getTime() + windowSeconds * 1000);

      if (existingRecord && existingRecord.expiresAt <= now) {
         // Expired: Reset the counter instead of banned permanently
         record = await db.rateLimit.update({
            where: { id: existingRecord.id },
            data: { hits: 1, expiresAt: newExpiry }
         });
      } else {
         // We use upsert to prevent unique constraint violation race conditions when two concurrent requests try to create a record simultaneously
         record = await db.rateLimit.upsert({
            where: { ip_endpoint: { ip, endpoint } },
            update: {
               hits: { increment: 1 }
            },
            create: {
               ip,
               endpoint,
               hits: 1,
               expiresAt: newExpiry
            }
         });
      }

      if (record.hits > maxHits) {
         console.warn(`[RATE_LIMIT:PG] Blocked ${ip} on ${endpoint} (${record.hits}/${maxHits})`);
         return false;
      }

      return true;
    } catch (e: any) {
      console.error("[RATE_LIMIT] Fatal Failure:", e);
      if (failClosed) {
        console.warn(`[RATE_LIMIT] Failing CLOSED for endpoint ${endpoint}`);
        return false;
      }
      console.warn(`[RATE_LIMIT] Failing OPEN for endpoint ${endpoint}`);
      return true;
    }
  }
  
  static async checkCustomKey(
    key: string,
    maxHits: number = 10,
    windowSeconds: number = 60,
    failClosed: boolean = true // Secure by default: block traffic if rate limiter fails
  ): Promise<boolean> {
    try {
      // W6-1 SECURITY FIX: Prevent Redis OOM or DB bloat from huge custom keys
      if (!key || key.length > 256) {
        console.warn(`[RATE_LIMIT_CUSTOM] Blocked key exceeding max length or empty`);
        return false;
      }
      
      const now = new Date();
      const redisKey = `ratelimit:custom:${key}`;

      // 1. Try Redis First
      try {
        if (redis.status === 'ready' || redis.status === 'connecting') {
          const script = `
            local current = redis.call('INCR', KEYS[1])
            if current == 1 then
              redis.call('EXPIRE', KEYS[1], ARGV[1])
            end
            return current
          `;
          const hits = await redis.eval(script, 1, redisKey, windowSeconds) as number;
          if (hits > maxHits) {
             console.warn(`[RATE_LIMIT_CUSTOM:REDIS] Blocked key ${key} (${hits}/${maxHits})`);
             return false;
          }
          return true;
        }
      } catch (redisError: any) {
        console.warn("[RATE_LIMIT_CUSTOM:REDIS] Redis check failed, falling back to PostgreSQL:", (redisError as Error).message);
      }

      // 2. Fallback to Postgres
      db.rateLimit.deleteMany({
        where: { expiresAt: { lte: now } }
      }).catch((e: any) => console.error("RateLimit cleanup error:", e));

      // We'll store it as ip: 'CUSTOM_KEY', endpoint: key
      const ip = "CUSTOM_KEY";
      const endpoint = key;
      const existingRecord = await db.rateLimit.findUnique({
        where: { ip_endpoint: { ip, endpoint } }
      });

      let record;
      const newExpiry = new Date(now.getTime() + windowSeconds * 1000);

      if (existingRecord && existingRecord.expiresAt <= now) {
         record = await db.rateLimit.update({
            where: { id: existingRecord.id },
            data: { hits: 1, expiresAt: newExpiry }
         });
      } else {
         record = await db.rateLimit.upsert({
            where: { ip_endpoint: { ip, endpoint } },
            update: { hits: { increment: 1 } },
            create: { ip, endpoint, hits: 1, expiresAt: newExpiry }
         });
      }

      if (record.hits > maxHits) {
         console.warn(`[RATE_LIMIT_CUSTOM:PG] Blocked key ${key} (${record.hits}/${maxHits})`);
         return false;
      }
      return true;
    } catch (e: any) {
      console.error("[RATE_LIMIT_CUSTOM] Fatal Failure:", e);
      if (failClosed) {
        console.warn(`[RATE_LIMIT_CUSTOM] Failing CLOSED for key ${key}`);
        return false;
      }
      console.warn(`[RATE_LIMIT_CUSTOM] Failing OPEN for key ${key}`);
      return true;
    }
  }
}

