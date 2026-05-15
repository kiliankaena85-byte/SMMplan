import { adminMarketingService } from '@/services/admin/marketing.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/admin/hero-ui';
import { Gift, TrendingUp, Users, Wallet } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/page-header';
import { MarketingTabs } from './client-tabs';
import { ReferralEconomicsChart } from './referral-chart';
import { PromoCodeTable } from './promocode-table';
import { CreatePromoForm } from './create-promo-form';
import { PayoutButton } from './payout-button';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MarketingPage() {
  const [promos, stats, topReferrers] = await Promise.all([
    adminMarketingService.listPromoCodes(),
    adminMarketingService.getReferralStats(),
    adminMarketingService.listTopReferrers(),
  ]);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-muted/50/50 min-h-full pb-10">
      <AdminPageHeader
        icon={Gift}
        title="Маркетинг"
        description="Управление промокодами и аналитика партнерской программы"
      />

      <MarketingTabs
        promocodesContent={
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <CreatePromoForm />
            </div>

            <Card className="lg:col-span-3 rounded-2xl border-border/50/50 shadow-sm bg-background/60 backdrop-blur-xl">
              <CardHeader className="border-b border-border/50/50 bg-muted/50/50 rounded-t-2xl pb-4">
                <CardTitle className="text-foreground text-sm font-bold uppercase tracking-widest">Список промокодов</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <PromoCodeTable data={promos} />
              </CardContent>
            </Card>
          </div>
        }
        referralsContent={
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="rounded-2xl border-border/50/50 shadow-sm bg-background/60 backdrop-blur-xl">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-success/20 text-success rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Выплачено всего</p>
                    <p className="text-2xl font-black text-foreground tabular-nums">{(Number(stats.totalPaidOut) / 100).toLocaleString('ru-RU')} ₽</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/50/50 shadow-sm bg-background/60 backdrop-blur-xl">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-warning/20 text-warning rounded-xl">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">В ожидании</p>
                    <p className="text-2xl font-black text-foreground tabular-nums">{(Number(stats.totalPending) / 100).toLocaleString('ru-RU')} ₽</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/50/50 shadow-sm bg-background/60 backdrop-blur-xl">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-sky-100 text-sky-600 rounded-xl">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Топ рефоводов</p>
                    <p className="text-2xl font-black text-foreground tabular-nums">{topReferrers.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
               <Card className="rounded-2xl border-border/50/50 shadow-sm bg-background/60 backdrop-blur-xl">
                  <CardHeader className="border-b border-border/50/50 bg-muted/50/50 rounded-t-2xl pb-4">
                    <CardTitle className="text-foreground text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-success" />
                      Экономика программы
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ReferralEconomicsChart paidOut={Number(stats.totalPaidOut)} pending={Number(stats.totalPending)} />
                  </CardContent>
               </Card>

               <Card className="rounded-2xl border-border/50/50 shadow-sm bg-background/60 backdrop-blur-xl">
                  <CardHeader className="border-b border-border/50/50 bg-muted/50/50 rounded-t-2xl pb-4">
                    <CardTitle className="text-foreground text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-4 h-4 text-sky-500" />
                      Аудит рефоводов
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">Клиенты с балансом на партнерском счету</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="w-full">
                      <Table aria-label="Топ рефоводов">
                        <TableHeader>
                          <TableColumn>КЛИЕНТ</TableColumn>
                          <TableColumn className="text-right">PENDING</TableColumn>
                          <TableColumn className="text-right">РЕФЕРАЛЫ</TableColumn>
                          <TableColumn className="text-right">ДЕЙСТВИЕ</TableColumn>
                        </TableHeader>
                        <TableBody renderEmptyState={() => "Нет активных реферальных балансов"}>
                          {topReferrers.map(u => (
                            <TableRow key={u.id}>
                              <TableCell>
                                <Link 
                                  href={`/admin/clients?q=${encodeURIComponent(u.email)}`}
                                  className="text-primary hover:underline font-mono text-xs font-semibold"
                                >
                                  {u.email}
                                </Link>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="font-black text-success tabular-nums">{(u.referralBalance / 100).toFixed(2)} ₽</span>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground tabular-nums">
                                <span className="px-2 py-1 rounded-md bg-muted text-[10px] font-bold">{u._count.referrals} чел.</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <PayoutButton userId={u.id} amount={u.referralBalance} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
               </Card>
            </div>
          </div>
        }
      />
    </div>
  );
}

