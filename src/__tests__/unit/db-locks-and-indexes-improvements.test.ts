import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { auditAdminAwaitable, auditAdmin } from '@/lib/admin-audit';
import { AnalyticsBufferService, ANALYTICS_BUFFER_KEY } from '@/services/analytics/analytics-buffer.service';
import { VestingManagerService } from '@/services/bonus/vesting-manager.service';
import { EscrowService } from '@/services/admin/escrow.service';

vi.mock('@/lib/db', () => {
  const fakeTx = {
    ticket: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    user: {
      update: vi.fn().mockResolvedValue({ id: 'user-1' }),
      findUnique: vi.fn().mockResolvedValue({ id: 'user-1', balance: BigInt(100), quarantineBalance: BigInt(50), tenantId: 'smmplan' }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'user-1', balance: BigInt(100), quarantineBalance: BigInt(50), tenantId: 'smmplan' }),
    },
    ticketMessage: { update: vi.fn().mockResolvedValue({ id: 'msg-1' }) },
    bonusRedemptionLog: { update: vi.fn().mockResolvedValue({ id: 'bonus-1' }) },
    ledgerEntry: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'entry-1', userId: 'user-1', amount: BigInt(50), tenantId: 'smmplan' }),
      create: vi.fn().mockResolvedValue({ id: 'entry-1' }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    $executeRaw: vi.fn().mockResolvedValue(1),
    adminAuditLog: { create: vi.fn() },
  };

  return {
    db: {
      analyticsEvent: {
        create: vi.fn().mockResolvedValue({ id: 'evt-1' }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      adminAuditLog: {
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
      },
      ticketMessage: {
        update: vi.fn().mockResolvedValue({ id: 'msg-1' }),
        findUnique: vi.fn(),
      },
      ticket: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'user-1' }),
      },
      bonusRedemptionLog: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'bonus-1' }),
      },
      ledgerEntry: {
        findUniqueOrThrow: vi.fn(),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn(async (callback) => {
        return await callback(fakeTx);
      }),
      $executeRaw: vi.fn().mockResolvedValue(1),
    },
  };
});

vi.mock('@/lib/transactions', () => ({
  runSerializableTransaction: vi.fn(async (callback) => {
    return await db.$transaction(callback as any);
  }),
}));

