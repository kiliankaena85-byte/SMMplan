import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runWatchdogCheck } from '@/lib/daemons/watchdog-daemon';
import { redis } from '@/lib/redis';
import { ordersQueue } from '@/lib/queue-manager';
import { db } from '@/lib/db';
import { DirectEmergencyAlertService } from '@/lib/notifications/direct-emergency-alert.service';

vi.mock('@/lib/redis', () => ({
  redis: {
    ping: vi.fn(),
    get: vi.fn()
  }
}));

vi.mock('@/lib/queue-manager', () => ({
  ordersQueue: {
    getWaitingCount: vi.fn()
  }
}));

vi.mock('@/lib/db', () => ({
  db: {
    order: {
      findMany: vi.fn()
    }
  }
}));

vi.mock('@/lib/notifications/direct-emergency-alert.service', () => ({
  DirectEmergencyAlertService: {
    sendRedisFailureAlert: vi.fn().mockResolvedValue({ success: true }),
    sendWorkerDownAlert: vi.fn().mockResolvedValue({ success: true }),
    sendStuckOrdersAlert: vi.fn().mockResolvedValue({ success: true })
  }
}));

describe('WatchdogDaemon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should report healthy when Redis, Worker heartbeat, and DB queues are normal', async () => {
    vi.mocked(redis.ping).mockResolvedValue('PONG');
    vi.mocked(ordersQueue.getWaitingCount).mockResolvedValue(0);
    vi.mocked(redis.get).mockResolvedValue((Date.now() - 10_000).toString()); // 10s ago
    vi.mocked(db.order.findMany).mockResolvedValue([]);

    const result = await runWatchdogCheck();

    expect(result.redisOk).toBe(true);
    expect(result.workerOk).toBe(true);
    expect(result.stuckOrdersCount).toBe(0);
    expect(DirectEmergencyAlertService.sendWorkerDownAlert).not.toHaveBeenCalled();
    expect(DirectEmergencyAlertService.sendStuckOrdersAlert).not.toHaveBeenCalled();
  });

  it('should alert and return workerOk=false when heartbeat is stale', async () => {
    vi.mocked(redis.ping).mockResolvedValue('PONG');
    vi.mocked(ordersQueue.getWaitingCount).mockResolvedValue(5);
    vi.mocked(redis.get).mockResolvedValue((Date.now() - 300_000).toString()); // 5m ago (> 120s)
    vi.mocked(db.order.findMany).mockResolvedValue([]);

    const result = await runWatchdogCheck();

    expect(result.redisOk).toBe(true);
    expect(result.workerOk).toBe(false);
    expect(DirectEmergencyAlertService.sendWorkerDownAlert).toHaveBeenCalledWith(
      expect.any(Number),
      5
    );
  });

  it('should detect and alert when orders are stuck in PENDING > 10m', async () => {
    vi.mocked(redis.ping).mockResolvedValue('PONG');
    vi.mocked(ordersQueue.getWaitingCount).mockResolvedValue(0);
    vi.mocked(redis.get).mockResolvedValue(Date.now().toString());
    vi.mocked(db.order.findMany).mockResolvedValue([
      { id: 'ord_1', numericId: 370, createdAt: new Date(Date.now() - 15 * 60 * 1000) }
    ] as any);

    const result = await runWatchdogCheck();

    expect(result.stuckOrdersCount).toBe(1);
    expect(DirectEmergencyAlertService.sendStuckOrdersAlert).toHaveBeenCalledWith(
      1,
      expect.any(Number),
      [370]
    );
  });
});
