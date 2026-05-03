import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import Link from 'next/link';
import { ClientDetailClient } from './client-detail-client';
import { banUserAction, unbanUserAction, loginAsAction } from '@/actions/admin/users';
import { SubmitButton } from '@/components/admin/submit-button';
import { ActionForm } from '@/components/admin/action-form';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, string> = {
  PENDING:    'bg-amber-100  text-amber-700',
  PROCESSING: 'bg-blue-100   text-blue-700',
  COMPLETED:  'bg-emerald-100 text-emerald-700',
  FAILED:     'bg-rose-100   text-rose-700',
  CANCELLED:  'bg-slate-100  text-slate-600',
  PARTIAL:    'bg-orange-100 text-orange-700',
};

const ROLE_BADGE: Record<string, string> = {
  OWNER:   'bg-indigo-100 text-indigo-800',
  ADMIN:   'bg-sky-100 text-sky-800',
  MANAGER: 'bg-emerald-100 text-emerald-800',
  SUPPORT: 'bg-slate-200 text-slate-700',
  USER:    'bg-slate-100 text-slate-700',
  BANNED:  'bg-rose-100 text-rose-800',
};

type Props = { params: Promise<{ id: string }> };

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      balance: true,
      quarantineBalance: true,
      totalSpent: true,
      personalDiscount: true,
      discountEndsAt: true,
      adminNote: true,
      adminNoteUpdatedAt: true,
      adminNoteUpdatedBy: true,
      telegramId: true,
      apiKey: true,
      referralCode: true,
      referralBalance: true,
      createdAt: true,
    },
    // Relations loaded separately for type-safety
  });

  if (!user) notFound();

  const [orders, countResult] = await Promise.all([
    db.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        id: true,
        numericId: true,
        status: true,
        quantity: true,
        charge: true,
        createdAt: true,
        service: { select: { name: true } },
      },
    }),
    db.user.findUnique({
      where: { id },
      select: {
        _count: { select: { orders: true, tickets: true } },
      },
    }),
  ]);

  const ordersCount = countResult?._count.orders ?? 0;
  const ticketsCount = countResult?._count.tickets ?? 0;

  // Safe DTO — only send what the UI needs (no raw DB object)
  const dto = {
    id: user.id,
    email: user.email,
    role: user.role,
    balance: user.balance,
    quarantineBalance: user.quarantineBalance,
    totalSpent: user.totalSpent,
    personalDiscount: user.personalDiscount,
    discountEndsAt: user.discountEndsAt?.toISOString() ?? null,
    adminNote: user.adminNote ?? '',
    adminNoteUpdatedAt: user.adminNoteUpdatedAt?.toISOString() ?? null,
    adminNoteUpdatedBy: user.adminNoteUpdatedBy ?? null,
    telegramId: user.telegramId ?? null,
    referralCode: user.referralCode ?? null,
    referralBalance: user.referralBalance,
    createdAt: user.createdAt.toISOString(),
    ordersCount,
    ticketsCount,
  };

  const roleBadge = ROLE_BADGE[user.role] ?? 'bg-slate-100 text-slate-700';

  return (
    <div className="space-y-6 pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/clients" className="hover:text-foreground transition-colors">← Клиенты</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[300px]">{user.email}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground">{user.email}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge}`}>
              {user.role}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            ID: <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{user.id}</code>
            <span className="mx-2">·</span>
            Зарегистрирован {new Date(user.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap">
          <ActionForm action={loginAsAction}>
            <input type="hidden" name="userId" value={user.id} />
            <SubmitButton variant="outline" className="text-xs h-9 gap-1.5">
              🔑 Войти как клиент
            </SubmitButton>
          </ActionForm>
          {user.role === 'BANNED' ? (
            <ActionForm action={unbanUserAction}>
              <input type="hidden" name="userId" value={user.id} />
              <SubmitButton
                variant="outline"
                className="text-xs h-9 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                confirmMessage="Снять блокировку?"
              >
                ✅ Разбанить
              </SubmitButton>
            </ActionForm>
          ) : (
            <ActionForm action={banUserAction}>
              <input type="hidden" name="userId" value={user.id} />
              <SubmitButton
                variant="outline"
                className="text-xs h-9 text-rose-600 border-rose-300 hover:bg-rose-50"
                confirmMessage="Забанить клиента? Он потеряет доступ к сервису."
              >
                🚫 Забанить
              </SubmitButton>
            </ActionForm>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Баланс', value: `${(Number(user.balance) / 100).toFixed(2)} ₽`, accent: 'text-foreground', note: user.quarantineBalance > 0 ? `🔒 ${(Number(user.quarantineBalance) / 100).toFixed(2)} ₽ эскроу` : null },
          { label: 'LTV', value: `${(Number(user.totalSpent) / 100).toLocaleString('ru-RU')} ₽`, accent: 'text-emerald-600', note: null },
          { label: 'Заказов', value: ordersCount.toString(), accent: 'text-foreground', note: `${ticketsCount} тикетов` },
          { label: 'Реф. баланс', value: `${(user.referralBalance / 100).toFixed(2)} ₽`, accent: 'text-violet-600', note: user.referralCode ? `Код: ${user.referralCode}` : 'Нет кода' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
            <div className={`text-xl font-bold tabular-nums ${s.accent}`}>{s.value}</div>
            {s.note && <div className="text-xs text-muted-foreground mt-1">{s.note}</div>}
          </div>
        ))}
      </div>

      {/* Interactive client panel */}
      <ClientDetailClient user={dto} />

      {/* Recent orders */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Последние заказы</h2>
        </div>
        <table className="w-full" aria-label="Заказы клиента">
          <thead>
            <tr className="text-left border-b border-border bg-muted/30">
              <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">#</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Услуга</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground text-right">Кол-во</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground text-right">Сумма</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Статус</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Дата</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-muted/20 transition-all duration-200">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/orders?q=${o.numericId}`} className="font-mono text-xs text-primary hover:underline">
                    #{o.numericId}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs text-foreground truncate max-w-[200px] block">{o.service.name}</span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-xs tabular-nums text-muted-foreground">{o.quantity.toLocaleString('ru-RU')}</span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-xs font-semibold tabular-nums text-foreground">{(Number(o.charge) / 100).toFixed(2)} ₽</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">Нет заказов</div>
        )}
        {ordersCount > 15 && (
          <div className="px-4 py-3 border-t border-border">
            <Link href={`/admin/orders?userId=${user.id}`} className="text-xs text-primary hover:underline">
              Показать все {ordersCount} заказов →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
