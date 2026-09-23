import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckoutPaymentService } from '@/services/orders/checkout-payment.service';
import type { User } from '@prisma/client';
import type { DbServiceWithCategory } from '@/services/orders/checkout-preflight-guard.service';

const mockCreatePayment = vi.fn().mockResolvedValue({
  remoteGatewayId: 'gw_123',
  paymentUrl: 'https://payment-provider.example/pay',
});

vi.mock('@/services/financial/payment-gateway.service', () => ({
  PaymentGatewayFactory: {
    getGateway: vi.fn(() => ({
      createPayment: mockCreatePayment,
    })),
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    payment: {
      update: vi.fn().mockResolvedValue({ id: 'pay_1' }),
    },
    order: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    promoCode: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

vi.mock('@/lib/settings', () => ({
  SettingsProvider: {
    isMockPaymentEnabled: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock('@/lib/session', () => ({
  createSession: vi.fn().mockResolvedValue({}),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: vi.fn(),
    get: vi.fn(),
  })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'usr-1',
    email: 'user@smmplan.pro',
    passwordHash: null,
    role: 'USER',
    preferredDashboard: 'CLASSIC',
    balance: BigInt(0),
    quarantineBalance: BigInt(0),
    totalSpent: BigInt(0),
    personalDiscount: 0,
    discountEndsAt: null,
    supportLimitCents: 50000,
    supportSpentTodayCents: 0,
    supportLastResetAt: new Date(),
    apiKeyHash: null,
    referralCode: null,
    referredById: null,
    referralBalance: 0,
    telegramId: null,
    phoneHash: null,
    isKycVerified: false,
    isEmailVerified: true,
    isBotOnly: false,
    isActive: true,
    isDeleted: false,
    termsAcceptedAt: new Date(),
    privacyAcceptedAt: new Date(),
    termsVersion: '1.0',
    twoFactorSecret: null,
    twoFactorEnabled: false,
    twoFactorConfirmedAt: null,
    twoFactorBackupCodes: [],
    backupCodesUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenantId: 'smmplan',
    ...overrides,
  } as unknown as User;
}

function createMockService(overrides: Partial<DbServiceWithCategory> = {}): DbServiceWithCategory {
  return {
    id: 'srv-1',
    numericId: 101,
    name: 'Telegram Subscribers',
    category: 'Subscribers',
    categoryId: 'cat-1',
    providerId: 'prv-1',
    providerServiceId: '101',
    rate: '100',
    min: 10,
    max: 10000,
    dripfeed: false,
    refill: false,
    cancel: false,
    type: 'Default',
    targetType: 'CHANNEL',
    pricePerUnitRub: 0.1,
    antiLossPercentage: 0,
    isActive: true,
    requiresCustomComments: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as DbServiceWithCategory;
}

describe('VULN-01: CheckoutPaymentService Multi-Tenant Gateway Return URL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate successUrl pointing to smmplan.pro for smmplan tenant', async () => {
    await CheckoutPaymentService.dispatch({
      result: {
        orderId: 'ord-smmplan-100',
        paymentId: 'pay-smmplan-100',
        numericId: 10001,
        remainingBalanceCents: null,
      },
      user: createMockUser({ id: 'usr-1', email: 'user@smmplan.pro', tenantId: 'smmplan' }),
      service: createMockService({ id: 'srv-1', name: 'Telegram Subscribers' }),
      gateway: 'yookassa',
      isNewUser: false,
      isTestMode: false,
      finalTotalCents: 50000,
      paymentAmount: 50000,
      email: 'user@smmplan.pro',
      link: 'https://t.me/testchannel',
      tenantId: 'smmplan',
    });

    expect(mockCreatePayment).toHaveBeenCalledTimes(1);
    expect(mockCreatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'smmplan',
        successUrl: 'https://smmplan.pro/success?orderId=ord-smmplan-100',
      })
    );
  });

  it('should generate successUrl pointing to smmflux.ru for flux tenant', async () => {
    await CheckoutPaymentService.dispatch({
      result: {
        orderId: 'ord-flux-200',
        paymentId: 'pay-flux-200',
        numericId: 20002,
        remainingBalanceCents: null,
      },
      user: createMockUser({ id: 'usr-2', email: 'user@smmflux.ru', tenantId: 'flux' }),
      service: createMockService({ id: 'srv-2', name: 'VK Likes' }),
      gateway: 'yookassa',
      isNewUser: false,
      isTestMode: false,
      finalTotalCents: 75000,
      paymentAmount: 75000,
      email: 'user@smmflux.ru',
      link: 'https://vk.com/wall-1_1',
      tenantId: 'flux',
    });

    expect(mockCreatePayment).toHaveBeenCalledTimes(1);
    expect(mockCreatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'flux',
        successUrl: 'https://smmflux.ru/success?orderId=ord-flux-200',
      })
    );
  });

  it('should preserve https protocol and prevent cross-tenant domain leak', async () => {
    await CheckoutPaymentService.dispatch({
      result: {
        orderId: 'ord-flux-999',
        paymentId: 'pay-flux-999',
        numericId: 99999,
        remainingBalanceCents: null,
      },
      user: createMockUser({ id: 'usr-3', email: 'buyer@smmflux.ru', tenantId: 'flux' }),
      service: createMockService({ id: 'srv-3', name: 'Instagram Followers' }),
      gateway: 'robokassa',
      isNewUser: false,
      isTestMode: false,
      finalTotalCents: 30000,
      paymentAmount: 30000,
      email: 'buyer@smmflux.ru',
      link: 'https://instagram.com/profile',
      tenantId: 'flux',
    });

    const passedSuccessUrl: string = mockCreatePayment.mock.calls[0][0].successUrl;
    expect(passedSuccessUrl).toBe('https://smmflux.ru/success?orderId=ord-flux-999');
    expect(passedSuccessUrl).not.toContain('smmplan.pro');
  });
});
