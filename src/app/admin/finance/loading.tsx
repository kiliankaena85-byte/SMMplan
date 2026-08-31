import { CreditCard } from 'lucide-react';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { FINANCE_TABS } from '@/components/admin/navigation-data';

export default function FinanceLoading() {
  return (
    <div className="space-y-6 w-full min-w-0 animate-in fade-in duration-300 ease-out sm:px-2 md:px-0 min-h-full pb-10" role="status" aria-busy="true">
      <AdminTabbedHeader
        icon={CreditCard}
        title="Финансы & Касса"
        description="Загрузка финансовых метрик и транзакций..."
        tabs={FINANCE_TABS}
      />

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border/70 p-4 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 bg-muted/40 animate-pulse rounded" />
              <div className="h-6 w-6 bg-muted/30 animate-pulse rounded-full" />
            </div>
            <div className="h-7 w-32 bg-muted/40 animate-pulse rounded" />
            <div className="h-3 w-20 bg-muted/30 animate-pulse rounded" />
          </div>
        ))}
      </div>

      {/* Filters & Ledger Table Skeleton */}
      <div className="bg-card rounded-xl border border-border/70 overflow-hidden shadow-sm space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-9 w-60 bg-muted/40 animate-pulse rounded-lg" />
          <div className="h-9 w-40 bg-muted/40 animate-pulse rounded-lg" />
          <div className="h-9 w-36 bg-muted/40 animate-pulse rounded-lg" />
        </div>

        <div className="divide-y divide-border/40 border-t border-border/40 pt-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="py-3 flex items-center justify-between gap-4">
              <div className="h-4 w-28 bg-muted/40 animate-pulse rounded" />
              <div className="h-4 w-40 bg-muted/40 animate-pulse rounded" />
              <div className="h-5 w-20 bg-muted/40 animate-pulse rounded-full" />
              <div className="h-4 w-24 bg-muted/40 animate-pulse rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
