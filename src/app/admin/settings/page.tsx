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
const StorefrontKeysSettings = dynamicImport(() => import('./storefront-keys/storefront-keys-settings').then(m => m.StorefrontKeysSettings), {
  loading: () => <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Загрузка ключей витрин...</div>
});
import { AuditLogsTab } from '@/components/admin/settings/audit-logs-tab';
import Link from 'next/link';
import { Suspense } from 'react';
import { enforceSectionAccess } from '@/lib/server/rbac';
import { SettingsProvider } from '@/lib/settings';
import { OnboardingReadinessBar } from '@/components/admin/settings/onboarding-readiness-bar';
import { SettingsSearchCommand } from '@/components/admin/settings/settings-search-command';
import { SettingsClusterTabs } from '@/components/admin/settings/settings-cluster-tabs';
import { resolveSettingsNavigation } from '@/components/admin/settings/settings-navigation-config';
import { AdminAuditLog, StaffRole, StaffPermission, SupportTemplate, SystemSettings, Provider, StorefrontKey } from '@prisma/client';

import { cookies } from 'next/headers';
import { normalizeTenantId } from '@/lib/tenant-resolver-edge';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; tenant?: string }>;
}) {
  // 1. RBAC Guard: Evaluate access ceiling first
  const admin = await enforceSectionAccess('settings');
  
  const params = await searchParams;
  const cookieStore = await cookies();
  const urlTenant = normalizeTenantId(params.tenant);
  const cookieTenant = normalizeTenantId(cookieStore.get('x_admin_tenant')?.value);
  const headerTenant = await SettingsProvider.getTenantId();
  const activeTenantId = urlTenant || cookieTenant || normalizeTenantId(headerTenant) || 'smmplan';

  const rawTab = params.tab || 'system';
  const { activeSubTab } = resolveSettingsNavigation(rawTab);
  const activeTab = activeSubTab;
  const searchQuery = params.q || '';

  // 2. Tab-Scoped Optimized Queries: Fetch settings + conditionally only the active tab data
  let settings: SystemSettings;
  try {
    settings = await settingsService.getSystemSettings(activeTenantId);
  } catch (error) {
    console.error('[AdminSettingsPage] Failed to load system settings:', error);
    throw new Error('Не удалось загрузить настройки. Попробуйте обновить страницу.');
  }

  // 3. Security Sanitize: Mask all critical secrets before passing to client components
  const sanitizedSettings = {
    ...settings,
    telegramBotToken: settings.telegramBotToken ? '                ' : null,
    yookassaSecretKey: settings.yookassaSecretKey ? '                ' : null,
    yookassaWebhookSecret: settings.yookassaWebhookSecret ? '                ' : null,
    yookassaTestSecretKey: settings.yookassaTestSecretKey ? '                ' : null,
    cryptoBotToken: settings.cryptoBotToken ? '                ' : null,
    resendApiKey: settings.resendApiKey ? '                ' : null,
    smtpPassword: settings.smtpPassword ? '                ' : null,
    inboundEmailWebhookSecret: settings.inboundEmailWebhookSecret ? '                ' : null,
    robokassaPassword: settings.robokassaPassword ? '                ' : null,
    robokassaWebhookPassword: settings.robokassaWebhookPassword ? '                ' : null,
    geminiApiKeys: settings.geminiApiKeys ? '                ' : null,
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 animate-in fade-in duration-300 ease-out px-2 sm:px-6 min-h-full pb-16">
      <AdminTabbedHeader
        icon={Settings}
        title="Настройки системы"
        description="Глобальная конфигурация платформы, безопасность и персонал."
        action={<SettingsSearchCommand />}
        tabs={SYSTEM_TABS}
        onboardingKey="settings"
        onboarding={ONBOARDING_CONFIGS.settings}
      />

      {/* ── Onboarding Readiness & Goal-Gradient Bar ── */}
      <OnboardingReadinessBar settings={sanitizedSettings} />

      

      {/* ── Level 1 & Level 2 Master Cluster Navigation ── */}
      <SettingsClusterTabs activeTab={activeTab} />

      <div className="space-y-8 mt-4">
        {/* ── TAB 1: SYSTEM ── */}
        {activeTab === 'system' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <TestModePanel initialIsTestMode={sanitizedSettings.isTestMode} isTestEnvironment={SettingsProvider.isTestEnvironment()} />
            <GeneralSettings key={activeTenantId} settings={sanitizedSettings} tenantId={activeTenantId} />
          </div>
        )}

        {/* ── TAB 1.5: CATALOG ── */}
        {activeTab === 'catalog' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <CatalogSettings key={activeTenantId} settings={sanitizedSettings} tenantId={activeTenantId} />
          </div>
        )}

        {/* ── TAB 2: INTEGRATIONS ── */}
        {activeTab === 'integrations' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <IntegrationsSettings key={activeTenantId} settings={sanitizedSettings} tenantId={activeTenantId} />
          </div>
        )}

        {/* ── TAB 2.5: TELEGRAM BOT ── */}
        {activeTab === 'telegram' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <TelegramBotSettings key={activeTenantId} settings={sanitizedSettings} tenantId={activeTenantId} />
          </div>
        )}

        {/* ── TAB 2.8: PROVIDER PROXIES ── */}
        {activeTab === 'proxy' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <Suspense fallback={<TabSkeleton />}>
              <ProxyTabWrapper />
            </Suspense>
          </div>
        )}

        {/* ── TAB 2.9: STOREFRONT KEYS ── */}
        {activeTab === 'storefront' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <Suspense fallback={<TabSkeleton />}>
              <StorefrontTabWrapper activeTenantId={activeTenantId} />
            </Suspense>
          </div>
        )}

        {/* ── TAB 3: TEAM ── */}
        {activeTab === 'team' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <Suspense fallback={<TabSkeleton />}>
              <TeamTabWrapper activeTenantId={activeTenantId} searchQuery={searchQuery} admin={admin} />
            </Suspense>
          </div>
        )}

        {/* ── TAB 3.7: SUPPORT TEMPLATES ── */}
        {activeTab === 'templates' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <Suspense fallback={<TabSkeleton />}>
              <TemplatesTabWrapper />
            </Suspense>
          </div>
        )}

        {/* ── TAB 4: AUDIT ── */}
        {activeTab === 'audit' && (
          <Suspense fallback={<TabSkeleton />}>
            <AuditTabWrapper />
          </Suspense>
        )}

        {/* ── CATCH-ALL: Unknown tab ── */}
        {!['system','catalog','integrations','telegram','proxy','storefront','team','templates','audit'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
            <Settings className="w-10 h-10 opacity-20" />
            <p className="font-semibold text-sm">Раздел не найден</p>
            <p className="text-xs">Выберите раздел из списка вкладок выше</p>
          </div>
        )}
      </div>
    </div>
  );
}




