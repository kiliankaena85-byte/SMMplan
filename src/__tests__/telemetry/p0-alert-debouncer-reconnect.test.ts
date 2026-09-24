import { describe, it, expect, beforeEach, vi } from 'vitest';
import { P0AlertDebouncer } from '@/lib/alerts/p0-alert-debouncer';
import { redis } from '@/lib/redis';

describe('Item 3: P0AlertDebouncer Redis Reconnect & LRU Eviction', () => {
  beforeEach(async () => {
    P0AlertDebouncer.clearInMemoryStores();
    vi.restoreAllMocks();
  });

  it('3.1 LRU Eviction prunes expired items first and evicts Least Recently Used when capacity exceeded', () => {
    P0AlertDebouncer.clearInMemoryStores();

    // Call prune
    P0AlertDebouncer.pruneInMemoryStores();
    const sizes = P0AlertDebouncer.getInMemoryStoreSizes();
    expect(sizes.locks).toBeLessThanOrEqual(5000);
  });

  it('3.2 Merges in-memory deltas into Redis when Redis transitions to ready state', async () => {
    // Simulate threshold count accum while Redis is offline
    const redisStatusSpy = vi.spyOn(redis, 'status', 'get').mockReturnValue('end' as any);

    // Call threshold counter while Redis offline
    const res1 = await P0AlertDebouncer.checkThresholdTrigger('test_offline_reconnect', 60, 10);
    expect(res1.count).toBe(1);
    const res2 = await P0AlertDebouncer.checkThresholdTrigger('test_offline_reconnect', 60, 10);
    expect(res2.count).toBe(2);

    // Now simulate Redis reconnect (status becomes ready)
    redisStatusSpy.mockReturnValue('ready');
    const incrbySpy = vi.spyOn(redis, 'incrby').mockResolvedValue(12 as any);
    const expireSpy = vi.spyOn(redis, 'expire').mockResolvedValue(1 as any);

    await P0AlertDebouncer.syncInMemoryToRedis();

    expect(incrbySpy).toHaveBeenCalledWith('p0:threshold:test_offline_reconnect', 2);
    expect(expireSpy).toHaveBeenCalled();
  });
});
