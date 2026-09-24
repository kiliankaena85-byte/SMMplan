import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'P0AlertDebouncer' });

export interface InMemoryLockEntry {
  expiresAt: number;
  lastAccessedAt: number;
}

export interface InMemoryCounterEntry {
  count: number;
  delta: number;
  expiresAt: number;
  lastAccessedAt: number;
}

// In-memory fallback stores if Redis is offline/unreachable
const inMemoryLocks = new Map<string, InMemoryLockEntry>();
const inMemoryCounters = new Map<string, InMemoryCounterEntry>();

let isSyncingToRedis = false;

export class P0AlertDebouncer {
  private static readonly PREFIX = 'p0:debounce:';
  private static readonly THRESHOLD_PREFIX = 'p0:threshold:';
  private static readonly MAX_IN_MEMORY_ENTRIES = 5000;

  /**
   * Prunes in-memory stores. First removes expired entries.
   * If store size exceeds MAX_IN_MEMORY_ENTRIES, evicts Least Recently Used (LRU) entries.
   */
  public static pruneInMemoryStores(): void {
    const now = Date.now();

    // 1. Evict expired lock entries
    for (const [key, entry] of inMemoryLocks.entries()) {
      if (entry.expiresAt <= now) {
        inMemoryLocks.delete(key);
      }
    }

    // 2. Evict expired counter entries
    for (const [key, entry] of inMemoryCounters.entries()) {
      if (entry.expiresAt <= now) {
        inMemoryCounters.delete(key);
      }
    }

    // 3. LRU eviction if locks exceed capacity
    if (inMemoryLocks.size > this.MAX_IN_MEMORY_ENTRIES) {
      const sortedLocks = Array.from(inMemoryLocks.entries())
        .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
      const toRemoveCount = inMemoryLocks.size - this.MAX_IN_MEMORY_ENTRIES;
      for (let i = 0; i < toRemoveCount; i++) {
        inMemoryLocks.delete(sortedLocks[i][0]);
      }
    }

    // 4. LRU eviction if counters exceed capacity
    if (inMemoryCounters.size > this.MAX_IN_MEMORY_ENTRIES) {
      const sortedCounters = Array.from(inMemoryCounters.entries())
        .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
      const toRemoveCount = inMemoryCounters.size - this.MAX_IN_MEMORY_ENTRIES;
      for (let i = 0; i < toRemoveCount; i++) {
        inMemoryCounters.delete(sortedCounters[i][0]);
      }
    }
  }

  /**
   * Merges accumulated in-memory deltas and active locks into Redis upon reconnect.
   * Redis serves as the source of truth, while in-memory pushes deltas.
   */
  public static async syncInMemoryToRedis(): Promise<void> {
    if (isSyncingToRedis) return;
    if (redis.status !== 'ready') return;
    if (inMemoryLocks.size === 0 && inMemoryCounters.size === 0) return;

    isSyncingToRedis = true;
    try {
      const now = Date.now();

      // Merge in-memory counters to Redis using INCRBY deltas
      for (const [fullKey, entry] of Array.from(inMemoryCounters.entries())) {
        if (entry.expiresAt <= now) {
          inMemoryCounters.delete(fullKey);
          continue;
        }

        if (entry.delta > 0) {
          const ttlSec = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));
          const newRedisCount = await redis.incrby(fullKey, entry.delta);
          await redis.expire(fullKey, ttlSec);
          entry.count = newRedisCount;
          entry.delta = 0;
        }
      }

