'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { updateGlobalSettings } from '@/actions/admin/settings';
import { toast } from 'sonner';
import { useActionState, useEffect, useState } from 'react';
import { 
  Loader2, 
  UploadCloud, 
  Globe, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  PhoneCall, 
  SlidersHorizontal,
  Eye
} from 'lucide-react';

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

  // Live Preview States
  const [siteName, setSiteName] = useState<string>(settings.siteName || 'SMMplan');
  const [siteDescription, setSiteDescription] = useState<string>(settings.siteDescription || '');
  const [supportEmail, setSupportEmail] = useState<string>(settings.contactSupportEmail || 'support@smmplan.pro');
  const [telegramBot, setTelegramBot] = useState<string>(settings.contactTelegramBot || 'smmplan_support_bot');
  const [companyName, setCompanyName] = useState<string>(settings.legalCompanyName || 'ИП Иванов И. И.');
  const [companyInn, setCompanyInn] = useState<string>(settings.legalCompanyInn || '770000000000');
  const [companyOgrnip, setCompanyOgrnip] = useState<string>(settings.legalCompanyOgrnip || '300000000000000');

  // Tax and USN Scheme reactivity
  const [taxRate, setTaxRate] = useState<number>(settings.taxRate ?? 6);
  const handleUsnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scheme = e.target.value;
    if (scheme === 'INCOME') {
      if (taxRate === 15) setTaxRate(6);
    } else if (scheme === 'INCOME_EXPENSES') {
      if (taxRate === 6) setTaxRate(15);
    }
  };

  // Branding Upload states
  const [logoUrl, setLogoUrl] = useState<string | null>(settings.siteLogoUrl);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(settings.siteFaviconUrl);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);

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

      const data = await res.json();
      if (data.success && data.url) {
        setUrl(data.url);
        toast.success(`${type === 'logo' ? 'Логотип' : 'Фавикон'} успешно загружен`);
      } else {
        throw new Error(data.error || 'Ошибка загрузки');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (formState?.success) {
      toast.success('Настройки системы успешно сохранены');
    } else if (formState?.error) {
      toast.error(formState.error);
    } else if (formState?.errors) {
      toast.error('Ошибка валидации данных. Проверьте заполненные поля.');
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

  return (
    <form key={settings.updatedAt?.toString() || 'general'} action={formAction} className="space-y-6">
      <input type="hidden" name="_isGeneralSettings" value="1" />
      {logoUrl && <input type="hidden" name="siteLogoUrl" value={logoUrl} />}
      {faviconUrl && <input type="hidden" name="siteFaviconUrl" value={faviconUrl} />}

      {/* 1. Platform Core Status (Maintenance Kill-Switch) */}
      <Card className="rounded-3xl border border-border/60 shadow-lg bg-card/70 backdrop-blur-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-border/50 pb-5">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Статус платформы & Режим техработ</h3>
            <p className="text-xs text-muted-foreground">
              Аварийный выключатель доступа для клиентов при проведении технических обновлений.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-border/60 bg-muted/20">
          <div className="space-y-1">
            <Label htmlFor="maintenanceMode" className="text-sm font-bold text-foreground cursor-pointer">
              Режим технического обслуживания (Maintenance)
            </Label>
            <p className="text-xs text-muted-foreground">
              Клиенты увидят красивую страницу техработ с контактами поддержки. Вход в панель администрирования останется доступен.
            </p>
          </div>
          <Checkbox
            id="maintenanceMode"
            name="maintenanceMode"
            defaultChecked={settings.maintenanceMode}
            className="w-5 h-5 border-2 rounded-md"
          />
        </div>
      </Card>

      {/* 2. Branding & Site Identity */}
      <Card className="rounded-3xl border border-border/60 shadow-lg bg-card/70 backdrop-blur-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-border/50 pb-5">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Брендинг & Идентичность сайта</h3>
            <p className="text-xs text-muted-foreground">
              Название, SEO-описание и графические логотипы платформы.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Название сайта (Brand)</Label>
            <Input
              name="siteName"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="SMMplan"
              className={formState?.errors?.siteName ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {formState?.errors?.siteName && (
              <p className="text-xs font-bold text-destructive mt-1">{formState.errors.siteName[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SEO Описание (Meta Description)</Label>
            <Input
              name="siteDescription"
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              placeholder="Сервис продвижения в социальных сетях №1"
              className={formState?.errors?.siteDescription ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {formState?.errors?.siteDescription && (
              <p className="text-xs font-bold text-destructive mt-1">{formState.errors.siteDescription[0]}</p>
            )}
          </div>
        </div>

        {/* Upload Logo & Favicon */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Логотип платформы</Label>
            <div className="flex items-center gap-5 p-4 rounded-2xl border border-border bg-muted/10">
              <div className="w-16 h-16 rounded-xl border border-border flex items-center justify-center bg-card overflow-hidden relative shadow-inner">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
                ) : (
                  <UploadCloud className="w-6 h-6 text-muted-foreground" />
                )}
                {logoUploading && (
                  <div className="absolute inset-0 bg-background/85 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
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
                  className="inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                >
                  Загрузить лого
                </label>
                <p className="text-[10px] text-muted-foreground">PNG, SVG, WEBP до 2 МБ</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Фавикон браузера</Label>
            <div className="flex items-center gap-5 p-4 rounded-2xl border border-border bg-muted/10">
              <div className="w-16 h-16 rounded-xl border border-border flex items-center justify-center bg-card overflow-hidden relative shadow-inner">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
                ) : (
                  <UploadCloud className="w-6 h-6 text-muted-foreground" />
                )}
                {faviconUploading && (
                  <div className="absolute inset-0 bg-background/85 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
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
                  className="inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                >
                  Загрузить иконку
                </label>
                <p className="text-[10px] text-muted-foreground">ICO, SVG, PNG до 500 КБ</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Contacts, Legal & Live Preview */}
      <Card className="rounded-3xl border border-border/60 shadow-lg bg-card/70 backdrop-blur-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-border/50 pb-5">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Контакты & Юридические реквизиты (152-ФЗ)</h3>
            <p className="text-xs text-muted-foreground">
              Отображаются в подвале сайта, пользовательском соглашении и платежных документах.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Поддержки</Label>
            <Input
              name="contactSupportEmail"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@smmplan.pro"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Telegram Бот (@юзернейм)</Label>
            <Input
              name="contactTelegramBot"
              value={telegramBot}
              onChange={(e) => setTelegramBot(e.target.value)}
              placeholder="smmplan_support_bot"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Название Юр. Лица / ИП</Label>
            <Input
              name="legalCompanyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="ИП Иванов И. И."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ИНН (10 или 12 цифр)</Label>
            <Input
              name="legalCompanyInn"
              value={companyInn}
              onChange={(e) => setCompanyInn(e.target.value)}
              placeholder="770000000000"
              className={formState?.errors?.legalCompanyInn ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {formState?.errors?.legalCompanyInn && (
              <p className="text-xs font-bold text-destructive mt-1">{formState.errors.legalCompanyInn[0]}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ОГРН / ОГРНИП</Label>
            <Input
              name="legalCompanyOgrnip"
              value={companyOgrnip}
              onChange={(e) => setCompanyOgrnip(e.target.value)}
              placeholder="300000000000000"
              className={formState?.errors?.legalCompanyOgrnip ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
          </div>
        </div>

        {/* ── LIVE FOOTER & REQUISITES PREVIEW ── */}
        <div className="p-5 rounded-2xl border border-border/60 bg-muted/20 space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              Предпросмотр подвала сайта (Как это видят клиенты)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/80 text-xs text-muted-foreground space-y-1.5 font-medium">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
              <span className="font-bold text-foreground">© 2026 {siteName || 'SMMplan'}. Все права защищены.</span>
              <span className="text-primary font-bold">Поддержка: {supportEmail || 'support@smmplan.pro'} | @{telegramBot}</span>
            </div>
            <div className="text-[11px] text-muted-foreground/80 pt-1">
              Реквизиты: {companyName || 'ИП Иванов И. И.'} | ИНН: {companyInn || '770000000000'} | ОГРНИП: {companyOgrnip || '300000000000000'}
            </div>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button disabled={isPending} type="submit" className="font-bold uppercase tracking-widest text-xs h-12 px-8 shadow-md">
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Сохранить все настройки
        </Button>
      </div>
    </form>
  );
}
