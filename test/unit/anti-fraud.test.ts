import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTopUpPaymentAction } from '@/actions/user/top-up.action';
import { checkoutAction } from '@/actions/order/checkout';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { marketingService } from '@/services/marketing.service';

vi.mock('@/lib/db', () => ({
  db: {
    service: { findUnique: vi.fn() },
    user: { upsert: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    order: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    payment: { create: vi.fn(), update: vi.fn(), aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
    promoCode: { findUnique: vi.fn(), update: vi.fn() },
    session: { create: vi.fn() },
    systemSettings: { findUnique: vi.fn() },
    contentItem: { findUnique: vi.fn() },
    $transaction: vi.fn(async (cb) => cb(db)),
  }
}));

vi.mock('@/services/core/rate-limit.service', () => ({
  RateLimitService: {
    check: vi.fn().mockResolvedValue(true),
  }
}));

vi.mock('@/lib/settings', () => ({
  SettingsManager: {
    isTestMode: vi.fn().mockResolvedValue(false), // Disable test mode to test real gateways
    getPaymentSecrets: vi.fn().mockResolvedValue({
      yookassaShopId: 'shop123',
      yookassaSecretKey: 'key123',
      cryptoBotToken: 'token123'
    })
  },
  SettingsProvider: {
    getSupportEmailDomain: vi.fn().mockResolvedValue('smmplan.local'),
    getContactAndLegalSettings: vi.fn().mockResolvedValue({ COMPANY_NAME: 'SMMplan' }),
    getExchangeRateUSD: vi.fn().mockResolvedValue(100),
  }
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('test-agent')
  })
}));

vi.mock('@/utils/ip', () => ({
  getClientIp: vi.fn().mockResolvedValue('127.0.0.1')
}));

vi.mock('@/lib/session', () => ({
  verifySession: vi.fn(),
  createSession: vi.fn().mockResolvedValue({}),
  getEncodedKey: vi.fn().mockReturnValue(new TextEncoder().encode('secretsecretsecretsecretsecretsecretsecret')),
}));

