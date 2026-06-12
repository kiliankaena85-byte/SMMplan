'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ChartDataPoint {
  name: string;
  total: number;
}

interface ReferralEconomicsChartProps {
  data: ChartDataPoint[];
}

export function ReferralEconomicsChart({ data }: ReferralEconomicsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground text-sm">
        Нет данных для отображения
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis 
            dataKey="name" 
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value} ₽`}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts value type is union number|string|array which is complex to assert in formatter
            formatter={(value: any) => [`${value} ₽`, 'Выплачено']}
            labelStyle={{ color: '#000', fontWeight: 'bold', marginBottom: '4px' }}
          />
          <Bar 
            dataKey="total" 
            fill="currentColor" 
            radius={[4, 4, 0, 0]} 
            className="fill-primary"
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
