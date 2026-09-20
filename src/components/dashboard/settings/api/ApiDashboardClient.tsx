'use client';

import React, { useState } from 'react';
import { Key, BookOpen } from 'lucide-react';
import ApiKeyManager from '@/app/dashboard/settings/api/ApiKeyManager';
import ApiWebhookCard from '@/components/dashboard/settings/ApiWebhookCard';
import { ApiReferenceDocs } from './ApiReferenceDocs';

export interface ApiDashboardClientProps {
  hasKey: boolean;
  webhookInitialData?: {
    webhookUrl?: string | null;
    webhookSecret?: string | null;
    isWebhookActive?: boolean;
  };
}

export function ApiDashboardClient({ hasKey, webhookInitialData }: ApiDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'key' | 'docs'>('key');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* ── Tabs selector ── */}
      <div className="flex bg-muted p-1 rounded-2xl border border-border/40 select-none max-w-sm w-full">
        <button
          type="button"
          onClick={() => setActiveTab('key')}
          className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'key'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          role="tab"
          aria-selected={activeTab === 'key'}
        >
          <Key className="w-4 h-4 text-primary shrink-0" />
          <span>Ключи и Вебхуки</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('docs')}
          className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'docs'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          role="tab"
          aria-selected={activeTab === 'docs'}
        >
          <BookOpen className="w-4 h-4 text-primary shrink-0" />
          <span>Документация API v2</span>
        </button>
      </div>

      {/* ── Active Tab View ── */}
      {activeTab === 'key' ? (
        <div className="space-y-6">
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2.5 bg-muted/20">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Key className="w-4 h-4 shrink-0" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-sm">Управление API-ключами</h2>
                <p className="text-[10px] text-muted-foreground">
                  Ключ для программного создания заказов через Panel API
                </p>
              </div>
            </div>
            <div className="p-5">
              <ApiKeyManager
                hasKey={hasKey}
                onKeyGenerated={(key: string | null) => setGeneratedKey(key)}
              />
            </div>
          </div>

          <ApiWebhookCard initialData={webhookInitialData} />
        </div>
      ) : (
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-border/40">
            <h3 className="font-extrabold text-foreground text-sm">Интеграционная документация API v2</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Спецификации, параметры запросов и примеры интеграции с реселлер-платформой SMMplan.
            </p>
          </div>
          <div className="p-5">
            <ApiReferenceDocs userApiKey={generatedKey} />
          </div>
        </div>
      )}
    </div>
  );
}