vi.mock('@/services/marketing.service', () => ({
  marketingService: {
    calculatePrice: vi.fn().mockResolvedValue({
      totalCents: 1000,
      originalTotalCents: 1000,
      discountCents: 0,
      discountPercent: 0,
      providerCostCents: 500,
      safetyFloorCents: 700,
      tier: 'REGULAR'
    }),
    consumePromoCode: vi.fn()
  }
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Anti-Fraud Telegram-Bound Card Limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Top-Up Limits (createTopUpPaymentAction)', () => {
    it('should block YooKassa card payment > $20 (180,000 cents) if user does not have telegramId', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: 'user_123' });
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user_123',
        telegramId: null
      } as any);

      // 1801 RUB = 180,100 cents (> 180,000 cents limit)
      await expect(createTopUpPaymentAction(1801, 'yookassa')).rejects.toThrow(
        'Для совершения платежей свыше $20 картой, пожалуйста, привяжите ваш Telegram-аккаунт в личном кабинете. Либо воспользуйтесь криптовалютой (без ограничений)'
      );
    });

    it('should allow YooKassa card payment <= $20 (180,000 cents) even if user does not have telegramId', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: 'user_123' });
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user_123',
        telegramId: null
      } as any);

      vi.mocked(db.payment.create).mockResolvedValue({ id: 'pay_new' } as any);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'yookassa_payment_id', confirmation: { confirmation_url: 'https://yookassa.ru/confirm' } })
      }));

      // 1800 RUB = 180,000 cents (<= 180,000 cents limit)
      const res = await createTopUpPaymentAction(1800, 'yookassa');
      expect(res.success).toBe(true);
      expect(res.paymentUrl).toBe('https://yookassa.ru/confirm');
    });

    it('should allow YooKassa card payment > $20 if user has telegramId linked', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: 'user_123' });
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user_123',
        telegramId: '123456789'
      } as any);

      vi.mocked(db.payment.create).mockResolvedValue({ id: 'pay_new' } as any);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'yookassa_payment_id', confirmation: { confirmation_url: 'https://yookassa.ru/confirm' } })
      }));

      // 1900 RUB > $20
      const res = await createTopUpPaymentAction(1900, 'yookassa');
      expect(res.success).toBe(true);
      expect(res.paymentUrl).toBe('https://yookassa.ru/confirm');
    });

    it('should allow CryptoBot payment > $20 even if user does not have telegramId linked', async () => {
      vi.mocked(verifySession).mockResolvedValue({ userId: 'user_123' });
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user_123',
        telegramId: null
      } as any);

      vi.mocked(db.payment.create).mockResolvedValue({ id: 'pay_new' } as any);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { invoice_id: 12345, bot_invoice_url: 'https://t.me/CryptoBot?start=invoice' } })
      }));

      // 5000 RUB
      const res = await createTopUpPaymentAction(5000, 'cryptobot');
      expect(res.success).toBe(true);
      expect(res.paymentUrl).toBe('https://t.me/CryptoBot?start=invoice');
    });
  });

  describe('Checkout Limits (checkoutAction)', () => {
    it('should block YooKassa checkout > $20 if user does not have telegramId', async () => {
      vi.mocked(db.service.findUnique).mockResolvedValue({ 
        id: 'svc_123', isActive: true, externalId: 'ext_1', minQty: 1, maxQty: 1000, providerId: 'p1',
        category: { network: { name: 'Telegram' } }
      } as any);

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user_123',
        telegramId: null,
        email: 'test@test.com'
      } as any);

      // Force pricing total to exceed $20 (180,000 cents)
      vi.mocked(marketingService.calculatePrice).mockResolvedValue({
        totalCents: 180001,
        originalTotalCents: 180001,
        discountCents: 0,
        discountPercent: 0,
        providerCostCents: 500,
        safetyFloorCents: 700,
        tier: 'REGULAR'
      });

      const res = await checkoutAction({
        serviceId: 'svc_123',
        link: 'https://t.me/test',
        quantity: 1000,
        email: 'test@test.com',
        gateway: 'yookassa'
      });

      expect(res.success).toBe(false);
      expect((res as any).error).toContain(
        'Для совершения платежей свыше $20 картой, пожалуйста, привяжите ваш Telegram-аккаунт в личном кабинете. Либо воспользуйтесь криптовалютой (без ограничений)'
      );
    });

    it('should allow YooKassa checkout > $20 if user has telegramId linked', async () => {
      vi.mocked(db.service.findUnique).mockResolvedValue({ 
        id: 'svc_123', isActive: true, externalId: 'ext_1', minQty: 1, maxQty: 100000, providerId: 'p1',
        category: { network: { name: 'Telegram' } }
      } as any);

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user_123',
        telegramId: '123456789',
        email: 'test@test.com'
      } as any);

      vi.mocked(db.order.create).mockResolvedValue({ id: 'order_new', charge: BigInt(185000) } as any);
      vi.mocked(db.payment.create).mockResolvedValue({ id: 'pay_new' } as any);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'yookassa_payment_id', confirmation: { confirmation_url: 'https://yookassa.ru/confirm' } })
      }));

      // Force pricing total to exceed $20 (180,000 cents)
      vi.mocked(marketingService.calculatePrice).mockResolvedValue({
        totalCents: 185000,
        originalTotalCents: 185000,
        discountCents: 0,
        discountPercent: 0,
        providerCostCents: 500,
        safetyFloorCents: 700,
        tier: 'REGULAR'
      });

      const res = await checkoutAction({
        serviceId: 'svc_123',
        link: 'https://t.me/test',
        quantity: 1000,
        email: 'test@test.com',
        gateway: 'yookassa'
      });

      expect(res.success).toBe(true);
      expect((res as any).data.paymentUrl).toBe('https://yookassa.ru/confirm');
    });

    it('should allow CryptoBot checkout > $20 even if user does not have telegramId linked', async () => {
      vi.mocked(db.service.findUnique).mockResolvedValue({ 
        id: 'svc_123', isActive: true, externalId: 'ext_1', minQty: 1, maxQty: 100000, providerId: 'p1',
        category: { network: { name: 'Telegram' } }
      } as any);

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user_123',
        telegramId: null,
        email: 'test@test.com'
      } as any);

      vi.mocked(db.order.create).mockResolvedValue({ id: 'order_new', charge: BigInt(185000) } as any);
      vi.mocked(db.payment.create).mockResolvedValue({ id: 'pay_new' } as any);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { invoice_id: 12345, pay_url: 'https://t.me/CryptoBot?start=invoice', bot_invoice_url: 'https://t.me/CryptoBot?start=invoice' } })
      }));

      // Force pricing total to exceed $20 (180,000 cents)
      vi.mocked(marketingService.calculatePrice).mockResolvedValue({
        totalCents: 185000,
        originalTotalCents: 185000,
        discountCents: 0,
        discountPercent: 0,
        providerCostCents: 500,
        safetyFloorCents: 700,
        tier: 'REGULAR'
      });

      const res = await checkoutAction({
        serviceId: 'svc_123',
        link: 'https://t.me/test',
        quantity: 1000,
        email: 'test@test.com',
        gateway: 'cryptobot'
      });

      expect(res.success).toBe(true);
      expect((res as any).data.paymentUrl).toBe('https://t.me/CryptoBot?start=invoice');
    });
  });
});
