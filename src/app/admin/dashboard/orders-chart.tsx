'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export type OrdersChartData = {
  dateStr: string;
  completed: number;
  canceled: number;
  unpaid: number;
};

interface OrdersChartProps {
  data: OrdersChartData[];
}

export function OrdersChart({ data }: OrdersChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] w-full mt-4 flex items-center justify-center border-2 border-dashed border-border/50 rounded-xl">
        <p className="text-sm font-medium text-muted-foreground">Нет данных для отображения</p>
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          
          <XAxis 
            dataKey="dateStr" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            dy={10}
            minTickGap={20}
          />
          
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 11 }} 
            allowDecimals={false}
          />
          
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}
            formatter={(value: any, name: any) => {
              if (name === 'completed') return [value, 'Выполнены'];
              if (name === 'canceled') return [value, 'Отменены'];
              if (name === 'unpaid') return [value, 'Не оплачены'];
              return [value, name];
            }}
          />
          
          <Legend 
             iconType="circle" 
             wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
             formatter={(value) => {
               if (value === 'completed') return <span className="text-muted-foreground font-medium">Выполнены</span>;
               if (value === 'canceled') return <span className="text-muted-foreground font-medium">Отменены</span>;
               if (value === 'unpaid') return <span className="text-muted-foreground font-medium">Не оплачены</span>;
               return value;
             }}
          />

          <Line 
            type="monotone" 
            dataKey="completed" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
          />
          <Line 
            type="monotone" 
            dataKey="canceled" 
            stroke="#f43f5e" 
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0, fill: '#f43f5e' }}
          />
          <Line 
            type="monotone" 
            dataKey="unpaid" 
            stroke="#f59e0b" 
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0, fill: '#f59e0b' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
