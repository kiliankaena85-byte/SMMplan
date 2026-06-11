import { describe, it, expect, vi, beforeEach } from 'vitest';
import paymentSyncProcessor from '../payment-sync';
import { db } from '../../../lib/db';
import { SettingsManager } from '../../../lib/settings';
import { paymentService } from '../../../services/financial/payment.service';

vi.mock('../../../lib/db', () => ({
  db: {
    payment: { findMany: vi.fn(), update: vi.fn() }
  }
}));

vi.mock('../../../lib/settings', () => ({
  SettingsManager: {
    isTestMode: vi.fn(),
    getPaymentSecrets: vi.fn()
  }
}));

vi.mock('../../../services/financial/payment.service', () => ({
  paymentService: {
    confirmPayment: vi.fn().mockResolvedValue(true)
  }
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Payment Sync Processor', () => {
  const mockJob = { name: 'payment-sync' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test mode early exit', async () => {
    vi.mocked(db.payment.findMany).mockResolvedValue([{ id: 'p1' }] as any);
    vi.mocked(SettingsManager.isTestMode).mockResolvedValue(true);

    await paymentSyncProcessor(mockJob);

    expect(SettingsManager.getPaymentSecrets).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('Succeeded remote payment (confirms locally)', async () => {
    vi.mocked(db.payment.findMany).mockResolvedValue([{
      id: 'p1',
      gatewayId: 'yoo1',
      userId: 'u1'
    }] as any);
    vi.mocked(SettingsManager.isTestMode).mockResolvedValue(false);
    vi.mocked(SettingsManager.getPaymentSecrets).mockResolvedValue({
      yookassaShopId: 'shop1',
      yookassaSecretKey: 'secret1'
    } as any);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'succeeded',
        amount: { value: '10.50' }
      })
    });

    await paymentSyncProcessor(mockJob);

    expect(mockFetch).toHaveBeenCalledWith('https://api.yookassa.ru/v3/payments/yoo1', expect.any(Object));
    expect(paymentService.confirmPayment).toHaveBeenCalledWith('yoo1', 1050, 'u1', false, 'yookassa', 'p1');
  });

  it('Canceled remote payment', async () => {
    vi.mocked(db.payment.findMany).mockResolvedValue([{
      id: 'p1',
      gatewayId: 'yoo1',
      userId: 'u1'
    }] as any);
    vi.mocked(SettingsManager.isTestMode).mockResolvedValue(false);
    vi.mocked(SettingsManager.getPaymentSecrets).mockResolvedValue({
      yookassaShopId: 'shop1',
      yookassaSecretKey: 'secret1'
    } as any);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'canceled'
      })
    });

    await paymentSyncProcessor(mockJob);

    expect(db.payment.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: 'CANCELED' }
    });
  });
});
