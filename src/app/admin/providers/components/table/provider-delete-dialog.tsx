'use client';

import React from 'react';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export type ProviderDeleteInfo = {
  provider: { id: string; name: string };
  counts: {
    services: number;
    routes: number;
    orders: number;
    shadowServices: number;
  };
};

export interface ProviderDeleteDialogProps {
  deleteInfo: ProviderDeleteInfo | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ProviderDeleteDialog({
  deleteInfo,
  isDeleting,
  onClose,
  onConfirm,
}: ProviderDeleteDialogProps) {
  return (
    <ConfirmModal
      isOpen={deleteInfo !== null}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Удалить провайдера «${deleteInfo?.provider.name ?? ''}»?`}
      confirmText={isDeleting ? 'Удаление...' : 'Да, удалить'}
      cancelText="Отмена"
      isDanger
    >
      {deleteInfo && (
        <div className="space-y-3">
          <p className="text-sm text-foreground">
            Провайдер будет удалён вместе с подключением (API-ключ, настройки маппинга, теневой каталог
            {deleteInfo.counts.shadowServices > 0 ? `: ${deleteInfo.counts.shadowServices} поз.` : ''}).
          </p>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border/50 bg-muted/40 px-2 py-1.5">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Услуг</div>
              <div className="font-bold text-foreground tabular-nums">{deleteInfo.counts.services}</div>
              <div className="text-[9px] text-muted-foreground">сохранятся (отвяжутся)</div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/40 px-2 py-1.5">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Заказов</div>
              <div className="font-bold text-foreground tabular-nums">{deleteInfo.counts.orders}</div>
              <div className="text-[9px] text-muted-foreground">сохранятся</div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/40 px-2 py-1.5">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Маршрутов</div>
              <div className="font-bold text-foreground tabular-nums">{deleteInfo.counts.routes}</div>
              <div className="text-[9px] text-muted-foreground">будут удалены</div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Услуги каталога и исторические заказы не удаляются — они лишь теряют привязку к этому провайдеру.
            Новые заказы на отвязанные услуги размещаться не будут, пока вы не переназначите им провайдера.
          </p>
        </div>
      )}
    </ConfirmModal>
  );
}
