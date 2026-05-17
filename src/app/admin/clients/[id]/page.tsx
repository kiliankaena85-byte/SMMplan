import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import Link from 'next/link';
import { ClientDetailClient } from './client-detail-client';
import { banUserAction, unbanUserAction, loginAsAction, updateBalanceAction } from '@/actions/admin/users';
import { SubmitButton } from '@/components/admin/submit-button';
import { ActionForm } from '@/components/admin/action-form';
import { ClientOrdersTable } from './client-orders-table';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, string> = {
  PENDING:    'bg-warning/20  text-amber-700',
  PROCESSING: 'bg-blue-100   text-blue-700',
  COMPLETED:  'bg-success/20 text-emerald-700',
  FAILED:     'bg-destructive/20   text-rose-700',
  CANCELLED:  'bg-muted  text-muted-foreground',
  PARTIAL:    'bg-orange-100 text-orange-700',
};

const ROLE_BADGE: Record<string, string> = {
  OWNER:   'bg-primary/20 text-indigo-800',
  ADMIN:   'bg-sky-100 text-sky-800',
  MANAGER: 'bg-success/20 text-emerald-800',
  SUPPORT: 'bg-muted text-foreground',
  USER:    'bg-muted text-foreground',
  BANNED:  'bg-destructive/20 text-rose-800',
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
      apiKeyHash: true,
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

  const roleBadge = ROLE_BADGE[user.role] ?? 'bg-muted text-foreground';

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
                className="text-xs h-9 text-emerald-700 border-emerald-300 hover:bg-success/10"
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
                className="text-xs h-9 text-destructive border-rose-300 hover:bg-destructive/10"
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
          { label: 'LTV', value: `${(Number(user.totalSpent) / 100).toLocaleString('ru-RU')} ₽`, accent: 'text-success', note: null },
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

      {/* Balance Adjustment Block */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">💰 Корректировка баланса</h3>
        <ActionForm action={updateBalanceAction} className="space-y-3 max-w-sm">
          <input type="hidden" name="userId" value={user.id} />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Сумма (в копейках, − для списания)</label>
            <input type="number" name="amount" placeholder="10000 = 100₽" required className="w-full h-9 text-sm px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Причина / Комментарий</label>
            <input name="reason" placeholder="Например: Бонус за регистрацию" required className="w-full h-9 text-sm px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" />
          </div>
          <SubmitButton className="w-full h-9 text-sm gap-1.5" confirmMessage="Вы уверены, что хотите изменить баланс клиента?">
            Применить изменение
          </SubmitButton>
        </ActionForm>
      </div>

      {/* Recent orders */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Последние заказы</h2>
        </div>
        <ClientOrdersTable orders={orders as any} />
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
