'use client';

import React from 'react';
import Link from 'next/link';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface TelegramCardProps {
  telegramId: string | null;
}

export default function TelegramCard({ telegramId }: TelegramCardProps) {
  const isBound = !!telegramId;

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
        <div className="flex items-start gap-4">
          {/* Telegram Premium Color Avatar */}
          <div className="w-12 h-12 rounded-xl bg-[#24A1DE]/10 text-[#24A1DE] flex items-center justify-center shrink-0">
            <svg 
              viewBox="0 0 24 24" 
              className="w-6 h-6 fill-current" 
              aria-hidden="true"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-2 .12-5.63 2.57-.53.36-1 .54-1.43.53-.47-.01-1.37-.27-2.04-.49-.82-.27-1.47-.41-1.42-.87.03-.24.37-.49 1.02-.74 3.99-1.73 6.66-2.88 8-3.43 3.8-1.56 4.59-1.83 5.11-1.84.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.16-.02.22z"/>
            </svg>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-foreground text-base">Интеграция с Telegram</h3>
              {isBound ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 uppercase">
                  <CheckCircle2 className="w-3 h-3" />
                  Подключено
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-blue-500/20 text-blue-600 dark:text-blue-400 bg-blue-500/10 uppercase">
                  <AlertCircle className="w-3 h-3" />
                  Не привязано
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
              {isBound
                ? 'Ваш Telegram привязан к аккаунту Smmplan. Уведомления об ответах техподдержки дублируются в чат с ботом, а лимиты на пополнение баланса сняты.'
                : 'Привяжите Telegram-аккаунт для моментального получения уведомлений об ответах техподдержки в чат с ботом и снятия лимитов на оплату банковскими картами (без передачи телефонного номера).'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 mt-3 sm:mt-0">
          {isBound ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground bg-muted px-4 py-2.5 rounded-xl border border-border/60 cursor-default h-[44px]">
                <span>tg: {telegramId.substring(0, 3)}****</span>
              </div>
              <a
                href="/api/support/telegram"
                className="inline-flex items-center justify-center gap-2 text-xs font-semibold bg-[#24A1DE] hover:bg-[#208ebe] text-white px-5 py-3 rounded-xl shadow-sm hover:shadow transition-all duration-200 active:scale-95 touch-manipulation min-h-[44px]"
                aria-label="Написать в Telegram-бот"
              >
                <Send className="w-4 h-4" />
                Написать в бот
              </a>
            </div>
          ) : (
            <a
              href="/api/support/telegram"
              className="inline-flex items-center gap-2 text-xs font-semibold bg-[#24A1DE] hover:bg-[#208ebe] text-white px-5 py-3 rounded-xl shadow-sm hover:shadow transition-all duration-200 active:scale-95 touch-manipulation min-h-[44px]"
              aria-label="Привязать Telegram-аккаунт"
            >
              <Send className="w-4 h-4" />
              Привязать Telegram
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
