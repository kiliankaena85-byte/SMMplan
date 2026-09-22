'use client';

import * as React from 'react';
import { SettingsCard } from '../settings-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Radio } from 'lucide-react';
import { updateGlobalSettings } from '@/actions/admin/settings';
import type { SystemSettings } from '@prisma/client';

export function WebhookSettings({ settings, tenantId = 'smmplan' }: { settings: SystemSettings; tenantId?: string }) {
  return (
    <SettingsCard
      id="webhooks"
      title="Inbound Webhooks (Входящая почта)"
      icon={<Radio className="w-5 h-5" />}
      action={updateGlobalSettings}
      tenantId={tenantId}
      statusBadge={
        settings.inboundEmailWebhookSecret ? (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-medium border border-emerald-500/20">Настроено</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium border border-border">Пусто</span>
        )
      }
    >
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Секретный ключ используется для верификации входящих писем от провайдеров (Mailgun, Postmark), чтобы предотвратить спам-атаки.
        </p>
        <div className="space-y-2">
          <Label>Webhook Secret</Label>
          <Input 
            name="inboundEmailWebhookSecret" 
            type="password"
            placeholder={settings.inboundEmailWebhookSecret ? '••••••••••••••••' : 'Введите секрет'} 
          />
        </div>
      </div>
    </SettingsCard>
  );
}
