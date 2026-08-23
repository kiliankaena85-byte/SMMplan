'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  updateGlobalSettings, 
  generateInboundSecretAction,
  testSmtpConnectionAction,
  testGeminiAiConnectionAction,
  testTelegramBotConnectionAction,
} from '@/actions/admin/settings';
import { toast } from 'sonner';
import { useActionState, useEffect, useState } from 'react';
import { Loader2, Eye, EyeOff, Key, Sparkles, Bot, ShieldCheck, Radio, CheckCircle, AlertCircle } from 'lucide-react';
import { SystemSettings } from '@prisma/client';

interface IntegrationsSettingsProps {
  settings: SystemSettings;
}

export function IntegrationsSettings({ settings }: IntegrationsSettingsProps) {
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await testSmtpConnectionAction();
      const message = 'message' in res ? res.message : res.error;
      setSmtpTestResult({ success: res.success, message });
      if (res.success) {
        toast.success(message);
      } else {
        toast.error(message);
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await testGeminiAiConnectionAction();
      const message = 'message' in res ? res.message : res.error;
      setGeminiTestResult({ success: res.success, message });
      if (res.success) {
        toast.success(message);
      } else {
        toast.error(message);
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setTestingGemini(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramTestResult(null);
    try {
      const res = await testTelegramBotConnectionAction();
      const message = 'message' in res ? res.message : res.error;
      setTelegramTestResult({ success: res.success, message });
      if (res.success) {
        toast.success(message);
      } else {
        toast.error(message);
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setTestingTelegram(false);
    }
  };
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
        return { success: false, error: errorMsg || 'Ошибка при обновлении интеграций' };
      }
    },
    null
  );

  const formState = state as { success?: boolean; error?: string; errors?: Record<string, string[]> } | null;

  useEffect(() => {
    if (formState?.success) {
      toast.success('Настройки интеграций обновлены');
    } else if (formState?.error) {
      toast.error(formState.error);
    } else if (formState?.errors) {
      toast.error('Ошибка валидации данных. Проверьте правильность введенных ключей и доменов.');
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

  // Webhook Secret States
  const [inboundSecret, setInboundSecret] = React.useState(settings.inboundEmailWebhookSecret || '');
  const [showSecret, setShowSecret] = React.useState(false);
  const [generatingSecret, setGeneratingSecret] = React.useState(false);

  const handleGenerateSecret = async () => {
    setGeneratingSecret(true);
    try {
      const res = await generateInboundSecretAction();
      if (res && res.success && res.secret) {
        setInboundSecret(res.secret);
        setShowSecret(true); // Automatically show secret so admin can copy it immediately
        toast.success('Секретный ключ вебхука входящей почты сгенерирован!');
      } else {
        throw new Error('Не удалось сгенерировать секрет');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(errorMsg || 'Ошибка генерации секрета');
    } finally {
      setGeneratingSecret(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Telegram */}
      <Card className="rounded-2xl border-border shadow-sm bg-primary/5 backdrop-blur-xl">
        <div className="p-5 sm:p-8 space-y-6">
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
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  intent="secondary"
                  size="sm"
                  onClick={handleTestTelegram}
                  disabled={testingTelegram}
                  className="font-bold uppercase tracking-widest text-[11px] h-9 cursor-pointer"
                >
                  {testingTelegram ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Bot className="w-3.5 h-3.5 mr-1.5" />}
                  Тест Telegram API
                </Button>
                {telegramTestResult && (
                  <span className={`text-xs font-semibold ${telegramTestResult.success ? 'text-success' : 'text-destructive'}`}>
                    {telegramTestResult.message}
                  </span>
                )}
              </div>
              <Button disabled={isPending} type="submit" intent="outline" className="font-bold uppercase tracking-widest text-xs h-9 cursor-pointer">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Обновить контент бота
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* Payments */}
      <Card className="rounded-2xl border-border shadow-sm bg-card backdrop-blur-xl">
        <div className="p-5 sm:p-8 space-y-8">
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
                <div className={`space-y-4 p-5 rounded-xl border-2 transition-all ${settings.isTestMode ? 'border-warning/50 bg-warning/5 shadow-sm' : 'border-border bg-muted/30 opacity-60'}`}>
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
                <div className={`space-y-4 p-5 rounded-xl border-2 transition-all ${!settings.isTestMode ? 'border-success/50 bg-success/5 shadow-sm' : 'border-border bg-muted/30 opacity-60'}`}>
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

            {/* Robokassa */}
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-1">Robokassa (Fiat)</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Идентификатор магазина (Merchant Login)</Label>
                  <Input
                    name="robokassaLogin"
                    defaultValue={settings.robokassaLogin || ''}
                    placeholder="Идентификатор магазина"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Пароль 1 (для инициализации оплаты)</Label>
                  <Input
                    name="robokassaPassword"
                    type="password"
                    placeholder={settings.robokassaPassword ? '••••••••••••••••' : 'Не настроено'}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Пароль 2 (для Webhook / ResultURL)</Label>
                  <Input
                    name="robokassaWebhookPassword"
                    type="password"
                    placeholder={settings.robokassaWebhookPassword ? '••••••••••••••••' : 'Не настроено'}
                  />
                </div>
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
        <div className="p-5 sm:p-8 space-y-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-info/20 text-info rounded-md text-[10px] font-bold">MAIL</span>
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
                    className={formState?.errors?.smtpPort ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {formState?.errors?.smtpPort && (
                    <p className="text-xs font-bold text-destructive mt-1">{formState.errors.smtpPort[0]}</p>
                  )}
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

            {/* Inbound Mail webhooks */}
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-1">Прием писем (Inbound)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Домен (для тикетов)</Label>
                  <Input
                    name="supportEmailDomain"
                    defaultValue={settings.supportEmailDomain || ''}
                    placeholder="smmplan.pro"
                    className={formState?.errors?.supportEmailDomain ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {formState?.errors?.supportEmailDomain && (
                    <p className="text-xs font-bold text-destructive mt-1">{formState.errors.supportEmailDomain[0]}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Используется для генерации адреса <code>support+ticketId@домен</code>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Секретный ключ вебхука</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        name="inboundEmailWebhookSecret"
                        type={showSecret ? 'text' : 'password'}
                        value={inboundSecret}
                        onChange={(e) => setInboundSecret(e.target.value)}
                        placeholder="Не настроено"
                        className="pr-10 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      disabled={generatingSecret}
                      onClick={handleGenerateSecret}
                      intent="outline"
                      className="font-bold text-xs gap-1"
                    >
                      {generatingSecret ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Key className="w-3.5 h-3.5" />
                      )}
                      Сгенерировать
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Используется для валидации входящих вебхуков писем от почтового шлюза.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  intent="secondary"
                  size="sm"
                  onClick={handleTestSmtp}
                  disabled={testingSmtp}
                  className="font-bold uppercase tracking-widest text-[11px] h-9 cursor-pointer"
                >
                  {testingSmtp ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 mr-1.5" />}
                  Тест SMTP соединения
                </Button>
                {smtpTestResult && (
                  <span className={`text-xs font-semibold ${smtpTestResult.success ? 'text-success' : 'text-destructive'}`}>
                    {smtpTestResult.message}
                  </span>
                )}
              </div>
              <Button disabled={isPending} type="submit" className="font-bold uppercase tracking-widest text-xs h-10 shadow-md cursor-pointer">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Сохранить настройки почты
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* ── SECTION 4: GOOGLE GEMINI AI & PROXY ── */}
      <Card className="p-6 border-border/60 shadow-sm bg-card/40 backdrop-blur-xs relative overflow-hidden">
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Google Gemini AI & Прокси для РФ</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  gemini-3-flash
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Глобальный пул ключей для ИИ-рерайта каталога и генерации ответов техподдержки с авто-ротацией и проксированием Clash Verge.
              </p>
            </div>
          </div>

          <form action={formAction} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* API Keys Pool */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Глобальные API-ключи Gemini (через запятую)
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">AES-256 Encrypted</span>
                </div>
                <Textarea
                  name="geminiApiKeys"
                  rows={3}
                  placeholder={settings.geminiApiKeys ? '•••••••••••••••• (Ключи сохранены в зашифрованном виде)' : 'AIzaSyKey1..., AIzaSyKey2...'}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Система автоматически распределяет нагрузку между ключами (Round-Robin) и переключается при исчерпании лимитов (429).
                </p>
              </div>

              {/* Proxy Settings */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Прокси для работы в РФ (Clash Verge / HTTP / SOCKS5)
                </Label>
                <Input
                  name="geminiProxy"
                  defaultValue={settings.geminiProxy || ''}
                  placeholder="http://proxy.smmplan.pro:7890"
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Для внешнего защищенного прокси укажите: <code>http://proxy-host:port</code> или <code>http://user:pass@host:port</code>.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-card border border-border/80 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                <p className="font-semibold text-foreground">Персональные ключи сотрудников:</p>
                <p>
                  Каждый сотрудник (оператор, менеджер) может подключить свой личный API-ключ во вкладке <strong>«Команда»</strong>.
                  При генерации ответов система сначала расходует личный ключ сотрудника, а при его отсутствии использует этот общий пул.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  intent="secondary"
                  size="sm"
                  onClick={handleTestGemini}
                  disabled={testingGemini}
                  className="font-bold uppercase tracking-widest text-[11px] h-9 cursor-pointer"
                >
                  {testingGemini ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                  Тест Gemini AI
                </Button>
                {geminiTestResult && (
                  <span className={`text-xs font-semibold ${geminiTestResult.success ? 'text-success' : 'text-destructive'}`}>
                    {geminiTestResult.message}
                  </span>
                )}
              </div>
              <Button disabled={isPending} type="submit" className="font-bold uppercase tracking-widest text-xs h-10 shadow-md cursor-pointer">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Сохранить настройки Gemini
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
