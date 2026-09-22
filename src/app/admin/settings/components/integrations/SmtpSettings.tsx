'use client';

import * as React from 'react';
import { SettingsCard } from '../settings-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, Send } from 'lucide-react';
import { testSmtpConnectionAction, updateGlobalSettings } from '@/actions/admin/settings';
import type { SystemSettings } from '@prisma/client';
import { useState } from 'react';
import { toast } from 'sonner';

export function SmtpSettings({ settings, tenantId = 'smmplan' }: { settings: SystemSettings; tenantId?: string }) {
  const [testing, setTesting] = useState(false);
  
  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await testSmtpConnectionAction(undefined, undefined, undefined, undefined, tenantId);
      const message = ('message' in res && typeof res.message === 'string')
        ? res.message
        : ('error' in res && typeof res.error === 'string' ? res.error : 'Ошибка связи');
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
      id="smtp"
      title="Почтовый сервер (SMTP)"
      icon={<Mail className="w-5 h-5" />}
      action={updateGlobalSettings}
      tenantId={tenantId}
      testButton={
        <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testing}>
          {testing ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Send className="w-3 h-3 mr-2" />}
          Отправить тестовое письмо
        </Button>
      }
      statusBadge={
        settings.smtpHost && settings.smtpUser ? (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-medium border border-emerald-500/20">Подключено</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium border border-destructive/20">Требует настройки</span>
        )
      }
    >
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>SMTP Host</Label>
          <Input name="smtpHost" defaultValue={settings.smtpHost || ''} placeholder="smtp.yandex.ru" />
        </div>
        <div className="space-y-2">
          <Label>SMTP Port</Label>
          <Input name="smtpPort" type="number" defaultValue={settings.smtpPort || ''} placeholder="465" />
        </div>
        <div className="space-y-2">
          <Label>Пользователь (Email)</Label>
          <Input name="smtpUser" defaultValue={settings.smtpUser || ''} placeholder="no-reply@smmplan.pro" />
        </div>
        <div className="space-y-2">
          <Label>Пароль (App Password)</Label>
          <Input 
            name="smtpPassword" 
            type="password"
            placeholder={settings.smtpPassword ? '••••••••••••••••' : 'Введите пароль приложения'} 
          />
        </div>
      </div>
    </SettingsCard>
  );
}
