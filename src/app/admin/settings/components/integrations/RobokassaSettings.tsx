'use client';

import * as React from 'react';
import { SettingsCard } from '../settings-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard } from 'lucide-react';
import { updateGlobalSettings } from '@/actions/admin/settings';
import type { SystemSettings } from '@prisma/client';

export function RobokassaSettings({ settings }: { settings: SystemSettings }) {
  return (
    <SettingsCard
      id="robokassa"
      title="Robokassa"
      icon={<CreditCard className="w-5 h-5 text-blue-500" />}
      action={updateGlobalSettings}
      statusBadge={
        settings.robokassaLogin && settings.robokassaPassword ? (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-medium border border-emerald-500/20">Настроено</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium border border-border">Не настроено</span>
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Идентификатор магазина (Login)</Label>
          <Input name="robokassaLogin" defaultValue={settings.robokassaLogin || ''} placeholder="Например: myshop" />
        </div>
        <div className="space-y-2">
          <Label>Пароль #1 (Password)</Label>
          <Input 
            name="robokassaPassword" 
            type="password"
            placeholder={settings.robokassaPassword ? '••••••••••••••••' : 'Введите Пароль #1'} 
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Пароль #2 (Для Webhook)</Label>
          <Input 
            name="robokassaWebhookPassword" 
            type="password"
            placeholder={settings.robokassaWebhookPassword ? '••••••••••••••••' : 'Введите Пароль #2'} 
          />
        </div>
      </div>
    </SettingsCard>
  );
}
