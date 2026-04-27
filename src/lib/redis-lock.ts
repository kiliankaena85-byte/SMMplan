import { redis } from './redis';

export class MutexManager {
  /**
   * Acquires a lock in Redis. Tries continuously until it gets the lock, 
   * or times out after maxWaitMs.
   */
  static async acquireLock(key: string, ttlMs: number, maxWaitMs: number = 5000): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const start = Date.now();
    const waitTime = 100; // ms between retries

    while (Date.now() - start < maxWaitMs) {
      // PX sets expiry in Ms. NX ensures we only set if it does not exist
      const acquired = await redis.set(lockKey, 'locked', 'PX', ttlMs, 'NX');
      
      if (acquired === 'OK') {
        return true;
      }
      
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    
    return false;
  }

  /**
   * Releases a lock in Redis. 
   */
  static async releaseLock(key: string): Promise<void> {
    const lockKey = `lock:${key}`;
    await redis.del(lockKey);
  }

  /**
   * Wrapper execute function that ensures mutual exclusion on a specific key.
   */
  static async withLock<T>(key: string, ttlMs: number, maxWaitMs: number, fn: () => Promise<T>): Promise<T> {
    const acquired = await this.acquireLock(key, ttlMs, maxWaitMs);
    if (!acquired) {
      throw new Error(`Failed to acquire lock for key: ${key}`);
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(key);
    }
  }
}
