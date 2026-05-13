import { describe, it, expect, vi, beforeEach } from 'vitest';
import orderProcessor from '../../src/workers/processors/order.processor';

const mocks = vi.hoisted(() => {
  const mockCreateOrder = vi.fn();
  const mockOrderDbUpdate = vi.fn();
  return { mockCreateOrder, mockOrderDbUpdate };
});

vi.mock('../../src/lib/db', () => ({
  db: { 
    order: { 
      findUnique: vi.fn(), 
      update: mocks.mockOrderDbUpdate,
      findMany: vi.fn().mockResolvedValue([])
    },
    service: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  },
}));

vi.mock('../../src/services/providers/provider.service', () => ({
  providerService: {
    getWorkerProviderInstance: vi.fn().mockResolvedValue({
      createOrder: mocks.mockCreateOrder,
    }),
  },
}));

vi.mock('../../src/services/financial/refund-policy.service', () => ({
  RefundPolicyService: {
    processRefund: vi.fn(),
  },
}));

vi.mock('../../src/lib/notifications', () => ({
  sendAdminAlert: vi.fn()
}));

function fakeJob(data: any, attemptsMade = 0, maxAttempts = 3) {
  return { data, attemptsMade, opts: { attempts: maxAttempts } } as any;
}

function mockOrder(overrides: any = {}) {
  return {
    id: 'ord-red-1', userId: 'usr-1', status: 'PENDING',
    link: 'https://t.me/test', quantity: 1000, charge: 5000,
    providerCost: 2000, remains: 1000, runs: null,
    isDripFeed: false, externalId: null, dripExternalIds: [],
    waitingUntil: null, customData: null,
    serviceId: 'srv-1',
    service: {
      name: 'Telegram Followers',
      externalId: '12345',
      provider: { id: 'p1', apiUrl: 'https://api.example.com', apiKey: 'key' },
    },
    ...overrides,
  };
}

describe('Red Team: BullMQ Retry & Partial Failure Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should gracefully handle 3x 500 Provider errors then succeed on 4th attempt without double charge', async () => {
    const { db } = await import('../../src/lib/db');
    const order = mockOrder();
    vi.mocked(db.order.findUnique).mockResolvedValue(order);
    mocks.mockOrderDbUpdate.mockResolvedValue({ ...order, status: 'IN_PROGRESS' });

    // Attempt 0: Network Error
    mocks.mockCreateOrder.mockRejectedValueOnce(new Error('Provider HTTP Error 500'));
    await expect(orderProcessor(fakeJob({ orderId: 'ord-red-1' }, 0, 4))).rejects.toThrow('Provider HTTP Error 500');

    // Attempt 1: Network Error
    mocks.mockCreateOrder.mockRejectedValueOnce(new Error('Provider HTTP Error 502'));
    await expect(orderProcessor(fakeJob({ orderId: 'ord-red-1' }, 1, 4))).rejects.toThrow('Provider HTTP Error 502');

    // Attempt 2: Timeout
    mocks.mockCreateOrder.mockRejectedValueOnce(new Error('Provider Request Timeout'));
    await expect(orderProcessor(fakeJob({ orderId: 'ord-red-1' }, 2, 4))).rejects.toThrow('Provider Request Timeout');

    // Attempt 3: Success!
    mocks.mockCreateOrder.mockResolvedValueOnce({ order: 'ext-999' });
    await orderProcessor(fakeJob({ orderId: 'ord-red-1' }, 3, 4));

    // Verify
    expect(mocks.mockCreateOrder).toHaveBeenCalledTimes(4); // Fired 4 times
    
    // DB Update should only happen once on success
    expect(mocks.mockOrderDbUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.mockOrderDbUpdate).toHaveBeenCalledWith({
      where: { id: 'ord-red-1' },
      data: expect.objectContaining({
        externalId: 'ext-999',
        status: 'IN_PROGRESS'
      })
    });
  });

  it('should detect Partial Failure (Worker crash mid-transaction) using provider-side deduplication', async () => {
    const { db } = await import('../../src/lib/db');
    const order = mockOrder();
    vi.mocked(db.order.findUnique).mockResolvedValue(order);

    // Context: Worker successfully fired to provider, provider created order,
    // BUT worker crashed before db.order.update(). 
    // Now BullMQ retries the job.

    // On retry, we fire the identical payload including the idempotency key (ref: order.id)
    mocks.mockCreateOrder.mockImplementation(async (payload) => {
        // We simulate a provider that uses idempotent "ref" or "custom_id"
        // If it sees the same ref, it returns the existing order ID instead of creating a new one.
        if (payload.ref === order.id || payload.custom_id === order.id) {
            return { order: 'ext-already-exists-555' };
        }
        return { order: 'ext-new-111' };
    });

    await orderProcessor(fakeJob({ orderId: 'ord-red-1' }, 1, 3));

    // The worker should transparently recover the externalId without throwing
    expect(mocks.mockOrderDbUpdate).toHaveBeenCalledWith({
      where: { id: 'ord-red-1' },
      data: expect.objectContaining({
        externalId: 'ext-already-exists-555',
        status: 'IN_PROGRESS'
      })
    });
  });
});
