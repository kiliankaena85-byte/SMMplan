import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import Link from 'next/link';
import { ShoppingCart, Wallet, Users, TrendingUp, ArrowRight, Clock } from 'lucide-react';

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
  COMPLETED:       'text-success bg-success/10',
  IN_PROGRESS:     'text-sky-500     bg-sky-500/10',
  PENDING:         'text-orange-500  bg-orange-500/10',
  AWAITING_PAYMENT:'text-orange-500  bg-orange-500/10',
  ERROR:           'text-destructive    bg-destructive/10',
  PARTIAL:         'text-warning        bg-warning/10',
  CANCELED:        'text-muted-foreground bg-muted',
};

export default async function DashboardPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const [user, orders, referralCount] = await Promise.all([
    db.user.findUnique({
      where: { id: session.userId },
      select: {
        email: true,
        balance: true,
        totalSpent: true,
        referralCode: true,
        createdAt: true,
      },
    }),
    db.order.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        numericId: true,
        status: true,
        charge: true,
        quantity: true,
        createdAt: true,
        service: { select: { name: true } },
      },
    }),
    db.user.count({ where: { referredById: session.userId } }),
  ]);

  if (!user) redirect('/login');

  // P3.4: Use server-side headers() — no hydration mismatch
  const headersList = await headers();
  const host = headersList.get('host') || process.env.NEXT_PUBLIC_APP_URL || 'localhost:3000';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const origin = `${proto}://${host}`;

  const activeOrders = await db.order.count({
    where: { userId: session.userId, status: { in: ['IN_PROGRESS', 'PENDING', 'PROVISIONING'] } },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Добро пожаловать 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{user.email}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance */}
        <div className="bg-card shadow-sm border border-border/60 rounded-2xl p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Баланс
            </span>
            <Wallet className="w-4 h-4 text-muted-foreground/60" />
          </div>
          <div className="text-2xl font-black text-foreground tracking-tight font-mono tabular-nums">
            {(Number(user.balance) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
          </div>
          <Link
            href="/dashboard/add-funds"
            className="mt-auto w-full h-11 bg-primary/10 text-primary hover:bg-primary/20 hover:scale-[1.02] active:scale-[0.98] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-200"
          >
            Пополнить <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Total spent */}
        <div className="bg-card shadow-sm border border-border/60 rounded-2xl p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Потрачено
            </span>
            <TrendingUp className="w-4 h-4 text-muted-foreground/60" />
          </div>
          <div className="text-2xl font-black text-foreground tracking-tight font-mono tabular-nums">
            {(Number(user.totalSpent) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
          </div>
          <span className="mt-auto text-xs font-semibold text-muted-foreground/60 p-2 flex items-center justify-center">за всё время</span>
        </div>

        {/* Active orders */}
        <div className="bg-card shadow-sm border border-border/60 rounded-2xl p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              В работе
            </span>
            <Clock className="w-4 h-4 text-muted-foreground/60" />
          </div>
          <div className="text-2xl font-black text-foreground tracking-tight font-mono tabular-nums">
            {activeOrders}
          </div>
          <Link
            href="/dashboard/orders"
            className="mt-auto w-full h-11 bg-muted text-foreground hover:bg-muted/80 hover:scale-[1.02] active:scale-[0.98] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-200"
          >
            Заказы <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Referrals */}
        <div className="bg-card shadow-sm border border-border/60 rounded-2xl p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Рефералы
            </span>
            <Users className="w-4 h-4 text-muted-foreground/60" />
          </div>
          <div className="text-2xl font-black text-foreground tracking-tight font-mono tabular-nums">
            {referralCount}
          </div>
          <Link
            href="/dashboard/referrals"
            className="mt-auto w-full h-11 bg-muted text-foreground hover:bg-muted/80 hover:scale-[1.02] active:scale-[0.98] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-200"
          >
            Программа <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/new-order"
          className="group bg-card border border-border/60 rounded-2xl p-6 flex items-center justify-between hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
        >
          <div>
            <div className="font-bold text-lg text-foreground tracking-tight mb-0.5 group-hover:text-primary transition-colors">Новый заказ</div>
            <div className="text-sm text-muted-foreground font-medium">Накрутка подписчиков, просмотров</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </Link>

        {user.referralCode && (
          <div className="bg-card shadow-sm border border-border rounded-2xl p-6 flex flex-col justify-between">
             <div>
               <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                 Ваша ссылка
               </div>
               <div className="font-mono text-sm font-semibold bg-muted px-3 py-2 rounded-xl text-foreground break-all select-all border border-border border-dashed">
                 {user.referralCode ? `${origin}/r/${user.referralCode}` : '—'}
               </div>
             </div>
             <Link
               href="/dashboard/referrals"
               className="flex items-center gap-1 mt-4 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
             >
               Партнёрка <ArrowRight className="w-3 h-3" />
             </Link>
          </div>
        )}
      </div>

      {/* Recent orders */}
      {orders.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base text-foreground">Последние заказы</h2>
            <Link
              href="/dashboard/orders"
              className="text-xs font-bold text-primary hover:opacity-80 flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
            >
              Все заказы <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="bg-card shadow-sm border border-border/60 rounded-2xl overflow-hidden">
            {orders.map((order) => {
              const color = STATUS_COLOR[order.status] || STATUS_COLOR.CANCELED;
              const label = STATUS_LABEL[order.status] || order.status;
              return (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  aria-label={`Заказ #${order.numericId} — ${order.service.name}`}
                  className="flex items-center gap-4 px-5 py-4 border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors duration-200 group"
                >
                  <span className="font-mono text-[11px] font-bold text-muted-foreground shrink-0 tabular-nums bg-muted px-2 py-1 rounded-md">
                    #{order.numericId}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {order.service.name}
                    </div>
                    <div className="text-[11px] font-bold text-muted-foreground/60 tabular-nums tracking-wide mt-0.5">
                      {order.quantity.toLocaleString('ru-RU')} штук
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-foreground tabular-nums font-mono tracking-tight">
                      {(Number(order.charge) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                    </div>
                    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 mt-1 rounded-md uppercase tracking-wider ${color}`}>
                      {label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
          <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Ещё нет заказов</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Сделайте первый заказ и получите результат уже через несколько минут
          </p>
          <Link
            href="/dashboard/new-order"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all duration-200"
          >
            Создать первый заказ <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
