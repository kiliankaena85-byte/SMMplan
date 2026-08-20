import { adminOrderService } from '@/services/admin/order.service';
import { Package, Download } from 'lucide-react';
import Link from 'next/link';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { OrderClient } from './components/order-client';
import { OrdersFilterForm } from './components/orders-filter-form';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';

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
    activityType?: string;
    datePreset?: string;
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
    isDripFeed?: string;
    noProvider?: string;
    stale?: string;
    sort?: string;
    order?: string;
    tenant?: string;
  }>;
};

import { enforceSectionAccess } from '@/lib/server/rbac';

export default async function AdminOrdersPage({ searchParams }: Props) {
  await enforceSectionAccess('orders');
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
  const tenantFilter = params.tenant && params.tenant !== 'all' ? params.tenant : undefined;

  const networks = await db.network.findMany({
    select: { 
      id: true, 
      name: true, 
      slug: true,
      categories: {
        select: { id: true, name: true, slug: true },
        orderBy: { sort: 'asc' }
      }
    },
    orderBy: { sort: 'asc' }
  });

  const isDripFeed = params.isDripFeed === 'true';
  const noProvider = params.noProvider === 'true';
  const staleMinutes = params.stale ? parseInt(params.stale, 10) : undefined;

  const { items: orders, nextCursor, hasMore } = await adminOrderService.searchOrders({
    query: query || undefined,
    status: statusFilter,
    activityType: params.activityType || undefined,
    datePreset: params.datePreset || undefined,
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
    tenantId: tenantFilter,
    isDripFeed: params.isDripFeed ? isDripFeed : undefined,
    noProvider: params.noProvider ? noProvider : undefined,
    staleMinutes: !isNaN(staleMinutes || NaN) ? staleMinutes : undefined,
    sortField: params.sort || undefined,
    sortOrder: (params.order === 'asc' || params.order === 'desc') ? params.order : undefined,
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

  const stats = await adminOrderService.getOrderStats(undefined, undefined, tenantFilter);

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
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 min-h-full pb-10">
      <AdminTabbedHeader
        icon={Package}
        title="Заказы"
        description={`Всего: ${stats.total} • В очереди: ${stats.pending} • В работе: ${stats.inProgress} • Ошибки: ${stats.error}`}
        currentTenant={tenantFilter}
        action={(
          <a
            href={`/api/admin/export${buildQueryString({ type: 'orders' })}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground bg-card border border-border/70 shadow-sm rounded-md hover:bg-muted hover:text-primary transition-colors h-8"
          >
            <Download className="w-3.5 h-3.5" /> Экспорт CSV
          </a>
        )}
      />

      {/* Search + Filters & Orders Table Container */}
      <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl shadow-sm ring-1 ring-border/5 overflow-hidden flex flex-col">
        {/* Top Ultra-Compact Filters Section */}
        <div className="p-3 sm:p-4 border-b border-border/40 bg-muted/10">
          <OrdersFilterForm networks={networks} />
        </div>

        {/* Table Section */}
        <div className="flex-1 p-4 sm:p-5 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Заказы</span>
              {query && <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md">«{query}»</span>}
              <span className="text-muted-foreground font-medium text-xs">({orders.length}{hasMore ? '+' : ''})</span>
            </h3>
          </div>
          <OrderClient 
            canSeeRates={canSeeRates}
            userRole={user?.role}
            data={orders.map(o => ({
              id: o.id,
              numericId: o.numericId,
              externalId: o.externalId ?? null,
              link: o.link,
              quantity: o.quantity,
              remains: o.remains,
              status: o.status,
              charge: o.charge.toString(),
              providerCost: (o.providerCost ?? BigInt(0)).toString(),
              createdAt: o.createdAt,
              updatedAt: o.updatedAt,
              isDripFeed: o.isDripFeed,
              dripExternalIds: o.dripExternalIds,
              runs: o.runs ?? null,
              interval: o.interval ?? null,
              currentRun: o.currentRun,
              error: o.error ?? null,
              tenantId: o.tenantId,
              user: { email: o.user.email },
              providerName: o.provider?.name ?? null,
              providerTicketUrl: o.provider?.ticketUrl ?? null,
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

          {/* Pagination Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-5 pt-4 border-t border-border/60 text-xs text-muted-foreground">
            <div>
              Показано <strong className="text-foreground">{orders.length}</strong> заказов {hasMore ? '(есть следующие страницы)' : '(конец списка)'}
            </div>
            <div className="flex items-center gap-2">
              {cursor ? (
                <Link
                  href={`/admin/orders${buildQueryString({ cursor: '' })}`}
                  className="px-3 py-1.5 font-semibold text-foreground bg-background border border-border/80 rounded-lg hover:bg-muted transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  ← В начало
                </Link>
              ) : null}
              {hasMore && nextCursor && (
                <Link
                  href={`/admin/orders${buildQueryString({ cursor: nextCursor })}`}
                  className="px-3.5 py-1.5 font-bold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  Следующая страница →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
