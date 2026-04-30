'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { updateGlobalSettings } from '@/actions/admin/settings';
import { toast } from 'sonner';

interface IntegrationsSettingsProps {
  settings: any;
}

export function IntegrationsSettings({ settings }: IntegrationsSettingsProps) {
  async function action(formData: FormData) {
    try {
      await updateGlobalSettings(formData);
      toast.success('Настройки интеграций обновлены');
    } catch (err) {
      toast.error('Ошибка при обновлении интеграций');
    }
  }

  return (
    <div className="space-y-6">
      {/* Telegram */}
      <Card className="rounded-2xl border-slate-100/50 shadow-sm bg-sky-50/30 backdrop-blur-xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-sky-100 text-sky-800 rounded-md text-[10px] font-bold">TG</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-sky-900">Telegram Бот</h3>
          </div>
          
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Приветственное сообщение (/start)</Label>
              <Textarea
                name="welcomeMessage"
                defaultValue={settings.welcomeMessage || ''}
                rows={4}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" intent="outline" className="font-bold uppercase tracking-widest text-xs h-9">
                Обновить контент бота
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* Payments */}
      <Card className="rounded-2xl border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl">
        <div className="p-8 space-y-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">PAY</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">Платёжные шлюзы</h3>
          </div>

          <form action={action} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* YooKassa */}
              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-1">YooKassa (Fiat)</div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Shop ID</Label>
                  <Input
                    name="yookassaShopId"
                    defaultValue={settings.yookassaShopId || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Secret Key</Label>
                  <Input
                    name="yookassaSecretKey"
                    type="password"
                    placeholder={settings.yookassaSecretKey ? '••••••••••••••••' : 'Не настроено'}
                  />
                </div>
              </div>

              {/* CryptoBot */}
              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-1">CryptoBot (Crypto)</div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">API Token</Label>
                  <Input
                    name="cryptoBotToken"
                    type="password"
                    placeholder={settings.cryptoBotToken ? '••••••••••••••••' : 'Не настроено'}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button type="submit" className="font-bold uppercase tracking-widest text-xs h-10 shadow-md">
                Сохранить ключи шлюзов
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
