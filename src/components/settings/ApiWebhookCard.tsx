'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { updateApiWebhookAction } from '@/actions/user/settings-extra';
import { Webhook, Save, Power } from 'lucide-react';
import { toast } from 'sonner';
import { WebhookUrlSection } from './webhook/WebhookUrlSection';
import { WebhookSecretSection } from './webhook/WebhookSecretSection';

export interface ApiWebhookCardProps {
  initialData?: {
    webhookUrl?: string | null;
    webhookSecret?: string | null;
    isWebhookActive?: boolean;
  };
}

export default function ApiWebhookCard({ initialData }: ApiWebhookCardProps) {
  const [isPending, startTransition] = useTransition();
  const [webhookUrl, setWebhookUrl] = useState(initialData?.webhookUrl || '');
  const [webhookSecret, setWebhookSecret] = useState(initialData?.webhookSecret || '');
  const [isWebhookActive, setIsWebhookActive] = useState(
    initialData?.isWebhookActive ?? (!!initialData?.webhookUrl)
  );
  const [copied, setCopied] = useState(false);

  const handleCopySecret = async () => {
    if (!webhookSecret) return;
    try {
      await navigator.clipboard.writeText(webhookSecret);
      setCopied(true);
      toast.success('Секретный ключ скопирован');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Не удалось скопировать ключ');
    }
  };

  const handleSave = (regenerateSecret = false, nextActiveState?: boolean) => {
    const targetActiveState = nextActiveState ?? isWebhookActive;
    const trimmedUrl = webhookUrl.trim();
    if (trimmedUrl && !trimmedUrl.startsWith('https://')) {
      toast.error('URL вебхука должен начинаться с https://');
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateApiWebhookAction({
          webhookUrl: trimmedUrl,
          isWebhookActive: targetActiveState,
          regenerateSecret,
        });

        if (!res.success) {
          toast.error(res.error || 'Ошибка при сохранении вебхука');
          return;
        }

        setWebhookUrl(res.webhookUrl || '');
        if (res.webhookSecret) {
          setWebhookSecret(res.webhookSecret);
        }
        if (typeof res.isWebhookActive === 'boolean') {
          setIsWebhookActive(res.isWebhookActive);
        }

        if (regenerateSecret) {
          toast.success('Новый секретный ключ вебхука сгенерирован!');
        } else {
          toast.success('Настройки API-вебхука успешно сохранены!');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
        toast.error(`Ошибка при сохранении: ${msg}`);
      }
    });
  };

  const handleToggleActive = () => {
    const nextState = !isWebhookActive;
    setIsWebhookActive(nextState);
    handleSave(false, nextState);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-sm">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Webhook className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm">
              Webhook & Автоматизация
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Автоматическая отправка статусов заказов и событий на ваш сервер
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={isPending}
            aria-label={isWebhookActive ? 'Деактивировать вебхук' : 'Активировать вебхук'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 min-h-[44px] cursor-pointer ${
              isWebhookActive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-muted border-border/80 text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Power className={`w-3.5 h-3.5 ${isWebhookActive ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            <span>{isWebhookActive ? 'Активен' : 'Отключён'}</span>
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <WebhookUrlSection
          webhookUrl={webhookUrl}
          onChangeUrl={setWebhookUrl}
        />

        <WebhookSecretSection
          webhookSecret={webhookSecret}
          isPending={isPending}
          copied={copied}
          onCopySecret={handleCopySecret}
          onRegenerateSecret={() => handleSave(true)}
        />

        <div className="flex items-center justify-end pt-3 border-t border-border/40 gap-2">
          <Button
            type="button"
            onClick={() => handleSave(false)}
            intent="primary"
            size="sm"
            isAnimated={true}
            disabled={isPending}
            className="rounded-xl shrink-0 font-semibold px-6 shadow-sm gap-2 min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>{isPending ? 'Сохранение...' : 'Сохранить настройки вебхука'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
