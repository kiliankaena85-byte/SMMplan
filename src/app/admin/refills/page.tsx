import { db } from '@/lib/db';
import { RefreshCw } from 'lucide-react';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { OPERATIONS_TABS, ONBOARDING_CONFIGS } from '@/components/admin/navigation-data';
import { RefillsTable } from './client-table';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  REJECTED: 'Отклонён',
  ERROR: 'Ошибка',
};

import Link from 'next/link';

type Props = {
  searchParams: Promise<{ status?: string; cursor?: string }>;
};

import { enforceSectionAccess } from '@/lib/server/rbac';

export default async function AdminRefillsPage({ searchParams }: Props) {
  await enforceSectionAccess('refills');
  const params = await searchParams;
  const statusFilter = params.status || 'ALL';
  const cursor = params.cursor || undefined;
  const pageSize = 50;

  const where: Record<string, unknown> = {};
  if (statusFilter !== 'ALL') {
    where.status = statusFilter;
  }

  const [rawRefills, totalCount, pendingCount, completedCount] = await Promise.all([
    db.refill.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: pageSize + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      include: {
        order: {
          select: {
            numericId: true,
            link: true,
            quantity: true,
            user: { select: { email: true } },
            service: { select: { name: true } },
          },
        },
      },
    }),
    db.refill.count(),
    db.refill.count({ where: { status: 'PENDING' } }),
    db.refill.count({ where: { status: 'COMPLETED' } }),
  ]);

  const hasMore = rawRefills.length > pageSize;
  const refills = hasMore ? rawRefills.slice(0, pageSize) : rawRefills;
  const nextCursor = hasMore ? refills[refills.length - 1].id : null;

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 min-h-full pb-10">
      <AdminTabbedHeader
        icon={RefreshCw}
        title="Докрутки (Refills)"
        description={`Всего: ${totalCount} • Ожидают: ${pendingCount} • Выполнены: ${completedCount}`}
        tabs={OPERATIONS_TABS}
        onboardingKey="refills"
        onboarding={ONBOARDING_CONFIGS.refills}
      />

      {/* Filter */}
      <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-[24px] shadow-sm p-6 ring-1 ring-border/5">
        <form className="flex gap-4 items-center">
          <select name="status" defaultValue={statusFilter}
            className="px-4 py-2 text-sm border border-border/60 rounded-xl bg-background/50 backdrop-blur-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 cursor-pointer">
            <option value="ALL">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <button type="submit" className="px-6 py-2 text-sm font-semibold text-primary-foreground bg-primary shadow-sm rounded-xl hover:opacity-90 transition-all duration-200 active:scale-95">
            Фильтр
          </button>
        </form>
      </div>

      {/* Refills Table */}
      <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-[24px] shadow-sm ring-1 ring-border/5 overflow-hidden p-6">
        <div className="w-full">
          <RefillsTable refills={refills} />
        </div>

        {/* Pagination */}
        {(cursor || hasMore) && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
            {cursor ? (
              <Link
                href={`/admin/refills?status=${statusFilter}`}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-muted/50 transition-colors"
              >
                ← В начало
              </Link>
            ) : <div />}
            {hasMore && nextCursor && (
              <Link
                href={`/admin/refills?status=${statusFilter}&cursor=${nextCursor}`}
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary transition-colors"
              >
                Следующая →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

