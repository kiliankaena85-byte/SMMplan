import { getFunnelAnalyticsAction } from '@/actions/admin/analytics.action';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/page-header';
import { BarChart, Clock, TrendingDown } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const params = await searchParams;
  const period = params.p === '1' ? 1 : 7;
  
  const { funnel, topServices } = await getFunnelAnalyticsAction(period);

  const maxCount = Math.max(funnel.linkPasted, 1);
  
  const s4Pct = funnel.linkPasted > 0 ? (funnel.paymentClicked / funnel.linkPasted) * 100 : 0;
  const dropToS2 = funnel.linkPasted > 0 ? (funnel.serviceSelected / funnel.linkPasted) * 100 : 0;
  const dropToS3 = funnel.serviceSelected > 0 ? (funnel.checkoutInitiated / funnel.serviceSelected) * 100 : 0;
  const dropToS4 = funnel.checkoutInitiated > 0 ? (funnel.paymentClicked / funnel.checkoutInitiated) * 100 : 0;

  function getColorClass(pct: number) {
    if (pct === 0 && maxCount === 1) return 'bg-slate-200 text-slate-600';
    if (pct < 30) return 'bg-rose-500 text-white shadow-rose-500/20';
    if (pct < 50) return 'bg-amber-500 text-white shadow-amber-500/20';
    return 'bg-emerald-500 text-white shadow-emerald-500/20';
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 min-h-full pb-10">
      <AdminPageHeader
        icon={BarChart}
        title="Воронка конверсии"
        description="Анализ Zero-Scroll Master в реальном времени"
      />

      {/* Controls */}
      <div className="flex gap-2 mb-6">
        <Link
          href="?p=1"
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
            period === 1
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-card border border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          <Clock className="w-4 h-4" /> 24 Часа
        </Link>
        <Link
          href="?p=7"
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
            period === 7
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-card border border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          <Clock className="w-4 h-4" /> 7 Дней
        </Link>
      </div>

      {/* Funnel */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <TrendingDown className="w-5 h-5 text-primary" /> Дроп-офф воронка
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 pb-12 flex flex-col items-center justify-center gap-1">

          <div className="w-full max-w-4xl flex flex-col items-center">
            <div className="w-full py-4 text-center rounded-t-xl font-bold bg-indigo-600 text-white shadow-lg">
              1. Вставлено ссылок: {funnel.linkPasted}
            </div>
            <div className="text-xs font-semibold text-muted-foreground py-2">Базовый трафик (100%)</div>
          </div>

          <div className="w-[85%] max-w-3xl flex flex-col items-center -mt-1">
            <div className={`w-full py-3.5 text-center rounded-sm font-bold shadow-md ${getColorClass(dropToS2)}`}>
              2. Выбрана услуга: {funnel.serviceSelected}
            </div>
            <div className="text-xs font-semibold text-muted-foreground py-2">
              Конверсия: {dropToS2.toFixed(1)}% {dropToS2 < 30 && '🔥 Узкое горлышко'}
            </div>
          </div>

          <div className="w-[70%] max-w-2xl flex flex-col items-center -mt-1">
            <div className={`w-full py-3 text-center rounded-sm font-bold shadow-md ${getColorClass(dropToS3)}`}>
              3. Открыта форма чекаута: {funnel.checkoutInitiated}
            </div>
            <div className="text-xs font-semibold text-muted-foreground py-2">
              Конверсия: {dropToS3.toFixed(1)}% {dropToS3 < 30 && '🔥 Отвал на UI чекаута'}
            </div>
          </div>

          <div className="w-[50%] max-w-lg flex flex-col items-center -mt-1">
            <div className={`w-full py-2.5 text-center rounded-b-xl font-bold shadow-md ${getColorClass(dropToS4)}`}>
              4. Клик к оплате: {funnel.paymentClicked}
            </div>
            <div className="text-xs font-semibold text-muted-foreground mt-2">
              Конверсия в оплату: {dropToS4.toFixed(1)}%
            </div>
            <div className="text-sm font-black text-foreground mt-2">
              OVERALL: {s4Pct.toFixed(1)}%
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Top Services — native HTML table, no React Aria collection issues */}
      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Топ 5 услуг (по кликам)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm" aria-label="Топ услуг по кликам">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Услуга
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Кликов
                  </th>
                </tr>
              </thead>
              <tbody>
                {topServices.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Нет данных за выбранный период
                    </td>
                  </tr>
                ) : (
                  topServices.map((srv, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-foreground">{srv.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono text-muted-foreground">
                        {srv.clicks}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
