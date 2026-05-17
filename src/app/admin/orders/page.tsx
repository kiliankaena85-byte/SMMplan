import { adminOrderService } from '@/services/admin/order.service';
import { Card, CardHeader, CardContent } from '@/components/admin/hero-ui';
import { Package, Download, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/page-header';
import { OrderClient } from './components/order-client';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  ALL: 'Все',
  AWAITING_PAYMENT: 'Ожидает оплату',
  PENDING: 'В очереди',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  PARTIAL: 'Частичный',
  CANCELED: 'Отменён',
  ERROR: 'Ошибка',
};

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    cursor?: string;
  }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const session = await verifySession();
  const user = session ? await db.user.findUnique({ 
    where: { id: session.userId },
    include: { staffRole: { include: { permissions: true } } }
  }) : null;

  const isOwner = user?.role === 'OWNER';
  const canSeeRates = isOwner || (user?.role !== 'SUPPORT');

  const params = await searchParams;
  const query = params.q || '';
  const statusFilter = params.status || 'ALL';
  const cursor = params.cursor || undefined;

  const { items: orders, nextCursor, hasMore } = await adminOrderService.searchOrders({
    query: query || undefined,
    status: statusFilter,
    cursor,
    pageSize: 50,
  });

  const stats = await adminOrderService.getOrderStats();

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-muted/50/50 min-h-full pb-10">
      <AdminPageHeader
        icon={Package}
        title="Заказы"
        description={`Всего: ${stats.total} • В очереди: ${stats.pending} • В работе: ${stats.inProgress} • Ошибки: ${stats.error}`}
        action={(
          <a
            href={`/api/admin/export?type=orders&status=${statusFilter}&q=${encodeURIComponent(query)}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-foreground bg-background border border-border shadow-sm rounded-lg hover:bg-muted/50 hover:text-primary transition-colors"
          >
            <Download className="w-4 h-4" /> Экспорт CSV
          </a>
        )}
      />

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-max border border-border">
        <Link 
          href="/admin/orders" 
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all",
            "bg-background text-primary shadow-sm border border-border"
          )}
        >
          <Package className="w-4 h-4" />
          Заказы
        </Link>
        <Link 
          href="/admin/refills" 
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
            "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <RefreshCw className="w-4 h-4" />
          Докрутки
        </Link>
      </div>

      {/* Search + Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="🔍 Поиск: email, ссылка, ID заказа..."
              className="flex-1 px-4 py-2 text-sm border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="px-4 py-2 text-sm border border-border rounded-md bg-background"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button type="submit" className="px-6 py-2 text-sm font-semibold text-primary-foreground bg-primary shadow-sm rounded-md hover:bg-primary/90 transition-colors">Найти</button>
          </form>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-bold">
            Результаты{query ? ` по запросу "${query}"` : ''} ({orders.length}{hasMore ? '+' : ''})
          </h3>
        </CardHeader>
        <CardContent>
          <OrderClient 
            canSeeRates={canSeeRates}
            data={orders.map(o => ({
              id: o.id,
              numericId: o.numericId,
              externalId: o.externalId ?? null,
              link: o.link,
              quantity: o.quantity,
              remains: o.remains,
              status: o.status,
              charge: Number(o.charge),
              providerCost: Number(o.providerCost ?? 0),
              createdAt: o.createdAt,
              isDripFeed: o.isDripFeed,
              dripExternalIds: o.dripExternalIds,
              runs: o.runs ?? null,
              interval: o.interval ?? null,
              currentRun: o.currentRun,
              error: o.error ?? null,
              user: { email: o.user.email },
              providerName: o.provider?.name ?? null,
              service: {
                name: o.service.name,
                etaP50Seconds: o.service.etaP50Seconds,
                etaP90Seconds: o.service.etaP90Seconds,
                etaSampleCount: o.service.etaSampleCount,
                etaSpeedClass: o.service.etaSpeedClass,
                etaUpdatedAt: o.service.etaUpdatedAt?.toISOString() ?? null,
                category: {
                  name: o.service.category.name,
                  network: o.service.category.network ?? null,
                },
              },
            }))} 
          />

          {/* Pagination */}
          {(cursor || hasMore) && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
              {cursor ? (
                <Link
                  href={`/admin/orders?q=${encodeURIComponent(query)}&status=${statusFilter}`}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-muted/50 transition-colors"
                >
                  ← В начало
                </Link>
              ) : <div />}
              {hasMore && nextCursor && (
                <Link
                  href={`/admin/orders?q=${encodeURIComponent(query)}&status=${statusFilter}&cursor=${nextCursor}`}
                  className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary transition-colors"
                >
                  Следующая →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
