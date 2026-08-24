import { describe, it, expect, vi, beforeEach } from 'vitest';
import syncProcessor from '../sync.processor';
import { db } from '../../../lib/db';

vi.mock('../../../lib/db', () => ({
  db: {
    provider: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
    order: {
      findMany: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (cb: any) => cb(db)),
  }
}));

vi.mock('@/lib/notifications', () => ({
  sendAdminAlert: vi.fn().mockResolvedValue(true)
}));

vi.mock('../smart-feedback-loop.processor', () => ({
  SmartFeedbackLoopProcessor: {
    runSmartFeedbackLoopTick: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/services/providers/quarantine.service', () => ({
  QuarantineService: {
    restoreExpiredQuarantines: vi.fn().mockResolvedValue(true),
    evaluateTriggerC: vi.fn().mockResolvedValue(true),
  }
}));

vi.mock('../../../services/core/order.service', () => ({
  orderService: {
    failOrderTerminal: vi.fn().mockResolvedValue(true)
  }
}));

describe('WRK-02: Zero-Start Detector in Sync Processor', () => {
  const mockJob = { name: 'sync-tick' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.provider.findMany).mockResolvedValue([{
      id: 'prov-1',
      isActive: true,
      apiUrl: 'http://test.local',
      apiKey: 'key-1'
    }] as any);
  });

  it('escalates IN_PROGRESS order to PENDING_CHECK when waitingUntil expired and remains == quantity', async () => {
    const zeroStartOrder = {
      id: 'order-zs-1',
      numericId: 2001,
      serviceId: 'svc-1',
      quantity: 100,
      remains: 100,
    };

    // 1st findMany (provider active orders) -> empty
    // 2nd findMany (orphans) -> empty
    // 3rd findMany (zero-start candidates) -> returns zeroStartOrder
    vi.mocked(db.order.findMany)
      .mockResolvedValueOnce([]) // provider active orders
      .mockResolvedValueOnce([]) // orphanOrders
      .mockResolvedValueOnce([zeroStartOrder] as any); // zeroStartCandidates

    await syncProcessor(mockJob);

    expect(db.order.update).toHaveBeenCalledWith({
      where: { id: 'order-zs-1' },
      data: {
        status: 'PENDING_CHECK',
        error: expect.stringContaining('zero-start')
      }
    });
  });

  it('does NOT escalate IN_PROGRESS order when remains < quantity (progress made)', async () => {
    const inProgressOrderWithProgress = {
      id: 'order-progress-1',
      numericId: 2002,
      serviceId: 'svc-1',
      quantity: 100,
      remains: 40, // 60 delivered, progress is happening
    };

    vi.mocked(db.order.findMany)
      .mockResolvedValueOnce([]) // provider active orders
      .mockResolvedValueOnce([]) // orphanOrders
      .mockResolvedValueOnce([inProgressOrderWithProgress] as any);

    await syncProcessor(mockJob);

    expect(db.order.update).not.toHaveBeenCalled();
  });

  it('does NOT escalate drip-feed orders (excluded from candidates query)', async () => {
    // When db.order.findMany with isDripFeed: false returns no candidates
    vi.mocked(db.order.findMany)
      .mockResolvedValueOnce([]) // provider active orders
      .mockResolvedValueOnce([]) // orphanOrders
      .mockResolvedValueOnce([]); // zeroStartCandidates (drip-feed filtered out)

    await syncProcessor(mockJob);

    expect(db.order.update).not.toHaveBeenCalled();
  });
});
