'use client';

import React from 'react';
import { Bell, CheckCircle2, CreditCard, Headphones } from 'lucide-react';

export interface TelegramNotificationTogglesProps {
  notifyOrders: boolean;
  notifyBalance: boolean;
  notifyTickets: boolean;
  isPending: boolean;
  onToggle: (key: 'notifyOrders' | 'notifyBalance' | 'notifyTickets', currentVal: boolean) => void;
}

interface ToggleItemProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
  isActive: boolean;
  isPending: boolean;
  onToggle: () => void;
  ariaLabel: string;
}

function ToggleItem({
  title,
  desc,
  icon,
  isActive,
  isPending,
  onToggle,
  ariaLabel,
}: ToggleItemProps) {
  return (
    <div className="bg-card border border-border/80 rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:border-border transition-all duration-200">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
          {icon}
          <span>{title}</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-snug">
          {desc}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <span className="text-[10px] font-bold text-muted-foreground">
          {isActive ? 'Включено' : 'Выключено'}
        </span>
        {/* Touch target >= 44px on the interactive switch button */}
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          onClick={onToggle}
          disabled={isPending}
          aria-label={ariaLabel}
          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-end focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-full cursor-pointer disabled:opacity-50"
        >
          <span
            className={`w-10 h-5 rounded-full transition-colors relative duration-200 inline-flex items-center px-0.5 ${
              isActive ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm ${
                isActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );
}

export function TelegramNotificationToggles({
  notifyOrders,
  notifyBalance,
  notifyTickets,
  isPending,
  onToggle,
}: TelegramNotificationTogglesProps) {
  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-primary shrink-0" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Тумблеры Telegram-уведомлений
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ToggleItem
          title="Статусы заказов"
          desc="Уведомления о выполнении, частичном возврате (Partial) и сбоях заказов"
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
          isActive={notifyOrders}
          isPending={isPending}
          onToggle={() => onToggle('notifyOrders', notifyOrders)}
          ariaLabel="Переключить уведомления о статусах заказов"
        />

        <ToggleItem
          title="Баланс и финансы"
          desc="Оповещения об успешных пополнениях, чеках и реферальных бонусах"
          icon={<CreditCard className="w-3.5 h-3.5 text-emerald-500" />}
          isActive={notifyBalance}
          isPending={isPending}
          onToggle={() => onToggle('notifyBalance', notifyBalance)}
          ariaLabel="Переключить уведомления о балансе и финансах"
        />

        <ToggleItem
          title="Тикеты поддержки"
          desc="Моментальные ответы дежурного оператора поддержки в чат Telegram"
          icon={<Headphones className="w-3.5 h-3.5 text-blue-500" />}
          isActive={notifyTickets}
          isPending={isPending}
          onToggle={() => onToggle('notifyTickets', notifyTickets)}
          ariaLabel="Переключить уведомления о тикетах поддержки"
        />
      </div>
    </div>
  );
}
