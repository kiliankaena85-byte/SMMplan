import { Link as LinkIcon } from 'lucide-react';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { CATALOG_TABS } from '@/components/admin/navigation-data';

export default function ProvidersLoading() {
  return (
    <div className="space-y-6 w-full min-w-0 animate-in fade-in duration-300 ease-out sm:px-2 md:px-0 min-h-full pb-10" role="status" aria-busy="true">
      <AdminTabbedHeader
        icon={LinkIcon}
        title="Провайдеры API"
        description="Загрузка поставщиков услуг и статусов синхронизации..."
        tabs={CATALOG_TABS}
      />

      {/* Action Bar Skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-9 w-48 bg-muted/40 animate-pulse rounded-lg" />
        <div className="h-9 w-36 bg-muted/40 animate-pulse rounded-lg" />
      </div>

      {/* Provider Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border/70 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5 flex-1">
                <div className="h-5 w-32 bg-muted/40 animate-pulse rounded" />
                <div className="h-3 w-48 bg-muted/30 animate-pulse rounded" />
              </div>
              <div className="h-6 w-16 bg-muted/40 animate-pulse rounded-full" />
            </div>

            <div className="p-3 bg-muted/20 rounded-lg space-y-2 border border-border/40">
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-muted/40 animate-pulse rounded" />
                <div className="h-3 w-20 bg-muted/40 animate-pulse rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-20 bg-muted/40 animate-pulse rounded" />
                <div className="h-3 w-24 bg-muted/40 animate-pulse rounded" />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <div className="h-8 flex-1 bg-muted/40 animate-pulse rounded-lg" />
              <div className="h-8 w-8 bg-muted/40 animate-pulse rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
