import { adminOrderService } from '@/services/admin/order.service';
import { Card, CardHeader, CardContent } from '@/components/admin/hero-ui';
import { Package, Download, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/page-header';
import { OrderClient } from './components/order-client';
import { OrdersFilterForm } from './components/orders-filter-form';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    userId?: string;
    edit_order_id?: string;
    clientEmail?: string;
    orderId?: string;
    externalId?: string;
    serviceName?: string;
    networkSlug?: string;
    link?: string;
    minPrice?: string;
    maxPrice?: string;
    minQuantity?: string;
    maxQuantity?: string;
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
  const userId = params.userId || '';
  const editOrderId = params.edit_order_id || '';
  const networkSlug = params.networkSlug || '';

  const networks = await db.network.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { slug: 'asc' }
  });

  const { items: orders, nextCursor, hasMore } = await adminOrderService.searchOrders({
    query: query || undefined,
    status: statusFilter,
    cursor,
    pageSize: 50,
    userId: userId || undefined,
    clientEmail: params.clientEmail || undefined,
    orderId: params.orderId ? parseInt(params.orderId, 10) : undefined,
    externalId: params.externalId || undefined,
    serviceName: params.serviceName || undefined,
    networkSlug: networkSlug || undefined,
    link: params.link || undefined,
    minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
    minQuantity: params.minQuantity ? parseInt(params.minQuantity, 10) : undefined,
    maxQuantity: params.maxQuantity ? parseInt(params.maxQuantity, 10) : undefined,
  });

  // Если передан edit_order_id, гарантируем, что этот заказ есть на первой странице (в начале списка)
  if (editOrderId) {
    const hasEditOrder = orders.some(o => o.id === editOrderId);
    if (!hasEditOrder) {
      const extraOrder = await db.order.findUnique({
        where: { id: editOrderId },
        include: {
          user: { select: { id: true, email: true } },
          provider: { select: { name: true } },
          service: { 
            select: { 
              id: true, 
              name: true, 
              numericId: true,
              etaP50Seconds: true,
              etaP90Seconds: true,
              etaSampleCount: true,
              etaSpeedClass: true,
              etaUpdatedAt: true,
              category: { select: { name: true, network: { select: { name: true } } } }
            } 
          },
        }
      });
      if (extraOrder) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        orders.unshift(extraOrder as any);
      }
    }
  }

  const stats = await adminOrderService.getOrderStats();

  // Helper to build the query string for pagination preserving all filters
  const buildQueryString = (extraParams: Record<string, string> = {}) => {
    const qParams = new URLSearchParams();
    
    // Add all active params from searchParams
    Object.entries(params).forEach(([key, val]) => {
      if (val && key !== 'cursor') {
        qParams.set(key, String(val));
      }
    });

    // Merge in extra params (like next cursor)
    Object.entries(extraParams).forEach(([key, val]) => {
      if (val) {
        qParams.set(key, val);
      } else {
        qParams.delete(key);
      }
    });

    const str = qParams.toString();
    return str ? `?${str}` : '';
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-muted/50/50 min-h-full pb-10">
      <AdminPageHeader
        icon={Package}
        title="Заказы"
        description={`Всего: ${stats.total} • В очереди: ${stats.pending} • В работе: ${stats.inProgress} • Ошибки: ${stats.error}`}
        action={(
          <a
            href={`/api/admin/export${buildQueryString({ type: 'orders' })}`}
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
          <OrdersFilterForm networks={networks} />
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
              updatedAt: o.updatedAt,
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
                  href={`/admin/orders${buildQueryString({ cursor: '' })}`}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-muted/50 transition-colors"
                >
                  ← В начало
                </Link>
              ) : <div />}
              {hasMore && nextCursor && (
                <Link
                  href={`/admin/orders${buildQueryString({ cursor: nextCursor })}`}
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
