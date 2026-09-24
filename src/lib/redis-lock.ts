import { redis } from './redis';
import crypto from 'crypto';

const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
`;

const EXTEND_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("pexpire", KEYS[1], ARGV[2])
else
    return 0
end
`;

export class LockLostError extends Error {
  readonly isLockLost = true;
  constructor(key: string, message?: string) {
    super(message || `Lock was lost during execution for key: ${key}`);
    this.name = 'LockLostError';
  }
}

export interface LockContext {
  token: string;
  fencingToken: number;
  isLockValid: () => Promise<boolean>;
  assertLockValid: () => Promise<void>;
}

export class MutexManager {
  /**
   * Acquires a lock in Redis with a unique owner token and a monotonic fencing token.
   * Returns { token, fencingToken } if acquired, null if timed out.
   */
  static async acquireLockWithFencing(
    key: string,
    ttlMs: number,
    maxWaitMs: number = 5000
  ): Promise<{ token: string; fencingToken: number } | null> {
    const lockKey = key.startsWith('lock:') ? key : `lock:${key}`;
    const token = crypto.randomUUID();
    const start = Date.now();
    const waitTime = 50; // ms between retries

    while (Date.now() - start < maxWaitMs) {
      const acquired = await redis.set(lockKey, token, 'PX', ttlMs, 'NX');
      if (acquired === 'OK') {
        const fenceKey = `fence:${lockKey}`;
        let fencingToken = 1;
        try {
          fencingToken = await redis.incr(fenceKey);
          const fenceTtlSec = Math.max(300, Math.ceil(ttlMs / 1000) * 5);
          await redis.expire(fenceKey, fenceTtlSec);
        } catch {
          fencingToken = Date.now();
        }
        return { token, fencingToken };
      }
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    return null;
  }

  /**
   * Acquires a lock in Redis with a unique owner token.
   * Returns the owner token if acquired, null if timed out.
   */
  static async acquireLock(key: string, ttlMs: number, maxWaitMs: number = 5000): Promise<string | null> {
    const result = await this.acquireLockWithFencing(key, ttlMs, maxWaitMs);
    return result ? result.token : null;
  }

  /**
   * Checks whether the given token currently owns the lock in Redis.
   */
  static async isLockOwner(key: string, token: string): Promise<boolean> {
    if (!token) return false;
    const lockKey = key.startsWith('lock:') ? key : `lock:${key}`;
    try {
      const current = await redis.get(lockKey);
      return current === token;
    } catch {
      return false;
    }
  }

  /**
   * Extends the TTL of an active lock if and only if the caller owns the lock token.
   */
  static async extendLock(key: string, token: string, extraTtlMs: number): Promise<boolean> {
    if (!token) return false;
    const lockKey = key.startsWith('lock:') ? key : `lock:${key}`;
    try {
      const result = await redis.eval(EXTEND_LOCK_LUA, 1, lockKey, token, extraTtlMs);
      return result === 1;
    } catch {
      return false;
    }
  }

  /**
   * Releases a lock in Redis safely via Lua script compare-and-delete.
   * Prevents removing a lock owned by another process after TTL expiry.
   */
  static async releaseLock(key: string, token: string): Promise<boolean> {
    if (!token) return false;
    const lockKey = key.startsWith('lock:') ? key : `lock:${key}`;
    try {
      const result = await redis.eval(RELEASE_LOCK_LUA, 1, lockKey, token);
      return result === 1;
    } catch {
      return false;
    }
  }

  /**
   * Wrapper execute function that ensures mutual exclusion on a specific key.
   * Periodically extends the lock TTL in the background and validates fencing ownership to prevent split-brain writes.
   */
  static async withLock<T>(
    key: string,
    ttlMs: number,
    maxWaitMs: number,
    fn: (context: LockContext) => Promise<T>
  ): Promise<T> {
    const lockData = await this.acquireLockWithFencing(key, ttlMs, maxWaitMs);
    if (!lockData) {
      throw new Error(`Failed to acquire lock for key: ${key}`);
    }

    const { token, fencingToken } = lockData;
    let lockLost = false;

    const intervalMs = Math.max(100, Math.floor(ttlMs / 3));
    const heartbeatTimer = setInterval(async () => {
      try {
        const extended = await this.extendLock(key, token, ttlMs);
        if (!extended) {
          lockLost = true;
        }
      } catch {
        lockLost = true;
      }
    }, intervalMs);

    const isLockValid = async (): Promise<boolean> => {
      if (lockLost) return false;
      return await this.isLockOwner(key, token);
    };

    const assertLockValid = async (): Promise<void> => {
      const valid = await isLockValid();
      if (!valid) {
        throw new LockLostError(key);
      }
    };

    const context: LockContext = {
      token,
      fencingToken,
      isLockValid,
      assertLockValid,
    };

    try {
      const result = await fn(context);
      if (lockLost || !(await this.isLockOwner(key, token))) {
        throw new LockLostError(key);
      }
      return result;
    } finally {
      clearInterval(heartbeatTimer);
      await this.releaseLock(key, token);
    }
  }
}
