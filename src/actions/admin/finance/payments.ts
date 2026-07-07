'use server';

/**
 * Admin Payments Server Action — Dispute Pack & Registry
 *
 * Security: Staff permission check ('finance', 'view').
 */

import { db } from '@/lib/db';
import { z } from 'zod';
import { requireStaffPermission } from '@/lib/server/rbac';
import { resolveAdminTenantContext } from '@/utils/admin-tenant';

const paymentsParamsSchema = z.object({
  status:   z.enum(['ALL', 'PENDING', 'SUCCEEDED', 'CANCELED']).default('ALL'),
  period:   z.enum(['today', 'week', 'month', 'all']).default('month'),
  search:   z.string().max(255).optional(),
  cursor:   z.string().optional(),
  pageSize: z.number().int().min(1).max(200).default(50),
  tenantId: z.string().optional(),
});

export type PaymentsParams = z.infer<typeof paymentsParamsSchema>;

export type PaymentDTO = {
  id: string;
  userId: string;
  userEmail: string;
  amount: number; // in Cents at DB layer, passed as number
  currency: string;
  status: string;
  gateway: string;
  gatewayId: string | null;
  consentIp: string | null;
  consentUserAgent: string | null;
  createdAt: string;
  tenantId: string;
};

export type PaymentsPageResult = {
  items: PaymentDTO[];
  nextCursor: string | null;
  hasMore: boolean;
};

function getPeriodStart(period: string): Date | undefined {
  const now = new Date();
  if (period === 'today') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (period === 'month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d;
  }
  return undefined;
}

export async function getPaymentsAction(params: Partial<PaymentsParams>): Promise<PaymentsPageResult | { success: false, error: string }> {
  return requireStaffPermission('finance', 'view', async (admin) => {
    const p = paymentsParamsSchema.parse(params);
    const periodStart = getPeriodStart(p.period);

    const searchTrim = p.search?.trim();
    const activeTenantId = resolveAdminTenantContext(admin, p.tenantId);

    const where = {
      ...(p.status !== 'ALL' ? { status: p.status } : {}),
      ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
      ...(activeTenantId && activeTenantId !== 'all' ? { tenantId: activeTenantId } : {}),
      ...(searchTrim ? {
        OR: [
          { user: { is: { email: { contains: searchTrim, mode: 'insensitive' as const } } } },
          { id: { contains: searchTrim, mode: 'insensitive' as const } },
          { gatewayId: { contains: searchTrim, mode: 'insensitive' as const } }
        ]
      } : {}),
    };

    const pageSize = p.pageSize;
    const payments = await db.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: pageSize + 1,
      ...(p.cursor ? { cursor: { id: p.cursor }, skip: 1 } : {}),
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    const hasMore = payments.length > pageSize;
    const page = hasMore ? payments.slice(0, pageSize) : payments;

    return {
      items: page.map(e => ({
        id: e.id,
        userId: e.userId,
        userEmail: e.user?.email ?? 'Unknown',
        amount: Number(e.amount),
        currency: e.currency,
        status: e.status,
        gateway: e.gateway,
        gatewayId: e.gatewayId,
        consentIp: e.consentIp,
        consentUserAgent: e.consentUserAgent,
        createdAt: e.createdAt.toISOString(),
        tenantId: e.tenantId,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
      hasMore,
    };
  });
}

type DisputePackOrderDTO = {
  id: string;
  numericId: number;
  serviceName: string;
  link: string;
  quantity: number;
  charge: number; // Cents
  status: string;
  remains: number;
  createdAt: string;
};

export type PaymentDisputePackDTO = {
  payment: PaymentDTO;
  user: {
    id: string;
    email: string;
    createdAt: string;
    totalSpent: number; // Cents
    balance: number; // Cents
  };
  orders: DisputePackOrderDTO[];
};

export async function getPaymentDisputePackAction(paymentId: string): Promise<PaymentDisputePackDTO | { success: false, error: string }> {
  return requireStaffPermission('finance', 'view', async (): Promise<PaymentDisputePackDTO | { success: false; error: string }> => {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            totalSpent: true,
            balance: true,
          },
        },
        orders: {
          include: {
            service: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return { success: false, error: 'Платеж не найден' };
    }

    if (!payment.user) {
      return { success: false, error: 'Пользователь не связан с платежом' };
    }

    // Capture associated orders (either direct or post-deposit orders)
    let associatedOrders = payment.orders;
    if (associatedOrders.length === 0) {
      // Direct deposit top-up: find orders created by this user right after the payment was initiated (up to 7 days)
      associatedOrders = await db.order.findMany({
        where: {
          userId: payment.userId,
          createdAt: {
            gte: payment.createdAt,
            lte: new Date(payment.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days window
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 20,
        include: {
          service: {
            select: {
              name: true,
            },
          },
        },
      });
    }

    return {
      payment: {
        id: payment.id,
        userId: payment.userId,
        userEmail: payment.user.email,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        gateway: payment.gateway,
        gatewayId: payment.gatewayId,
        consentIp: payment.consentIp,
        consentUserAgent: payment.consentUserAgent,
        createdAt: payment.createdAt.toISOString(),
        tenantId: payment.tenantId,
      },
      user: {
        id: payment.user.id,
        email: payment.user.email,
        createdAt: payment.user.createdAt.toISOString(),
        totalSpent: Number(payment.user.totalSpent),
        balance: Number(payment.user.balance),
      },
      orders: associatedOrders.map(o => ({
        id: o.id,
        numericId: o.numericId,
        serviceName: o.service?.name ?? 'Unknown Service',
        link: o.link,
        quantity: o.quantity,
        charge: Number(o.charge),
        status: o.status,
        remains: o.remains,
        createdAt: o.createdAt.toISOString(),
      })),
    };
  });
}
