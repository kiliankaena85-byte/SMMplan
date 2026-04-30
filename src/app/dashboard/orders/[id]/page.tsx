import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Clock, Wallet, LayoutDashboard } from 'lucide-react';
import { CancelOrderButton } from '@/components/orders/CancelOrderButton';

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

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) redirect('/login');

  const { id } = await params;

  // CRITICAL SECURITY: IDOR Protection via userId check
  const order = await db.order.findUnique({
    where: { 
      id: id,
      userId: session.userId 
    },
    include: {
      service: {
        include: { category: true }
      }
    }
  });

  if (!order) {
    redirect('/dashboard/orders');
  }

  const color = STATUS_COLOR[order.status] || STATUS_COLOR.CANCELED;
  const label = STATUS_LABEL[order.status] || order.status;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/orders"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-card border border-border hover:bg-muted transition-colors"
          aria-label="Назад к заказами"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Заказ #{order.numericId}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
            <Clock className="w-3.5 h-3.5" /> 
            {new Date(order.createdAt).toLocaleString('ru-RU', { 
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
            })}
          </p>
        </div>
      </div>

      {/* Main Details Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Top Status Bar */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${color}`}>
              {label}
            </span>
            {order.remains > 0 && order.status === 'IN_PROGRESS' && (
              <span className="text-sm font-semibold text-muted-foreground">
                Осталось: {order.remains.toLocaleString('ru-RU')}
              </span>
            )}
            {order.status === 'PENDING' && (
               <CancelOrderButton orderId={order.id} createdAt={order.createdAt} status={order.status} />
            )}
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Сумма</div>
            <div className="text-xl font-black text-foreground font-mono tabular-nums">
              {(order.charge / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-5 space-y-5">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Услуга
            </label>
            <div className="text-base font-semibold text-foreground">
              {order.service.name}
            </div>
            <div className="text-sm font-medium text-muted-foreground/80 mt-1 flex items-center gap-1">
               <LayoutDashboard className="w-3.5 h-3.5" /> {order.service.category?.name || 'Без категории'}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Целевая ссылка
            </label>
            <a 
              href={order.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline break-all"
            >
              {order.link}
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Заказано
              </label>
              <div className="text-lg font-black text-foreground font-mono tabular-nums">
                {order.quantity.toLocaleString('ru-RU')}
              </div>
            </div>
            {order.customData && (
              <div className="bg-muted/50 rounded-xl p-4 border border-border/50 col-span-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Дополнительные данные (Комментарии/Формат)
                </label>
                <div className="text-sm font-medium text-foreground whitespace-pre-wrap font-mono bg-background border border-border p-3 rounded-md">
                  {order.customData}
                </div>
              </div>
            )}
          </div>
          
          {order.status === 'ERROR' && order.error && (
            <div className="mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl">
              <label className="text-xs font-bold uppercase tracking-wider block mb-1">
                Системная ошибка
              </label>
               <p className="text-sm font-semibold">{order.error}</p>
            </div>
          )}

          {order.runs && order.runs > 1 && (
            <div className="mt-4 bg-blue-500/10 border border-blue-500/20 text-blue-500 p-4 rounded-xl flex items-center gap-3">
               <Clock className="w-5 h-5 shrink-0" />
               <div>
                 <div className="text-xs font-bold uppercase tracking-wider">Drip-Feed включен</div>
                 <div className="text-sm font-medium mt-0.5">Разделено на {order.runs} запусков с интервалом {order.interval} минут.</div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
