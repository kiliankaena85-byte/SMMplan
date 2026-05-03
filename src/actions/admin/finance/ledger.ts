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
import { requireStaffPermission } from '@/lib/server/rbac';

const ledgerParamsSchema = z.object({
  status:   z.enum(['ALL', 'APPROVED', 'QUARANTINE', 'REJECT']).default('ALL'),
  period:   z.enum(['today', 'week', 'month', 'all']).default('month'),
  search:   z.string().max(255).optional(),
  cursor:   z.string().optional(),
  pageSize: z.number().int().min(1).max(200).default(50),
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
  createdAt: string;
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
  return requireStaffPermission('finance', 'view', async () => {
    const p = ledgerParamsSchema.parse(params);
    const periodStart = getPeriodStart(p.period);

    // Resolve search → userId list
    let userIds: string[] | undefined;
    if (p.search?.trim()) {
      const found = await db.user.findMany({
        where: { email: { contains: p.search.trim(), mode: 'insensitive' } },
        select: { id: true },
        take: 100,
      });
      userIds = found.map(u => u.id);
      if (userIds.length === 0) {
        return { items: [], nextCursor: null, hasMore: false, totals: { approved: 0, quarantine: 0, refunds: 0 } };
      }
    }

    const where = {
      ...(p.status !== 'ALL' ? { status: p.status } : {}),
      ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
      ...(userIds ? { userId: { in: userIds } } : {}),
    };

    const pageSize = p.pageSize;
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
        createdAt: true,
      },
    });

    const hasMore = entries.length > pageSize;
    const page = hasMore ? entries.slice(0, pageSize) : entries;

    // Enrich with user email
    const uIds = Array.from(new Set(page.map(e => e.userId)));
    const users = await db.user.findMany({
      where: { id: { in: uIds } },
      select: { id: true, email: true },
    });
    const emailMap = new Map(users.map(u => [u.id, u.email]));

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
        userEmail: emailMap.get(e.userId) ?? e.userId,
        adminId: e.adminId,
        amount: Number(e.amount), // BigInt → number at DTO boundary
        reason: e.reason,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
      hasMore,
      totals: {
        approved: Number(approvedAgg._sum.amount ?? 0),
        quarantine: Number(quarantineAgg._sum.amount ?? 0),
        refunds: Math.abs(Number(refundsAgg._sum.amount ?? 0)),
      },
    };
  });
}
