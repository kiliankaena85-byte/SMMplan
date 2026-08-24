import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type Service } from '@prisma/client';

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

const mockHeadersStore = new Headers({
  'x-forwarded-for': '127.0.0.1',
  'user-agent': 'vitest',
  'x-tenant-id': 'smmplan'
});

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => mockHeadersStore),
  cookies: vi.fn(async () => mockCookieStore),
}));

// Mock verifySession to return null (guest)
vi.mock('@/lib/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/session')>();
  return {
    ...actual,
    verifySession: vi.fn(async () => null),
    createSession: vi.fn(async () => {}),
  };
});

// Mock queue so it doesn't push real jobs
vi.mock('@/lib/queue-manager', () => ({
  paymentGatewayQueue: {
    add: vi.fn(async () => {}),
  },
}));

import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { massOrderCheckoutAction, structuredMassOrderCheckoutAction } from '@/actions/order/mass';

describe('D0.2: Mass Order Guest PasswordHash Shield (CHK-02)', () => {
  let service: Service;

  beforeEach(async () => {
    // Clear rate limits
    await db.rateLimit.deleteMany();
    if (redis.status === 'ready') {
      await redis.del('ratelimit:massCheckoutCore:127.0.0.1');
    }

    const network = await db.network.upsert({
      where: { name: 'Telegram' },
      create: { name: 'Telegram', slug: 'telegram' },
      update: {},
    });

    const category = await db.category.create({
      data: { name: 'Mass Shield Category', networkId: network.id }
    });

    service = await db.service.create({
      data: {
        name: 'Mass Test Service',
        categoryId: category.id,
        rate: 50 / 95,
        markup: 3,
        minQty: 10,
        maxQty: 5000,
        isActive: true,
        targetType: 'POST',
      }
    });
  });

  it('blocks guest from mass ordering with an email of a password-protected user in massOrderCheckoutAction', async () => {
    const protectedEmail = 'protected-user-mass@example.com';
    await db.user.create({
      data: {
        email: protectedEmail,
        passwordHash: '$2b$10$hashedpasswordstringforsecurity',
        tenantId: 'smmplan',
        role: 'USER',
      }
    });

    const orderText = `${service.numericId} | https://t.me/channel_name/100 | 50`;
    const res = await massOrderCheckoutAction({
      text: orderText,
      email: protectedEmail,
      gateway: 'yookassa',
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toContain('Этот email уже зарегистрирован в системе. Пожалуйста, войдите в свой аккаунт');
    }
  });

  it('blocks guest from ordering with email of a password-protected user in structuredMassOrderCheckoutAction', async () => {
    const protectedEmail = 'structured-protected-user@example.com';
    await db.user.create({
      data: {
        email: protectedEmail,
        passwordHash: '$2b$10$hashedpasswordstringforsecurity',
        tenantId: 'smmplan',
        role: 'USER',
      }
    });

    const res = await structuredMassOrderCheckoutAction({
      orders: [
        {
          serviceId: service.id,
          link: 'https://t.me/channel_name/100',
          quantity: 50,
        }
      ],
      email: protectedEmail,
      gateway: 'yookassa',
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toContain('Этот email уже зарегистрирован в системе. Пожалуйста, войдите в свой аккаунт');
    }
  });

  it('allows guest to mass order if user has no passwordHash (guest profile)', async () => {
    const guestEmail = 'pure-guest-mass@example.com';
    await db.user.create({
      data: {
        email: guestEmail,
        passwordHash: null,
        tenantId: 'smmplan',
        role: 'USER',
      }
    });

    const orderText = `${service.numericId} | https://t.me/channel_name/100 | 50`;
    const res = await massOrderCheckoutAction({
      text: orderText,
      email: guestEmail,
      gateway: 'yookassa',
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.paymentId).toBeDefined();
    }
  });
});