vi.mock('@/services/financial/wallet-ops', () => ({
  WalletOps: {
    quarantineRelease: vi.fn().mockResolvedValue(undefined),
    credit: vi.fn().mockResolvedValue({ success: true }),
    charge: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/lib/redis', () => ({
  redis: {
    rpush: vi.fn().mockResolvedValue(1),
    lpop: vi.fn().mockResolvedValue(null),
    lpush: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('@/lib/admin-audit', () => ({
  auditAdmin: vi.fn(),
  auditAdminAwaitable: vi.fn().mockResolvedValue({ id: 'audit-1' }),
}));

describe('P0/P1/P2 Database Performance, Locks, and Analytics Invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('P0: Transaction Lock Freeing', () => {
    it('confiscateBonus runs serializable transaction first, then executes auditAdminAwaitable outside', async () => {
      vi.mocked(db.bonusRedemptionLog.findUnique).mockResolvedValueOnce({
        id: 'bonus-123',
        userId: 'user-456',
        amountCents: BigInt(500),
        status: 'LOCKED',
        tenantId: 'smmplan',
      } as any);

      const executionOrder: string[] = [];
      vi.mocked(db.$transaction).mockImplementationOnce(async (cb: any) => {
        executionOrder.push('transaction_start');
        const res = await cb({
          bonusRedemptionLog: { update: vi.fn().mockResolvedValue({}) },
          user: { update: vi.fn().mockResolvedValue({}) },
        });
        executionOrder.push('transaction_committed');
        return res;
      });

      vi.mocked(auditAdminAwaitable).mockImplementationOnce(async () => {
        executionOrder.push('audit_called');
        return { id: 'audit-log-1' } as any;
      });

      const res = await VestingManagerService.confiscateBonus('bonus-123', 'Fraudulent referral', 'admin-1');

      expect(res).toEqual({ success: true });
      expect(executionOrder).toEqual(['transaction_start', 'transaction_committed', 'audit_called']);
      expect(auditAdminAwaitable).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BONUS_CONFISCATED',
          adminId: 'admin-1',
          target: 'user-456',
          tenantId: 'smmplan',
        })
      );
    });

    it('resolveQuarantine runs transaction first, then executes awaitable audit outside transaction', async () => {
      const escrow = new EscrowService();
      const executionOrder: string[] = [];

      vi.mocked(db.$transaction).mockImplementationOnce(async (cb: any) => {
        executionOrder.push('tx_started');
        const fakeTx = {
          $executeRaw: vi.fn().mockResolvedValue(1),
          ledgerEntry: {
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              id: 'entry-999',
              userId: 'user-888',
              amount: BigInt(1000),
              tenantId: 'smmplan',
            }),
          },
          user: {
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              id: 'user-888',
              balance: BigInt(5000),
              quarantineBalance: BigInt(1000),
              tenantId: 'smmplan',
            }),
            update: vi.fn().mockResolvedValue({}),
          },
        };
        const res = await cb(fakeTx);
        executionOrder.push('tx_committed');
        return res;
      });

      vi.mocked(auditAdminAwaitable).mockImplementationOnce(async () => {
        executionOrder.push('audit_logged');
        return { id: 'audit-escrow-1' } as any;
      });

      await escrow.resolveQuarantine(
        'entry-999',
        'APPROVE',
        { id: 'owner-1', email: 'owner@smmplan.pro' },
        '127.0.0.1'
      );

      expect(executionOrder).toEqual(['tx_started', 'tx_committed', 'audit_logged']);
      expect(auditAdminAwaitable).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUARANTINE_APPROVE',
          target: 'entry-999',
          adminId: 'owner-1',
          tenantId: 'smmplan',
        })
      );
    });
  });

  describe('P2: Analytics Buffering and Zero-Loss Flushing', () => {
    it('buffers analytics events in Redis buffer:analytics_events with fallback on failure', async () => {
      const { POST } = await import('@/app/api/analytics/route');

      const req = new Request('http://127.0.0.1:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'host': '127.0.0.1:3000',
          'origin': 'http://127.0.0.1:3000',
        },
        body: JSON.stringify({
          event: 'page_view',
          metadata: { path: '/catalog' },
          sessionId: 'test-session-123',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(redis.rpush).toHaveBeenCalledWith(
        ANALYTICS_BUFFER_KEY,
        expect.stringContaining('page_view')
      );
    });

    it('falls back to db.analyticsEvent.create when Redis throws', async () => {
      vi.mocked(redis.rpush).mockRejectedValueOnce(new Error('Redis connection failure'));
      const { POST } = await import('@/app/api/analytics/route');

      const req = new Request('http://127.0.0.1:3000/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'host': '127.0.0.1:3000',
          'origin': 'http://127.0.0.1:3000',
        },
        body: JSON.stringify({
          event: 'page_view',
          metadata: { path: '/catalog' },
          sessionId: 'test-session-123',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(db.analyticsEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            event: 'page_view',
          }),
        })
      );
    });

    it('flushes buffered events from Redis to Postgres in batches', async () => {
      const item1 = JSON.stringify({ event: 'page_view', metadata: { url: '/' }, createdAt: new Date().toISOString() });
      const item2 = JSON.stringify({ event: 'service_selected', metadata: { serviceId: '1' }, createdAt: new Date().toISOString() });

      vi.mocked(redis.lpop)
        .mockResolvedValueOnce(item1 as any)
        .mockResolvedValueOnce(item2 as any)
        .mockResolvedValueOnce(null as any);

      const count = await AnalyticsBufferService.flush(100);

      expect(count).toBe(2);
      expect(db.analyticsEvent.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ event: 'page_view' }),
          expect.objectContaining({ event: 'service_selected' }),
        ]),
      });
    });

    it('guarantees zero telemetry loss by restoring items to Redis if db.createMany fails', async () => {
      const item1 = JSON.stringify({ event: 'page_view', metadata: { url: '/' } });
      const item2 = JSON.stringify({ event: 'order_started', metadata: {} });

      vi.mocked(redis.lpop)
        .mockResolvedValueOnce(item1 as any)
        .mockResolvedValueOnce(item2 as any)
        .mockResolvedValueOnce(null as any);

      vi.mocked(db.analyticsEvent.createMany).mockRejectedValueOnce(new Error('DB connection refused'));

      await expect(AnalyticsBufferService.flush(100)).rejects.toThrow('DB connection refused');

      // Crucial invariant: items MUST be restored to Redis buffer
      expect(redis.lpush).toHaveBeenCalledWith(
        ANALYTICS_BUFFER_KEY,
        item2,
        item1
      );
    });
  });
});
