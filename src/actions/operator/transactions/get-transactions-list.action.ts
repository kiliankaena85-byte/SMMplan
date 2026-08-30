'use server';

import { db } from '@/lib/db';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireOperatorPermission } from '@/lib/operator/rbac';

const ledgerParamsSchema = z.object({
  status: z.enum(['ALL', 'APPROVED', 'QUARANTINE', 'REJECTED']).default('ALL'),
  type:   z.enum(['ALL', 'TOPUP', 'DEBIT', 'REFUND', 'COMPENSATION', 'ADJUSTMENT']).default('ALL'),
  period: z.enum(['today', 'week', 'month', 'all']).default('month'),
  search: z.string().max(255).optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().min(1).max(200).default(50),
  userId: z.string().optional(),
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

export async function getTransactionsListAction(
  params: Partial<LedgerParams>
): Promise<LedgerPageResult | { success: false; error: string }> {
  try {
    const result = await requireOperatorPermission<LedgerPageResult>('orders', 'view', async () => {
      const p = ledgerParamsSchema.parse(params);
      const periodStart = getPeriodStart(p.period);
      const searchTrim = p.search?.trim();

      const andConditions: Prisma.LedgerEntryWhereInput[] = [];

      if (p.status !== 'ALL') {
        andConditions.push({ status: p.status });
      }
      if (periodStart) {
        andConditions.push({ createdAt: { gte: periodStart } });
      }
      if (p.userId) {
        andConditions.push({ userId: p.userId });
      }

      if (p.type === 'TOPUP') {
        andConditions.push({ amount: { gt: 0 }, transactionType: { not: 'REFUND' } });
      } else if (p.type === 'DEBIT') {
        andConditions.push({ amount: { lt: 0 } });
      } else if (p.type === 'REFUND') {
        andConditions.push({
          OR: [
            { transactionType: 'REFUND' },
            { reason: { contains: 'возврат', mode: 'insensitive' as const } },
            { reason: { contains: 'refund', mode: 'insensitive' as const } }
          ]
        });
      } else if (p.type === 'COMPENSATION') {
        andConditions.push({
          OR: [
            { transactionType: 'COMPENSATION' },
            { reason: { contains: 'компенсац', mode: 'insensitive' as const } },
            { reason: { contains: 'бонус', mode: 'insensitive' as const } }
          ]
        });
      } else if (p.type === 'ADJUSTMENT') {
        andConditions.push({ adminId: { not: null } });
      }

      if (searchTrim) {
        andConditions.push({
          OR: [
            { user: { email: { contains: searchTrim, mode: 'insensitive' as const } } },
            { id: { contains: searchTrim, mode: 'insensitive' as const } },
            { idempotencyKey: { contains: searchTrim, mode: 'insensitive' as const } },
          ]
        });
      }

      const where: Prisma.LedgerEntryWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

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
          transactionType: true,
          createdAt: true,
        },
      });

      const hasMore = entries.length > pageSize;
      const page = hasMore ? entries.slice(0, pageSize) : entries;

      // Enrich with user email
      const uIds = Array.from(new Set(page.map((e) => e.userId)));
      const users = await db.user.findMany({
        where: { id: { in: uIds } },
        select: { id: true, email: true },
      });
      const emailMap = new Map(users.map((u) => [u.id, u.email]));

      // Totals for the summary strip
      const [approvedAgg, quarantineAgg, refundsAgg] = await Promise.all([
        db.ledgerEntry.aggregate({
          _sum: { amount: true },
          where: { ...where, status: 'APPROVED', amount: { gt: 0 } },
        }),
        db.ledgerEntry.aggregate({
          _sum: { amount: true },
          where: { ...where, status: 'QUARANTINE' },
        }),
        db.ledgerEntry.aggregate({
          _sum: { amount: true },
          where: { ...where, status: 'APPROVED', amount: { lt: 0 } },
        }),
      ]);

      return {
        items: page.map((e) => ({
          id: e.id,
          userId: e.userId,
          userEmail: emailMap.get(e.userId) ?? e.userId,
          adminId: e.adminId,
          amount: Number(e.amount),
          reason: e.reason,
          status: e.status,
          transactionType: e.transactionType,
          createdAt: e.createdAt.toISOString(),
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

    return result;
  } catch (err) {
    console.error('[getTransactionsListAction] Error:', err);
    const message = err instanceof Error ? err.message : 'Ошибка сервера при загрузке транзакций';
    return { success: false, error: message };
  }
}
