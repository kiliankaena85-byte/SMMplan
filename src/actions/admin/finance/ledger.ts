'use server';

/**
 * Finance Ledger Server Action — Sprint 1.6
 *
 * Paginated ledger entries with filters.
 * Security: Admin-only route (layout enforces enforcePageRole).
 * No requireAdmin wrapper needed — page is behind /admin layout guard.
 */

import { db } from '@/lib/db';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireStaffPermission } from '@/lib/server/rbac';
import { resolveAdminTenantContext } from '@/utils/admin-tenant';

const ledgerParamsSchema = z.object({
  status:   z.enum(['ALL', 'APPROVED', 'QUARANTINE', 'REJECT', 'REJECTED']).default('ALL'),
  type:     z.enum([
    'ALL', 'TOPUP', 'ORDER_CHARGE', 'ORDER_CANCEL',
    'REFUND', 'COMPENSATION', 'ADJUSTMENT', 'REROUTE', 'PAYMENT',
    'DEBIT', // legacy alias
  ]).default('ALL'),
  period:   z.enum(['today', 'week', 'month', 'all']).default('month'),
  search:   z.string().max(255).optional(),
  cursor:   z.string().optional(),
  pageSize: z.number().int().min(1).max(200).default(50),
  tenantId: z.string().optional(),
});

export type LedgerParams = z.infer<typeof ledgerParamsSchema>;

export type LedgerEntryDTO = {
  id: string;
  userId: string;
  userEmail: string;
  adminId: string | null;
  amount: number;
  reason: string;
  status: string;
  transactionType: string;
  createdAt: string;
  tenantId?: string;
};

export type LedgerPageResult = {
  items: LedgerEntryDTO[];
  nextCursor: string | null;
  hasMore: boolean;
  totals: { approved: number; quarantine: number; refunds: number };
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

export async function getLedgerAction(params: Partial<LedgerParams>): Promise<LedgerPageResult | { success: false, error: string }> {
  try {
    return await requireStaffPermission('finance', 'view', async (admin) => {
      const p = ledgerParamsSchema.parse(params);
      const periodStart = getPeriodStart(p.period);

      const searchTrim = p.search?.trim();
      const activeTenantId = resolveAdminTenantContext(admin, p.tenantId);

      // Build type-based conditions and search using AND array to avoid OR collisions
      const andConditions: Prisma.LedgerEntryWhereInput[] = [];

      if (p.status !== 'ALL') {
        andConditions.push({ status: p.status });
      }
      if (periodStart) {
        andConditions.push({ createdAt: { gte: periodStart } });
      }
      if (activeTenantId && activeTenantId !== 'all') {
        andConditions.push({
          OR: [
            { tenantId: activeTenantId },
            { user: { tenantId: activeTenantId } },
          ],
        });
      }

      if (p.type === 'TOPUP') {
        andConditions.push({
          OR: [
            { transactionType: 'TOPUP' },
            { transactionType: 'PAYMENT', amount: { gt: 0 } },
          ],
        });
      } else if (p.type === 'ORDER_CHARGE' || p.type === 'DEBIT') {
        andConditions.push({
          OR: [
            { transactionType: 'ORDER_CHARGE' },
            { transactionType: 'PAYMENT', amount: { lt: 0 } },
          ],
        });
      } else if (p.type === 'ORDER_CANCEL') {
        andConditions.push({ transactionType: 'ORDER_CANCEL' });
      } else if (p.type === 'REFUND') {
        andConditions.push({
          OR: [
            { transactionType: 'REFUND' },
            { reason: { contains: 'авто-возврат', mode: 'insensitive' as const } },
            { reason: { contains: 'Fail-Fast', mode: 'insensitive' as const } },
          ],
        });
      } else if (p.type === 'COMPENSATION') {
        andConditions.push({ transactionType: 'COMPENSATION' });
      } else if (p.type === 'ADJUSTMENT') {
        andConditions.push({
          OR: [
            { transactionType: 'ADJUSTMENT' },
            { transactionType: 'COMPENSATION', adminId: { not: null } },
          ],
        });
      } else if (p.type === 'REROUTE') {
        andConditions.push({
          OR: [
            { transactionType: 'REROUTE' },
            { reason: { contains: 'перезапуск', mode: 'insensitive' as const } },
          ],
        });
      } else if (p.type === 'PAYMENT') {
        andConditions.push({ transactionType: 'PAYMENT' });
      }

      if (searchTrim) {
        andConditions.push({
          OR: [
            { user: { is: { email: { contains: searchTrim, mode: 'insensitive' as const } } } },
            { id: { contains: searchTrim, mode: 'insensitive' as const } },
            { idempotencyKey: { contains: searchTrim, mode: 'insensitive' as const } }
          ]
        });
      }

      const where: Prisma.LedgerEntryWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

      const { SafePagination } = await import('@/lib/pagination/safe-pagination');
      const pagination = SafePagination.sanitize({ pageSize: p.pageSize, cursor: p.cursor });
      const pageSize = pagination.take;

      const entries = await db.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pageSize + 1,
        ...(p.cursor ? { cursor: { id: p.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          userId: true,
          adminId: true,
          amount: true,
          reason: true,
          status: true,
          transactionType: true,
          createdAt: true,
          tenantId: true,
          user: {
            select: {
              email: true,
              tenantId: true,
            },
          },
        },
      });

      const hasMore = entries.length > pageSize;
      const page = hasMore ? entries.slice(0, pageSize) : entries;

      // Totals for the same where clause (summary strip)
      const [approvedAgg, quarantineAgg, refundsAgg] = await Promise.all([
        db.ledgerEntry.aggregate({ _sum: { amount: true }, where: { ...where, status: 'APPROVED', amount: { gt: 0 } } }),
        db.ledgerEntry.aggregate({ _sum: { amount: true }, where: { ...where, status: 'QUARANTINE' } }),
        db.ledgerEntry.aggregate({ _sum: { amount: true }, where: { ...where, status: 'APPROVED', amount: { lt: 0 } } }),
      ]);

      return {
        items: page.map(e => ({
          id: e.id,
          userId: e.userId,
          userEmail: e.user?.email ?? e.userId,
          adminId: e.adminId,
          amount: Number(e.amount), // BigInt → number at DTO boundary
          reason: e.reason,
          status: e.status,
          transactionType: e.transactionType || (Number(e.amount) >= 0 ? 'PAYMENT' : 'DEBIT'),
          createdAt: e.createdAt.toISOString(),
          tenantId: e.tenantId ?? e.user?.tenantId ?? 'smmplan',
        })),
        nextCursor: hasMore ? page[page.length - 1].id : null,
        hasMore,
        totals: {
          approved: Number(approvedAgg._sum?.amount ?? 0),
          quarantine: Number(quarantineAgg._sum?.amount ?? 0),
          refunds: Math.abs(Number(refundsAgg._sum?.amount ?? 0)),
        },
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки записей Ledger';
    return { success: false, error: message };
  }
}
