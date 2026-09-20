'use client';

import React from 'react';
import { CheckCheck, ShieldAlert } from 'lucide-react';

export interface ApiKeyActiveDisplayProps {
  newKey: string | null;
  copied: boolean;
  onCopyKey: () => void;
}

export function ApiKeyActiveDisplay({
  newKey,
  copied,
  onCopyKey,
}: ApiKeyActiveDisplayProps) {
  if (newKey) {
    return (
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <CheckCheck className="w-5 h-5" />
          <span className="font-semibold text-sm">Новый API-ключ сгенерирован</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Скопируйте ключ прямо сейчас. В целях безопасности он больше никогда не будет показан в открытом виде.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 min-w-0 bg-background border border-emerald-500/30 rounded-xl px-4 py-2.5 font-mono text-sm text-foreground truncate select-all">
            {newKey}
          </div>
          <button
            type="button"
            onClick={onCopyKey}
            aria-label="Скопировать API-ключ"
            className={`shrink-0 px-4 py-2.5 rounded-xl border font-semibold text-xs transition-all duration-200 min-h-[44px] cursor-pointer ${
              copied
                ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                : 'bg-card border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {copied ? 'Скопировано!' : 'Скопировать'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-start gap-3">
      <ShieldAlert className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-foreground">API-ключ активен (SHA-256)</p>
        <p className="text-xs text-muted-foreground mt-1">
          В целях безопасности ключ захеширован и скрыт. Если вы его потеряли, сгенерируйте новый токен.
        </p>
      </div>
    </div>
  );
}
