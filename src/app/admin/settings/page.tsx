import { settingsService } from '@/services/admin/settings.service';
import { db } from '@/lib/db';
import { Settings, Globe, Link as LinkIcon, Users, History, MessageSquare, Database, Bot, Server } from 'lucide-react';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { SYSTEM_TABS, ONBOARDING_CONFIGS } from '@/components/admin/navigation-data';
import { TestModePanel } from '@/components/admin/test-mode-panel';
import { GeneralSettings } from './general-settings';
import { CatalogSettings } from './catalog-settings';
import { IntegrationsSettings } from './integrations-settings';
import { TelegramBotSettings } from './telegram-bot-settings';
import dynamicImport from 'next/dynamic';

const TeamManagement = dynamicImport(() => import('./team-management').then(m => m.TeamManagement), {
  loading: () => <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Загрузка панели команды...</div>
});
const ProviderProxyManager = dynamicImport(() => import('./provider-proxy-manager').then(m => m.ProviderProxyManager), {
  loading: () => <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Загрузка прокси провайдеров...</div>
});
const SupportTemplatesSettings = dynamicImport(() => import('./support-templates').then(m => m.SupportTemplatesSettings), {
  loading: () => <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Загрузка шаблонов ответов...</div>
});
import { DataTable } from '@/components/ui/data-table';
import { columns as auditColumns } from './audit-columns';
import Link from 'next/link';
import { enforceSectionAccess } from '@/lib/server/rbac';
import { SettingsProvider } from '@/lib/settings';
import { SystemHealthOverview } from '@/components/admin/settings/system-health-overview';
import { AdminAuditLog, StaffRole, StaffPermission, SupportTemplate, SystemSettings, Provider } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  // 1. RBAC Guard: Evaluate access ceiling first
  const admin = await enforceSectionAccess('settings');
  
  const params = await searchParams;
  const activeTab = params.tab || 'system';
  const searchQuery = params.q || '';

  // 2. Tab-Scoped Optimized Queries: Fetch settings + conditionally only the active tab data
  let settings: SystemSettings;
  let staffUsers: Awaited<ReturnType<typeof settingsService.listStaffUsers>> = [];
  let users: Awaited<ReturnType<typeof settingsService.listUsers>> = [];
  let recentLogs: AdminAuditLog[] = [];
  let staffRoles: (StaffRole & { permissions: StaffPermission[] })[] = [];
  let templates: SupportTemplate[] = [];
  let providers: Provider[] = [];

  try {
    const settingsPromise = settingsService.getSystemSettings();

    if (activeTab === 'team') {
      const [s, stUsers, uList, roles] = await Promise.all([
        settingsPromise,
        settingsService.listStaffUsers(),
        searchQuery ? settingsService.listUsers(searchQuery) : Promise.resolve([]),
        db.staffRole.findMany({ include: { permissions: true }, orderBy: { name: 'asc' } }),
      ]);
      settings = s;
      staffUsers = stUsers;
      users = uList;
      staffRoles = roles;
    } else if (activeTab === 'proxy') {
      const [s, pList] = await Promise.all([
        settingsPromise,
        db.provider.findMany({ orderBy: { name: 'asc' } }),
      ]);
      settings = s;
      providers = pList;
    } else if (activeTab === 'templates') {
      const [s, tList] = await Promise.all([
        settingsPromise,
        db.supportTemplate.findMany({ orderBy: { sort: 'asc' } }),
      ]);
      settings = s;
      templates = tList;
    } else if (activeTab === 'audit') {
      const [s, logs] = await Promise.all([
        settingsPromise,
        db.adminAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      ]);
      settings = s;
      recentLogs = logs;
    } else {
      // Default tabs: 'system', 'catalog', 'integrations', 'telegram' only need settings
      settings = await settingsPromise;
    }
  } catch (error) {
    console.error('[AdminSettingsPage] Failed to load settings data:', error);
    throw new Error('Не удалось загрузить данные настроек. Попробуйте обновить страницу.');
  }

  // 3. Security Sanitize: Mask all 11 critical secrets before passing to client components
  const sanitizedSettings = {
    ...settings,
    telegramBotToken: settings.telegramBotToken ? '••••••••••••••••' : null,
    yookassaSecretKey: settings.yookassaSecretKey ? '••••••••••••••••' : null,
    yookassaWebhookSecret: settings.yookassaWebhookSecret ? '••••••••••••••••' : null,
    yookassaTestSecretKey: settings.yookassaTestSecretKey ? '••••••••••••••••' : null,
    cryptoBotToken: settings.cryptoBotToken ? '••••••••••••••••' : null,
    resendApiKey: settings.resendApiKey ? '••••••••••••••••' : null,
    smtpPassword: settings.smtpPassword ? '••••••••••••••••' : null,
    inboundEmailWebhookSecret: settings.inboundEmailWebhookSecret ? '••••••••••••••••' : null,
    robokassaPassword: settings.robokassaPassword ? '••••••••••••••••' : null,
    robokassaWebhookPassword: settings.robokassaWebhookPassword ? '••••••••••••••••' : null,
    geminiApiKeys: settings.geminiApiKeys ? '••••••••••••••••' : null,
  };

  const regularUsers = users.filter((u) => u.id !== admin.id);

  const tabs = [
    { id: 'system', label: 'Система', icon: Globe },
    { id: 'catalog', label: 'Каталог', icon: Database },
    { id: 'integrations', label: 'Интеграции', icon: LinkIcon },
    { id: 'telegram', label: 'Telegram Бот', icon: Bot },
    { id: 'proxy', label: 'Прокси провайдеров', icon: Server },
    { id: 'team', label: 'Команда', icon: Users },
    { id: 'templates', label: 'Шаблоны', icon: MessageSquare },
    { id: 'audit', label: 'Аудит', icon: History },
  ];

  return (
    <div className="space-y-6 w-full min-w-0 animate-in fade-in duration-300 ease-out sm:px-2 md:px-0 min-h-full pb-10">
      <AdminTabbedHeader
        icon={Settings}
        title="Настройки системы"
        description="Глобальная конфигурация платформы, безопасность и персонал."
        tabs={SYSTEM_TABS}
        onboardingKey="settings"
        onboarding={ONBOARDING_CONFIGS.settings}
      />

      {/* ── Dynamic System Health Pulse & Quick Actions ── */}
      <SystemHealthOverview settings={sanitizedSettings} />

      {/* ── Custom URL-based Tabs ── */}
      <div className="flex gap-1 border-b border-border overflow-x-auto w-full min-w-0 no-scrollbar snap-x snap-mandatory">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`?tab=${t.id}`}
            className={`flex items-center gap-2 py-3 px-5 transition-all -mb-px text-[11px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap shrink-0 snap-start ${
              activeTab === t.id
                ? 'border-primary text-primary bg-card rounded-t-xl shadow-xs'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </Link>
        ))}
      </div>

      <div className="space-y-8 mt-4">
        {/* ── TAB 1: SYSTEM ── */}
        {activeTab === 'system' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <TestModePanel initialIsTestMode={sanitizedSettings.isTestMode} isTestEnvironment={SettingsProvider.isTestEnvironment()} />
            <GeneralSettings settings={sanitizedSettings} />
          </div>
        )}

        {/* ── TAB 1.5: CATALOG ── */}
        {activeTab === 'catalog' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <CatalogSettings settings={sanitizedSettings} />
          </div>
        )}

        {/* ── TAB 2: INTEGRATIONS ── */}
        {activeTab === 'integrations' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <IntegrationsSettings settings={sanitizedSettings} />
          </div>
        )}

        {/* ── TAB 2.5: TELEGRAM BOT ── */}
        {activeTab === 'telegram' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <TelegramBotSettings settings={sanitizedSettings} />
          </div>
        )}

        {/* ── TAB 2.8: PROVIDER PROXIES ── */}
        {activeTab === 'proxy' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <ProviderProxyManager providers={providers} />
          </div>
        )}

        {/* ── TAB 3: TEAM ── */}
        {activeTab === 'team' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <TeamManagement 
              staffUsers={staffUsers} 
              regularUsers={regularUsers} 
              searchQuery={searchQuery} 
              currentAdminRole={admin.role}
              staffRoles={staffRoles}
            />
          </div>
        )}

        {/* ── TAB 3.7: SUPPORT TEMPLATES ── */}
        {activeTab === 'templates' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <SupportTemplatesSettings initialTemplates={templates} />
          </div>
        )}

        {/* ── TAB 4: AUDIT ── */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="rounded-2xl border border-border shadow-sm bg-card overflow-hidden">
              <div className="p-0">
                <DataTable 
                  columns={auditColumns} 
                  data={recentLogs}
                  searchKey="action"
                  searchPlaceholder="Поиск по действию..."
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
