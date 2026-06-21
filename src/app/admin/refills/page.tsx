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

type Props = {
  searchParams: Promise<{ status?: string }>;
};

import { enforceSectionAccess } from '@/lib/server/rbac';

export default async function AdminRefillsPage({ searchParams }: Props) {
  await enforceSectionAccess('orders');
  const params = await searchParams;
  const statusFilter = params.status || 'ALL';

  const where: Record<string, unknown> = {};
  if (statusFilter !== 'ALL') {
    where.status = statusFilter;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [refills, stats] = await Promise.all([
    db.refill.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
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
    db.refill.aggregate({
      _count: {
        id: true,
      },
      where: { status: 'PENDING' }, // example for pending
    })
  ]);

  const totalCount = await db.refill.count();
  const pendingCount = await db.refill.count({ where: { status: 'PENDING' } });
  const completedCount = await db.refill.count({ where: { status: 'COMPLETED' } });

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
      <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-[24px] shadow-sm ring-1 ring-border/5 overflow-hidden">
        <div className="w-full">
          <RefillsTable refills={refills} />
        </div>
      </div>
    </div>
  );
}

