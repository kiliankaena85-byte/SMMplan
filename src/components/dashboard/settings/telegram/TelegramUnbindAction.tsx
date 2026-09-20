'use client';

import React from 'react';
import { Unlink } from 'lucide-react';

export interface TelegramUnbindActionProps {
  confirmUnbind: boolean;
  isPending: boolean;
  onUnbind: () => void;
}

export function TelegramUnbindAction({
  confirmUnbind,
  isPending,
  onUnbind,
}: TelegramUnbindActionProps) {
  if (confirmUnbind) {
    return (
      <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-1 min-h-[44px]">
        <span className="text-[11px] font-bold text-destructive">Отвязать?</span>
        <button
          type="button"
          onClick={onUnbind}
          disabled={isPending}
          className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-[11px] font-bold transition-all min-h-[44px] cursor-pointer disabled:opacity-50"
        >
          Да, подтверждаю
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onUnbind}
      disabled={isPending}
      aria-label="Отвязать Telegram аккаунт"
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-3 py-2 rounded-xl transition-all duration-200 border border-transparent hover:border-destructive/20 min-h-[44px] cursor-pointer disabled:opacity-50"
    >
      <Unlink className="w-3.5 h-3.5" />
      <span>Отвязать</span>
    </button>
  );
}
