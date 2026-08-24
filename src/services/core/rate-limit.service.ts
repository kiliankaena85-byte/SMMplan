import { db } from "@/lib/db";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
        const { SettingsProvider } = await import('@/lib/settings');
        if (SettingsProvider.isTestEnvironment() && process.env.ENABLE_RATE_LIMIT_TEST !== 'true') {
          return true;
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      if (process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT_TEST !== 'true') return true;
    }
    try {
      const { getClientIp } = await import('@/utils/ip');
      const ip = await getClientIp();
      const now = new Date();
      const redisKey = `ratelimit:${endpoint}:${ip}`;

      // 1. Try Redis First
      try {
        if (redis.status === 'wait') {
          await redis.connect();
        }
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
      } catch (redisError: unknown) {
        console.warn("[RATE_LIMIT:REDIS] Redis check failed, falling back to PostgreSQL:", (redisError as Error).message);
      }

      // 2. Fallback to Postgres with atomic UPSERT (Zero Race Condition)
      const newExpiry = new Date(now.getTime() + windowSeconds * 1000);
      const rows = await db.$queryRaw<Array<{ hits: number }>>`
        INSERT INTO "RateLimit" ("id", "ip", "endpoint", "hits", "expiresAt", "createdAt")
        VALUES (gen_random_uuid()::text, ${ip}, ${endpoint}, 1, ${newExpiry}, NOW())
        ON CONFLICT ("ip", "endpoint") DO UPDATE SET
          "hits" = CASE WHEN "RateLimit"."expiresAt" <= NOW() THEN 1 ELSE "RateLimit"."hits" + 1 END,
          "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= NOW() THEN ${newExpiry} ELSE "RateLimit"."expiresAt" END
        RETURNING "hits";
      `;

      const hits = rows[0]?.hits ?? 1;
      if (hits > maxHits) {
         console.warn(`[RATE_LIMIT:PG] Blocked ${ip} on ${endpoint} (${hits}/${maxHits})`);
         return false;
      }

      return true;
    } catch (e: unknown) {
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
      if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
        const { SettingsProvider } = await import('@/lib/settings');
        if (SettingsProvider.isTestEnvironment() && process.env.ENABLE_RATE_LIMIT_TEST !== 'true') {
          return true;
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      if (process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT_TEST !== 'true') return true;
    }
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
        if (redis.status === 'wait') {
          await redis.connect();
        }
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
      } catch (redisError: unknown) {
        console.warn("[RATE_LIMIT_CUSTOM:REDIS] Redis check failed, falling back to PostgreSQL:", (redisError as Error).message);
      }

      // 2. Fallback to Postgres with atomic UPSERT (Zero Race Condition)
      const ip = "CUSTOM_KEY";
      const endpoint = key;
      const newExpiry = new Date(now.getTime() + windowSeconds * 1000);
      const rows = await db.$queryRaw<Array<{ hits: number }>>`
        INSERT INTO "RateLimit" ("id", "ip", "endpoint", "hits", "expiresAt", "createdAt")
        VALUES (gen_random_uuid()::text, ${ip}, ${endpoint}, 1, ${newExpiry}, NOW())
        ON CONFLICT ("ip", "endpoint") DO UPDATE SET
          "hits" = CASE WHEN "RateLimit"."expiresAt" <= NOW() THEN 1 ELSE "RateLimit"."hits" + 1 END,
          "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= NOW() THEN ${newExpiry} ELSE "RateLimit"."expiresAt" END
        RETURNING "hits";
      `;

      const hits = rows[0]?.hits ?? 1;
      if (hits > maxHits) {
         console.warn(`[RATE_LIMIT_CUSTOM:PG] Blocked key ${key} (${hits}/${maxHits})`);
         return false;
      }
      return true;
    } catch (e: unknown) {
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

