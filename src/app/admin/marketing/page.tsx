import { adminMarketingService } from '@/services/admin/marketing.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, TrendingUp, Users, Wallet } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/page-header';
import { MarketingTabs } from './client-tabs';
import { ReferralEconomicsChart } from './referral-chart';
import { PromoCodeTable } from './promocode-table';
import { CreatePromoForm } from './create-promo-form';
import { PayoutButton } from './payout-button';
import Link from 'next/link';
import { ReferrersTable } from './client-referrers-table';

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
                      <ReferrersTable referrers={topReferrers as any} />
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

