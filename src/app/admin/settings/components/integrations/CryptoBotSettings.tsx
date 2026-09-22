'use client';

import * as React from 'react';
import { SettingsCard } from '../settings-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Landmark } from 'lucide-react';
import { updateGlobalSettings } from '@/actions/admin/settings';
import type { SystemSettings } from '@prisma/client';

export function CryptoBotSettings({ settings, tenantId = 'smmplan' }: { settings: SystemSettings; tenantId?: string }) {
  return (
    <SettingsCard
      id="cryptobot"
      title="CryptoBot (Telegram)"
      icon={<Landmark className="w-5 h-5" />}
      action={updateGlobalSettings}
      tenantId={tenantId}
      statusBadge={
        settings.cryptoBotToken ? (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-medium border border-emerald-500/20">Настроено</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium border border-border">Не настроено</span>
        )
      }
    >
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Crypto Pay API Token</Label>
          <Input 
            name="cryptoBotToken" 
            type="password"
            placeholder={settings.cryptoBotToken ? '••••••••••••••••' : 'Введите токен из @CryptoBot'} 
          />
        </div>
      </div>
    </SettingsCard>
  );
}
