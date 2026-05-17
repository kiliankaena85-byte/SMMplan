'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { updateGlobalSettings } from '@/actions/admin/settings';
import { toast } from 'sonner';
import { useActionState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface GeneralSettingsProps {
  settings: any;
}

export function GeneralSettings({ settings }: GeneralSettingsProps) {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      try {
        await updateGlobalSettings(formData);
        return { success: true };
      } catch (err) {
        return { success: false, error: 'Ошибка при обновлении настроек' };
      }
    },
    null
  );

  useEffect(() => {
    if (state?.success) {
      toast.success('Настройки системы обновлены');
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6 pb-24">
      {/* 1. Core Settings */}
      <Card className="rounded-2xl border-border shadow-sm bg-card backdrop-blur-xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-primary/20 text-primary rounded-md text-[10px] font-bold">CORE</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Основные настройки</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Название сайта</Label>
              <Input
                name="siteName"
                defaultValue={settings.siteName}
                placeholder="Smmplan Lite"
              />
              <p className="text-[11px] text-muted-foreground">Используется в логотипе, заголовках писем и метатегах (SEO)</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Описание (SEO)</Label>
              <Input
                name="siteDescription"
                defaultValue={settings.siteDescription}
                placeholder="Платформа для продвижения..."
              />
              <p className="text-[11px] text-muted-foreground">Краткое описание проекта для поисковиков (Meta Description)</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Курс USD/RUB</Label>
              <Input
                name="exchangeRateUSD"
                type="number"
                step="0.01"
                defaultValue={settings.exchangeRateUSD || 0}
                className="font-mono font-bold"
              />
              <p className="text-[11px] text-muted-foreground">0 = автоматическое обновление ЦБ РФ</p>
            </div>
            
            <div className="flex items-center gap-3 pt-6">
              <Checkbox 
                id="maintenanceMode"
                name="maintenanceMode" 
                value="true" 
                defaultChecked={settings.maintenanceMode}
              />
              <Label htmlFor="maintenanceMode" className="text-sm font-bold text-destructive cursor-pointer">🚧 Режим обслуживания</Label>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Contacts & Socials */}
      <Card className="rounded-2xl border-border shadow-sm bg-card backdrop-blur-xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-blue-500/20 text-blue-500 rounded-md text-[10px] font-bold">CONTACTS</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Контакты и Соцсети</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Поддержки</Label>
              <Input name="contactSupportEmail" defaultValue={settings.contactSupportEmail} placeholder="support@smmplan.pro" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Privacy</Label>
              <Input name="contactPrivacyEmail" defaultValue={settings.contactPrivacyEmail} placeholder="privacy@smmplan.pro" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Telegram Бот</Label>
              <Input name="contactTelegramBot" defaultValue={settings.contactTelegramBot} placeholder="smmplan_support_bot" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Telegram Канал</Label>
              <Input name="contactTelegramChannel" defaultValue={settings.contactTelegramChannel} placeholder="smmplan_support" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">WhatsApp (опционально)</Label>
              <Input name="contactWhatsApp" defaultValue={settings.contactWhatsApp} placeholder="79991234567" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">VK Group (опционально)</Label>
              <Input name="contactVk" defaultValue={settings.contactVk} placeholder="smmplan_official" />
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Legal Info */}
      <Card className="rounded-2xl border-border shadow-sm bg-card backdrop-blur-xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-success/20 text-success rounded-md text-[10px] font-bold">LEGAL</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Юридическая информация</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Название Юр. Лица</Label>
              <Input name="legalCompanyName" defaultValue={settings.legalCompanyName} placeholder="ИП Иванов И. И." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Юридический адрес</Label>
              <Input name="legalCompanyAddress" defaultValue={settings.legalCompanyAddress} placeholder="г. Москва, ул. Примерная, д. 1" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ИНН</Label>
              <Input name="legalCompanyInn" defaultValue={settings.legalCompanyInn} placeholder="770000000000" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ОГРН / ОГРНИП</Label>
              <Input name="legalCompanyOgrnip" defaultValue={settings.legalCompanyOgrnip} placeholder="300000000000000" />
            </div>
          </div>
        </div>
      </Card>

      {/* Sticky Save Button */}
      <div className="fixed bottom-0 right-0 left-64 p-4 bg-background/80 backdrop-blur-md border-t border-border z-10 flex justify-end">
        <Button disabled={isPending} type="submit" className="font-bold uppercase tracking-widest text-xs h-12 px-8 shadow-xl">
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Сохранить все настройки
        </Button>
      </div>
    </form>
  );
}
