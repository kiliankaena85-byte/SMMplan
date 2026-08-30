import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
export const dynamic = "force-dynamic";
import Link from 'next/link';
import { Toaster } from '@/components/ui/sonner';
import { AdminSidebar } from '@/components/admin/sidebar';
import { MobileNavDrawer } from '@/components/admin/mobile-nav-drawer';
import { CommandPalette } from '@/components/admin/command-palette';
import { ShortcutsProvider } from '@/components/admin/shortcuts-provider';
import { AdminProfileDropdown } from '@/components/admin/admin-profile-dropdown';
import { GlobalSiteSwitcher } from '@/components/admin/tenant-switcher';
import { EnvironmentModeSwitcher } from '@/components/admin/EnvironmentModeSwitcher';
import { SystemEmergencyBanner } from '@/components/admin/system-emergency-banner';
import { SettingsManager } from '@/lib/settings';
import { unstable_cache } from 'next/cache';
import { cookies } from 'next/headers';
import { normalizeTenantId } from '@/lib/tenant-resolver-edge';

// ADM-16: catalog anomaly badge — cached for 60s instead of a COUNT on every admin page load
const getCachedAnomalyCount = unstable_cache(
  async () => db.service.count({
    where: {
      OR: [
        { isQuarantined: true },
        { cooldownReason: 'ZOMBIE_AUTO_DISABLED', isActive: false },
        { cooldownUntil: { gt: new Date() }, cooldownReason: { not: 'ZOMBIE_AUTO_DISABLED' } },
      ]
    }
  }),
  ['admin-catalog-anomaly-count-v1'],
  { revalidate: 60, tags: ['catalog', 'anomaly-count'] }
);

// RBAC: Allowed roles for admin panel access
const ADMIN_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'];

