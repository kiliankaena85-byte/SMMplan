/**
 * (c) 2024-2026 SMMplan. All rights reserved.
 * Bulkhead Concurrency Limiter & Compartment Isolation Pattern (NIST SP 800-207).
 *
 * Prevents cascading failures and resource exhaustion by isolating concurrency
 * limits per external provider, payment gateway, and multi-tenant compartment.
 */

import { getRedisConnection } from '@/lib/queue-manager';

export type BulkheadResult<T> =
  | { success: true; data: T }
  | { success: false; status: 'BULKHEAD_FULL'; error?: string };

export class BulkheadSemaphore {
  public static readonly DEFAULT_MAX_CONCURRENT = 5;
  private static readonly HOLD_TTL_SEC = 20;

  /**
   * Attempts to acquire a concurrency slot in the designated compartment.
   * @param compartmentId Unique identifier for the compartment (e.g. 'tenant:smmplan' or 'provider:123')
   * @param maxConcurrent Maximum concurrent slots allowed in this compartment
   */
  static async acquireSlot(
    compartmentId: string,
    maxConcurrent = BulkheadSemaphore.DEFAULT_MAX_CONCURRENT
  ): Promise<boolean> {
    const redis = getRedisConnection();
    const key = `bulkhead:${compartmentId}:active`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, this.HOLD_TTL_SEC);
    }

    if (count > maxConcurrent) {
      await redis.decr(key);
      return false; // Compartment saturated
    }

    return true;
  }

  /**
   * Releases an acquired slot in the designated compartment.
   * @param compartmentId Unique identifier for the compartment
   */
  static async releaseSlot(compartmentId: string): Promise<void> {
    const redis = getRedisConnection();
    const key = `bulkhead:${compartmentId}:active`;
    const current = await redis.decr(key);
    if (current < 0) {
      await redis.set(key, '0');
    }
  }

  /**
   * Executes an asynchronous task within the bounded bulkhead compartment.
   * Returns `{ success: false, status: 'BULKHEAD_FULL' }` if the compartment is saturated.
   */
  static async execute<T>(
    compartmentId: string,
    task: () => Promise<T>,
    maxConcurrent = BulkheadSemaphore.DEFAULT_MAX_CONCURRENT
  ): Promise<BulkheadResult<T>> {
    const acquired = await this.acquireSlot(compartmentId, maxConcurrent);
    if (!acquired) {
      return { success: false, status: 'BULKHEAD_FULL', error: `Bulkhead compartment saturated for ${compartmentId}` };
    }
    try {
      const data = await task();
      return { success: true, data };
    } finally {
      await this.releaseSlot(compartmentId);
    }
  }

  /**
   * Retrieves active concurrency count in the designated compartment.
   */
  static async getActiveCount(compartmentId: string): Promise<number> {
    const redis = getRedisConnection();
    const key = `bulkhead:${compartmentId}:active`;
    const raw = await redis.get(key);
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  }

  /**
   * Resets active concurrency slots for the compartment.
   */
  static async reset(compartmentId: string): Promise<void> {
    const redis = getRedisConnection();
    const key = `bulkhead:${compartmentId}:active`;
    await redis.del(key);
  }
}
