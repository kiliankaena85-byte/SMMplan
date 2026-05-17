import { adminUserService, getVolumeTier } from '@/services/admin/user.service';
import { updateBalanceAction, banUserAction, unbanUserAction, loginAsAction } from '@/actions/admin/users';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/page-header';
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

export default async function AdminClientsPage({ searchParams }: Props) {
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
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-muted/50/50 min-h-full pb-10">
      <AdminPageHeader
        icon={Users}
        title="Клиенты платформы"
        description={
          <>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>Всего: {stats.total}</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-success rounded-full"></div>Активные: {stats.active}</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-destructive rounded-full"></div>Забанены: {stats.banned}</span>
            {canSeeFinances && (
               <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-warning rounded-full"></div>Liability: <span className="tabular-nums font-bold">{(Number(stats.totalLiability) / 100).toLocaleString('ru-RU')} ₽</span></span>
            )}
          </>
        }
        action={(
          <a
            href={`/api/admin/export?type=users&q=${encodeURIComponent(search)}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-foreground bg-background border border-border shadow-sm rounded-lg hover:bg-muted/50 hover:text-primary transition-colors"
          >
            <Download className="w-4 h-4" /> Экспорт CSV
          </a>
        )}
      />

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex gap-4">
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="🔍 Поиск по email..."
              className="flex-1 px-4 py-2 text-sm border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
            <Button type="submit">Найти</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <ClientTable 
            data={users.map(u => ({
              ...u,
              totalSpent: Number(u.totalSpent),
              balance: Number(u.balance),
              quarantineBalance: Number(u.quarantineBalance),
              tier: getVolumeTier(Number(u.totalSpent))
            })) as any}
          >
            {userCard ? (
              <div className="space-y-4">
                {/* Profile Card */}
                <Card className="shadow-none border-none bg-transparent">
                  <CardContent className="p-0 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {canSeeFinances && (
                        <>
                          <div className="bg-background border border-border rounded-lg p-3 shadow-sm">
                            <div className="text-muted-foreground mb-1">Баланс</div>
                            <div className="font-bold text-lg text-foreground">{(Number(userCard.balance) / 100).toFixed(2)} ₽</div>
                          </div>
                          <div className="bg-background border border-border rounded-lg p-3 shadow-sm">
                            <div className="text-muted-foreground mb-1">LTV</div>
                            <div className="font-bold text-lg text-foreground">{(Number(userCard.totalSpent) / 100).toLocaleString('ru-RU')} ₽</div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground bg-background border border-border rounded-lg p-3 shadow-sm">
                      <p>Зарегистрирован: {userCard.createdAt.toLocaleDateString('ru-RU')}</p>
                      {userCard.personalDiscount > 0 && (
                        <p className="mt-1 text-primary font-medium">Скидка: {userCard.personalDiscount}%</p>
                      )}
                      {userCard.telegramId && (
                        <p className="mt-1">Telegram: {userCard.telegramId}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <ActionForm action={loginAsAction} className="flex-1">
                        <input type="hidden" name="userId" value={userCard.id} />
                        <SubmitButton variant="outline" className="w-full text-xs h-9">
                          🔑 Войти как
                        </SubmitButton>
                      </ActionForm>
                      {userCard.role === 'BANNED' ? (
                        <ActionForm action={unbanUserAction}>
                          <input type="hidden" name="userId" value={userCard.id} />
                          <SubmitButton variant="outline" className="text-xs h-9 text-emerald-700 hover:text-emerald-800 hover:bg-success/10" confirmMessage="Снять блокировку с этого пользователя?">
                            Разбанить
                          </SubmitButton>
                        </ActionForm>
                      ) : (
                        <ActionForm action={banUserAction}>
                          <input type="hidden" name="userId" value={userCard.id} />
                          <SubmitButton variant="outline" className="text-xs h-9 text-destructive hover:text-rose-700 hover:bg-destructive/10" confirmMessage="Вы уверены, что хотите забанить данного клиента? Действие можно отменить позже.">
                            Бан
                          </SubmitButton>
                        </ActionForm>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Orders */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">📦 Последние 10 заказов</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {userCard.orders.map(o => (
                        <Link
                          key={o.id}
                          href={`/admin/orders?q=${o.numericId}`}
                          className="flex justify-between items-center py-2 px-3 text-xs bg-muted/50 border border-border/50 rounded-md hover:border-border transition-colors"
                        >
                          <span className="font-mono text-muted-foreground font-medium">#{o.numericId}</span>
                          <span className="truncate max-w-[150px] text-muted-foreground px-2">{o.service.name}</span>
                          <span className="font-semibold text-foreground border-l border-border pl-2">{(Number(o.charge) / 100).toFixed(0)} ₽</span>
                        </Link>
                      ))}
                      {userCard.orders.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4 bg-muted/50 rounded-md">Нет заказов</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
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
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
              {cursor ? (
                <Link href={`/admin/clients?q=${encodeURIComponent(search)}`}
                  className="px-3 py-1.5 text-sm text-foreground bg-background border border-border rounded-md hover:bg-muted/50">
                  ← В начало
                </Link>
              ) : <div />}
              {hasMore && nextCursor && (
                <Link href={`/admin/clients?q=${encodeURIComponent(search)}&cursor=${nextCursor}`}
                  className="px-3 py-1.5 text-sm text-primary-foreground bg-primary rounded-md hover:bg-primary">
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