// Navigation sections with role-based visibility
const ADMIN_NAVIGATION = [
  {
    group: 'Главное управление',
    items: [
      { href: '/admin/dashboard',                 icon: 'Home',          label: 'Дашборд',              section: 'dashboard' },
      { href: '/admin/orders',                    icon: 'Package',       label: 'Заказы',               section: 'orders' },
      { href: '/admin/catalog',                   icon: 'ShoppingCart',  label: 'Каталог услуг',        section: 'catalog' },
      { href: '/admin/providers',                 icon: 'Link',          label: 'Провайдеры',           section: 'providers' },
      { href: '/admin/tickets',                   icon: 'MessageSquare', label: 'Поддержка',            section: 'tickets' },
      { href: '/admin/clients',                   icon: 'Users',         label: 'Клиенты',              section: 'clients' },
      { href: '/admin/finance',                   icon: 'CreditCard',    label: 'Финансы & Касса',      section: 'finance' },
      { href: '/admin/finance/balance-requests',  icon: 'Inbox',         label: 'Заявки на баланс',     section: 'balance_requests' },
      { href: '/admin/analytics',                 icon: 'BarChart3',     label: 'Аналитика',            section: 'analytics' },
      { href: '/admin/settings',                  icon: 'Settings',      label: 'Настройки',            section: 'settings' },
    ]
  }
];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER:   { label: 'Владелец',  color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-bold' },
  ADMIN:   { label: 'Админ',     color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 font-bold' },
  MANAGER: { label: 'Менеджер',  color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold' },
  SUPPORT: { label: 'Саппорт',   color: 'bg-muted text-muted-foreground border-border font-bold' },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await verifySession();
  
  if (!session) {
    redirect('/login');
  }

  const user = await db.user.findUnique({ 
    where: { id: session.userId },
    include: { staffRole: { include: { permissions: true } } }
  });

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    redirect('/dashboard/new-order');
  }

  const anomalyCount = await getCachedAnomalyCount();

  // Filter navigation based on canonical RBAC sections
  const navigation = ADMIN_NAVIGATION.map(group => ({
    ...group,
    items: group.items.map(item => {
      if (item.section === 'catalog' && anomalyCount > 0) {
        return { ...item, badge: anomalyCount };
      }
      return item;
    }).filter(item => {
      if (user.role === 'OWNER' || user.role === 'ADMIN') return true;
      if (!user.staffRole) return false;
      const normalizedSection = item.section.toLowerCase();
      return user.staffRole.permissions.some(
        (p: { section: string; canView: boolean; canEdit: boolean }) =>
          p.section.toLowerCase() === normalizedSection && (p.canView || p.canEdit)
      );
    })
  })).filter(group => group.items.length > 0);

  const roleInfo = ROLE_LABELS[user.role] || { label: user.role, color: 'bg-muted text-foreground' };
  const cookieStore = await cookies();
  const cookieTenant = cookieStore.get('x_admin_tenant')?.value;
  const activeTenantId = normalizeTenantId(cookieTenant) || user.tenantId || 'smmplan';
  const isTestMode = await SettingsManager.isTestMode(activeTenantId);

  const canEditSettings = user.role === 'OWNER' || user.role === 'ADMIN' || Boolean(
    user.staffRole?.permissions?.some((p: { section: string; canEdit: boolean }) => p.section.toUpperCase() === 'SETTINGS' && p.canEdit)
  );

  return (
    <ShortcutsProvider>
      <div data-tenant={activeTenantId} className="h-screen w-full overflow-hidden bg-muted/10 dark:bg-background flex flex-col md:flex-row relative selection:bg-primary/20 selection:text-foreground font-sans">
        {/* Soft Ambient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 pointer-events-none z-0" />

        <AdminSidebar 
          userEmail={user.email}
          roleInfo={roleInfo}
          navigation={navigation}
        />

        {/* Floating Main Content Area */}
        <div className="flex-1 max-h-screen overflow-hidden p-0 md:p-3.5 z-10 relative flex flex-col">
          <SystemEmergencyBanner />
          {/* Top Header Bar with Mobile Drawer, Global Site Switcher & Profile Dropdown */}
          <header className="mb-2 px-3 md:px-1 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 md:gap-3">
              <MobileNavDrawer
                userEmail={user.email}
                roleInfo={roleInfo}
                navigation={navigation}
              />
              <GlobalSiteSwitcher currentTenant={activeTenantId} />
              <EnvironmentModeSwitcher readOnly={!canEditSettings} />
            </div>
            <div className="flex items-center gap-2">
              <AdminProfileDropdown
                userEmail={user.email}
                role={user.role}
                roleLabel={roleInfo.label}
                roleColor={roleInfo.color}
              />
            </div>
          </header>

          {/* Global Test Mode Warning Banner */}
          {isTestMode && (
            <div className="mb-2.5 mx-3 md:mx-0 rounded-lg bg-muted/60 border border-border/70 text-foreground px-4 py-2.5 flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-3 relative z-10">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                  <span className="font-extrabold text-[11px] uppercase tracking-wider text-primary">Тестовый режим</span>
                  <span className="text-muted-foreground text-xs">Заказы не отправляются провайдерам. Ghost Proxy перехватывает трафик.</span>
                </div>
              </div>
              <Link href="/admin/settings?tab=system" className="text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-2.5 py-1 rounded-md transition-all relative z-10">
                Настройки →
              </Link>
            </div>
          )}
          <main id="main-content" tabIndex={-1} className="flex-1 w-full overflow-hidden flex flex-col relative transition-all duration-200 bg-card md:rounded-xl md:border md:border-border/60 md:shadow-sm outline-none">
            <div className="flex-1 w-full p-3 md:p-4.5 flex flex-col overflow-y-auto">
              {children}
            </div>
          </main>
        </div>

        <CommandPalette />
        <Toaster position="top-right" richColors closeButton className="mt-4 mr-4" />
      </div>
    </ShortcutsProvider>
  );
}
