'use client';

import React from 'react';
import { Copy, CheckCheck, RefreshCw, ShieldCheck } from 'lucide-react';

export interface WebhookSecretSectionProps {
  webhookSecret: string;
  isPending: boolean;
  copied: boolean;
  onCopySecret: () => void;
  onRegenerateSecret: () => void;
}

export function WebhookSecretSection({
  webhookSecret,
  isPending,
  copied,
  onCopySecret,
  onRegenerateSecret,
}: WebhookSecretSectionProps) {
  return (
    <div className="space-y-1 pt-2">
      <label
        htmlFor="webhookSecret"
        className="block text-xs font-bold text-muted-foreground uppercase tracking-wider"
      >
        Webhook Secret (HMAC-SHA256) — webhookSecret
      </label>
      <div className="flex gap-2">
        <input
          id="webhookSecret"
          type="text"
          readOnly
          value={webhookSecret || 'Секретный ключ еще не сгенерирован'}
          className="flex-1 min-w-0 bg-muted/40 border border-border rounded-xl px-4 py-2.5 font-mono text-base sm:text-xs text-foreground truncate select-all outline-none"
        />
        {webhookSecret && (
          <button
            type="button"
            onClick={onCopySecret}
            aria-label="Скопировать секрет вебхука"
            className={`shrink-0 px-3.5 py-2.5 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-all duration-200 min-h-[44px] cursor-pointer ${
              copied
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-card border-border hover:bg-muted text-foreground'
            }`}
          >
            {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Скопировано' : 'Скопировать'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onRegenerateSecret}
          disabled={isPending}
          aria-label="Сгенерировать новый секрет вебхука"
          title="Сгенерировать новый секрет"
          className="shrink-0 px-3.5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center gap-1.5 text-xs font-semibold min-h-[44px] cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
          <span>Секрет</span>
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
        Используйте этот ключ для проверки подписи подлинности заголовка{' '}
        <code className="text-foreground font-mono font-bold">X-Smmplan-Signature</code>.
      </p>
    </div>
  );
}