      // Sync active in-memory locks to Redis
      for (const [fullKey, entry] of Array.from(inMemoryLocks.entries())) {
        if (entry.expiresAt <= now) {
          inMemoryLocks.delete(fullKey);
          continue;
        }
        const ttlSec = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));
        await redis.set(fullKey, '1', 'EX', ttlSec, 'NX');
      }

      this.pruneInMemoryStores();
    } catch (err) {
      log.warn('[P0AlertDebouncer] Error syncing in-memory state to Redis upon reconnect', { error: err });
    } finally {
      isSyncingToRedis = false;
    }
  }

  /**
   * Attempts to acquire an alert lock.
   * Returns TRUE if this is the first alert in the window (lock acquired -> ALLOW SEND).
   * Returns FALSE if an alert was already sent recently (lock exists -> DEBOUNCE / SUPPRESS).
   */
  public static async shouldSendAlert(
    alertKey: string,
    cooldownSeconds: number = 3600 // Default 1 hour cooldown
  ): Promise<boolean> {
    const fullKey = `${this.PREFIX}${alertKey}`;
    const now = Date.now();

    try {
      if (redis.status === 'ready' || redis.status === 'connecting') {
        await this.syncInMemoryToRedis();
        const acquired = await redis.set(fullKey, '1', 'EX', cooldownSeconds, 'NX');
        if (acquired === 'OK') {
          inMemoryLocks.set(fullKey, { expiresAt: now + cooldownSeconds * 1000, lastAccessedAt: now });
          return true;
        }
        return false;
      }
    } catch (redisErr) {
      log.warn('[P0AlertDebouncer] Redis unavailable, using in-memory debounce lock', { error: redisErr });
    }

    // In-memory fallback
    this.pruneInMemoryStores();
    const existing = inMemoryLocks.get(fullKey);
    if (existing && existing.expiresAt > now) {
      existing.lastAccessedAt = now;
      return false; // Suppress
    }

    inMemoryLocks.set(fullKey, {
      expiresAt: now + cooldownSeconds * 1000,
      lastAccessedAt: now,
    });
    return true; // Allow
  }

  /**
   * Sliding window threshold accumulator.
   * Useful for events that require accumulation (e.g. 20 auth errors in 5 min) before triggering P0.
   * Returns reached = TRUE when threshold limit is met/exceeded.
   */
  public static async checkThresholdTrigger(
    key: string,
    windowSeconds: number,
    thresholdLimit: number
  ): Promise<{ count: number; shouldTrigger: boolean }> {
    const fullKey = `${this.THRESHOLD_PREFIX}${key}`;
    const now = Date.now();

    try {
      if (redis.status === 'ready' || redis.status === 'connecting') {
        await this.syncInMemoryToRedis();
        const currentCount = await redis.incr(fullKey);
        if (currentCount === 1) {
          await redis.expire(fullKey, windowSeconds);
        }
        return {
          count: currentCount,
          shouldTrigger: currentCount >= thresholdLimit,
        };
      }
    } catch (redisErr) {
      log.warn('[P0AlertDebouncer] Redis unavailable, using in-memory threshold counter', { error: redisErr });
    }

    // In-memory fallback
    this.pruneInMemoryStores();
    const entry = inMemoryCounters.get(fullKey);
    if (!entry || entry.expiresAt <= now) {
      inMemoryCounters.set(fullKey, {
        count: 1,
        delta: 1,
        expiresAt: now + windowSeconds * 1000,
        lastAccessedAt: now,
      });
      return { count: 1, shouldTrigger: 1 >= thresholdLimit };
    }

    entry.count += 1;
    entry.delta += 1;
    entry.lastAccessedAt = now;
    return {
      count: entry.count,
      shouldTrigger: entry.count >= thresholdLimit,
    };
  }

  /**
   * Resets a debounce lock (useful when an issue is resolved and can alert again).
   */
  public static async resetLock(alertKey: string): Promise<void> {
    const fullKey = `${this.PREFIX}${alertKey}`;
    try {
      if (redis.status === 'ready' || redis.status === 'connecting') {
        await redis.del(fullKey);
      }
    } catch (err) {
      log.warn('[P0AlertDebouncer] Redis resetLock failed', { error: err });
    }
    inMemoryLocks.delete(fullKey);
    inMemoryCounters.delete(`${this.THRESHOLD_PREFIX}${alertKey}`);
  }

  /**
   * Smart Deduplication with occurrence count tracker.
   * Returns shouldSend = true on first occurrence, plus the total occurrences accumulated.
   */
  public static async checkDeduplicatedAlert(
    alertKey: string,
    cooldownSeconds: number = 7200 // 2 hours default
  ): Promise<{ shouldSend: boolean; occurrences: number }> {
    const countKey = `${this.THRESHOLD_PREFIX}occurrences:${alertKey}`;
    let occurrences = 1;

    try {
      if (redis.status === 'ready' || redis.status === 'connecting') {
        await this.syncInMemoryToRedis();
        occurrences = await redis.incr(countKey);
        if (occurrences === 1) {
          await redis.expire(countKey, cooldownSeconds);
        }
      }
    } catch (redisErr) {
      log.warn('[P0AlertDebouncer] Redis error on occurrence increment', { error: redisErr });
    }

    const shouldSend = await this.shouldSendAlert(alertKey, cooldownSeconds);
    return { shouldSend, occurrences };
  }

  /**
   * Helper for unit testing and state inspection.
   */
  public static getInMemoryStoreSizes(): { locks: number; counters: number } {
    return { locks: inMemoryLocks.size, counters: inMemoryCounters.size };
  }

  public static clearInMemoryStores(): void {
    inMemoryLocks.clear();
    inMemoryCounters.clear();
  }

  public static populateInMemoryLockForTest(key: string, entry: InMemoryLockEntry): void {
    inMemoryLocks.set(key, entry);
  }
}

// Hook up automatic reconnect sync
if (redis && typeof redis.on === 'function') {
  redis.on('ready', () => {
    P0AlertDebouncer.syncInMemoryToRedis().catch((err) => {
      log.warn('[P0AlertDebouncer] Automatic reconnect sync failed', { error: err });
    });
  });
}
