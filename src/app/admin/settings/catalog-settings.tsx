'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateGlobalSettings } from '@/actions/admin/settings';
import { toast } from 'sonner';
import { useActionState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface CatalogSettingsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
}

export function CatalogSettings({ settings }: CatalogSettingsProps) {
  const [state, formAction, isPending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      try {
        const res = await updateGlobalSettings(formData);
        if (res && typeof res === 'object' && 'success' in res && !res.success) {
          return res;
        }
        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return { success: false, error: errorMsg || 'Ошибка при обновлении каталога' };
      }
    },
    null
  );

  const formState = state as { success?: boolean; error?: string; errors?: Record<string, string[]> } | null;

  useEffect(() => {
    if (formState?.success) {
      toast.success('Настройки каталога успешно обновлены');
    } else if (formState?.error) {
      toast.error(formState.error);
    } else if (formState?.errors) {
      toast.error('Ошибка валидации данных каталога. Проверьте числовые диапазоны.');
      // Auto scroll to first error field
      const firstErrorField = Object.keys(formState.errors)[0];
      if (firstErrorField) {
        const element = document.getElementsByName(firstErrorField)[0];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (element as HTMLElement).focus();
        }
      }
    }
  }, [formState]);

  const formatSyncTime = (dateStr?: string | Date | null) => {
    if (!dateStr) return 'Никогда';
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <form key={settings.updatedAt?.toString() || 'catalog'} action={formAction} className="space-y-6">
  <input type="hidden" name="_isCatalogSettings" value="1" />

  {/* 1. Pricing Rules */}
  <Card className="rounded-2xl border-border shadow-sm bg-card backdrop-blur-xl">
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="p-1 px-2.5 bg-primary/20 text-primary rounded-md text-[10px] font-bold">PRICING</span>
        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Правила ценообразования</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Глобальная наценка (множитель)</Label>
          <Input
            name="globalMarkup"
            type="number"
            step="0.01"
            min="1"
            max="100"
            defaultValue={settings.globalMarkup || 3.0}
            className={`font-mono font-bold ${formState?.errors?.globalMarkup ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          />
          {formState?.errors?.globalMarkup && (
            <p className="text-xs font-bold text-destructive mt-1">{formState.errors.globalMarkup[0]}</p>
          )}
          <p className="text-[11px] text-muted-foreground">Наценка по умолчанию для новых услуг (3.0 = 300% от цены опта)</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Порог безопасности (минимальная наценка)</Label>
          <Input
            name="safetyFloor"
            type="number"
            step="0.01"
            min="1"
            max="100"
            defaultValue={settings.safetyFloor || 1.0}
            className={`font-mono font-bold ${formState?.errors?.safetyFloor ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          />
          {formState?.errors?.safetyFloor && (
            <p className="text-xs font-bold text-destructive mt-1">{formState.errors.safetyFloor[0]}</p>
          )}
          <p className="text-[11px] text-muted-foreground">Запретить продавать дешевле этого множителя (1.0 = себестоимость)</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Порог карантина резкого скачка цен (%)</Label>
          <Input
            name="quarantineThreshold"
            type="number"
            min="0"
            max="100"
            defaultValue={settings.quarantineThreshold !== undefined ? Math.round(settings.quarantineThreshold * 100) : 20}
            className={`font-mono font-bold ${formState?.errors?.quarantineThreshold ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          />
          {formState?.errors?.quarantineThreshold && (
            <p className="text-xs font-bold text-destructive mt-1">{formState.errors.quarantineThreshold[0]}</p>
          )}
          <p className="text-[11px] text-muted-foreground">Если цена провайдера вырастет на эту величину, услуга уходит на карантин</p>
        </div>
      </div>
    </div>
  </Card>

  {/* 2. Exchange Rate */}
  <Card className="rounded-2xl border-border shadow-sm bg-card backdrop-blur-xl">
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="p-1 px-2.5 bg-blue-500/20 text-blue-500 rounded-md text-[10px] font-bold">CURRENCY</span>
        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Курс валют</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Курс USD к RUB</Label>
          <Input
            name="exchangeRateUSD"
            type="number"
            step="0.01"
            min="0"
            defaultValue={settings.exchangeRateUSD || 0}
            className={`font-mono font-bold ${formState?.errors?.exchangeRateUSD ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          />
          {formState?.errors?.exchangeRateUSD && (
            <p className="text-xs font-bold text-destructive mt-1">{formState.errors.exchangeRateUSD[0]}</p>
          )}
          <p className="text-[11px] text-muted-foreground">Установите 0 для включения авто-синхронизации с ЦБ РФ</p>
        </div>

        <div className="space-y-2 flex flex-col justify-center bg-muted/20 p-4 rounded-xl border border-border">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Авто-обновление курса USD</span>
          <div className="text-sm font-bold text-foreground mt-1 flex items-center gap-2">
            <span>📅</span>
            <span>Последняя синхронизация: {formatSyncTime(settings.exchangeRateUpdatedAt)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-normal mt-1">
            Система автоматически обновляет курс через API Центробанка РФ раз в сутки, если установлено значение 0.
          </p>
        </div>
      </div>
    </div>
  </Card>

  {/* Save Button */}
  <div className="flex justify-end pt-4">
    <Button disabled={isPending} type="submit" className="font-bold uppercase tracking-widest text-xs h-12 px-8 shadow-md">
      {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      Сохранить настройки каталога
    </Button>
  </div>
</form>
  );
}
