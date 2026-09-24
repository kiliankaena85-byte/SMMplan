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
import { Calendar, RotateCcw } from 'lucide-react';

const PERIODS = [
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
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handlePeriodChange = (val: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val && val !== 'all') {
      params.set('period', val);
    } else {
      params.delete('period');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('refresh', 'true');
    router.push(`${pathname}?${params.toString()}`);
    setTimeout(() => {
      params.delete('refresh');
      router.replace(`${pathname}?${params.toString()}`);
      setIsRefreshing(false);
    }, 1500);
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger size="sm" className="w-36 h-8 border border-border/70 bg-card text-foreground transition-all cursor-pointer text-xs font-semibold rounded-md">
          <SelectValue placeholder="Все время">
            {(value: string | null) => {
              if (!value) return 'Все время';
              return PERIODS.find(p => p.id === value)?.name ?? value;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border border-border/80 rounded-md shadow-md text-foreground">
          {PERIODS.map(p => (
            <SelectItem key={p.id} value={p.id} className="cursor-pointer text-xs">
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        type="button"
        title="Сбросить кэш и принудительно обновить метрики дашборда"
        className="p-1.5 h-8 w-8 flex items-center justify-center rounded-md border border-border/70 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
      >
        <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
      </button>
    </div>
  );
}