// --- Async Wrapper Components for Suspense Data Fetching ---

function TabSkeleton() {
  return (
    <div className="w-full h-[400px] bg-muted/20 border border-border/50 rounded-xl animate-pulse flex items-center justify-center">
      <p className="text-sm text-muted-foreground font-medium">Загрузка данных вкладки...</p>
    </div>
  );
}

async function ProxyTabWrapper() {
  const providers = await db.provider.findMany({ orderBy: { name: 'asc' } });
  return <ProviderProxyManager providers={providers} />;
}

async function StorefrontTabWrapper({ activeTenantId }: { activeTenantId: string }) {
  const kList = await db.storefrontKey.findMany({
    where: { tenantId: activeTenantId },
    orderBy: { createdAt: 'desc' },
  });
  const storefrontKeys = kList.map((k: StorefrontKey) => ({
    id: k.id,
    tenantId: k.tenantId,
    type: k.type as 'PUBLISHABLE' | 'SECRET',
    keyPrefix: k.keyPrefix,
    name: k.name,
    isActive: k.isActive,
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
    createdAt: k.createdAt.toISOString(),
  }));
  return <StorefrontKeysSettings initialKeys={storefrontKeys} tenantId={activeTenantId} />;
}

async function TeamTabWrapper({ activeTenantId, searchQuery, admin }: { activeTenantId: string, searchQuery: string, admin: any }) {
  const [staffUsers, users, staffRoles] = await Promise.all([
    settingsService.listStaffUsers(),
    searchQuery ? settingsService.listUsers(searchQuery) : Promise.resolve([]),
    db.staffRole.findMany({ include: { permissions: true }, orderBy: { name: 'asc' } }),
  ]);
  const regularUsers = users.filter((u: any) => u.id !== admin.id);
  
  return (
    <TeamManagement 
      key={activeTenantId}
      staffUsers={staffUsers} 
      regularUsers={regularUsers} 
      searchQuery={searchQuery} 
      currentAdminRole={admin.role}
      staffRoles={staffRoles}
    />
  );
}

async function TemplatesTabWrapper() {
  const templates = await db.supportTemplate.findMany({ orderBy: { sort: 'asc' } });
  return <SupportTemplatesSettings initialTemplates={templates} />;
}

async function AuditTabWrapper() {
  const recentLogs = await db.adminAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  return <AuditLogsTab logs={recentLogs} />;
}
