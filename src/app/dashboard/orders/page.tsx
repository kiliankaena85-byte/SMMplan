import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import Link from 'next/link';
import { CancelOrderButton } from '@/components/orders/CancelOrderButton';
import { RetryPaymentModal } from '@/components/orders/RetryPaymentModal';
import { MobileOrderList } from '@/components/orders/MobileOrderList';
import { ClientDate } from '@/components/ui/client-date';
import { OrderFilters } from '@/components/orders/OrderFilters';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  COMPLETED:       'Выполнен',
  IN_PROGRESS:     'В работе',
  PENDING:         'Ожидание',
  AWAITING_PAYMENT:'Ожидает оплаты',
  ERROR:           'Ошибка',
  CANCELED:        'Отменён',
  PARTIAL:         'Частично',
  PROVISIONING:    'Запуск',
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED:       'text-emerald-800 dark:text-success bg-success/10 border-emerald-500/20',
  IN_PROGRESS:     'text-blue-800 dark:text-blue-500    bg-blue-500/10    border-blue-500/20',
  PENDING:         'text-orange-800 dark:text-orange-500  bg-orange-500/10  border-orange-500/20',
  AWAITING_PAYMENT:'text-orange-800 dark:text-orange-500  bg-orange-500/10  border-orange-500/20',
  PROVISIONING:    'text-indigo-800 dark:text-indigo-500  bg-indigo-500/10  border-indigo-500/20',
  ERROR:           'text-red-800 dark:text-destructive     bg-destructive/10     border-red-500/20',
  PARTIAL:         'text-amber-800 dark:text-warning         bg-warning/10         border-amber-500/20',
  CANCELED:        'text-muted-foreground bg-muted border-border',
};

interface OrdersPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
    network?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const session = await verifySession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const currentPage = parseInt(params.page || '1', 10);
  const limit = 15; // 15 records per page matches SaaS data density standards
  const skip = (currentPage - 1) * limit;

  const search = params.search || '';
  const status = params.status || '';
  const network = params.network || '';

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { balance: true }
  });

  if (!user) redirect('/login');

  // Build the DB where filter dynamically
  const where: any = {
    userId: session.userId,
  };

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (network && network !== 'ALL') {
    where.service = {
      category: {
        network: {
          slug: network
        }
      }
    };
  }

  if (search) {
    where.OR = [
      ...(isNaN(Number(search)) ? [] : [{ numericId: parseInt(search, 10) }]),
      {
        service: {
          name: {
            contains: search,
            mode: 'insensitive' as const
          }
        }
      },
      {
        link: {
          contains: search,
          mode: 'insensitive' as const
        }
      }
    ];
  }

  // Fetch paginated dataset concurrently
  const [orders, totalCount, networks] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        numericId: true,
        status: true,
        charge: true,
        quantity: true,
        remains: true,
        link: true,
        error: true,
        createdAt: true,
        service: { 
          select: { 
            name: true,
            category: {
              select: {
                name: true,
                network: {
                  select: {
                    name: true
                  }
                }
              }
            }
          } 
        },
      },
    }),
    db.order.count({ where }),
    db.network.findMany({
      where: { isActive: true },
      select: { slug: true, name: true },
      orderBy: { sort: 'asc' }
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Мои заказы</h1>
          <p className="text-muted-foreground text-sm mt-1">
            История всех заказов — всего найдено: {totalCount}
          </p>
        </div>
        <Link
          href="/dashboard/new-order"
          className="h-11 px-4 flex items-center text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-sm"
        >
          + Новый заказ
        </Link>
      </div>

      {/* ── CLIENT FILTERS PANEL ── */}
      <OrderFilters
        initialSearch={search}
        initialStatus={status}
        initialNetwork={network}
        availableNetworks={networks}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm" aria-label="Список заказов">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground bg-muted/20 border-b border-border/40">
                <th className="py-3.5 px-4 font-bold">ID</th>
                <th className="py-3.5 px-4 font-bold min-w-[200px]">Услуга</th>
                <th className="py-3.5 px-4 font-bold">Ссылка / Кол-во</th>
                <th className="py-3.5 px-4 font-bold text-right">Сумма (₽)</th>
                <th className="py-3.5 px-4 font-bold">Статус</th>
                <th className="py-3.5 px-4 font-bold text-right">Дата</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const color = STATUS_COLOR[order.status] || STATUS_COLOR.CANCELED;
                const label = STATUS_LABEL[order.status] || order.status;
                return (
                  <tr
                    key={order.id}
                    className="border-b border-border/40 hover:bg-muted/30 transition-colors last:border-0 cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      <Link href={`/dashboard/orders/${order.id}`} className="hover:text-primary transition-colors" aria-label={`Открыть заказ #${order.numericId}`}>
                        #{order.numericId}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/dashboard/orders/${order.id}`} className="block" tabIndex={-1}>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5 flex items-center gap-1.5">
                          {order.service.category?.network?.name && (
                            <span className="text-primary">{order.service.category.network.name}</span>
                          )}
                          {order.service.category?.network?.name && order.service.category?.name && (
                            <span className="text-muted-foreground/50">•</span>
                          )}
                          {order.service.category?.name && (
                            <span>{order.service.category.name}</span>
                          )}
                        </div>
                        <div className="font-medium text-foreground line-clamp-2 max-w-[200px] hover:text-primary transition-colors">
                          {order.service.name}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        {order.link && (
                          <a
                            href={order.link}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-primary hover:underline text-xs max-w-[160px] truncate"
                            aria-label={`Открыть ссылку заказа #${order.numericId}`}
                          >
                            {order.link}
                          </a>
                        )}
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {order.quantity.toLocaleString('ru-RU')} шт.
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground tabular-nums">
                      {(Number(order.charge) / 100).toLocaleString('ru-RU', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wide font-bold rounded-md border ${color}`}
                      >
                        {label}
                      </span>
                      {order.error && (
                        <div
                          className="text-[10px] text-destructive mt-1 max-w-[150px] line-clamp-1"
                          title={order.error}
                        >
                          {order.error}
                        </div>
                      )}
                      {['PENDING', 'AWAITING_PAYMENT'].includes(order.status) && (
                        <div className="mt-1.5 flex gap-2 min-w-[120px]">
                            <CancelOrderButton orderId={order.id} createdAt={order.createdAt} status={order.status} />
                            {order.status === 'AWAITING_PAYMENT' && user && (
                              <RetryPaymentModal 
                                orderId={order.id} 
                                charge={Number(order.charge)} 
                                balance={Number(user.balance)} 
                              />
                            )}
                        </div>
                      )}
                      {order.status === 'IN_PROGRESS' && order.remains != null && (
                        <div className="mt-1 space-y-0.5">
                          <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.round(((order.quantity - order.remains) / order.quantity) * 100)}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-muted-foreground tabular-nums">
                            {order.quantity - order.remains} / {order.quantity.toLocaleString('ru-RU')}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                      <ClientDate date={order.createdAt.toISOString()} format="datetime" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards (Virtualized + Drawer) */}
        <MobileOrderList orders={orders} user={user} />

        {orders.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-muted-foreground text-sm">Заказов не найдено</p>
            <Link
              href="/dashboard/new-order"
              className="mt-4 h-11 px-5 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all duration-200"
            >
              + Создать заказ
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
