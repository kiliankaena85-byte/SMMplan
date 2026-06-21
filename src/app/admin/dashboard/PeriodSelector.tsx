'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

const periods = [
  { id: 'today', name: 'Сегодня' },
  { id: 'yesterday', name: 'Вчера' },
  { id: '7d', name: '7 дней' },
  { id: '30d', name: '30 дней' },
  { id: 'all', name: 'Все время' },
];

interface PeriodSelectorProps {
  period: string;
}

export function PeriodSelector({ period }: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePeriodChange = (val: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val && val !== 'all') {
      params.set('period', val);
    } else {
      params.delete('period');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-40 h-9 border border-border bg-card text-foreground focus:ring-2 focus:ring-primary/20 transition-all duration-200 cursor-pointer text-xs font-semibold rounded-xl">
          <SelectValue placeholder="Все время">
            {(value: string | null) => {
              if (!value) return 'Все время';
              return periods.find(p => p.id === value)?.name ?? value;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border border-border rounded-xl shadow-lg text-foreground">
          {periods.map(p => (
            <SelectItem key={p.id} value={p.id} className="cursor-pointer text-xs">
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
