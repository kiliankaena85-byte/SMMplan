'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { updateGlobalSettings } from '@/actions/admin/settings';
import { 
  getTelegramBotDiagnosticsAction, 
  resetTelegramWebhookAction, 
  sendTelegramTestAlertAction,
  type TelegramBotDiagnostics 
} from '@/actions/admin/telegram-bot';
import { toast } from 'sonner';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { 
  Loader2, 
  Bot, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Send, 
  RotateCcw, 
  Users, 
  Headphones, 
  ShoppingBag, 
  Smartphone, 
  ExternalLink,
  MessageSquare,
  Zap,
  Info,
  Radio
} from 'lucide-react';
import { SystemSettings } from '@prisma/client';

interface TelegramBotSettingsProps {
  settings: SystemSettings;
}

export function TelegramBotSettings({ settings }: TelegramBotSettingsProps) {
  const [diagnostics, setDiagnostics] = useState<TelegramBotDiagnostics | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [isPendingReset, startTransitionReset] = useTransition();
  const [isPendingTestMsg, startTransitionTestMsg] = useTransition();

  // Content Preview States
  const [botUsername, setBotUsername] = useState(settings.contactTelegramBot || 'SMMplansapport_bot');
  const [newsChannel, setNewsChannel] = useState(settings.contactTelegramChannel || '@smmplan_news');
  const [welcomeText, setWelcomeText] = useState(
    settings.welcomeMessage ||
    '👋 <b>Добро пожаловать в {siteName}!</b>\n\nПлатформа автоматического продвижения в социальных сетях.\n\n💰 Ваш баланс: <b>{balance} ₽</b>\n\nВыберите действие в меню ниже:'
  );
  const [testChatId, setTestChatId] = useState('');
  const [testMsgText, setTestMsgText] = useState('Проверка доставки уведомлений из панели управления SMMpanel 1.0.');

  const fetchDiagnostics = async () => {
    setLoadingDiag(true);
    try {
      const res = await getTelegramBotDiagnosticsAction();
      setDiagnostics(res);
      if (res.success && res.bot) {
        toast.success(`Бот @${res.bot.username} онлайн (Ping: ${res.pingMs}ms)`);
      } else if (!res.success && res.error) {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoadingDiag(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const handleResetWebhook = () => {
    startTransitionReset(async () => {
      try {
        const res = await resetTelegramWebhookAction();
        if (res.success) {
          toast.success(res.message);
          fetchDiagnostics();
        } else {
          toast.error(res.error || 'Ошибка сброса вебхука');
        }
      } catch (err) {
        toast.error(String(err));
      }
    });
  };

  const handleSendTestMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransitionTestMsg(async () => {
      try {
        const res = await sendTelegramTestAlertAction(formData);
        if (res.success) {
          toast.success(res.message);
        } else {
          toast.error(res.error || 'Ошибка отправки');
        }
      } catch (err) {
        toast.error(String(err));
      }
    });
  };

  const [state, formAction, isPendingSave] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      try {
        const res = await updateGlobalSettings(formData);
        if (res && typeof res === 'object' && 'success' in res && !res.success) {
          return res;
        }
        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return { success: false, error: errorMsg || 'Ошибка при сохранении настроек' };
      }
    },
    null
  );

  const formState = state as { success?: boolean; error?: string; errors?: Record<string, string[]> } | null;

  useEffect(() => {
    if (formState?.success) {
      toast.success('Настройки Telegram-бота успешно сохранены в базе данных');
      fetchDiagnostics();
    } else if (formState?.error) {
      toast.error(formState.error);
    }
  }, [formState]);

  // Live formatted text for simulator
  const renderSimulatedText = () => {
    return welcomeText
      .replace(/{siteName}/g, settings.siteName || 'SMMplan')
      .replace(/{userName}/g, 'Артём')
      .replace(/{balance}/g, '1 500.00');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── 1. HERO STATUS & DIAGNOSTICS BANNER ── */}
      <Card className="rounded-3xl border border-border/80 shadow-lg bg-card/80 backdrop-blur-xl p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border/60">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
              <Bot className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">Telegram Bot Control Center</h2>
                {diagnostics?.success ? (
                  diagnostics.daemonRunning ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Online • Long Polling (Демон активен)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Токен валиден • Процесс Polling остановлен
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    {diagnostics ? 'Токен не настроен / Ошибка' : 'Проверка статуса...'}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Глобальный узел интеграции с Telegram: каталог услуг, прием тикетов поддержки, Smart Bind слияние аккаунтов и CSAT-оценки.
              </p>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              type="button"
              intent="secondary"
              size="sm"
              onClick={fetchDiagnostics}
              disabled={loadingDiag}
              className="font-bold text-xs h-9 px-3.5 cursor-pointer gap-1.5"
            >
              {loadingDiag ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-blue-400" />}
              <span>Тест API</span>
            </Button>

            <Button
              type="button"
              intent="outline"
              size="sm"
              onClick={handleResetWebhook}
              disabled={isPendingReset}
              className="font-bold text-xs h-9 px-3.5 cursor-pointer gap-1.5 border-border hover:bg-muted/40"
              title="Удаляет вебхуки и сбрасывает подвисшие апдейты в Telegram"
            >
              {isPendingReset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 text-amber-400" />}
              <span>Сбросить очередь</span>
            </Button>

            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              <span>Открыть @{botUsername}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Diagnostic Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Bot Latency (Ping)
            </span>
            <p className="text-base font-extrabold text-foreground font-mono">
              {diagnostics?.pingMs !== undefined ? `${diagnostics.pingMs} ms` : '—'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Привязано аккаунтов
            </span>
            <p className="text-base font-extrabold text-foreground font-mono">
              {diagnostics?.stats?.linkedUsersCount ?? 0}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Headphones className="w-3.5 h-3.5 text-emerald-400" />
              Тикетов из Telegram
            </span>
            <p className="text-base font-extrabold text-foreground font-mono">
              {diagnostics?.stats?.telegramTicketsCount ?? 0}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
              Всего заказов в БД
            </span>
            <p className="text-base font-extrabold text-foreground font-mono">
              {diagnostics?.stats?.totalOrdersCount ?? 0}
            </p>
          </div>
        </div>
      </Card>

      {/* ── 2. MAIN CONFIGURATION & LIVE SIMULATOR TWO-COLUMN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form action={formAction} className="space-y-6">
            {/* Card: Connection Secrets & Identifiers */}
            <Card className="rounded-3xl border border-border/80 shadow-sm bg-card p-6 space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
                <span className="p-1 px-2.5 bg-primary/10 text-primary rounded-md text-[10px] font-bold">AUTH</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Идентификаторы и Секреты</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Юзернейм бота (без @)
                  </Label>
                  <Input
                    name="contactTelegramBot"
                    value={botUsername}
                    onChange={(e) => setBotUsername(e.target.value)}
                    placeholder="SMMplansapport_bot"
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Основной бот: <span className="font-bold text-foreground font-mono">@{botUsername}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Официальный канал (@канал)
                  </Label>
                  <Input
                    name="contactTelegramChannel"
                    value={newsChannel}
                    onChange={(e) => setNewsChannel(e.target.value)}
                    placeholder="@smmplan_news"
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Ссылка на новости в меню профиля
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Токен Telegram Бота (TELEGRAM_BOT_TOKEN)
                  </Label>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    AES-256-GCM Vault
                  </span>
                </div>
                <Input
                  name="telegramBotToken"
                  type="password"
                  placeholder={settings.telegramBotToken ? '••••••••••••••••' : 'Вставьте токен от @BotFather (или оставьте пустым для .env)'}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Токен надежно шифруется в базе данных и имеет приоритет над переменной <code>.env</code>.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Режим работы бота
                </Label>
                <select
                  name="telegramBotMode"
                  defaultValue={settings.telegramBotMode || 'polling'}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="polling">Long Polling (Автономный демон / Docker сервис bot)</option>
                  <option value="webhook">Webhook (HTTP POST /api/support/telegram)</option>
                </select>
                <p className="text-[10px] text-muted-foreground">
                  По умолчанию используется Long Polling.
                </p>
              </div>
            </Card>

            {/* Card: Message Templates & Content Engine */}
            <Card className="rounded-3xl border border-border/80 shadow-sm bg-card p-6 space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
                <span className="p-1 px-2.5 bg-blue-500/10 text-blue-400 rounded-md text-[10px] font-bold">MSG</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Приветствие и Шаблоны</h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Приветственное сообщение (/start)
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">HTML Format</span>
                </div>
                <Textarea
                  name="welcomeMessage"
                  value={welcomeText}
                  onChange={(e) => setWelcomeText(e.target.value)}
                  rows={5}
                  className="font-mono text-xs leading-relaxed"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground">Переменные:</span>
                  {['{siteName}', '{userName}', '{balance}'].map((placeholder) => (
                    <button
                      key={placeholder}
                      type="button"
                      onClick={() => setWelcomeText(prev => `${prev} ${placeholder}`)}
                      className="text-[10px] font-mono font-bold bg-muted/60 hover:bg-muted text-primary px-1.5 py-0.5 rounded border border-border transition-colors cursor-pointer"
                    >
                      {placeholder}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Card: Advanced Engine Flags */}
            <Card className="rounded-3xl border border-border/80 shadow-sm bg-card p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
                <span className="p-1 px-2.5 bg-emerald-500/10 text-emerald-400 rounded-md text-[10px] font-bold">ENGINE</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Продвинутые функции экосистемы</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Smart Bind Protocol 2.0
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Одноразовые токены <code>/start tg_bind_...</code> для мгновенного объединения балансов и истории без SMS.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Сквозная поддержка (Desk)
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Сообщения, голосовые заметки и скриншоты клиентов из Telegram мгновенно попадают в тикеты операторов.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    CSAT Рейтинг (1-5 ⭐)
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Интерактивные кнопки оценки работы саппорта при закрытии тикета с авто-тегом <code>CSAT_5_STAR</code>.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Розничный прайс (₽ / шт)
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Каталог услуг в боте строго соблюдает единую ценовую политику: розничные цены за 1 единицу.
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isPendingSave}
                className="font-bold uppercase tracking-widest text-xs h-11 px-6 shadow-lg shadow-primary/20 cursor-pointer"
              >
                {isPendingSave && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Сохранить параметры бота
              </Button>
            </div>
          </form>

          {/* Card: Test Message Dispatcher */}
          <Card className="rounded-3xl border border-border/80 shadow-sm bg-card p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
              <span className="p-1 px-2.5 bg-purple-500/10 text-purple-400 rounded-md text-[10px] font-bold">TEST</span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Отправка тестового сообщения</h3>
            </div>

            <form onSubmit={handleSendTestMessage} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Telegram Chat ID
                  </Label>
                  <Input
                    name="chatId"
                    value={testChatId}
                    onChange={(e) => setTestChatId(e.target.value)}
                    placeholder="Например: 123456789"
                    className="font-mono text-xs"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">Ваш числовой ID в Telegram</p>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Текст сообщения
                  </Label>
                  <Input
                    name="message"
                    value={testMsgText}
                    onChange={(e) => setTestMsgText(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  intent="secondary"
                  size="sm"
                  disabled={isPendingTestMsg}
                  className="font-bold text-xs h-9 gap-1.5 cursor-pointer"
                >
                  {isPendingTestMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-primary" />}
                  <span>Отправить тестовый алерт</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Live Telegram Mobile Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-primary" />
              Live Telegram Simulator
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">iOS Dark Style</span>
          </div>

          {/* Smartphone Bezel Mock */}
          <div className="w-full max-w-[380px] mx-auto rounded-[40px] border-[6px] border-zinc-800 bg-zinc-950 p-3 shadow-2xl relative overflow-hidden">
            {/* Top Notch */}
            <div className="w-28 h-4 bg-zinc-800 rounded-full mx-auto mb-3" />

            {/* Telegram Header */}
            <div className="bg-zinc-900/90 rounded-2xl p-3 flex items-center justify-between border border-zinc-800/80 mb-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                  S
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">{settings.siteName || 'SMMplan'}</h4>
                  <p className="text-[10px] text-blue-400 font-mono">бот</p>
                </div>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">12:00</span>
            </div>

            {/* Chat Area */}
            <div className="space-y-3 min-h-[320px] p-2 flex flex-col justify-end">
              {/* User Command */}
              <div className="self-end bg-blue-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2 text-xs max-w-[80%] shadow-md">
                /start
              </div>

              {/* Bot Welcome Message */}
              <div className="self-start bg-zinc-900 text-zinc-100 rounded-2xl rounded-bl-sm p-3.5 text-xs max-w-[95%] border border-zinc-800/90 shadow-md space-y-2">
                <div 
                  className="leading-relaxed whitespace-pre-wrap font-sans text-zinc-200"
                  dangerouslySetInnerHTML={{ __html: renderSimulatedText() }}
                />
                <div className="text-[9px] text-zinc-500 text-right font-mono">12:00 ✓✓</div>
              </div>
            </div>

            {/* Telegram Custom Keyboard */}
            <div className="pt-3 border-t border-zinc-800/80 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="p-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-white text-[11px] font-bold text-center border border-zinc-700/60 shadow-xs cursor-default">
                  🛍 Каталог услуг
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-white text-[11px] font-bold text-center border border-zinc-700/60 shadow-xs cursor-default">
                  📦 Мои заказы
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="p-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-white text-[11px] font-bold text-center border border-zinc-700/60 shadow-xs cursor-default">
                  💰 Пополнить
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-white text-[11px] font-bold text-center border border-zinc-700/60 shadow-xs cursor-default">
                  👤 Профиль
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="p-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-white text-[11px] font-bold text-center border border-zinc-700/60 shadow-xs cursor-default">
                  🆘 Поддержка
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-white text-[11px] font-bold text-center border border-zinc-700/60 shadow-xs cursor-default">
                  👥 Рефералы
                </div>
              </div>
            </div>

            {/* Bottom Home Indicator */}
            <div className="w-32 h-1 bg-zinc-700 rounded-full mx-auto mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
