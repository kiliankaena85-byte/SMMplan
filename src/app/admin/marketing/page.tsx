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

export const dynamic = 'force-dynamic';

export default async function MarketingPage() {
  const [promos, stats, topReferrers] = await Promise.all([
    adminMarketingService.listPromoCodes(),
    adminMarketingService.getReferralStats(),
    adminMarketingService.listTopReferrers(),
  ]);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-slate-50/50 min-h-full pb-10">
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

            <Card className="lg:col-span-3 rounded-2xl border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl">
              <CardHeader className="border-b border-slate-100/50 bg-slate-50/50 rounded-t-2xl pb-4">
                <CardTitle className="text-slate-800 text-sm font-bold uppercase tracking-widest">Список промокодов</CardTitle>
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
              <Card className="rounded-2xl border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Выплачено всего</p>
                    <p className="text-2xl font-black text-slate-900 tabular-nums">{(stats.totalPaidOut / 100).toLocaleString('ru-RU')} ₽</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">В ожидании</p>
                    <p className="text-2xl font-black text-slate-900 tabular-nums">{(stats.totalPending / 100).toLocaleString('ru-RU')} ₽</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-sky-100 text-sky-600 rounded-xl">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Топ рефоводов</p>
                    <p className="text-2xl font-black text-slate-900 tabular-nums">{topReferrers.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
               <Card className="rounded-2xl border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl">
                  <CardHeader className="border-b border-slate-100/50 bg-slate-50/50 rounded-t-2xl pb-4">
                    <CardTitle className="text-slate-800 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      Экономика программы
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ReferralEconomicsChart paidOut={stats.totalPaidOut} pending={stats.totalPending} />
                  </CardContent>
               </Card>

               <Card className="rounded-2xl border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl">
                  <CardHeader className="border-b border-slate-100/50 bg-slate-50/50 rounded-t-2xl pb-4">
                    <CardTitle className="text-slate-800 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-4 h-4 text-sky-500" />
                      Аудит рефоводов
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-1">Клиенты с балансом на партнерском счету</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm font-medium text-slate-700">
                        <thead>
                          <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-100/60 bg-slate-50/30">
                            <th className="py-3 px-6 font-bold">Клиент</th>
                            <th className="py-3 px-4 font-bold text-right text-emerald-600">Pending</th>
                            <th className="py-3 px-4 font-bold text-right">Рефералы</th>
                            <th className="py-3 px-6 font-bold text-right">Действие</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topReferrers.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100/30 last:border-0">
                              <td className="py-4 px-6">
                                <Link 
                                  href={`/admin/clients?q=${encodeURIComponent(u.email)}`}
                                  className="text-sky-600 hover:text-sky-800 hover:underline font-mono text-xs font-semibold"
                                >
                                  {u.email}
                                </Link>
                              </td>
                              <td className="py-4 px-4 text-right font-black text-emerald-600 tabular-nums">{(u.referralBalance / 100).toFixed(2)} ₽</td>
                              <td className="py-4 px-4 text-right text-slate-500 tabular-nums">
                                <span className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold">{u._count.referrals} чел.</span>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <PayoutButton userId={u.id} amount={u.referralBalance} />
                              </td>
                            </tr>
                          ))}
                          {topReferrers.length === 0 && (
                            <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-medium text-sm">Нет активных реферальных балансов</td></tr>
                          )}
                        </tbody>
                      </table>
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
