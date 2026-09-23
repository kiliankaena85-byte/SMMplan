'use client';

import React from 'react';
import { Send, CheckCircle2, AlertCircle, QrCode, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface TelegramCardHeaderProps {
  isBound: boolean;
  telegramId: string | null;
  botUsername: string;
  onOpenBindModal: () => void;
}

export function TelegramCardHeader({
  isBound,
  telegramId,
  botUsername,
  onOpenBindModal,
}: TelegramCardHeaderProps) {
  const maskedId = telegramId ? `tg: ${telegramId.substring(0, 3)}****` : null;

  return (
    <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Send className="w-4 h-4 shrink-0" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-foreground text-sm">Smart Bind Telegram</h2>
            {isBound ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 uppercase">
                <CheckCircle2 className="w-3 h-3" />
                Подключено
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-amber-500/20 text-amber-600 dark:text-amber-400 bg-amber-500/10 uppercase">
                <AlertCircle className="w-3 h-3 shrink-0" />
                Не привязано
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Мгновенные уведомления о статусах заказов, пополнениях и поддержка в 1 клик (без передачи телефонного номера)
          </p>
        </div>
      </div>

      {/* Top Action */}
      <div className="flex items-center gap-2 shrink-0">
        {isBound ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/80 px-2.5 py-1.5 rounded-lg border border-border/60">
              {maskedId}
            </span>
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-xl border border-primary/20 transition-all duration-200 min-h-[44px] touch-manipulation"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Бот</span>
              <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
            </a>
          </div>
        ) : (
          <Button
            type="button"
            onClick={onOpenBindModal}
            intent="primary"
            size="sm"
            isAnimated={true}
            className="rounded-xl font-bold text-xs gap-1.5 px-4 shadow-sm min-h-[44px]"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Привязать в 1 клик</span>
          </Button>
        )}
      </div>
    </div>
  );
}
