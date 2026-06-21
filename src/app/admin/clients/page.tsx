import { adminUserService, getVolumeTier } from '@/services/admin/user.service';
import { updateBalanceAction, banUserAction, unbanUserAction, loginAsAction } from '@/actions/admin/users';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { FINANCE_TABS, ONBOARDING_CONFIGS } from '@/components/admin/navigation-data';
import { ClientTable } from './components/client-table';
import { Users, Download } from 'lucide-react';
import { SubmitButton } from '@/components/admin/submit-button';
import { ActionForm } from '@/components/admin/action-form';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    q?: string;
    cursor?: string;
    userId?: string;
  }>;
};

import { enforceSectionAccess } from '@/lib/server/rbac';

export default async function AdminClientsPage({ searchParams }: Props) {
  await enforceSectionAccess('finance');
  const session = await verifySession();
  const user = session ? await db.user.findUnique({ 
    where: { id: session.userId },
    include: { staffRole: { include: { permissions: true } } }
  }) : null;

  const isOwner = user?.role === 'OWNER';
  const isSupport = user?.role === 'SUPPORT';
  const canSeeFinances = isOwner || !isSupport;

  const params = await searchParams;
  const search = params.q || '';
  const cursor = params.cursor || undefined;
  const selectedUserId = params.userId;

  const { items: users, nextCursor, hasMore } = await adminUserService.listUsers({
    search: search || undefined,
    cursor,
    pageSize: 50,
  });

  const stats = await adminUserService.getUserStats();

  // If a user is selected, load their full card
  const userCard = selectedUserId ? await adminUserService.getUserCard(selectedUserId).catch(() => null) : null;

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 min-h-full pb-10">
      <AdminTabbedHeader
        icon={Users}
        title="Клиенты платформы"
        description={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground font-medium text-xs">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>Всего: {stats.total}</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-success rounded-full"></div>Активные: {stats.active}</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-destructive rounded-full"></div>Забанены: {stats.banned}</span>
            {canSeeFinances && (
               <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-warning rounded-full"></div>Liability: <span className="tabular-nums font-bold">{(Number(stats.totalLiability) / 100).toLocaleString('ru-RU')} ₽</span></span>
            )}
          </div>
        }
        action={(
          <a
            href={`/api/admin/export?type=users&q=${encodeURIComponent(search)}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-foreground bg-background border border-border shadow-sm rounded-lg hover:bg-muted/50 hover:text-primary transition-colors"
          >
            <Download className="w-4 h-4" /> Экспорт CSV
          </a>
        )}
        tabs={FINANCE_TABS}
        onboardingKey="clients"
        onboarding={ONBOARDING_CONFIGS.clients}
      />

      {/* Search */}
      <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-6 ring-1 ring-border/5">
        <form className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground flex items-center justify-center">🔍</span>
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Поиск по email..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-background/50 border border-border/60 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
            />
          </div>
          <Button type="submit" className="sm:w-auto w-full rounded-xl active:scale-95 transition-transform shadow-sm">
            Найти
          </Button>
        </form>
      </div>

      <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl ring-1 ring-border/5 overflow-hidden">
        <div className="p-6">
          <ClientTable 
            data={users.map(u => ({
              ...u,
              totalSpent: Number(u.totalSpent),
              balance: Number(u.balance),
              quarantineBalance: Number(u.quarantineBalance),
              tier: getVolumeTier(Number(u.totalSpent))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            })) as any}
          >
            {userCard ? (
              <div className="space-y-4">
                {/* Profile Card */}
                <div className="space-y-4">
                  <div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {canSeeFinances && (
                        <>
                          <div className="bg-background/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm ring-1 ring-border/5">
                            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Баланс</div>
                            <div className="font-mono font-bold text-lg text-foreground tabular-nums tracking-tight">{(Number(userCard.balance) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</div>
                          </div>
                          <div className="bg-background/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm ring-1 ring-border/5">
                            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">LTV</div>
                            <div className="font-mono font-bold text-lg text-foreground tabular-nums tracking-tight">{(Number(userCard.totalSpent) / 100).toLocaleString('ru-RU')} ₽</div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground bg-background/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm ring-1 ring-border/5 mt-4">
                      <p>Зарегистрирован: <span className="font-mono font-medium text-foreground">{userCard.createdAt.toLocaleDateString('ru-RU')}</span></p>
                      {userCard.personalDiscount > 0 && (
                        <p className="mt-1 text-primary font-bold">Скидка: <span className="font-mono">{userCard.personalDiscount}%</span></p>
                      )}
                      {userCard.telegramId && (
                        <p className="mt-1">Telegram: <span className="font-mono font-medium text-foreground">{userCard.telegramId}</span></p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <ActionForm action={loginAsAction} className="flex-1">
                        <input type="hidden" name="userId" value={userCard.id} />
                        <SubmitButton variant="outline" className="w-full text-xs h-9 rounded-xl active:scale-95 transition-transform shadow-sm">
                          🔑 Войти как
                        </SubmitButton>
                      </ActionForm>
                      {userCard.role === 'BANNED' ? (
                        <ActionForm action={unbanUserAction}>
                          <input type="hidden" name="userId" value={userCard.id} />
                          <SubmitButton variant="outline" className="text-xs h-9 text-emerald-700 hover:text-emerald-800 hover:bg-success/10 rounded-xl active:scale-95 transition-transform shadow-sm" confirmMessage="Снять блокировку с этого пользователя?">
                            Разбанить
                          </SubmitButton>
                        </ActionForm>
                      ) : (
                        <ActionForm action={banUserAction}>
                          <input type="hidden" name="userId" value={userCard.id} />
                          <SubmitButton variant="outline" className="text-xs h-9 text-destructive hover:text-rose-700 hover:bg-destructive/10 rounded-xl active:scale-95 transition-transform shadow-sm" confirmMessage="Вы уверены, что хотите забанить данного клиента? Действие можно отменить позже.">
                            Бан
                          </SubmitButton>
                        </ActionForm>
                      )}
                    </div>

                    {canSeeFinances && (
                      <div className="bg-background/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm mt-4 ring-1 ring-border/5">
                        <h3 className="text-sm font-bold tracking-tight text-foreground mb-4">💰 Корректировка баланса</h3>
                        <ActionForm action={updateBalanceAction} className="space-y-4">
                          <input type="hidden" name="userId" value={userCard.id} />
                          <div>
                            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5 block">Сумма (в копейках, − для списания)</label>
                            <input type="number" name="amount" placeholder="10000 = 100₽" required className="w-full h-10 text-sm font-mono tabular-nums px-3 py-2 rounded-xl border border-border/60 bg-background/50 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5 block">Причина / Комментарий</label>
                            <input name="reason" placeholder="Например: Бонус за регистрацию" required className="w-full h-10 text-sm px-3 py-2 rounded-xl border border-border/60 bg-background/50 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                          <SubmitButton className="w-full h-10 text-xs font-bold gap-2 rounded-xl active:scale-95 shadow-sm transition-transform" confirmMessage="Вы уверены, что хотите изменить баланс клиента?">
                            Применить изменение
                          </SubmitButton>
                        </ActionForm>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-background/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm ring-1 ring-border/5">
                  <h3 className="text-sm font-bold tracking-tight text-foreground mb-4">📦 Последние 10 заказов</h3>
                  <div className="space-y-2">
                    {userCard.orders.map(o => (
                      <Link
                        key={o.id}
                        href={`/admin/orders?q=${o.numericId}`}
                        className="flex justify-between items-center py-2.5 px-3 text-xs bg-muted/30 border border-border/50 rounded-xl hover:border-border hover:bg-muted/50 transition-all shadow-sm"
                      >
                        <span className="font-mono text-muted-foreground font-medium w-16">#{o.numericId}</span>
                        <span className="truncate max-w-[150px] text-muted-foreground px-2 flex-1">{o.service.name}</span>
                        <span className="font-bold font-mono text-foreground tabular-nums tracking-tight border-l border-border/50 pl-3">{(Number(o.charge) / 100).toLocaleString('ru-RU')} ₽</span>
                      </Link>
                    ))}
                    {userCard.orders.length === 0 && (
                      <p className="text-xs font-medium text-muted-foreground text-center py-6 bg-muted/30 border border-border/50 rounded-xl border-dashed">Нет заказов</p>
                    )}
                  </div>
                </div>
              </div>
            ) : !selectedUserId ? (
              <div className="py-16 flex flex-col items-center justify-center text-center px-6 text-muted-foreground gap-3 bg-background/50 border border-border/50 rounded-2xl min-h-[300px] border-dashed ring-1 ring-border/5">
                <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-bold text-sm text-foreground">Профиль не выбран</h4>
                <p className="text-xs max-w-[220px]">Выберите клиента из списка слева для просмотра деталей и управления балансом</p>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center gap-4 justify-center h-full text-muted-foreground">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                Загрузка профиля...
              </div>
            )}
          </ClientTable>

          {/* Pagination for Server Sync */}
          {(cursor || hasMore) && (
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-border/50">
              {cursor ? (
                <Link href={`/admin/clients?q=${encodeURIComponent(search)}`}
                  className="px-4 py-2 text-sm font-semibold text-foreground bg-background/50 border border-border/60 rounded-xl hover:bg-muted/80 shadow-sm transition-all active:scale-95">
                  ← В начало
                </Link>
              ) : <div />}
              {hasMore && nextCursor && (
                <Link href={`/admin/clients?q=${encodeURIComponent(search)}&cursor=${nextCursor}`}
                  className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 shadow-sm transition-all active:scale-95">
                  Следующая →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
