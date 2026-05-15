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
    <div className="space-y-6">
      <Card className="rounded-2xl border-border shadow-sm bg-card backdrop-blur-xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-primary/20 text-primary rounded-md text-[10px] font-bold">CORE</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Основные настройки</h3>
          </div>
          
          <form action={formAction} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Название сайта</Label>
                <Input
                  name="siteName"
                  defaultValue={settings.siteName}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Описание (SEO)</Label>
                <Input
                  name="siteDescription"
                  defaultValue={settings.siteDescription}
                />
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

            <div className="pt-4 border-t border-border flex justify-end">
              <Button disabled={isPending} type="submit" className="font-bold uppercase tracking-widest text-xs h-10 shadow-md">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Сохранить основные настройки
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
