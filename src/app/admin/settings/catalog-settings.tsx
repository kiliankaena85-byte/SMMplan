'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateGlobalSettings } from '@/actions/admin/settings';
import { toast } from 'sonner';
import { useActionState, useEffect, useState } from 'react';
import { Loader2, Calculator, TrendingUp, Coins, Sparkles } from 'lucide-react';
import { applyBeautifulRounding } from '@/lib/financial-constants';
import { formatPricePerUnit, formatRubles } from '@/utils/format-price';

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

  // Flexible markup & sample price simulator
  const [liveMarkup, setLiveMarkup] = useState<number>(settings.globalMarkup || 3.0);
  const [sampleWholesale, setSampleWholesale] = useState<number>(142.5);

  useEffect(() => {
    if (formState?.success) {
      toast.success('Настройки каталога успешно обновлены');
    } else if (formState?.error) {
      toast.error(formState.error);
    } else if (formState?.errors) {
      toast.error('Ошибка валидации данных каталога. Проверьте числовые диапазоны.');
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
    });
  };

  // Calculations using platform's marketing beautiful rounding
  const rawCalculatedPrice = sampleWholesale * liveMarkup;
  const roundedRetailPrice = applyBeautifulRounding(rawCalculatedPrice);
  const retailPerUnit = formatPricePerUnit(roundedRetailPrice / 1000);
  const calculatedProfit = roundedRetailPrice - sampleWholesale;
  const profitMarginPercent = sampleWholesale > 0 ? ((calculatedProfit / sampleWholesale) * 100) : 0;

  return (
    <form key={settings.updatedAt?.toString() || 'catalog'} action={formAction} className="space-y-6">
      <input type="hidden" name="_isCatalogSettings" value="1" />

      {/* 1. Pricing Rules & Interactive Simulator */}
      <Card className="rounded-3xl border border-border/60 shadow-lg bg-card/70 backdrop-blur-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Правила ценообразования & Маржинальность</h3>
              <p className="text-xs text-muted-foreground">
                Глобальный множитель наценки и алгоритм психологического красивого округления для витрины.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[11px] font-black uppercase tracking-wider self-start sm:self-auto">
            Smart Markup
          </span>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Глобальная наценка (множитель)
              </Label>
              <span className="text-xs font-black font-mono text-primary">x{liveMarkup.toFixed(2)}</span>
            </div>
            <Input
              name="globalMarkup"
              type="number"
              step="0.05"
              min="1"
              max="100"
              value={liveMarkup}
              onChange={(e) => setLiveMarkup(parseFloat(e.target.value) || 1)}
              placeholder="3.0"
              className={`font-mono font-bold text-sm ${formState?.errors?.globalMarkup ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {formState?.errors?.globalMarkup && (
              <p className="text-xs font-bold text-destructive mt-1">{formState.errors.globalMarkup[0]}</p>
            )}
            <p className="text-[11px] text-muted-foreground leading-normal">
              Множитель по умолчанию для новых услуг (например, 2.5, 3.0, 3.85).
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Порог безопасности (Safety Floor)
            </Label>
            <Input
              name="safetyFloor"
              type="number"
              step="0.05"
              min="1"
              max="100"
              defaultValue={settings.safetyFloor || 1.0}
              className={`font-mono font-bold text-sm ${formState?.errors?.safetyFloor ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {formState?.errors?.safetyFloor && (
              <p className="text-xs font-bold text-destructive mt-1">{formState.errors.safetyFloor[0]}</p>
            )}
            <p className="text-[11px] text-muted-foreground leading-normal">
              Нижний порог множителя (1.0 = защита от продажи в убыток).
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Порог карантина скачка цен (%)
            </Label>
            <Input
              name="quarantineThreshold"
              type="number"
              min="0"
              max="100"
              defaultValue={settings.quarantineThreshold !== undefined ? Math.round(settings.quarantineThreshold * 100) : 20}
              className={`font-mono font-bold text-sm ${formState?.errors?.quarantineThreshold ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {formState?.errors?.quarantineThreshold && (
              <p className="text-xs font-bold text-destructive mt-1">{formState.errors.quarantineThreshold[0]}</p>
            )}
            <p className="text-[11px] text-muted-foreground leading-normal">
              Если провайдер поднимает цену выше этого %, услуга автоматически блокируется.
            </p>
          </div>
        </div>

        {/* ── LIVE INTERACTIVE PRICING & BEAUTIFUL ROUNDING SIMULATOR ── */}
        <div className="p-5 sm:p-6 rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              Калькулятор наценки & Красивого округления (Маркетинговая цена)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
            <div className="p-4 rounded-xl bg-card border border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Оптовая закупка (за 1000 шт)
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  value={sampleWholesale}
                  onChange={(e) => setSampleWholesale(parseFloat(e.target.value) || 0)}
                  className="w-28 px-2.5 py-1 text-base font-black font-mono bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-sm font-bold text-foreground">₽</span>
              </div>
              <span className="text-[10px] text-muted-foreground block mt-1">Оптовая ставка провайдера</span>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Красивая цена в каталоге
                </span>
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                  <Sparkles className="w-2.5 h-2.5" /> Округлено
                </span>
              </div>
              <p className="text-xl font-black font-mono text-primary mt-0.5">
                {formatRubles(roundedRetailPrice)} <span className="text-xs font-bold text-muted-foreground">/ 1к</span>
              </p>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                Клиент видит: <strong className="text-foreground">{retailPerUnit} ₽ / шт</strong>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-success/10 border border-success/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-success block mb-1">
                Ваша чистая маржа
              </span>
              <p className="text-xl font-black font-mono text-success mt-0.5">
                +{formatRubles(calculatedProfit)} <span className="text-xs font-bold">({profitMarginPercent.toFixed(0)}%)</span>
              </p>
              <span className="text-[10px] text-success/80 block mt-1">Прибыль с каждой тысячи заказов</span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-primary/10">
            💡 <strong>Как работает красивое округление:</strong> сырой расчет <span className="font-mono">{formatRubles(sampleWholesale)} × {liveMarkup.toFixed(2)} = {formatRubles(rawCalculatedPrice)}</span> автоматически округляется вверх до эстетичного маркетингового значения <strong className="text-foreground font-mono">{formatRubles(roundedRetailPrice)}</strong> (кратное 10 ₽ для услуг до 1000 ₽ и кратное 100 ₽ для дорогих услуг). Это исключает «кривые» копейки и лишние нули в розничном каталоге.
          </div>
        </div>
      </Card>

      {/* 2. Exchange Rate & CBR API */}
      <Card className="rounded-3xl border border-border/60 shadow-lg bg-card/70 backdrop-blur-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-border/50 pb-5">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Валютный курс ЦБ РФ & Конвертация</h3>
            <p className="text-xs text-muted-foreground">
              Автоматическая ежедневная синхронизация курса доллара США через официальный шлюз Центробанка РФ.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Фиксированный курс USD к RUB (0 = Авто ЦБ РФ)
            </Label>
            <Input
              name="exchangeRateUSD"
              type="number"
              step="0.01"
              min="0"
              defaultValue={settings.exchangeRateUSD || 0}
              className={`font-mono font-bold text-sm ${formState?.errors?.exchangeRateUSD ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {formState?.errors?.exchangeRateUSD && (
              <p className="text-xs font-bold text-destructive mt-1">{formState.errors.exchangeRateUSD[0]}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Установите <strong>0</strong> для включения авто-синхронизации с Центробанком РФ, либо укажите фиксированный курс вручную.
            </p>
          </div>

          <div className="space-y-2 flex flex-col justify-center bg-muted/20 p-5 rounded-2xl border border-border">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Статус авто-обновления ЦБ РФ
            </span>
            <div className="text-sm font-bold text-foreground mt-1 flex items-center gap-2">
              <span>📅</span>
              <span>Последняя синхронизация: {formatSyncTime(settings.exchangeRateUpdatedAt)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              Система автоматически опрашивает ЦБ РФ раз в сутки в 04:00 МСК и пересчитывает оптовую себестоимость долларовых провайдеров.
            </p>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button disabled={isPending} type="submit" className="font-bold uppercase tracking-widest text-xs h-12 px-8 shadow-md">
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Сохранить настройки каталога
        </Button>
      </div>
    </form>
  );
}
