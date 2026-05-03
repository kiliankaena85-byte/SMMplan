'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp } from 'lucide-react';

interface LTVChartsProps {
  ltv: {
    totalUsers: number;
    top10PercentShare: number;
    buckets: { label: string; count: number }[];
  } | null;
}

export function LTVCharts({ ltv }: LTVChartsProps) {
  if (!ltv) return null;

  const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#f5f3ff'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Whale Stats */}
      <Card className="lg:col-span-1 border-slate-100 shadow-sm rounded-2xl bg-indigo-50/30">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-800">Киты и Распределение</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-indigo-100 text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Всего клиентов</p>
              <p className="text-2xl font-black text-slate-900">{ltv.totalUsers.toLocaleString('ru-RU')}</p>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl shadow-sm border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" /> Доля топ 10%
              </span>
              <span className="text-sm font-black text-emerald-600">{ltv.top10PercentShare.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000" 
                style={{ width: `${ltv.top10PercentShare}%` }} 
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed font-medium">
              Топ 10% клиентов генерируют {ltv.top10PercentShare.toFixed(1)}% всей выручки платформы.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* LTV Bucket Chart */}
      <Card className="lg:col-span-2 border-slate-100 shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-800">Распределение LTV (чел.)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ltv.buckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]} 
                  barSize={40}
                >
                  {ltv.buckets.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
