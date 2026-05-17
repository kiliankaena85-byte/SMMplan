import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedPaymentService } from './unified-payment.service';
import { db } from '@/lib/db';

// Mock DB
vi.mock('@/lib/db', () => ({
  db: {
    payment: {
      create: vi.fn().mockResolvedValue({ id: 'payment-123' }),
      update: vi.fn().mockResolvedValue({}),
    }
  }
}));

// Mock SettingsManager and SettingsProvider
vi.mock('@/lib/settings', () => ({
  SettingsManager: {
    getPaymentSecrets: vi.fn().mockResolvedValue({
      yookassaShopId: 'shop-1',
      yookassaSecretKey: 'secret-1',
      cryptoBotToken: 'token-1'
    }),
  },
  SettingsProvider: {
    getContactAndLegalSettings: vi.fn().mockResolvedValue({
      COMPANY_NAME: 'DynamicBrand',
    }),
    getSupportEmailDomain: vi.fn().mockResolvedValue('dynamicbrand.com'),
  }
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('UnifiedPaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.dynamicbrand.com';
    global.fetch = vi.fn();
  });

  it('YooKassa gateway uses dynamic brand domain for success return_url', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL; // Force fallback to supportDomain

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'remote-1',
        confirmation: { confirmation_url: 'https://yookassa.ru/pay' }
      })
    });

    const result = await UnifiedPaymentService.createPayment(
      undefined, 'user1', 500, 'Test Deposit', {}, 'yookassa'
    );

    expect(result.success).toBe(true);
    
    // Check fetch call to ensure return_url used dynamic domain
    const fetchArgs = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(fetchArgs[1].body);
    expect(payload.confirmation.return_url).toBe('https://dynamicbrand.com/dashboard');
  });

  it('CryptoBot gateway uses dynamic brand name for hidden_message', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        result: {
          invoice_id: 'invoice-1',
          pay_url: 'https://pay.crypt.bot/pay'
        }
      })
    });

    const result = await UnifiedPaymentService.createPayment(
      undefined, 'user1', 500, 'Test Deposit', {}, 'cryptobot'
    );

    expect(result.success).toBe(true);

    // Check fetch call to ensure hidden_message contains the dynamic brand
    const fetchArgs = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(fetchArgs[1].body);
    expect(payload.hidden_message).toBe('DynamicBrand Deposit');
  });
});
