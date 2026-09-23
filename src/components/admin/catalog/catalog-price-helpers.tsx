'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CatalogServiceDTO } from '@/types/catalog.dto';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { applyBeautifulRounding } from '@/lib/financial-constants';

export function calcDisplayPrice(
  rate: number,
  markup: number,
  usdToRub: number,
  curr: 'RUB' | 'USD',
  vol: 'UNIT' | '1K'
) {
  if (vol === '1K') {
    const rawPrice = curr === 'USD' ? rate * markup : rate * markup * usdToRub;
    return curr === 'RUB' ? applyBeautifulRounding(rawPrice) : parseFloat(rawPrice.toFixed(4));
  } else {
    const rawPrice = curr === 'USD' ? (rate * markup) / 1000 : (rate * markup * usdToRub) / 1000;
    return curr === 'RUB'
      ? applyBeautifulRounding(rawPrice * 1000) / 1000
      : parseFloat(rawPrice.toFixed(6));
  }
}

export function calcDisplayCost(
  rate: number,
  usdToRub: number,
  curr: 'RUB' | 'USD',
  vol: 'UNIT' | '1K'
) {
  if (vol === '1K') {
    return curr === 'USD' ? rate : rate * usdToRub;
  } else {
    return curr === 'USD' ? rate / 1000 : (rate * usdToRub) / 1000;
  }
}

export function ArchiveButton({
  service,
  onDeleted,
}: {
  service: CatalogServiceDTO;
  onDeleted?: (id: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleArchive() {
    setConfirmOpen(true);
  }

  function executeArchive() {
    setConfirmOpen(false);

    // ⚡ Optimistic UI: Notify parent to hide row immediately
    if (onDeleted) {
      onDeleted(service.id);
    }

    startTransition(async () => {
      try {
        const { deleteOrArchiveServiceAction } = await import('@/actions/admin/catalog/services');
        const r = await deleteOrArchiveServiceAction(service.id);
        if (r.success) {
          toast.success(r.message);
          router.refresh();
        } else {
          toast.error(r.error || 'Ошибка удаления услуги');
          router.refresh();
        }
      } catch {
        toast.error('Сетевой сбой при удалении');
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleArchive}
        disabled={isPending}
        title="Удалить или архивировать услугу"
        aria-label={`Удалить услугу ${service.name}`}
        className="h-7 w-7 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150 active:scale-95 disabled:opacity-40 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeArchive}
        title="Удаление / Архивация услуги"
        isDanger={true}
        confirmText="Удалить / В архив"
        cancelText="Отмена"
      >
        Удалить услугу «{service.name}»? Если по ней нет заказов, она будет удалена навсегда. Если есть заказы — перенесена в архив.
      </ConfirmModal>
    </>
  );
}
