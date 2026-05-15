'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PromoCode } from '@prisma/client';
import { Trash2 } from 'lucide-react';
import { togglePromoCode, deletePromoCode } from '@/actions/admin/marketing';
import { useTransition } from 'react';
import { toast } from 'sonner';

export const columns: ColumnDef<PromoCode>[] = [
  {
    accessorKey: 'code',
    header: 'Код',
    cell: ({ row }) => (
      <span className="font-mono font-bold text-foreground tracking-wider">
        {row.original.code}
      </span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Тип',
    cell: ({ row }) => {
      const type = row.original.type;
      return (
        <Badge
          intent={type === 'DISCOUNT' ? 'primary' : 'secondary'}
          className="uppercase font-bold tracking-wider text-[10px]"
        >
          {type === 'DISCOUNT' ? 'Скидка' : 'Ваучер'}
        </Badge>
      );
    },
  },
  {
    header: 'Бонус',
    cell: ({ row }) => {
      const p = row.original;
      return (
        <span className="tabular-nums font-semibold text-foreground">
          {p.type === 'DISCOUNT' ? `${p.discountPercent}%` : `${p.amount} ₽`}
        </span>
      );
    },
  },
  {
    header: 'Использование',
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground tabular-nums">
            {p.uses} / {p.maxUses}
          </span>
          <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-sky-500 transition-all" 
              style={{ width: `${Math.min(100, (p.uses / p.maxUses) * 100)}%` }} 
            />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'isActive',
    header: 'Статус',
    cell: ({ row }) => {
      const [isPending, startTransition] = useTransition();
      const p = row.original;

      const handleToggle = () => {
        startTransition(async () => {
          const res = await togglePromoCode(p.id, !p.isActive);
          if (res.success) {
            toast.success(`Промокод ${!p.isActive ? 'активирован' : 'деактивирован'}`);
          } else {
            toast.error(res.error);
          }
        });
      };

      return (
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={p.isActive} 
            onCheckedChange={handleToggle}
            disabled={isPending}
          />
          <span className={`text-[11px] font-bold uppercase tracking-widest ${p.isActive ? 'text-success' : 'text-muted-foreground'}`}>
            {p.isActive ? 'Active' : 'Off'}
          </span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const [isPending, startTransition] = useTransition();
      const p = row.original;

      const handleDelete = () => {
        if (!confirm(`Удалить промокод ${p.code}?`)) return;
        
        startTransition(async () => {
          const res = await deletePromoCode(p.id);
          if (res.success) {
            toast.success('Промокод удален');
          } else {
            toast.error(res.error);
          }
        });
      };

      return (
        <div className="flex justify-end">
          <Button
            size="icon"
            intent="ghost"
            onClick={handleDelete}
            disabled={isPending}
            className="hover:bg-destructive/10 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      );
    },
  },
];
