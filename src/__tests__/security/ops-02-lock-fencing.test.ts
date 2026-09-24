import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MutexManager, LockLostError } from '@/lib/redis-lock';
import { redis } from '@/lib/redis';

describe('OPS-02: Distributed Lock Fencing Token & Split-Brain Prevention', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
  });

  it('allocates monotonically increasing fencing tokens upon lock acquisition', async () => {
    const lockKey = 'test-fencing-task';
    const first = await MutexManager.acquireLockWithFencing(lockKey, 5000);
    expect(first).not.toBeNull();
    expect(first?.fencingToken).toBeGreaterThan(0);

    await MutexManager.releaseLock(lockKey, first!.token);

    const second = await MutexManager.acquireLockWithFencing(lockKey, 5000);
    expect(second).not.toBeNull();
    expect(second!.fencingToken).toBeGreaterThan(first!.fencingToken);

    await MutexManager.releaseLock(lockKey, second!.token);
  });

  it('passes LockContext into withLock and allows explicit assertLockValid()', async () => {
    let capturedFencingToken = 0;

    const res = await MutexManager.withLock('test-context-task', 5000, 1000, async (ctx) => {
      capturedFencingToken = ctx.fencingToken;
      expect(await ctx.isLockValid()).toBe(true);
      await ctx.assertLockValid(); // Should not throw
      return 'OK';
    });

    expect(res).toBe('OK');
    expect(capturedFencingToken).toBeGreaterThan(0);
  });

  it('detects stolen/expired lock during execution and throws LockLostError', async () => {
    const lockKey = 'test-split-brain-key';

    await expect(
      MutexManager.withLock(lockKey, 5000, 1000, async (ctx) => {
        // Simulate another process stealing the lock in Redis while this worker is running
        await redis.set(`lock:${lockKey}`, 'stolen-by-other-worker', 'PX', 5000);

        // Explicit check fails
        await expect(ctx.assertLockValid()).rejects.toThrow(LockLostError);

        return 'should_fail';
      })
    ).rejects.toThrow(LockLostError);
  });
});
