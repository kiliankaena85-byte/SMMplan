'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Eye, EyeOff } from 'lucide-react';

export interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPending: boolean;
  confirmText: string;
  setConfirmText: (val: string) => void;
  requiresPassword: boolean;
  password: string;
  setPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  onDelete: (e: React.FormEvent) => void;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  isPending,
  confirmText,
  setConfirmText,
  requiresPassword,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  onDelete,
}: DeleteAccountModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div
        className="bg-card border border-border/80 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in scale-in duration-300 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="absolute right-4 top-4 text-muted-foreground/60 hover:text-foreground transition-colors p-2.5 rounded-xl hover:bg-muted min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer disabled:opacity-50"
          aria-label="Закрыть окно подтверждения"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">Подтвердите удаление</h3>
            <p className="text-[10px] text-muted-foreground font-semibold">Это действие необратимо</p>
          </div>
        </div>

        <form onSubmit={onDelete} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Введите слово <span className="text-destructive font-black">УДАЛИТЬ</span>
            </label>
            <input
              type="text"
              required
              disabled={isPending}
              placeholder="УДАЛИТЬ"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full text-base sm:text-sm border border-border/80 rounded-xl px-4 py-2.5 outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/20 bg-background/50 font-bold tracking-wider min-h-[44px]"
            />
          </div>

          {requiresPassword && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Введите ваш пароль
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isPending}
                  placeholder="Ваш текущий пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-base sm:text-sm border border-border/80 rounded-xl px-4 py-2.5 pr-11 outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/20 bg-background/50 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 min-h-[44px] rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition-all border border-border/50 disabled:opacity-50 cursor-pointer"
            >
              Отмена
            </button>
            <Button
              type="submit"
              intent="destructive"
              size="sm"
              disabled={isPending || confirmText !== 'УДАЛИТЬ' || (requiresPassword && !password)}
              className="flex-1 min-h-[44px] rounded-xl font-black text-xs shadow-sm"
            >
              {isPending ? 'Удаление...' : 'Удалить аккаунт'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
