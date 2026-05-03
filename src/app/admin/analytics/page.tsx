import { getFunnelAnalyticsAction } from '@/actions/admin/analytics.action';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/page-header';
import { BarChart as BarChartIcon, Clock, TrendingDown, Download } from 'lucide-react';
import Link from 'next/link';
import { LTVCharts } from './ltv-charts';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const params = await searchParams;
  const period = params.p === '1' ? 1 : 7;
  
  const analyticsData = await getFunnelAnalyticsAction(period);

  if ('error' in analyticsData) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-rose-600">Ошибка доступа</h1>
        <p className="text-slate-500 mt-2">{analyticsData.error}</p>
        <Link href="/admin/dashboard" className="mt-4 inline-block text-indigo-600 hover:underline">
          Вернуться на главную
        </Link>
      </div>
    );
  }

  const { funnel, topServices, profitability, ltv } = analyticsData;

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

  const fmt = (v: number) => (v / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 }) + ' ₽';

  return (
    <div className="space-y-8 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 min-h-full pb-10 bg-slate-50/30">
      <AdminPageHeader
        icon={BarChartIcon}
        title="Аналитика и Рентабельность"
        description="Глубокий анализ конверсии и чистой прибыли"
        action={(
          <a
            href="/api/admin/export?type=profitability"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
          >
            <Download className="w-4 h-4" /> Отчет бухгалтерии (CSV)
          </a>
        )}
      />

      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Link
            href="?p=1"
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              period === 1
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> 24 Часа
            </div>
          </Link>
          <Link
            href="?p=7"
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              period === 7
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> 7 Дней
            </div>
          </Link>
        </div>
      </div>

      {/* LTV & Whale Analysis */}
      <LTVCharts ltv={ltv} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Funnel */}
        <Card className="border-slate-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-2 border-b border-slate-50">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-primary" /> Воронка конверсии
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 pb-12 flex flex-col items-center justify-center gap-1">

            <div className="w-full max-w-md flex flex-col items-center">
              <div className="w-full py-4 text-center rounded-t-xl font-black bg-indigo-600 text-white shadow-lg text-sm uppercase tracking-wider">
                1. Трафик (Лендинг): {funnel.linkPasted}
              </div>
              <div className="text-[10px] font-bold text-slate-400 py-2 uppercase tracking-tighter">BASE (100%)</div>
            </div>

            <div className="w-[85%] max-w-sm flex flex-col items-center -mt-1">
              <div className={`w-full py-3.5 text-center rounded-sm font-black shadow-md text-sm uppercase tracking-wider ${getColorClass(dropToS2)}`}>
                2. Выбор услуги: {funnel.serviceSelected}
              </div>
              <div className="text-[10px] font-bold text-slate-400 py-2 uppercase tracking-tighter">
                CR: {dropToS2.toFixed(1)}% {dropToS2 < 30 && '🔥 DROP'}
              </div>
            </div>

            <div className="w-[70%] max-w-xs flex flex-col items-center -mt-1">
              <div className={`w-full py-3 text-center rounded-sm font-black shadow-md text-xs uppercase tracking-wider ${getColorClass(dropToS3)}`}>
                3. Чекаут: {funnel.checkoutInitiated}
              </div>
              <div className="text-[10px] font-bold text-slate-400 py-2 uppercase tracking-tighter">
                CR: {dropToS3.toFixed(1)}% {dropToS3 < 30 && '🔥 DROP'}
              </div>
            </div>

            <div className="w-[50%] max-w-[180px] flex flex-col items-center -mt-1">
              <div className={`w-full py-2.5 text-center rounded-b-xl font-black shadow-md text-xs uppercase tracking-wider ${getColorClass(dropToS4)}`}>
                4. Оплата: {funnel.paymentClicked}
              </div>
              <div className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">
                FINAL CR: {s4Pct.toFixed(1)}%
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Top Services by Clicks */}
        <Card className="border-slate-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-2 border-b border-slate-50">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-800">Топ 5 Популярных (клики)</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-xs" aria-label="Топ услуг по кликам">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-widest">Услуга</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase tracking-widest">Кликов</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topServices.length === 0 ? (
                    <tr><td colSpan={2} className="px-4 py-12 text-center text-slate-400 font-medium">Нет данных</td></tr>
                  ) : (
                    topServices.map((srv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-700">{srv.name}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-black text-indigo-600">{srv.clicks}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profitability by Category */}
      <Card className="border-slate-100 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-slate-50">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-800">Рентабельность по категориям</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-widest">Категория</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase tracking-widest">Заказов</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase tracking-widest">Выручка</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase tracking-widest">Себест.</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-800 uppercase tracking-widest">Прибыль</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase tracking-widest">Маржа %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profitability.categories.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{c.categoryName}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{c.ordersCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(c.revenue)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-400">{fmt(c.cogs)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-black text-emerald-600">{fmt(c.profit)}</td>
                    <td className="px-4 py-3 text-right">
                       <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${c.marginPct > 40 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                         {c.marginPct.toFixed(1)}%
                       </span>
                    </td>
                  </tr>
                ))}
                {profitability.categories.length === 0 && (
                   <tr><td colSpan={6} className="py-12 text-center text-slate-400">Нет данных о продажах</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Profitability by Service (Top 15) */}
      <Card className="border-slate-100 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-slate-50">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-800">Рентабельность по услугам (Топ 15)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-widest">Услуга</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase tracking-widest">Заказов</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase tracking-widest">Выручка</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-800 uppercase tracking-widest">Прибыль</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase tracking-widest">Маржа %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profitability.services.slice(0, 15).map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{s.serviceName}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-tighter">{s.categoryName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{s.ordersCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(s.revenue)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-black text-indigo-600">{fmt(s.profit)}</td>
                    <td className="px-4 py-3 text-right">
                       <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${s.marginPct > 50 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                         {s.marginPct.toFixed(1)}%
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
