'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PromoCode } from '@prisma/client';
import { Trash2 } from 'lucide-react';
import { togglePromoCode, deletePromoCode } from '@/actions/admin/marketing';
import { useTransition, useState } from 'react';
import { toast } from 'sonner';
import { Switch, Modal, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';

// Isolated Status Toggle Client Component
function PromoCodeStatusToggle({ promo }: { promo: PromoCode }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const res = await togglePromoCode(promo.id, !promo.isActive);
      if (res.success) {
        toast.success(`Промокод ${!promo.isActive ? 'активирован' : 'деактивирован'}`);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Switch 
        isSelected={promo.isActive} 
        onChange={handleToggle}
        isDisabled={isPending}
        size="sm"
        aria-label={`Toggle status for ${promo.code}`}
      />
      <span className={`text-[11px] font-bold uppercase tracking-widest ${promo.isActive ? 'text-success' : 'text-muted-foreground'}`}>
        {promo.isActive ? 'Active' : 'Off'}
      </span>
    </div>
  );
}

// Isolated Delete Promo Code Client Component
function DeletePromoButton({ promo }: { promo: PromoCode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deletePromoCode(promo.id);
      if (res.success) {
        toast.success('Промокод успешно удален');
        setIsOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <Button
        size="icon"
        intent="ghost"
        onClick={() => setIsOpen(true)}
        disabled={isPending}
        className="hover:bg-destructive/10 text-destructive hover:text-destructive touch-target-expand"
        title="Удалить промокод"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <Modal isOpen={isOpen} onOpenChange={setIsOpen}>
        <div className="bg-background rounded-large shadow-large border border-divider">
          <div className="p-6">
            <ModalHeader className="font-bold text-foreground">Удаление промокода</ModalHeader>
            <ModalBody className="text-sm text-muted-foreground">
              Вы уверены, что хотите безвозвратно удалить промокод <strong>{promo.code}</strong>?
            </ModalBody>
            <ModalFooter>
              <Button intent="outline" onClick={() => setIsOpen(false)} className="min-h-[44px]">
                Отмена
              </Button>
              <Button 
                onClick={handleDelete}
                disabled={isPending}
                className="bg-danger text-danger-foreground hover:bg-danger/90 min-h-[44px]"
              >
                {isPending ? 'Удаление...' : 'Удалить'}
              </Button>
            </ModalFooter>
          </div>
        </div>
      </Modal>
    </>
  );
}

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
    cell: ({ row }) => <PromoCodeStatusToggle promo={row.original} />,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex justify-end">
        <DeletePromoButton promo={row.original} />
      </div>
    ),
  },
];
