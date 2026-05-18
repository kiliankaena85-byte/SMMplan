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
            <span className="p-1 px-2.5 bg-success/20 text-success rounded-md text-[10px] font-bold">PAY</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Платёжные шлюзы</h3>
          </div>

          <form action={formAction} className="space-y-8">
            {/* YooKassa section */}
            <div className="space-y-6">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-1">YooKassa (Fiat)</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TEST KEYS */}
                <div className={`space-y-4 p-5 rounded-xl border-2 transition-all ${settings.isTestMode ? 'border-amber-500/50 bg-warning/5 shadow-sm' : 'border-border bg-muted/30 opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-warning bg-warning/20 px-2 py-0.5 rounded">Тестовые</span>
                    </div>
                    {settings.isTestMode && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-success bg-success/20 px-2 py-0.5 rounded animate-pulse">Активно</span>
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
                <div className={`space-y-4 p-5 rounded-xl border-2 transition-all ${!settings.isTestMode ? 'border-emerald-500/50 bg-success/5 shadow-sm' : 'border-border bg-muted/30 opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-success bg-success/20 px-2 py-0.5 rounded">Боевые</span>
                    </div>
                    {!settings.isTestMode && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-success bg-success/20 px-2 py-0.5 rounded animate-pulse">Активно</span>
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

      {/* Email & SMTP */}
      <Card className="rounded-2xl border-border shadow-sm bg-card backdrop-blur-xl">
        <div className="p-8 space-y-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-blue-500/20 text-blue-500 rounded-md text-[10px] font-bold">MAIL</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Почта (SMTP & Inbound)</h3>
          </div>

          <form action={formAction} className="space-y-8">
            <div className="space-y-6">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-1">Отправка писем</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Провайдер писем</Label>
                  <select
                    name="emailProvider"
                    defaultValue={settings.emailProvider || 'SMTP'}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="SMTP">SMTP (Nodemailer)</option>
                    <option value="RESEND">Resend SDK</option>
                  </select>
                </div>
                
                <div className="space-y-2 md:col-span-2 pt-4 border-t border-border">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ключ API Resend</Label>
                  <Input
                    name="resendApiKey"
                    type="password"
                    placeholder={settings.resendApiKey ? '••••••••••••••••' : 'Не настроено'}
                  />
                  <p className="text-[10px] text-muted-foreground">Используется, если выбран провайдер Resend.</p>
                </div>

                <div className="space-y-2 mt-4 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Настройки SMTP (Nodemailer)</Label>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SMTP Host</Label>
                  <Input
                    name="smtpHost"
                    defaultValue={settings.smtpHost || ''}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SMTP Port</Label>
                  <Input
                    name="smtpPort"
                    type="number"
                    defaultValue={settings.smtpPort || 465}
                    placeholder="465"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Пользователь (Email)</Label>
                  <Input
                    name="smtpUser"
                    defaultValue={settings.smtpUser || ''}
                    placeholder="support@smmplan.pro"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Пароль приложения</Label>
                  <Input
                    name="smtpPassword"
                    type="password"
                    placeholder={settings.smtpPassword ? '••••••••••••••••' : 'Не настроено'}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-1">Прием писем (Inbound)</div>
              <div className="max-w-md space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Домен (для тикетов)</Label>
                <Input
                  name="supportEmailDomain"
                  defaultValue={settings.supportEmailDomain || ''}
                  placeholder="smmplan.pro"
                />
                <p className="text-[10px] text-muted-foreground">
                  Используется для генерации адреса <code>support+ticketId@домен</code>
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-between items-center">
              <p className="text-[10px] text-muted-foreground">Если поля пустые, используются настройки из .env (fallback)</p>
              <Button disabled={isPending} type="submit" className="font-bold uppercase tracking-widest text-xs h-10 shadow-md">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Сохранить настройки почты
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
