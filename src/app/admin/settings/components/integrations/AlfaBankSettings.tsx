'use client';

import * as React from 'react';
import { SettingsCard } from '../settings-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Landmark, Loader2 } from 'lucide-react';
import { testAlfaBankConnectionAction, updateGlobalSettings } from '@/actions/admin/settings';
import type { SystemSettings } from '@prisma/client';
import { useState } from 'react';
import { toast } from 'sonner';

export function AlfaBankSettings({ settings, tenantId = 'smmplan' }: { settings: SystemSettings; tenantId?: string }) {
  const [testing, setTesting] = useState(false);
  const [isSandbox, setIsSandbox] = useState(settings.alfaBankIsSandbox ?? true);
  
  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await testAlfaBankConnectionAction(tenantId);
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
      id="alfabank"
      title="Alfa-Bank (B2B Эквайринг)"
      icon={<Landmark className="w-5 h-5" />}
      action={updateGlobalSettings}
      tenantId={tenantId}
      testButton={
        <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testing}>
          {testing && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
          Проверить соединение
        </Button>
      }
      statusBadge={
        settings.alfaBankApiKey && settings.alfaBankAccountNumber ? (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-medium border border-emerald-500/20">Активно</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium border border-border">Не настроено</span>
        )
      }
    >
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Номер счета (Account Number)</Label>
          <Input name="alfaBankAccountNumber" defaultValue={settings.alfaBankAccountNumber || ''} placeholder="40702810..." />
        </div>
        <div className="space-y-2 flex flex-col justify-end">
           <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/20">
              <Checkbox 
                id="alfa-sandbox" 
                name="alfaBankIsSandbox" 
                checked={isSandbox} 
                onCheckedChange={(checked) => setIsSandbox(checked === true)} 
                value="true" 
              />
              <Label htmlFor="alfa-sandbox" className="cursor-pointer font-medium">Режим песочницы (Sandbox)</Label>
           </div>
           {!isSandbox && <input type="hidden" name="alfaBankIsSandbox" value="false" />}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>API Key (Client ID)</Label>
          <Input 
            name="alfaBankApiKey" 
            type="password"
            placeholder={settings.alfaBankApiKey ? '••••••••••••••••' : 'Введите API Key'} 
          />
        </div>
      </div>
    </SettingsCard>
  );
}
