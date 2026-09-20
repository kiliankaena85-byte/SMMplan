'use client';

import React from 'react';
import { RefreshCw, Trash2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ApiKeyActionButtonsProps {
  hasKeyOrNew: boolean;
  isPending: boolean;
  confirmRevoke: boolean;
  onGenerate: () => void;
  onRevoke: () => void;
}

export function ApiKeyActionButtons({
  hasKeyOrNew,
  isPending,
  confirmRevoke,
  onGenerate,
  onRevoke,
}: ApiKeyActionButtonsProps) {
  if (!hasKeyOrNew) {
    return (
      <div className="space-y-4">
        <div className="bg-muted/30 border border-border rounded-xl p-4 text-xs text-muted-foreground">
          У вас ещё не создан API-ключ. Сгенерируйте его для доступа к REST API SMMplan (создание заказов, проверка баланса).
        </div>
        <Button
          type="button"
          onClick={onGenerate}
          disabled={isPending}
          intent="primary"
          size="sm"
          isAnimated={true}
          className="rounded-xl text-xs font-semibold gap-2 shadow-sm min-h-[44px]"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{isPending ? 'Генерация...' : 'Сгенерировать API-ключ'}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <Button
        type="button"
        onClick={onGenerate}
        disabled={isPending}
        intent="secondary"
        size="sm"
        className="rounded-xl text-xs font-semibold gap-2 min-h-[44px]"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
        <span>Сгенерировать новый</span>
      </Button>

      {confirmRevoke ? (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-1 animate-in fade-in min-h-[44px]">
          <span className="text-xs text-destructive font-semibold">Отозвать ключ навсегда?</span>
          <button
            type="button"
            onClick={onRevoke}
            disabled={isPending}
            className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-destructive text-white hover:bg-destructive/90 text-xs font-bold transition-all min-h-[44px] cursor-pointer disabled:opacity-50"
          >
            Да, удалить
          </button>
        </div>
      ) : (
        <Button
          type="button"
          onClick={onRevoke}
          disabled={isPending}
          intent="destructive"
          size="sm"
          className="rounded-xl text-xs font-semibold gap-2 min-h-[44px]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Отозвать</span>
        </Button>
      )}
    </div>
  );
}
