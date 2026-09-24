import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkFingerprintPoolLimit } from '@/lib/security/ddos-shield/token-bucket-pool';
import { MutexManager } from '@/lib/redis-lock';
import { paginatedQuery } from '@/lib/pagination';

describe('Performance, DB & Queue Remediation Suite (SPEC-2026-09-24)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PERF-01: Redis Pipeline in Token Bucket Sliding Window', () => {
    it('executes sliding window checks via a pipeline in a single roundtrip', async () => {
      const mockPipeline = {
        zremrangebyscore: vi.fn().mockReturnThis(),
        zcard: vi.fn().mockReturnThis(),
        zadd: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [null, 0], // zremrangebyscore
          [null, 5], // zcard
          [null, 1], // zadd
          [null, 1], // expire
        ]),
      };

      const mockRedisClient: any = {
        pipeline: vi.fn().mockReturnValue(mockPipeline),
        zremrangebyscore: vi.fn(),
        zcard: vi.fn(),
        zadd: vi.fn(),
        expire: vi.fn(),
      };

      const result = await checkFingerprintPoolLimit(
        'fp_test_123',
        'smmplan',
        120,
        60,
        mockRedisClient
      );

      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.zremrangebyscore).toHaveBeenCalled();
      expect(mockPipeline.zcard).toHaveBeenCalled();
      expect(mockPipeline.zadd).toHaveBeenCalled();
      expect(mockPipeline.expire).toHaveBeenCalled();
      expect(mockPipeline.exec).toHaveBeenCalled();
      expect(result.isAllowed).toBe(true);
      expect(result.remaining).toBe(120 - 6);
    });

    it('rejects request when current count exceeds maxRequests', async () => {
      const mockPipeline = {
        zremrangebyscore: vi.fn().mockReturnThis(),
        zcard: vi.fn().mockReturnThis(),
        zadd: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [null, 0], // zremrangebyscore
          [null, 125], // zcard: 125 >= 120
          [null, 1],
          [null, 1],
        ]),
      };

      const mockRedisClient: any = {
        pipeline: vi.fn().mockReturnValue(mockPipeline),
      };

      const result = await checkFingerprintPoolLimit(
        'fp_test_overload',
        'smmplan',
        120,
        60,
        mockRedisClient
      );

      expect(result.isAllowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('QUEUE-04: Redis Mutex Fencing Key TTL Expiry', () => {
    it('sets TTL on fenceKey during acquireLockWithFencing to prevent key leaks', async () => {
      const { redis } = await import('@/lib/redis');
      const setSpy = vi.spyOn(redis, 'set').mockResolvedValue('OK' as any);
      const incrSpy = vi.spyOn(redis, 'incr').mockResolvedValue(42 as any);
      const expireSpy = vi.spyOn(redis, 'expire').mockResolvedValue(1 as any);

      const lockData = await MutexManager.acquireLockWithFencing('test_resource', 5000, 100);

      expect(lockData).not.toBeNull();
      expect(lockData?.fencingToken).toBe(42);
      expect(expireSpy).toHaveBeenCalledWith(
        expect.stringContaining('fence:lock:test_resource'),
        expect.any(Number)
      );

      setSpy.mockRestore();
      incrSpy.mockRestore();
      expireSpy.mockRestore();
    });
  });

  describe('DB-04: Cursor Pagination skips expensive model.count()', () => {
    it('does not invoke model.count() when cursor is present', async () => {
      const mockModel = {
        findMany: vi.fn().mockResolvedValue([
          { id: 'cuid_1', name: 'Order 1' },
          { id: 'cuid_2', name: 'Order 2' },
        ]),
        count: vi.fn().mockResolvedValue(1000000),
      };

      const result = await paginatedQuery(mockModel as any, {
        cursor: 'cuid_1',
        pageSize: 10,
        where: { tenantId: 'smmplan' },
      });

      expect(mockModel.findMany).toHaveBeenCalled();
      expect(mockModel.count).not.toHaveBeenCalled();
      expect(result.items.length).toBe(2);
      expect(result.totalCount).toBe(-1); // Skipped to protect DB from Seq Scan
    });

    it('invokes model.count() when page-based offset pagination is used', async () => {
      const mockModel = {
        findMany: vi.fn().mockResolvedValue([
          { id: 'cuid_1', name: 'Order 1' },
        ]),
        count: vi.fn().mockResolvedValue(42),
      };

      const result = await paginatedQuery(mockModel as any, {
        page: 1,
        pageSize: 10,
        where: { tenantId: 'smmplan' },
      });

      expect(mockModel.findMany).toHaveBeenCalled();
      expect(mockModel.count).toHaveBeenCalled();
      expect(result.totalCount).toBe(42);
    });
  });

  describe('QUEUE-02: Stale Job Cleanup on Orphan Re-enqueue', () => {
    it('removes stale failed job before calling ordersQueue.add', async () => {
      const { reEnqueueOrphanOrder } = await import('@/workers/processors/sync.processor');

      const mockStaleJob = {
        getState: vi.fn().mockResolvedValue('failed'),
        remove: vi.fn().mockResolvedValue(undefined),
      };

      const mockQueue: any = {
        getJob: vi.fn().mockResolvedValue(mockStaleJob),
        add: vi.fn().mockResolvedValue({ id: 'dispatch-order-123' }),
      };

      const enqueued = await reEnqueueOrphanOrder(mockQueue, { id: 'order-123', numericId: 456 });

      expect(mockQueue.getJob).toHaveBeenCalledWith('dispatch-order-123');
      expect(mockStaleJob.getState).toHaveBeenCalled();
      expect(mockStaleJob.remove).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith(
        'order-dispatch',
        { orderId: 'order-123' },
        { jobId: 'dispatch-order-123' }
      );
      expect(enqueued).toBe(true);
    });

    it('skips re-enqueueing if job is active or waiting', async () => {
      const { reEnqueueOrphanOrder } = await import('@/workers/processors/sync.processor');

      const mockActiveJob = {
        getState: vi.fn().mockResolvedValue('active'),
        remove: vi.fn().mockResolvedValue(undefined),
      };

      const mockQueue: any = {
        getJob: vi.fn().mockResolvedValue(mockActiveJob),
        add: vi.fn(),
      };

      const enqueued = await reEnqueueOrphanOrder(mockQueue, { id: 'order-live', numericId: 789 });

      expect(mockQueue.getJob).toHaveBeenCalledWith('dispatch-order-live');
      expect(mockActiveJob.remove).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(enqueued).toBe(false);
    });
  });

  describe('BUG-01: Dispatched Guard Auto-Healing with Preserved externalId', () => {
    it('auto-heals order to IN_PROGRESS when Redis contains valid provider externalId', async () => {
      const { handleDispatchedGuard } = await import('@/workers/processors/order.processor');

      const mockConnection: any = {
        get: vi.fn().mockResolvedValue('PROVIDER_EXT_7890'),
      };
      const mockDb: any = {
        order: {
          update: vi.fn().mockResolvedValue({ id: 'ord_1', status: 'IN_PROGRESS' }),
        },
      };

      const healed = await handleDispatchedGuard('ord_1', mockConnection, mockDb);

      expect(healed).toBe(true);
      expect(mockDb.order.update).toHaveBeenCalledWith({
        where: { id: 'ord_1' },
        data: {
          externalId: 'PROVIDER_EXT_7890',
          status: 'IN_PROGRESS',
          error: null,
        },
      });
    });

    it('returns false for in-flight guard flag "1" to proceed with critical alert and PENDING_CHECK', async () => {
      const { handleDispatchedGuard } = await import('@/workers/processors/order.processor');

      const mockConnection: any = {
        get: vi.fn().mockResolvedValue('1'),
      };
      const mockDb: any = {
        order: {
          update: vi.fn(),
        },
      };

      const healed = await handleDispatchedGuard('ord_2', mockConnection, mockDb);

      expect(healed).toBe(false);
      expect(mockDb.order.update).not.toHaveBeenCalled();
    });
  });

  describe('BUG-02: Safe Fire-and-Forget Debit Email Notification', () => {
    it('does not reject or throw unhandled errors even if SMTP fails', async () => {
      const { sendOrderDebitNotificationSafe } = await import('@/services/core/order.service');

      const mockDb: any = {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            email: 'user@example.com',
            balance: BigInt(50000),
            tenantId: 'smmplan',
          }),
        },
        service: {
          findUnique: vi.fn().mockResolvedValue({
            name: 'Telegram Followers',
          }),
        },
      };

      const failingSmtp = vi.fn().mockRejectedValue(new Error('SMTP Connection Refused'));

      await expect(
        sendOrderDebitNotificationSafe(
          'user_123',
          'service_456',
          789,
          BigInt(1000),
          mockDb,
          failingSmtp
        )
      ).resolves.not.toThrow();
    });
  });
});

