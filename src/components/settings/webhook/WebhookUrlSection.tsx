'use client';

import React from 'react';

export interface WebhookUrlSectionProps {
  webhookUrl: string;
  onChangeUrl: (url: string) => void;
}

export function WebhookUrlSection({ webhookUrl, onChangeUrl }: WebhookUrlSectionProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor="webhookUrl"
        className="block text-xs font-bold text-muted-foreground uppercase tracking-wider"
      >
        Webhook URL (HTTPS) — webhookUrl
      </label>
      <input
        id="webhookUrl"
        type="url"
        placeholder="https://api.yourcompany.com/v1/smmplan-webhook"
        value={webhookUrl}
        onChange={(e) => onChangeUrl(e.target.value)}
        className="w-full text-base sm:text-sm border border-border/80 rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background/50 hover:bg-background/80 transition-all duration-200 font-mono"
      />
      <p className="text-[11px] text-muted-foreground mt-1">
        Все события (изменение статусов заказов, выполнение, отмена) будут отправляться методом POST на этот URL.
      </p>
    </div>
  );
}
