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
import { SystemSettings } from '@prisma/client';

interface GeneralSettingsProps {
  settings: SystemSettings;
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
  const [maintenance, setMaintenance] = useState<boolean>(Boolean(settings.maintenanceMode));
  const [siteName, setSiteName] = useState<string>(settings.siteName || 'SMMplan');
  const [siteDescription, setSiteDescription] = useState<string>(settings.siteDescription || '');
  const [supportEmail, setSupportEmail] = useState<string>(settings.contactSupportEmail || 'support@smmplan.pro');
  const [telegramBot, setTelegramBot] = useState<string>(settings.contactTelegramBot || 'SMMplansapport_bot');
  const [companyName, setCompanyName] = useState<string>(settings.legalCompanyName || 'ИП Иванов И. И.');
  const [companyInn, setCompanyInn] = useState<string>(settings.legalCompanyInn || '770000000000');
  const [companyOgrnip, setCompanyOgrnip] = useState<string>(settings.legalCompanyOgrnip || '300000000000000');

  // Bot test states
  const [isTestingBot, setIsTestingBot] = useState(false);
  interface BotTestResult {
    success: boolean;
    username?: string;
    name?: string;
    botId?: string | number;
    bot?: unknown;
    pingMs?: number;
    error?: string;
  }
  const [botTestResult, setBotTestResult] = useState<BotTestResult | null>(null);

  const handleTestBot = async () => {
    setIsTestingBot(true);
    setBotTestResult(null);
    try {
      const res = await fetch('/api/admin/test-telegram-bot', { cache: 'no-store' });
      const data = await res.json();
      setBotTestResult(data);
      if (data.success) {
        toast.success(`Бот @${data.username} успешно отвечает (Ping: ${data.pingMs}ms)`);
      } else {
        toast.error(`Ошибка связи: ${data.error}`);
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsTestingBot(false);
    }
  };

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
          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-xs font-bold ${maintenance ? 'text-rose-500 font-extrabold' : 'text-muted-foreground'}`}>
              {maintenance ? '🔴 Включен' : '⚪ Выключен'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="maintenanceMode"
                name="maintenanceMode"
                checked={maintenance}
                onChange={(e) => setMaintenance(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6.5 bg-muted-foreground/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-background after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>
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

      {/* 3. Telegram Support Bot Configuration & Live Diagnostics */}
      <Card className="rounded-3xl border border-border/60 shadow-lg bg-card/70 backdrop-blur-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Telegram Бот Поддержки</h3>
              <p className="text-xs text-muted-foreground">
                Прием сообщений от клиентов из Telegram и отправка ответов операторов из единой админки.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleTestBot}
            disabled={isTestingBot}
            className="text-xs font-bold gap-2 cursor-pointer shrink-0 h-9 px-3.5 border border-border bg-muted/40 hover:bg-muted text-foreground"
          >
            {isTestingBot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
            <span>Проверить статус API</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Юзернейм бота (без @)
            </Label>
            <Input
              name="contactTelegramBot"
              value={telegramBot}
              onChange={(e) => setTelegramBot(e.target.value)}
              placeholder="SMMplansapport_bot"
            />
            <p className="text-[11px] text-muted-foreground">
              Клиенты на сайте видят ссылку <span className="font-mono text-primary font-bold">t.me/{telegramBot}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Статус подключения бота
            </Label>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-foreground">@{telegramBot}</span>
              </div>
              <a
                href={`https://t.me/${telegramBot}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-bold text-[11px] flex items-center gap-1"
              >
                Открыть в Telegram ↗
              </a>
            </div>
          </div>
        </div>

        {/* Live Diagnostics Card */}
        {botTestResult && (
          <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
            botTestResult.success 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span>{botTestResult.success ? '✅ Telegram Bot API: Связь установлена успешно!' : '❌ Ошибка проверки Telegram Bot:'}</span>
              {botTestResult.pingMs && <span className="font-mono text-[11px]">Ping: {botTestResult.pingMs}ms</span>}
            </div>
            {botTestResult.success && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-foreground">
                <div>Имя: <span className="font-bold">{botTestResult.name || '—'}</span></div>
                <div>Username: <span className="font-bold">{botTestResult.username ? `@${botTestResult.username}` : '—'}</span></div>
                <div>Bot ID: <span className="font-bold">{String(botTestResult.botId || '—')}</span></div>
              </div>
            )}
            {!botTestResult.success && (
              <p className="text-[11px] font-mono">{botTestResult.error}</p>
            )}
          </div>
        )}
      </Card>

      {/* 4. Contacts & Legal Requisites */}
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
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Telegram Канал новостей (@канал)</Label>
            <Input
              name="contactTelegramChannel"
              defaultValue={settings.contactTelegramChannel || 'smmplan_news'}
              placeholder="smmplan_news"
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
