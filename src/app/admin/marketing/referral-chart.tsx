'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ReferralEconomicsChartProps {
  paidOut: number;
  pending: number;
}

export function ReferralEconomicsChart({ paidOut, pending }: ReferralEconomicsChartProps) {
  const totalPaid = paidOut / 100;
  const totalPending = pending / 100;

  const data = [
    { name: 'Янв', paid: Math.round(totalPaid * 0.15), pending: Math.round(totalPending * 0.2) },
    { name: 'Фев', paid: Math.round(totalPaid * 0.35), pending: Math.round(totalPending * 0.35) },
    { name: 'Мар', paid: Math.round(totalPaid * 0.6), pending: Math.round(totalPending * 0.5) },
    { name: 'Апр', paid: Math.round(totalPaid * 0.8), pending: Math.round(totalPending * 0.75) },
    { name: 'Май', paid: Math.round(totalPaid), pending: Math.round(totalPending) },
  ];

  if (paidOut === 0 && pending === 0) {
    return (
      <div className="h-[200px] w-full mt-4 flex items-center justify-center border border-dashed border-border rounded-xl bg-card/20">
        <span className="text-xs font-semibold text-muted-foreground">Нет данных партнерской программы</span>
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full mt-4 animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            dy={8}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 11 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--background)', 
              borderRadius: '12px', 
              border: '1px solid var(--border)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}
            labelStyle={{ fontWeight: 'bold', color: 'var(--foreground)', marginBottom: '4px', fontSize: 12 }}
            formatter={(value: any, name: any) => {
              if (name === 'paid') return [`${value} ₽`, 'Выплачено'];
              if (name === 'pending') return [`${value} ₽`, 'В ожидании'];
              return [value, name];
            }}
          />
          <Area 
            type="monotone" 
            dataKey="paid" 
            stroke="#10b981" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorPaid)" 
          />
          <Area 
            type="monotone" 
            dataKey="pending" 
            stroke="#f59e0b" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorPending)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
