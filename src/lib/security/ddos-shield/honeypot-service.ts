import { logger } from '@/lib/logger';

const log = logger.child({ component: 'HoneypotDefenseService' });

export interface MinimalRedisClient {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode?: string, duration?: number) => Promise<unknown>;
}

// In-memory fast-path caches to eliminate 2x Redis network round-trips per request
const inMemoryBlockedCache = new Map<string, number>();
const inMemoryCleanCache = new Map<string, number>();
const MAX_LOCAL_CACHE = 10_000;
const CLEAN_CACHE_TTL_MS = 20_000; // 20 seconds for verified clean visitors
const BLOCKED_CACHE_TTL_MS = 86_400_000; // 24 hours

export function clearHoneypotMemoryCache(): void {
  inMemoryBlockedCache.clear();
  inMemoryCleanCache.clear();
}

async function getRedisInstance(): Promise<MinimalRedisClient | null> {
  try {
    const { redis } = await import('@/lib/redis');
    return redis as unknown as MinimalRedisClient;
  } catch (err) {
    log.warn('Redis unavailable for DDoS shield honeypot service', { error: String(err) });
    return null;
  }
}

/**
 * Automatically blacklists an aggressive bot or scraper in Redis and local memory for 24 hours.
 */
export async function recordHoneypotViolation(
  ip: string,
  fingerprint: string,
  customRedis?: MinimalRedisClient
): Promise<void> {
  const now = Date.now();
  const ipKey = ip && ip !== 'unknown' ? `ip:${ip}` : null;
  const fpKey = fingerprint && fingerprint.length === 64 ? `fp:${fingerprint}` : null;

  if (ipKey) {
    inMemoryBlockedCache.set(ipKey, now + BLOCKED_CACHE_TTL_MS);
    inMemoryCleanCache.delete(ipKey);
  }
  if (fpKey) {
    inMemoryBlockedCache.set(fpKey, now + BLOCKED_CACHE_TTL_MS);
    inMemoryCleanCache.delete(fpKey);
  }

  const redis = customRedis || (await getRedisInstance());
  if (!redis) return;

  const TTL_SECONDS = 86400; // 24 hours

  try {
    const tasks: Promise<unknown>[] = [];
    if (ip && ip !== 'unknown') {
      tasks.push(redis.set(`blacklist:ddos:ip:${ip}`, '1', 'EX', TTL_SECONDS));
    }
    if (fingerprint && fingerprint.length === 64) {
      tasks.push(redis.set(`blacklist:ddos:fp:${fingerprint}`, '1', 'EX', TTL_SECONDS));
    }
    await Promise.all(tasks);

    log.warn('🚨 Bot successfully trapped in Honeypot! Blacklisted for 24h', { ip, fingerprint });
  } catch (err) {
    log.error('Failed to blacklist honeypot attacker in Redis', { error: String(err), ip });
  }
}

/**
 * Checks whether an IP or browser fingerprint is currently in the active DDoS blacklist.
 * Uses high-performance in-memory tiering before contacting Redis.
 */
export async function isBlacklistedDdosTarget(
  ip: string,
  fingerprint: string,
  customRedis?: MinimalRedisClient
): Promise<boolean> {
  const now = Date.now();
  const ipKey = ip && ip !== 'unknown' ? `ip:${ip}` : null;
  const fpKey = fingerprint && fingerprint.length === 64 ? `fp:${fingerprint}` : null;

  // 1. Fast path: check in-memory blocked cache
  if (ipKey) {
    const blockedUntil = inMemoryBlockedCache.get(ipKey);
    if (blockedUntil && blockedUntil > now) return true;
  }
  if (fpKey) {
    const blockedUntil = inMemoryBlockedCache.get(fpKey);
    if (blockedUntil && blockedUntil > now) return true;
  }

  // 2. Fast path: check in-memory clean cache (0 Redis round-trips for repeat visits)
  const isIpClean = ipKey ? (inMemoryCleanCache.get(ipKey) ?? 0) > now : true;
  const isFpClean = fpKey ? (inMemoryCleanCache.get(fpKey) ?? 0) > now : true;
  if (isIpClean && isFpClean && (ipKey || fpKey)) {
    return false;
  }

  const redis = customRedis || (await getRedisInstance());
  if (!redis) return false;

  try {
    const tasks: Promise<string | null>[] = [];
    if (ipKey && !isIpClean) {
      tasks.push(redis.get(`blacklist:ddos:ip:${ip}`));
    } else {
      tasks.push(Promise.resolve(null));
    }
    if (fpKey && !isFpClean) {
      tasks.push(redis.get(`blacklist:ddos:fp:${fingerprint}`));
    } else {
      tasks.push(Promise.resolve(null));
    }

    const [ipBlocked, fpBlocked] = await Promise.all(tasks);

    if (ipBlocked) {
      if (ipKey) inMemoryBlockedCache.set(ipKey, now + BLOCKED_CACHE_TTL_MS);
      return true;
    } else if (ipKey) {
      inMemoryCleanCache.set(ipKey, now + CLEAN_CACHE_TTL_MS);
    }

    if (fpBlocked) {
      if (fpKey) inMemoryBlockedCache.set(fpKey, now + BLOCKED_CACHE_TTL_MS);
      return true;
    } else if (fpKey) {
      inMemoryCleanCache.set(fpKey, now + CLEAN_CACHE_TTL_MS);
    }

    // Periodic prune
    if (inMemoryCleanCache.size > MAX_LOCAL_CACHE) {
      for (const [k, exp] of inMemoryCleanCache.entries()) {
        if (exp <= now) inMemoryCleanCache.delete(k);
      }
    }

    return false;
  } catch {
    return false; // Fail-Open on Redis query errors
  }
}
