'use client';

import React, { useState, useTransition } from 'react';
import { ShieldCheck, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  updateTelegramNotificationSettingsAction,
  unbindTelegramAction,
} from '@/actions/user/settings-extra';
import { useTelegramBind } from './useTelegramBind';
import { TelegramCardHeader } from './TelegramCardHeader';
import { TelegramNotificationToggles } from './TelegramNotificationToggles';
import { TelegramUnbindAction } from './TelegramUnbindAction';
import { TelegramBindModal } from './TelegramBindModal';

export interface TelegramCardProps {
  telegramId: string | null;
  notifyOrders?: boolean;
  notifyBalance?: boolean;
  notifyTickets?: boolean;
}

export default function TelegramCard({
  telegramId: initialTelegramId,
  notifyOrders: initialNotifyOrders = true,
  notifyBalance: initialNotifyBalance = true,
  notifyTickets: initialNotifyTickets = true,
}: TelegramCardProps) {
  const [isPending, startTransition] = useTransition();

  const [telegramId, setTelegramId] = useState<string | null>(initialTelegramId);
  const [notifyOrders, setNotifyOrders] = useState<boolean>(initialNotifyOrders);
  const [notifyBalance, setNotifyBalance] = useState<boolean>(initialNotifyBalance);
  const [notifyTickets, setNotifyTickets] = useState<boolean>(initialNotifyTickets);
  const [confirmUnbind, setConfirmUnbind] = useState(false);

  const isBound = !!telegramId;
  const bindState = useTelegramBind();

  const handleToggleNotification = (
    key: 'notifyOrders' | 'notifyBalance' | 'notifyTickets',
    currentVal: boolean
  ) => {
    const nextVal = !currentVal;
    if (key === 'notifyOrders') setNotifyOrders(nextVal);
    if (key === 'notifyBalance') setNotifyBalance(nextVal);
    if (key === 'notifyTickets') setNotifyTickets(nextVal);

    startTransition(async () => {
      try {
        const payload = {
          notifyOrders: key === 'notifyOrders' ? nextVal : notifyOrders,
          notifyBalance: key === 'notifyBalance' ? nextVal : notifyBalance,
          notifyTickets: key === 'notifyTickets' ? nextVal : notifyTickets,
        };
        const res = await updateTelegramNotificationSettingsAction(payload);
        if (!res.success) {
          toast.error(res.error || 'Ошибка при сохранении настроек уведомлений');
          if (key === 'notifyOrders') setNotifyOrders(currentVal);
          if (key === 'notifyBalance') setNotifyBalance(currentVal);
          if (key === 'notifyTickets') setNotifyTickets(currentVal);
        } else {
          toast.success('Настройки Telegram-уведомлений сохранены');
        }
      } catch {
        toast.error('Не удалось сохранить настройки');
        if (key === 'notifyOrders') setNotifyOrders(currentVal);
        if (key === 'notifyBalance') setNotifyBalance(currentVal);
        if (key === 'notifyTickets') setNotifyTickets(currentVal);
      }
    });
  };

  const handleUnbind = () => {
    if (!confirmUnbind) {
      setConfirmUnbind(true);
      setTimeout(() => setConfirmUnbind(false), 5000);
      return;
    }

    setConfirmUnbind(false);
    startTransition(async () => {
      try {
        const res = await unbindTelegramAction();
        if (res.success) {
          setTelegramId(null);
          toast.success('Telegram-аккаунт успешно отвязан');
        } else {
          toast.error(res.error || 'Не удалось отвязать Telegram');
        }
      } catch {
        toast.error('Ошибка при отвязке аккаунта');
      }
    });
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-sm">
      <TelegramCardHeader
        isBound={isBound}
        telegramId={telegramId}
        botUsername={bindState.botUsername}
        onOpenBindModal={bindState.openBindModal}
      />

      <div className="p-5 space-y-5">
        {/* Main description & info */}
        <div className="bg-muted/40 border border-border/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <p className="text-xs text-foreground font-semibold">
              {isBound
                ? 'Ваш Telegram-аккаунт успешно сопряжён с личным кабинетом SMMplan.'
                : 'Привяжите Telegram для мгновенного получения пуш-уведомлений и быстрого доступа к службе заботы.'}
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              Технология Smart Bind полностью анонимна и не запрашивает ваш реальный номер телефона.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
            {isBound ? (
              <TelegramUnbindAction
                confirmUnbind={confirmUnbind}
                isPending={isPending}
                onUnbind={handleUnbind}
              />
            ) : (
              <Button
                type="button"
                onClick={bindState.openBindModal}
                intent="secondary"
                size="sm"
                className="w-full sm:w-auto rounded-xl text-xs font-semibold gap-1.5 min-h-[44px]"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR-код & Ссылка</span>
              </Button>
            )}
          </div>
        </div>

        {/* Notification Switches Section */}
        <TelegramNotificationToggles
          notifyOrders={notifyOrders}
          notifyBalance={notifyBalance}
          notifyTickets={notifyTickets}
          isPending={isPending}
          onToggle={handleToggleNotification}
        />
      </div>

      {/* Smart Bind Modal */}
      <TelegramBindModal
        isOpen={bindState.isModalOpen}
        onClose={bindState.closeBindModal}
        deepLink={bindState.deepLink}
        isLoading={bindState.isLoadingDeepLink}
        copied={bindState.copied}
        onCopyLink={bindState.copyLink}
        onRefresh={bindState.fetchNewBindLink}
      />
    </div>
  );
}
