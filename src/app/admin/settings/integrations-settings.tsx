'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { updateGlobalSettings } from '@/actions/admin/settings';
import { toast } from 'sonner';
import { useActionState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface IntegrationsSettingsProps {
  settings: any;
}

export function IntegrationsSettings({ settings }: IntegrationsSettingsProps) {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      try {
        await updateGlobalSettings(formData);
        return { success: true };
      } catch (err) {
        return { success: false, error: 'Ошибка при обновлении интеграций' };
      }
    },
    null
  );

  useEffect(() => {
    if (state?.success) {
      toast.success('Настройки интеграций обновлены');
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div className="space-y-6">
      {/* Telegram */}
      <Card className="rounded-2xl border-border shadow-sm bg-primary/5 backdrop-blur-xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-primary/20 text-primary rounded-md text-[10px] font-bold">TG</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Telegram Бот</h3>
          </div>
          
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Приветственное сообщение (/start)</Label>
              <Textarea
                name="welcomeMessage"
                defaultValue={settings.welcomeMessage || ''}
                rows={4}
              />
            </div>
            <div className="flex justify-end">
              <Button disabled={isPending} type="submit" intent="outline" className="font-bold uppercase tracking-widest text-xs h-9">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Обновить контент бота
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* Payments */}
      <Card className="rounded-2xl border-border shadow-sm bg-card backdrop-blur-xl">
        <div className="p-8 space-y-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-emerald-500/20 text-success rounded-md text-[10px] font-bold">PAY</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Платёжные шлюзы</h3>
          </div>

          <form action={formAction} className="space-y-8">
            {/* YooKassa section */}
            <div className="space-y-6">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-1">YooKassa (Fiat)</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TEST KEYS */}
                <div className={`space-y-4 p-5 rounded-xl border-2 transition-all ${settings.isTestMode ? 'border-amber-500/50 bg-amber-500/5 shadow-sm' : 'border-border bg-muted/30 opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-warning bg-amber-500/20 px-2 py-0.5 rounded">Тестовые</span>
                    </div>
                    {settings.isTestMode && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-success bg-emerald-500/20 px-2 py-0.5 rounded animate-pulse">Активно</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Test Shop ID</Label>
                    <Input
                      name="yookassaTestShopId"
                      defaultValue={settings.yookassaTestShopId || ''}
                      placeholder="Тестовый Shop ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Test Secret Key</Label>
                    <Input
                      name="yookassaTestSecretKey"
                      type="password"
                      placeholder={settings.yookassaTestSecretKey ? '••••••••••••••••' : 'Не настроено'}
                    />
                  </div>
                </div>

                {/* PRODUCTION KEYS */}
                <div className={`space-y-4 p-5 rounded-xl border-2 transition-all ${!settings.isTestMode ? 'border-emerald-500/50 bg-emerald-500/5 shadow-sm' : 'border-border bg-muted/30 opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-success bg-emerald-500/20 px-2 py-0.5 rounded">Боевые</span>
                    </div>
                    {!settings.isTestMode && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-success bg-emerald-500/20 px-2 py-0.5 rounded animate-pulse">Активно</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Shop ID</Label>
                    <Input
                      name="yookassaShopId"
                      defaultValue={settings.yookassaShopId || ''}
                      placeholder="Боевой Shop ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Secret Key</Label>
                    <Input
                      name="yookassaSecretKey"
                      type="password"
                      placeholder={settings.yookassaSecretKey ? '••••••••••••••••' : 'Не настроено'}
                    />
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Переключение между тестовыми и боевыми ключами — через «Тестовый режим» на вкладке «Система».
                При включённом тестовом режиме используются тестовые ключи (с fallback на боевые).
              </p>
            </div>

            {/* CryptoBot */}
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-1">CryptoBot (Crypto)</div>
              <div className="max-w-md space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">API Token</Label>
                <Input
                  name="cryptoBotToken"
                  type="password"
                  placeholder={settings.cryptoBotToken ? '••••••••••••••••' : 'Не настроено'}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button disabled={isPending} type="submit" className="font-bold uppercase tracking-widest text-xs h-10 shadow-md">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Сохранить ключи шлюзов
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
