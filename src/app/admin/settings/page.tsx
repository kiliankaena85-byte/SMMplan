import { settingsService } from '@/services/admin/settings.service';
import { db } from '@/lib/db';
import { Settings, Globe, Link as LinkIcon, Users, History, MessageSquare, Database, Bot } from 'lucide-react';
import { AdminTabbedHeader } from '@/components/admin/tabbed-header';
import { SYSTEM_TABS, ONBOARDING_CONFIGS } from '@/components/admin/navigation-data';
import { TestModePanel } from '@/components/admin/test-mode-panel';
import { GeneralSettings } from './general-settings';
import { CatalogSettings } from './catalog-settings';
import { IntegrationsSettings } from './integrations-settings';
import { TelegramBotSettings } from './telegram-bot-settings';
import { TeamManagement } from './team-management';

import { SupportTemplatesSettings } from './support-templates';
import { DataTable } from '@/components/ui/data-table';
import { columns as auditColumns } from './audit-columns';
import Link from 'next/link';
import { enforceSectionAccess } from '@/lib/server/rbac';
import { SettingsProvider } from '@/lib/settings';
import { SystemHealthOverview } from '@/components/admin/settings/system-health-overview';
import { AdminAuditLog, StaffRole, StaffPermission, SupportTemplate, SystemSettings } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface SettingsPageData {
  staffUsers: Awaited<ReturnType<typeof settingsService.listStaffUsers>>;
  users: Awaited<ReturnType<typeof settingsService.listUsers>>;
  settings: SystemSettings;
  recentLogs: AdminAuditLog[];
  staffRoles: (StaffRole & { permissions: StaffPermission[] })[];
  templates: SupportTemplate[];
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const admin = await enforceSectionAccess('settings');
  
  const params = await searchParams;
  const activeTab = params.tab || 'system';
  const searchQuery = params.q || '';

  let pageData: SettingsPageData;

  try {
    const [staffUsers, users, settings, recentLogs, staffRoles, templates] = await Promise.all([
      settingsService.listStaffUsers(),
      searchQuery ? settingsService.listUsers(searchQuery) : Promise.resolve([]),
      settingsService.getSystemSettings(),
      db.adminAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      db.staffRole.findMany({ include: { permissions: true }, orderBy: { name: 'asc' } }),
      db.supportTemplate.findMany({ orderBy: { sort: 'asc' } }),
    ]);

    pageData = { staffUsers, users, settings, recentLogs, staffRoles, templates };
  } catch (error) {
    console.error('[AdminSettingsPage] Failed to load settings data:', error);
    throw new Error('Не удалось загрузить данные настроек. Попробуйте обновить страницу.');
  }

  const { staffUsers, users, settings, recentLogs, staffRoles, templates } = pageData;

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
    { id: 'team', label: 'Команда', icon: Users },
    { id: 'templates', label: 'Шаблоны', icon: MessageSquare },
    { id: 'audit', label: 'Аудит', icon: History },
  ];
  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 min-h-full pb-10">
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
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`?tab=${t.id}`}
            className={`flex items-center gap-2 py-3 px-6 transition-all -mb-px text-[11px] font-black uppercase tracking-widest border-b-2 ${
              activeTab === t.id
                ? 'border-primary text-primary bg-card rounded-t-xl'
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
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-400">
            <TestModePanel initialIsTestMode={sanitizedSettings.isTestMode} isTestEnvironment={SettingsProvider.isTestEnvironment()} />
            <GeneralSettings settings={sanitizedSettings} />
          </div>
        )}

        {/* ── TAB 1.5: CATALOG ── */}
        {activeTab === 'catalog' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-400">
            <CatalogSettings settings={sanitizedSettings} />
          </div>
        )}

        {/* ── TAB 2: INTEGRATIONS ── */}
        {activeTab === 'integrations' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-400">
            <IntegrationsSettings settings={sanitizedSettings} />
          </div>
        )}

        {/* ── TAB 2.5: TELEGRAM BOT ── */}
        {activeTab === 'telegram' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-400">
            <TelegramBotSettings settings={sanitizedSettings} />
          </div>
        )}

        {/* ── TAB 3: TEAM ── */}
        {activeTab === 'team' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-400">
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
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-400">
            <SupportTemplatesSettings initialTemplates={templates} />
          </div>
        )}


        {/* ── TAB 4: AUDIT ── */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-400">
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
