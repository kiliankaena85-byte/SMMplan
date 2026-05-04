import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import Link from 'next/link';
import { CancelOrderButton } from '@/components/orders/CancelOrderButton';
import { RetryPaymentModal } from '@/components/orders/RetryPaymentModal';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  COMPLETED:       'Выполнен',
  IN_PROGRESS:     'В работе',
  PENDING:         'Ожидание',
  AWAITING_PAYMENT:'Ожидает оплаты',
  ERROR:           'Ошибка',
  CANCELED:        'Отменён',
  PROVISIONING:    'Запуск',
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED:       'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  IN_PROGRESS:     'text-blue-500    bg-blue-500/10    border-blue-500/20',
  PENDING:         'text-orange-500  bg-orange-500/10  border-orange-500/20',
  AWAITING_PAYMENT:'text-orange-500  bg-orange-500/10  border-orange-500/20',
  PROVISIONING:    'text-indigo-500  bg-indigo-500/10  border-indigo-500/20',
  ERROR:           'text-red-500     bg-red-500/10     border-red-500/20',
  CANCELED:        'text-muted-foreground bg-muted border-border',
};

export default async function OrdersPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { balance: true }
  });

  const orders = await db.order.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
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
              platform: true
            }
          }
        } 
      },
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Мои заказы</h1>
          <p className="text-muted-foreground text-sm mt-1">
            История всех заказов — последние 50
          </p>
        </div>
        <Link
          href="/dashboard/new-order"
          className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-sm"
        >
          + Новый заказ
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm" aria-label="Список заказов">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground bg-muted/30 border-b border-border">
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
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors last:border-0 cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      <Link href={`/dashboard/orders/${order.id}`} className="hover:text-primary transition-colors" aria-label={`Открыть заказ #${order.numericId}`}>
                        #{order.numericId}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/dashboard/orders/${order.id}`} className="block"  tabIndex={-1}>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5 flex items-center gap-1.5">
                          {order.service.category?.platform && (
                            <span className="text-primary">{order.service.category.platform}</span>
                          )}
                          {order.service.category?.platform && order.service.category?.name && (
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
                          className="text-[10px] text-rose-500 mt-1 max-w-[150px] line-clamp-1"
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
                      {order.createdAt.toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-border">
          {orders.map((order) => {
            const color = STATUS_COLOR[order.status] || STATUS_COLOR.CANCELED;
            const label = STATUS_LABEL[order.status] || order.status;
            return (
              <div key={order.id} className="p-4 space-y-2">
                <Link
                  href={`/dashboard/orders/${order.id}`}
                  className="block space-y-2"
                  aria-label={`Открыть заказ #${order.numericId}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-muted-foreground">#{order.numericId}</div>
                      
                      <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1 flex items-center gap-1">
                        {order.service.category?.platform && (
                          <span className="text-primary">{order.service.category.platform}</span>
                        )}
                        {order.service.category?.name && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{order.service.category.name}</span>
                          </>
                        )}
                      </div>
                      
                      <div className="text-sm font-medium text-foreground line-clamp-2 mt-0.5 hover:text-primary transition-colors">
                        {order.service.name}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-foreground tabular-nums">
                        {(Number(order.charge) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${color}`}>
                        {label}
                      </span>
                    </div>
                  </div>
                  {['PENDING', 'AWAITING_PAYMENT'].includes(order.status) && (
                    <div className="pt-1 flex gap-2" onClick={(e) => e.preventDefault()}>
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
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="tabular-nums">{order.quantity.toLocaleString('ru-RU')} шт.</span>
                    <span>
                      {order.createdAt.toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {orders.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-muted-foreground text-sm">Заказов пока нет</p>
            <Link
              href="/dashboard/new-order"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all duration-200"
            >
              + Создать заказ
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
