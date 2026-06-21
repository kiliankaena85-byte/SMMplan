'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { updateGlobalSettings } from '@/actions/admin/settings';
import { toast } from 'sonner';
import { useActionState, useEffect } from 'react';
import { Loader2, UploadCloud } from 'lucide-react';

interface GeneralSettingsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
}

export function GeneralSettings({ settings }: GeneralSettingsProps) {
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
        return { success: false, error: errorMsg || 'Ошибка при обновлении настроек' };
      }
    },
    null
  );

  const formState = state as { success?: boolean; error?: string; errors?: Record<string, string[]> } | null;

  useEffect(() => {
    if (formState?.success) {
      toast.success('Настройки системы обновлены');
    } else if (formState?.error) {
      toast.error(formState.error);
    } else if (formState?.errors) {
      toast.error('Ошибка валидации данных. Проверьте заполненные поля.');
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

  // Tax and USN Scheme reactivity
  const [taxRate, setTaxRate] = React.useState<number>(settings.taxRate ?? 6);
  const handleUsnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scheme = e.target.value;
    if (scheme === 'INCOME') {
      if (taxRate === 15) setTaxRate(6);
    } else if (scheme === 'INCOME_EXPENSES') {
      if (taxRate === 6) setTaxRate(15);
    }
  };

  // Branding Upload states
  const [logoUrl, setLogoUrl] = React.useState<string | null>(settings.siteLogoUrl);
  const [faviconUrl, setFaviconUrl] = React.useState<string | null>(settings.siteFaviconUrl);
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [faviconUploading, setFaviconUploading] = React.useState(false);

  const handleBrandingUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = type === 'logo' ? 2 * 1024 * 1024 : 500 * 1024;
    if (file.size > maxSize) {
      toast.error(`Файл слишком большой. Максимальный размер: ${type === 'logo' ? '2 МБ' : '500 КБ'}`);
      return;
    }

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!allowedMime.includes(file.type)) {
      toast.error('Неподдерживаемый формат. Разрешены PNG, JPG, WEBP, SVG, ICO.');
      return;
    }

    const setUploading = type === 'logo' ? setLogoUploading : setFaviconUploading;
    const setUrl = type === 'logo' ? setLogoUrl : setFaviconUrl;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await fetch('/api/admin/upload-branding', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(errMsg || 'Ошибка загрузки');
      }

      const data = await res.json();
      if (data.success && data.url) {
        setUrl(data.url);
        toast.success(`${type === 'logo' ? 'Логотип' : 'Фавикон'} успешно обновлен!`);
      } else {
        throw new Error('Не удалось обновить изображение');
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(errorMsg || 'Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form action={formAction} className="space-y-6 pb-24">
      <input type="hidden" name="_isGeneralSettings" value="1" />
      
      {/* Hidden inputs to preserve uploads inside settings submit */}
      <input type="hidden" name="siteLogoUrl" value={logoUrl || ''} />
      <input type="hidden" name="siteFaviconUrl" value={faviconUrl || ''} />

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
                placeholder="Smmplan"
                className={formState?.errors?.siteName ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {formState?.errors?.siteName && (
                <p className="text-xs font-bold text-destructive mt-1">{formState.errors.siteName[0]}</p>
              )}
              <p className="text-[11px] text-muted-foreground">Используется в логотипе, заголовках писем и метатегах (SEO)</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Описание (SEO)</Label>
              <Input
                name="siteDescription"
                defaultValue={settings.siteDescription}
                placeholder="Платформа для продвижения..."
                className={formState?.errors?.siteDescription ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {formState?.errors?.siteDescription && (
                <p className="text-xs font-bold text-destructive mt-1">{formState.errors.siteDescription[0]}</p>
              )}
              <p className="text-[11px] text-muted-foreground">Краткое описание проекта для поисковиков (Meta Description)</p>
            </div>
            
            <div className="flex items-center gap-3 pt-6 md:col-span-2">
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

      {/* 2. Брендинг и логотипы */}
      <Card className="rounded-2xl border-border shadow-sm bg-card backdrop-blur-xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-purple-500/20 text-purple-500 rounded-md text-[10px] font-bold">BRANDING</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Брендинг</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Логотип сайта</Label>
              <div className="flex items-center gap-6 p-5 rounded-xl border border-border bg-muted/20">
                <div className="w-20 h-20 rounded-xl border border-border flex items-center justify-center bg-card overflow-hidden relative group shadow-inner">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <UploadCloud className="w-8 h-8 text-muted-foreground" />
                  )}
                  {logoUploading && (
                    <div className="absolute inset-0 bg-background/85 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="relative">
                    <input
                      type="file"
                      id="logo-file"
                      accept=".png,.jpg,.jpeg,.webp,.svg"
                      className="hidden"
                      onChange={(e) => handleBrandingUpload(e, 'logo')}
                      disabled={logoUploading}
                    />
                    <label
                      htmlFor="logo-file"
                      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-sm ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      Загрузить логотип
                    </label>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Максимум 2 МБ. Форматы: PNG, JPG, WEBP, SVG.
                  </p>
                </div>
              </div>
            </div>

            {/* Favicon Upload */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Фавикон сайта</Label>
              <div className="flex items-center gap-6 p-5 rounded-xl border border-border bg-muted/20">
                <div className="w-20 h-20 rounded-xl border border-border flex items-center justify-center bg-card overflow-hidden relative group shadow-inner">
                  {faviconUrl ? (
                    <img src={faviconUrl} alt="Favicon" className="w-10 h-10 object-contain" />
                  ) : (
                    <UploadCloud className="w-8 h-8 text-muted-foreground" />
                  )}
                  {faviconUploading && (
                    <div className="absolute inset-0 bg-background/85 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="relative">
                    <input
                      type="file"
                      id="favicon-file"
                      accept=".png,.jpg,.jpeg,.webp,.svg,.ico"
                      className="hidden"
                      onChange={(e) => handleBrandingUpload(e, 'favicon')}
                      disabled={faviconUploading}
                    />
                    <label
                      htmlFor="favicon-file"
                      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-sm ${faviconUploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      Загрузить фавикон
                    </label>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Максимум 500 КБ. Форматы: PNG, JPG, WEBP, SVG, ICO.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Финансы и налоги */}
      <Card className="rounded-2xl border-border shadow-sm bg-card backdrop-blur-xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-emerald-500/20 text-emerald-500 rounded-md text-[10px] font-bold">FINANCE</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Финансы и налоги</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Система налогообложения (УСН)</Label>
              <select
                name="usnScheme"
                defaultValue={settings.usnScheme || 'INCOME_EXPENSES'}
                onChange={handleUsnChange}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-medium text-foreground"
              >
                <option value="INCOME">УСН «Доходы» (Налог на Выручку)</option>
                <option value="INCOME_EXPENSES">УСН «Доходы минус Расходы» (Налог на Маржу)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">База для расчета оценочного налога</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ставка налога (%)</Label>
              <Input
                name="taxRate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className={`font-mono font-bold ${formState?.errors?.taxRate ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {formState?.errors?.taxRate && (
                <p className="text-xs font-bold text-destructive mt-1">{formState.errors.taxRate[0]}</p>
              )}
              <p className="text-[11px] text-muted-foreground">Процентная ставка (например, 6% или 15%)</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Постоянные расходы (OPEX, ₽/мес)</Label>
              <Input
                name="opexMonthly"
                type="number"
                min="0"
                defaultValue={settings.opexMonthly ? Math.round(settings.opexMonthly / 100) : 0}
                className={`font-mono font-bold ${formState?.errors?.opexMonthly ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {formState?.errors?.opexMonthly && (
                <p className="text-xs font-bold text-destructive mt-1">{formState.errors.opexMonthly[0]}</p>
              )}
              <p className="text-[11px] text-muted-foreground">Фиксированные операционные расходы в рублях</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Contacts & Socials */}
      <Card className="rounded-2xl border-border shadow-sm bg-card backdrop-blur-xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-blue-500/20 text-blue-500 rounded-md text-[10px] font-bold">CONTACTS</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Контакты и Соцсети</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Поддержки</Label>
              <Input
                name="contactSupportEmail"
                defaultValue={settings.contactSupportEmail}
                placeholder="support@smmplan.pro"
                className={formState?.errors?.contactSupportEmail ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {formState?.errors?.contactSupportEmail && (
                <p className="text-xs font-bold text-destructive mt-1">{formState.errors.contactSupportEmail[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Privacy</Label>
              <Input
                name="contactPrivacyEmail"
                defaultValue={settings.contactPrivacyEmail}
                placeholder="privacy@smmplan.pro"
                className={formState?.errors?.contactPrivacyEmail ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {formState?.errors?.contactPrivacyEmail && (
                <p className="text-xs font-bold text-destructive mt-1">{formState.errors.contactPrivacyEmail[0]}</p>
              )}
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

      {/* 5. Legal Info */}
      <Card className="rounded-2xl border-border shadow-sm bg-card backdrop-blur-xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-neutral-500/20 text-neutral-600 dark:text-neutral-400 rounded-md text-[10px] font-bold">LEGAL</span>
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
              <Input
                name="legalCompanyInn"
                defaultValue={settings.legalCompanyInn}
                placeholder="770000000000"
                className={formState?.errors?.legalCompanyInn ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {formState?.errors?.legalCompanyInn && (
                <p className="text-xs font-bold text-destructive mt-1">{formState.errors.legalCompanyInn[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ОГРН / ОГРНИП</Label>
              <Input
                name="legalCompanyOgrnip"
                defaultValue={settings.legalCompanyOgrnip}
                placeholder="300000000000000"
                className={formState?.errors?.legalCompanyOgrnip ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {formState?.errors?.legalCompanyOgrnip && (
                <p className="text-xs font-bold text-destructive mt-1">{formState.errors.legalCompanyOgrnip[0]}</p>
              )}
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
