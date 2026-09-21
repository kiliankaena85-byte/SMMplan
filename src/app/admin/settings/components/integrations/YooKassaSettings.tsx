'use client';

import * as React from 'react';
import { SettingsCard } from '../settings-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { testYooKassaConnectionAction, updateGlobalSettings } from '@/actions/admin/settings';
import type { SystemSettings } from '@prisma/client';
import { useState } from 'react';
import { toast } from 'sonner';

export function YooKassaSettings({ settings }: { settings: SystemSettings }) {
  const [testing, setTesting] = useState(false);
  
  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await testYooKassaConnectionAction();
      const message = 'message' in res ? res.message : (res as any).error;
      if (res.success) toast.success(message);
      else toast.error(message);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <SettingsCard
      id="yookassa"
      title="YooKassa (ЮKassa)"
      icon={<CreditCard className="w-5 h-5" />}
      action={updateGlobalSettings}
      testButton={
        <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testing}>
          {testing && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
          Проверить соединение
        </Button>
      }
      statusBadge={
        settings.yookassaShopId && settings.yookassaSecretKey ? (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-medium border border-emerald-500/20">Активно</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium border border-border">Не настроено</span>
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Shop ID (Магазин)</Label>
          <Input name="yookassaShopId" defaultValue={settings.yookassaShopId || ''} placeholder="Например: 123456" />
        </div>
        <div className="space-y-2">
          <Label>Секретный ключ (Secret Key)</Label>
          <Input 
            name="yookassaSecretKey" 
            type="password"
            placeholder={settings.yookassaSecretKey ? '••••••••••••••••' : 'Введите секретный ключ'} 
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Webhook Secret (Для проверки подписей)</Label>
          <Input 
            name="yookassaWebhookSecret" 
            type="password"
            placeholder={settings.yookassaWebhookSecret ? '••••••••••••••••' : 'Токен из настроек HTTP-уведомлений'} 
          />
        </div>
      </div>
    </SettingsCard>
  );
}
