'use client';

import React from 'react';
import { Send, AlertCircle, Copy, CheckCheck, RefreshCw, X } from 'lucide-react';
import { QRCodeSVG } from '@/components/ui/qr-code';

export interface TelegramBindModalProps {
  isOpen: boolean;
  onClose: () => void;
  deepLink: string;
  isLoading: boolean;
  copied: boolean;
  onCopyLink: () => void;
  onRefresh: () => void;
}

export function TelegramBindModal({
  isOpen,
  onClose,
  deepLink,
  isLoading,
  copied,
  onCopyLink,
  onRefresh,
}: TelegramBindModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div
        className="bg-card border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button with touch target >= 44px */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors p-2.5 rounded-xl hover:bg-muted min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Закрыть модальное окно"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-10">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Send className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Привязка Telegram в 1 клик</h3>
            <p className="text-xs text-muted-foreground">Smart Bind Protocol (Анонимно & Безопасно)</p>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-background border border-border/80 rounded-2xl space-y-3">
          {isLoading ? (
            <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin text-primary shrink-0" />
              <span className="text-xs font-semibold">Генерация токена...</span>
            </div>
          ) : deepLink ? (
            <>
              <div className="p-3 bg-white rounded-xl shadow-inner border border-slate-200">
                <QRCodeSVG value={deepLink} size={160} fgColor="#0f172a" bgColor="#ffffff" />
              </div>
              <p className="text-[11px] text-muted-foreground text-center font-medium">
                Наведите камеру смартфона для мгновенного перехода в бот
              </p>
            </>
          ) : (
            <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 text-destructive">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <span className="text-xs font-semibold">Не удалось загрузить ссылку</span>
            </div>
          )}
        </div>

        {/* Deep link input with copy button */}
        {deepLink && (
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Прямая ссылка Deep-Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={deepLink}
                className="flex-1 min-w-0 bg-muted/40 border border-border rounded-xl px-3.5 py-2 font-mono text-base sm:text-xs text-foreground truncate select-all outline-none"
              />
              <button
                type="button"
                onClick={onCopyLink}
                aria-label="Скопировать ссылку"
                className={`shrink-0 px-3 py-2 rounded-xl border font-semibold text-xs flex items-center gap-1.5 min-h-[44px] transition-all duration-200 cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-card border-border hover:bg-muted text-foreground'
                }`}
              >
                {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Скопировано' : 'Копировать'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <a
            href={deepLink || '/api/support/telegram'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs py-3 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-200 active:scale-95 touch-manipulation min-h-[44px]"
          >
            <Send className="w-4 h-4 shrink-0" />
            <span>Открыть Telegram-бот</span>
          </a>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Сгенерировать новый токен"
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-all duration-200 min-h-[44px] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Обновить QR</span>
          </button>
        </div>

        {/* Instructions */}
        <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside bg-muted/30 p-3 rounded-xl border border-border/60">
          <li>Откройте бота по ссылке или через сканирование QR-кода</li>
          <li>Нажмите кнопку <strong>START</strong> в диалоге с ботом</li>
          <li>Бот автоматически свяжет аккаунт и включит оповещения</li>
        </ol>
      </div>
    </div>
  );
}
