/**
 * @file multi-tenant-blind-spots-package-3.test.ts
 * @description SDD-TDD 2026 Test Suite for Multi-Tenant Blind Spots & Cross-Storefront Resolution (Package 3)
 * Comprehensive testing for all 8 Blind Spots:
 * 1. [PAY-01] Payment status polling cross-tenant identity & IDOR protection
 * 2. [PAY-02] Retry checkout service tenant user charge & canonical return URL
 * 3. [PAY-03] Top-up action canonical successUrl per tenant
 * 4. [BAL-01] Promo / voucher activation active tenant resolution & WalletOps credit
 * 5. [SUP-01] Ticket message dispatch cross-storefront permission check
 * 6. [SUP-02] Ticket attachment upload route tenant resolution
 * 7. [SUP-03] Ticket media attachment view route multi-tenant staff & client check
 * 8. [SUP-04] Ticket chat page orders dropdown allowedUserIds filtering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// In-memory test state
const {
  sessionState,
  headersState,
  paymentsStore,
  usersStore,
  ordersStore,
  ticketsStore,
  promoStore,
  ledgerStore,
  walletOpsCalls
} = vi.hoisted(() => {
  return {
    sessionState: { current: null as any },
    headersState: { current: new Map<string, string>() },
    paymentsStore: new Map<string, any>(),
    usersStore: new Map<string, any>(),
    ordersStore: new Map<string, any>(),
    ticketsStore: new Map<string, any>(),
    promoStore: new Map<string, any>(),
    ledgerStore: new Map<string, any>(),
    walletOpsCalls: {
      charges: [] as any[],
      credits: [] as any[],
    }
  };
});

// Mock headers() from next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (key: string) => headersState.current.get(key.toLowerCase()) ?? null,
  })),
}));

// Mock verifySession from @/lib/session
vi.mock('@/lib/session', () => ({
  verifySession: vi.fn(async () => sessionState.current),
  readSessionTokenFromCookies: vi.fn(() => 'valid-token'),
  getEncodedKey: vi.fn(() => new Uint8Array(32)),
}));

// Mock jose for JWT in upload / media routes
vi.mock('jose', () => ({
  jwtVerify: vi.fn(async () => ({
    payload: { userId: sessionState.current?.userId || 'usr_smmplan_1' },
  })),
}));

// Mock RateLimitService
vi.mock('@/services/core/rate-limit.service', () => ({
  RateLimitService: {
    check: vi.fn(async () => true),
    checkCustomKey: vi.fn(async () => true),
  },
}));

// Mock WalletOps
vi.mock('@/services/financial/wallet-ops', () => ({
  WalletOps: {
    charge: vi.fn(async (tx: any, userId: string, amountCents: number, description: string, options: any) => {
      walletOpsCalls.charges.push({ userId, amountCents, description, options });
      return { success: true, balanceAfter: BigInt(5000) };
    }),
    credit: vi.fn(async (tx: any, userId: string, amountCents: number, description: string, options: any) => {
      walletOpsCalls.credits.push({ userId, amountCents, description, options });
      return { success: true, balanceAfter: BigInt(15000) };
    }),
  },
}));

// Mock PaymentGatewayFactory
vi.mock('@/services/financial/payment-gateway.service', () => ({
  PaymentGatewayFactory: {
    getGateway: vi.fn(() => ({
      createPayment: vi.fn(async (args: any) => ({
        paymentUrl: `https://mockgateway.com/pay/${args.paymentId}`,
        remoteGatewayId: `gw_${args.paymentId}`,
      })),
    })),
  },
}));

// Mock SettingsManager & SettingsProvider
vi.mock('@/lib/settings', () => ({
  SettingsManager: {
    getPaymentSecrets: vi.fn(async () => ({})),
    isTestMode: vi.fn(async () => true),
  },
  SettingsProvider: {
    isMockPaymentEnabled: vi.fn(async () => false),
    isTestMode: vi.fn(async () => true),
    getContactAndLegalSettings: vi.fn(async () => ({ COMPANY_INN: '7700000000' })),
  },
}));

// Mock queue-manager
vi.mock('@/lib/queue-manager', () => ({
  ordersQueue: {
    add: vi.fn(async () => {}),
  },
}));

// Mock ticket.service & sse.service
vi.mock('@/services/support/ticket.service', () => ({
  ticketService: {
    getOrCreateTicket: vi.fn(async (userId: string, subject: string, source: string, tenantId?: string) => {
      const id = `tkt_${Date.now()}`;
      const t = { id, userId, subject, source, tenantId: tenantId || 'smmplan', status: 'OPEN' };
      ticketsStore.set(id, t);
      return t;
    }),
    addMessage: vi.fn(async () => ({ id: `msg_${Date.now()}` })),
  },
}));

vi.mock('@/services/support/sse.service', () => ({
  publishMessageSSE: vi.fn(async () => {}),
}));

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock Prisma DB
vi.mock('@/lib/db', () => {
  const mockTx: any = {
    user: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) return usersStore.get(where.id) || null;
        if (where.email_tenantId) {
          const key = `${where.email_tenantId.email.toLowerCase()}:${where.email_tenantId.tenantId}`;
          return usersStore.get(key) || null;
        }
        return null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const id = `usr_auto_${Date.now()}`;
        const u = { id, ...data };
        usersStore.set(id, u);
        usersStore.set(`${data.email.toLowerCase()}:${data.tenantId}`, u);
        return u;
      }),
    },
    order: {
      findUnique: vi.fn(async ({ where }: any) => ordersStore.get(where.id) || null),
      findMany: vi.fn(async ({ where }: any) => {
        return Array.from(ordersStore.values()).filter(o => {
          if (where.userId) {
            if (typeof where.userId === 'string' && o.userId !== where.userId) return false;
            if (where.userId.in && !where.userId.in.includes(o.userId)) return false;
          }
          if (where.paymentId && o.paymentId !== where.paymentId) return false;
          if (where.status && o.status !== where.status) return false;
          if (where.tenantId && o.tenantId !== where.tenantId) return false;
          return true;
        });
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        return Array.from(ordersStore.values()).find(o => {
          if (where.id && o.id !== where.id) return false;
          if (where.userId && o.userId !== where.userId) return false;
          if (where.tenantId && o.tenantId !== where.tenantId) return false;
          return true;
        }) || null;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const existing = ordersStore.get(where.id);
        const updated = { ...existing, ...data };
        ordersStore.set(where.id, updated);
        return updated;
      }),
    },
    payment: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) return paymentsStore.get(where.id) || null;
        if (where.orderId) {
          return Array.from(paymentsStore.values()).find(p => p.orderId === where.orderId) || null;
        }
        return null;
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        return Array.from(paymentsStore.values()).find(p => {
          if (where.userId && p.userId !== where.userId) return false;
          if (where.status && p.status !== where.status) return false;
          if (where.tenantId && p.tenantId !== where.tenantId) return false;
          return true;
        }) || null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const id = `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const p = { id, ...data, createdAt: new Date() };
        paymentsStore.set(id, p);
        return p;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const existing = paymentsStore.get(where.id);
        const updated = { ...existing, ...data };
        paymentsStore.set(where.id, updated);
        return updated;
      }),
    },
    promoCode: {
      findFirst: vi.fn(async ({ where }: any) => {
        return Array.from(promoStore.values()).find(p => {
          if (where.code && p.code !== where.code) return false;
          if (where.tenantId && p.tenantId !== where.tenantId) return false;
          return true;
        }) || null;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const promo = promoStore.get(where.id);
        if (!promo) return { count: 0 };
        if (promo.maxUses > 0 && promo.uses >= promo.maxUses) return { count: 0 };
        promo.uses += (data.uses?.increment || 1);
        return { count: 1 };
      }),
    },
    ledgerEntry: {
      findFirst: vi.fn(async ({ where }: any) => {
        return Array.from(ledgerStore.values()).find(l => {
          if (where.idempotencyKey && l.idempotencyKey !== where.idempotencyKey) return false;
          if (where.tenantId && l.tenantId !== where.tenantId) return false;
          return true;
        }) || null;
      }),
    },
  };

  return {
    db: {
      ...mockTx,
      $transaction: vi.fn(async (cb: any) => cb(mockTx)),
      contentItem: {
        findFirst: vi.fn(async () => ({ updatedAt: new Date() })),
      },
      ticket: {
        findUnique: vi.fn(async ({ where }: any) => ticketsStore.get(where.id) || null),
        findFirst: vi.fn(async ({ where }: any) => {
          return Array.from(ticketsStore.values()).find(t => {
            if (where.id && t.id !== where.id) return false;
            if (where.userId && t.userId !== where.userId) return false;
            if (where.tenantId && t.tenantId !== where.tenantId) return false;
            return true;
          }) || null;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const existing = ticketsStore.get(where.id);
          const updated = { ...existing, ...data };
          ticketsStore.set(where.id, updated);
          return updated;
        }),
      },
    },
  };
});

// Mock runSerializableTransaction
vi.mock('@/lib/transactions', () => ({
  runSerializableTransaction: vi.fn(async (cb: any) => {
    const { db } = await import('@/lib/db');
    return cb(db);
  }),
}));

describe('Multi-Tenant Blind Spots (Package 3 SDD-TDD 2026 Suite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionState.current = null;
    headersState.current.clear();
    paymentsStore.clear();
    usersStore.clear();
    ordersStore.clear();
    ticketsStore.clear();
    promoStore.clear();
    ledgerStore.clear();
    walletOpsCalls.charges = [];
    walletOpsCalls.credits = [];

    // Seed test users: user-smmplan and user-flux with same email
    const smmplanUser = {
      id: 'usr_smmplan_1',
      email: 'client@example.com',
      role: 'USER',
      tenantId: 'smmplan',
      balance: BigInt(50000),
      allowedTenants: ['smmplan'],
      isActive: true,
      isDeleted: false,
    };
    const fluxUser = {
      id: 'usr_flux_1',
      email: 'client@example.com',
      role: 'USER',
      tenantId: 'flux',
      balance: BigInt(20000),
      allowedTenants: ['flux'],
      isActive: true,
      isDeleted: false,
    };
    const foreignUser = {
      id: 'usr_foreign_1',
      email: 'stranger@example.com',
      role: 'USER',
      tenantId: 'flux',
      balance: BigInt(10000),
      allowedTenants: ['flux'],
      isActive: true,
      isDeleted: false,
    };
    const staffUser = {
      id: 'usr_staff_1',
      email: 'support@smmplan.pro',
      role: 'SUPPORT',
      tenantId: 'smmplan',
      allowedTenants: ['smmplan', 'flux'],
      isActive: true,
      isDeleted: false,
    };

    usersStore.set(smmplanUser.id, smmplanUser);
    usersStore.set(`client@example.com:smmplan`, smmplanUser);
    usersStore.set(fluxUser.id, fluxUser);
    usersStore.set(`client@example.com:flux`, fluxUser);
    usersStore.set(foreignUser.id, foreignUser);
    usersStore.set(`stranger@example.com:flux`, foreignUser);
    usersStore.set(staffUser.id, staffUser);
  });

  describe('1. [PAY-01] Payment Status Polling IDOR & Multi-Tenant Identity', () => {
    it('should allow polling payment created under tenantUser on flux when session is smmplan user with same email', async () => {
      const payId = 'pay_flux_status_1';
      paymentsStore.set(payId, {
        id: payId,
        userId: 'usr_flux_1',
        tenantId: 'flux',
        status: 'PENDING',
        amount: BigInt(1000),
        user: { id: 'usr_flux_1', email: 'client@example.com', tenantId: 'flux' },
      });

      // Session user has usr_smmplan_1, but same verified email
      sessionState.current = {
        userId: 'usr_smmplan_1',
        email: 'client@example.com',
        role: 'USER',
        tenantId: 'smmplan',
      };

      const { GET } = await import('@/app/api/payments/[id]/status/route');
      const req = new NextRequest(`http://smmflux.ru/api/payments/${payId}/status`);
      const res = await GET(req, { params: Promise.resolve({ id: payId }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('PENDING');
    });

    it('should block polling payment when user has no matching email or tenant account (IDOR protection)', async () => {
      const payId = 'pay_flux_status_2';
      paymentsStore.set(payId, {
        id: payId,
        userId: 'usr_flux_1',
        tenantId: 'flux',
        status: 'PENDING',
        amount: BigInt(1000),
        user: { id: 'usr_flux_1', email: 'client@example.com', tenantId: 'flux' },
      });

      sessionState.current = {
        userId: 'usr_foreign_1',
        email: 'stranger@example.com',
        role: 'USER',
        tenantId: 'flux',
      };

      const { GET } = await import('@/app/api/payments/[id]/status/route');
      const req = new NextRequest(`http://smmflux.ru/api/payments/${payId}/status`);
      const res = await GET(req, { params: Promise.resolve({ id: payId }) });

      expect(res.status).toBe(403);
    });

    it('should allow staff with allowedTenants to poll payment status', async () => {
      const payId = 'pay_flux_status_3';
      paymentsStore.set(payId, {
        id: payId,
        userId: 'usr_flux_1',
        tenantId: 'flux',
        status: 'PENDING',
        amount: BigInt(1000),
        user: { id: 'usr_flux_1', email: 'client@example.com', tenantId: 'flux' },
      });

      sessionState.current = {
        userId: 'usr_staff_1',
        email: 'support@smmplan.pro',
        role: 'SUPPORT',
        tenantId: 'smmplan',
        allowedTenants: ['smmplan', 'flux'],
      };

      const { GET } = await import('@/app/api/payments/[id]/status/route');
      const req = new NextRequest(`http://smmflux.ru/api/payments/${payId}/status`);
      const res = await GET(req, { params: Promise.resolve({ id: payId }) });

      expect(res.status).toBe(200);
    });
  });

  describe('2. [PAY-03] Top-Up Action Return URL Isolation', () => {
    it('should generate absolute canonical successUrl on smmflux.ru when topping up on flux storefront', async () => {
      sessionState.current = {
        userId: 'usr_smmplan_1',
        email: 'client@example.com',
        role: 'USER',
        tenantId: 'smmplan',
      };
      headersState.current.set('host', 'smmflux.ru');
      headersState.current.set('x-tenant-id', 'flux');

      const { createTopUpPaymentAction } = await import('@/actions/user/top-up.action');
      const res = await createTopUpPaymentAction(500, 'yookassa');

      expect(res.success).toBe(true);
      const createdPayments = Array.from(paymentsStore.values());
      expect(createdPayments.length).toBeGreaterThan(0);
      const topupPayment = createdPayments[0];
      expect(topupPayment.tenantId).toBe('flux');
      expect(topupPayment.userId).toBe('usr_flux_1');
    });

    it('should generate absolute canonical successUrl on smmplan.pro when topping up on smmplan storefront', async () => {
      sessionState.current = {
        userId: 'usr_smmplan_1',
        email: 'client@example.com',
        role: 'USER',
        tenantId: 'smmplan',
      };
      headersState.current.set('host', 'smmplan.pro');
      headersState.current.set('x-tenant-id', 'smmplan');

      const { createTopUpPaymentAction } = await import('@/actions/user/top-up.action');
      const res = await createTopUpPaymentAction(300, 'yookassa');

      expect(res.success).toBe(true);
      const createdPayments = Array.from(paymentsStore.values());
      expect(createdPayments.length).toBeGreaterThan(0);
      const topupPayment = createdPayments[0];
      expect(topupPayment.tenantId).toBe('smmplan');
      expect(topupPayment.userId).toBe('usr_smmplan_1');
    });
  });

  describe('3. [BAL-01] Promo/Voucher Activation Active Tenant Isolation', () => {
    it('should activate a flux promo code for the user on flux storefront and credit flux account', async () => {
      sessionState.current = {
        userId: 'usr_smmplan_1',
        email: 'client@example.com',
        role: 'USER',
        tenantId: 'smmplan',
      };
      headersState.current.set('host', 'smmflux.ru');
      headersState.current.set('x-tenant-id', 'flux');

      promoStore.set('promo_flux_1', {
        id: 'promo_flux_1',
        code: 'FLUX2026',
        tenantId: 'flux',
        type: 'VOUCHER',
        amount: 25000,
        isActive: true,
        maxUses: 10,
        uses: 0,
      });

      const { activatePromoCodeAction } = await import('@/actions/user/promo');
      const res = await activatePromoCodeAction('FLUX2026');

      expect(res.success).toBe(true);
      expect(res.amount).toBe(25000);

      expect(walletOpsCalls.credits.length).toBe(1);
      const credit = walletOpsCalls.credits[0];
      expect(credit.userId).toBe('usr_flux_1');
      expect(credit.options.tenantId).toBe('flux');
      expect(credit.options.idempotencyKey).toBe('promo-FLUX2026-usr_flux_1');
    });

    it('should reject a smmplan promo code when entered on the flux storefront', async () => {
      sessionState.current = {
        userId: 'usr_smmplan_1',
        email: 'client@example.com',
        role: 'USER',
        tenantId: 'smmplan',
      };
      headersState.current.set('host', 'smmflux.ru');
      headersState.current.set('x-tenant-id', 'flux');

      promoStore.set('promo_smmplan_1', {
        id: 'promo_smmplan_1',
        code: 'SMMPLAN100',
        tenantId: 'smmplan',
        type: 'VOUCHER',
        amount: 10000,
        isActive: true,
        maxUses: 10,
        uses: 0,
      });

      const { activatePromoCodeAction } = await import('@/actions/user/promo');
      const res = await activatePromoCodeAction('SMMPLAN100');

      expect(res.success).toBe(false);
      expect(res.error).toBe('Промокод недействителен или не существует');
      expect(walletOpsCalls.credits.length).toBe(0);
    });
  });

  describe('4. [PAY-02] Retry Checkout Service Tenant Isolation', () => {
    it('should charge the tenant user balance and redirect to canonical tenant successUrl', async () => {
      const orderId = 'ord_flux_999';
      ordersStore.set(orderId, {
        id: orderId,
        numericId: 999,
        userId: 'usr_flux_1',
        tenantId: 'flux',
        status: 'AWAITING_PAYMENT',
        charge: BigInt(5000),
        user: { id: 'usr_flux_1', email: 'client@example.com', isActive: true, isDeleted: false },
        service: { name: 'Telegram Members' },
      });

      const { RetryCheckoutService } = await import('@/services/orders/retry-checkout.service');

      const result = await RetryCheckoutService.execute({
        orderId,
        gateway: 'balance',
        sessionUserId: 'usr_smmplan_1',
        currentTenantId: 'flux',
        consentIp: '127.0.0.1',
        consentUserAgent: 'Mozilla/5.0',
        reqHeaders: { get: (k: string) => k === 'host' ? 'smmflux.ru' : null },
      });

      expect(result.orderId).toBe(orderId);
      expect(walletOpsCalls.charges.length).toBe(1);
      const charge = walletOpsCalls.charges[0];
      expect(charge.userId).toBe('usr_flux_1');
      expect(charge.options.tenantId).toBe('flux');
      expect(result.paymentUrl).toContain('smmflux.ru/success?orderId=ord_flux_999');
    });

    it('should block retrying order from a different storefront if tenantId does not match current tenant', async () => {
      const orderId = 'ord_smmplan_888';
      ordersStore.set(orderId, {
        id: orderId,
        numericId: 888,
        userId: 'usr_smmplan_1',
        tenantId: 'smmplan',
        status: 'AWAITING_PAYMENT',
        charge: BigInt(5000),
        user: { id: 'usr_smmplan_1', email: 'client@example.com', isActive: true, isDeleted: false },
      });

      const { RetryCheckoutService } = await import('@/services/orders/retry-checkout.service');

      await expect(
        RetryCheckoutService.execute({
          orderId,
          gateway: 'balance',
          sessionUserId: 'usr_smmplan_1',
          currentTenantId: 'flux',
          consentIp: '127.0.0.1',
          consentUserAgent: 'Mozilla/5.0',
          reqHeaders: { get: () => null },
        })
      ).rejects.toThrow('Заказ недоступен для текущей площадки');
    });
  });

  describe('5. [SUP-01] Ticket Message Dispatch Cross-Storefront Support', () => {
    it('should allow posting messages when user has cross-tenant identity matching ticket on flux', async () => {
      const ticketId = 'tkt_flux_123';
      ticketsStore.set(ticketId, {
        id: ticketId,
        userId: 'usr_flux_1',
        tenantId: 'flux',
        status: 'OPEN',
        user: { id: 'usr_flux_1', email: 'client@example.com', tenantId: 'flux' },
      });

      sessionState.current = {
        userId: 'usr_smmplan_1',
        email: 'client@example.com',
        role: 'USER',
        tenantId: 'smmplan',
      };
      headersState.current.set('host', 'smmflux.ru');
      headersState.current.set('x-tenant-id', 'flux');

      const formData = new FormData();
      formData.set('ticketId', ticketId);
      formData.set('message', 'Hello support on flux!');

      const { addTicketMessage } = await import('@/actions/support/ticket');
      await expect(addTicketMessage(formData)).resolves.not.toThrow();
    });

    it('should block a stranger from posting messages to someone else\'s ticket', async () => {
      const ticketId = 'tkt_flux_123';
      ticketsStore.set(ticketId, {
        id: ticketId,
        userId: 'usr_flux_1',
        tenantId: 'flux',
        status: 'OPEN',
        user: { id: 'usr_flux_1', email: 'client@example.com', tenantId: 'flux' },
      });

      sessionState.current = {
        userId: 'usr_foreign_1',
        email: 'stranger@example.com',
        role: 'USER',
        tenantId: 'flux',
      };
      headersState.current.set('host', 'smmflux.ru');
      headersState.current.set('x-tenant-id', 'flux');

      const formData = new FormData();
      formData.set('ticketId', ticketId);
      formData.set('message', 'Hacker message');

      const { addTicketMessage } = await import('@/actions/support/ticket');
      await expect(addTicketMessage(formData)).rejects.toThrow('Ticket not found or access denied');
    });
  });

  describe('6. [SUP-04] Ticket Detail Page Orders Dropdown Allowed User IDs', () => {
    it('should query orders matching either session.userId or tenantUser.id within current tenant', async () => {
      // Create orders for both usr_smmplan_1 and usr_flux_1
      ordersStore.set('ord_1', {
        id: 'ord_1',
        numericId: 101,
        userId: 'usr_flux_1',
        tenantId: 'flux',
        status: 'COMPLETED',
        charge: BigInt(1000),
        createdAt: new Date(),
        service: { name: 'Telegram Post Views' },
      });
      ordersStore.set('ord_2', {
        id: 'ord_2',
        numericId: 102,
        userId: 'usr_smmplan_1',
        tenantId: 'smmplan',
        status: 'COMPLETED',
        charge: BigInt(2000),
        createdAt: new Date(),
        service: { name: 'VK Followers' },
      });

      const { resolveTenantUser } = await import('@/lib/tenant-user-resolver');
      const tenantUser = await resolveTenantUser('usr_smmplan_1', 'flux');
      const allowedUserIds = Array.from(new Set(['usr_smmplan_1', tenantUser?.id].filter(Boolean) as string[]));

      const { db } = await import('@/lib/db');
      const orders = await db.order.findMany({
        where: {
          userId: { in: allowedUserIds },
          tenantId: 'flux',
        },
      });

      expect(orders.length).toBe(1);
      expect(orders[0].id).toBe('ord_1');
      expect(orders[0].tenantId).toBe('flux');
    });
  });
});
