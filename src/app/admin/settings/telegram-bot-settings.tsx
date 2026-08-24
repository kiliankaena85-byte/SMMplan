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
  getTelegramEnterpriseConfigAction,
  TelegramMenuButton,
  TelegramRatingReasonsConfig,
  TelegramMessageTemplatesConfig,
  DEFAULT_TELEGRAM_MENU_BUTTONS,
  DEFAULT_TELEGRAM_RATING_REASONS,
  DEFAULT_TELEGRAM_MESSAGE_TEMPLATES,
  type TelegramBotDiagnostics 
} from '@/actions/admin/telegram-bot';
import { toast } from 'sonner';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { 
  Loader2, 
  Bot, 
  RotateCcw, 
  Users, 
  Headphones, 
  ShoppingBag, 
  Smartphone, 
  ExternalLink,
  MessageSquare, 
  Zap, 
  Radio,
  Send,
  Star,
  Settings2,
  BarChart3
} from 'lucide-react';
import { SystemSettings } from '@prisma/client';

import { TelegramMenuTab } from './telegram/telegram-menu-tab';
import { TelegramTemplatesTab } from './telegram/telegram-templates-tab';
import { TelegramCsatTab } from './telegram/telegram-csat-tab';
import { TelegramFeedbackListTab } from './telegram/telegram-feedback-list-tab';
import { TelegramLivePreview } from './telegram/telegram-live-preview';

interface TelegramBotSettingsProps {
  settings: SystemSettings;
}

type TelegramSubTab = 'general' | 'menu' | 'templates' | 'csat' | 'feedback';

export function TelegramBotSettings({ settings }: TelegramBotSettingsProps) {
  const [activeTab, setActiveTab] = useState<TelegramSubTab>('general');
  const [diagnostics, setDiagnostics] = useState<TelegramBotDiagnostics | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [isPendingReset, startTransitionReset] = useTransition();
  const [isPendingTestMsg, startTransitionTestMsg] = useTransition();

  // General Settings State
  const [botUsername, setBotUsername] = useState(settings.contactTelegramBot || 'SMMplansapport_bot');
  const [newsChannel, setNewsChannel] = useState(settings.contactTelegramChannel || '@smmplan_news');

  // Enterprise Config States for Live Preview Synchronization
  const [menuButtons, setMenuButtons] = useState<TelegramMenuButton[]>(
    (settings.telegramMenuConfig as unknown as TelegramMenuButton[]) || DEFAULT_TELEGRAM_MENU_BUTTONS
  );
  const [ratingReasons, setRatingReasons] = useState<TelegramRatingReasonsConfig>(
    (settings.telegramRatingReasons as unknown as TelegramRatingReasonsConfig) || DEFAULT_TELEGRAM_RATING_REASONS
  );
  const [templates, setTemplates] = useState<TelegramMessageTemplatesConfig>(
    (settings.telegramTemplates as unknown as TelegramMessageTemplatesConfig) || DEFAULT_TELEGRAM_MESSAGE_TEMPLATES
  );

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

  const loadEnterpriseConfig = async () => {
    try {
      const res = await getTelegramEnterpriseConfigAction();
      if (res.success && res.config) {
        if (res.config.menuButtons) setMenuButtons(res.config.menuButtons);
        if (res.config.ratingReasons) setRatingReasons(res.config.ratingReasons);
        if (res.config.templates) setTemplates(res.config.templates);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchDiagnostics();
    loadEnterpriseConfig();
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
      toast.success('Параметры подключения Telegram-бота успешно сохранены');
      fetchDiagnostics();
    } else if (formState?.error) {
      toast.error(formState.error);
    }
  }, [formState]);

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
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">Telegram Enterprise Control Center</h2>
                {diagnostics?.success ? (
                  diagnostics.daemonRunning ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Online • Long Polling (Демон активен)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Токен валиден • Polling перезапускается
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
                Комплексное управление экосистемой Telegram: кастомизация кнопок меню, шаблоны автоответов, причины оценок (1–5 ⭐) и журнал отзывов CSAT.
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

      {/* ── 2. INNER NAVIGATION TABS ── */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-muted/30 border border-border/60">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'bg-card text-foreground shadow-sm border border-border/80'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>1. Подключение & Статус</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'menu'
              ? 'bg-card text-foreground shadow-sm border border-border/80'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-primary" />
          <span>2. Кнопки Меню</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-card text-foreground shadow-sm border border-border/80'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
          <span>3. Шаблоны Ответов</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('csat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'csat'
              ? 'bg-card text-foreground shadow-sm border border-border/80'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>4. Причины Оценок</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'feedback'
              ? 'bg-card text-foreground shadow-sm border border-border/80'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          <span>5. Журнал Отзывов & CSAT</span>
        </button>
      </div>

      {/* ── 3. TWO-COLUMN WORKSPACE: TAB CONTENT (7 cols) + LIVE SIMULATOR (5 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* TAB 1: GENERAL SETTINGS */}
          {activeTab === 'general' && (
            <form action={formAction} className="space-y-6">
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
                    <option value="webhook">Webhook (HTTP POST /api/webhooks/telegram)</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    По умолчанию используется отказоустойчивый Long Polling.
                  </p>
                </div>
              </Card>

              {/* Card: Test Alert Message */}
              <Card className="rounded-3xl border border-border/80 shadow-sm bg-card p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
                  <span className="p-1 px-2.5 bg-amber-500/10 text-amber-400 rounded-md text-[10px] font-bold">TEST</span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Отправка тестового сообщения</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Chat ID получателя</Label>
                    <Input
                      name="testChatId"
                      placeholder="123456789"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Текст сообщения</Label>
                    <Input
                      name="testMessage"
                      defaultValue="Проверка доставки уведомлений из SMMpanel 1.0."
                      className="text-xs"
                    />
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
                  Сохранить параметры подключения
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: MENU BUILDER */}
          {activeTab === 'menu' && (
            <TelegramMenuTab
              initialButtons={menuButtons}
              onButtonsChange={setMenuButtons}
            />
          )}

          {/* TAB 3: MESSAGE TEMPLATES */}
          {activeTab === 'templates' && (
            <TelegramTemplatesTab
              initialTemplates={templates}
              onTemplatesChange={setTemplates}
            />
          )}

          {/* TAB 4: CSAT RATING REASONS */}
          {activeTab === 'csat' && (
            <TelegramCsatTab
              initialReasons={ratingReasons}
              onReasonsChange={setRatingReasons}
            />
          )}

          {/* TAB 5: FEEDBACK CRM */}
          {activeTab === 'feedback' && (
            <TelegramFeedbackListTab />
          )}
        </div>

        {/* Right Column: Live Interactive iPhone Dark Simulator (5 cols) */}
        <div className="lg:col-span-5 sticky top-6">
          <TelegramLivePreview
            botUsername={botUsername}
            siteName={settings.siteName || 'SMMplan'}
            menuButtons={menuButtons}
            ratingReasons={ratingReasons}
            templates={templates}
          />
        </div>
      </div>
    </div>
  );
}
