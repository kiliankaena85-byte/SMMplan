import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
export const dynamic = "force-dynamic";
import Link from 'next/link';
import { Toaster } from '@/components/ui/sonner';
import { AdminSidebar } from '@/components/admin/sidebar';
import { CommandPalette } from '@/components/admin/command-palette';
import { SettingsManager } from '@/lib/settings';

// RBAC: Allowed roles for admin panel access
const ADMIN_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'];

// Navigation sections with role-based visibility
const ADMIN_NAVIGATION = [
  {
    group: 'Операционка',
    items: [
      { href: '/admin/dashboard', icon: 'Home',          label: 'Дашборд',   section: 'dashboard' },
      { href: '/admin/orders',    icon: 'Package',       label: 'Заказы',     section: 'orders' },
      { href: '/admin/refills',   icon: 'RefreshCw',     label: 'Докрутки',   section: 'refills' },
      { href: '/admin/tickets',   icon: 'MessageSquare', label: 'Тикеты',     section: 'tickets' },
      { href: '/admin/clients',   icon: 'Users',         label: 'Клиенты',    section: 'clients' },
    ]
  },
  {
    group: 'Финансы',
    items: [
      { href: '/admin/finance',   icon: 'CreditCard',    label: 'Биллинг',    section: 'finance' },
      { href: '/admin/marketing', icon: 'Gift',          label: 'Маркетинг',  section: 'marketing' },
    ]
  },
  {
    group: 'Каталог & Ядро',
    items: [
      { href: '/admin/catalog',           icon: 'ShoppingCart',  label: 'Услуги',        section: 'catalog' },
      { href: '/admin/catalog/quarantine',icon: 'AlertTriangle', label: 'Карантин',      section: 'quarantine' },
      { href: '/admin/smart',             icon: 'Cpu',           label: 'Умный Dripfeed', section: 'catalog' },
      { href: '/admin/providers', icon: 'Link',          label: 'Провайдеры', section: 'providers' },
      { href: '/admin/pages',     icon: 'FileText',      label: 'Страницы',   section: 'pages' },
      { href: '/admin/knowledge', icon: 'BookOpen',      label: 'Блог & Статьи', section: 'pages' },
    ]
  },
  {
    group: 'Система',
    items: [
      { href: '/admin/settings',        icon: 'Settings',   label: 'Настройки',     section: 'settings' },
      { href: '/admin/system/features', icon: 'ToggleLeft', label: 'Фичи',          section: 'features' },
    ]
  }
];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER:   { label: 'Владелец',  color: 'bg-primary/20 text-indigo-700 dark:text-indigo-300 border-primary/30 font-bold' },
  ADMIN:   { label: 'Админ',     color: 'bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-500/30 font-bold' },
  MANAGER: { label: 'Менеджер',  color: 'bg-success/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold' },
  SUPPORT: { label: 'Саппорт',   color: 'bg-muted/40 text-slate-700 dark:text-slate-300 border-slate-500/30 font-bold' },
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

  const anomalyCount = await db.service.count({
    where: {
      OR: [
        { isQuarantined: true },
        { cooldownReason: 'ZOMBIE_AUTO_DISABLED', isActive: false },
        { cooldownUntil: { gt: new Date() }, cooldownReason: { not: 'ZOMBIE_AUTO_DISABLED' } },
      ]
    }
  });

  // Map UI sections to StaffRole permissions
  const SECTION_MAP: Record<string, string> = {
    'dashboard': 'orders',
    'orders': 'orders',
    'refills': 'orders',
    'tickets': 'orders',
    'clients': 'finance',
    'finance': 'finance',
    'marketing': 'finance',
    'catalog': 'catalog',
    'quarantine': 'catalog',
    'providers': 'catalog',
    'pages': 'settings',
    'settings': 'settings',
    'features': 'settings',
    'queues': 'settings',
  };

  // Filter navigation based on RBAC
  const navigation = ADMIN_NAVIGATION.map(group => ({
    ...group,
    items: group.items.map(item => {
      if (item.section === 'quarantine' && anomalyCount > 0) {
        return { ...item, badge: anomalyCount };
      }
      return item;
    }).filter(item => {
      if (user.role === 'OWNER' || user.role === 'ADMIN') return true;
      if (!user.staffRole) return false;
      const requiredPerm = SECTION_MAP[item.section] || item.section;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return user.staffRole.permissions.some((p: any) => p.section === requiredPerm && p.canView);
    })
  })).filter(group => group.items.length > 0);

  const roleInfo = ROLE_LABELS[user.role] || { label: user.role, color: 'bg-muted text-foreground' };
  const isTestMode = await SettingsManager.isTestMode();

  return (
    <div className="h-screen w-full overflow-hidden bg-background flex flex-col md:flex-row relative selection:bg-primary/20 selection:text-foreground">
      {/* Soft Ambient Background */}
      <div className="absolute inset-0 bg-background pointer-events-none z-0" />

      <AdminSidebar 
        userEmail={user.email}
        roleInfo={roleInfo}
        navigation={navigation}
      />
      
      {/* Mobile static nav fallback */}
      <aside className="md:hidden w-full bg-primary border-b border-slate-800 text-primary-foreground p-4 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-sky-400">
            SMMplan
          </h2>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{roleInfo.label}</span>
        </div>
      </aside>

      {/* Floating Main Content Area */}
      <div className="flex-1 max-h-screen overflow-hidden p-2 md:p-4 z-10 relative flex flex-col">
        {/* Global Test Mode Warning Banner */}
        {isTestMode && (
          <div className="mb-2 rounded-xl bg-muted border border-border text-foreground px-4 py-2.5 flex items-center justify-between shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 relative z-10">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                <span className="font-extrabold text-xs uppercase tracking-wider text-primary">Тестовый режим активен</span>
                <span className="text-muted-foreground text-xs">Заказы не отправляются провайдерам. Ghost Proxy перехватывает трафик.</span>
              </div>
            </div>
            <Link href="/admin/settings?tab=system" className="text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 rounded-lg transition-all duration-200 relative z-10">
              Настройки →
            </Link>
          </div>
        )}
        <main id="main-content" tabIndex={-1} className="flex-1 w-full overflow-x-hidden overflow-y-auto scrollbar-hide relative transition-all duration-300 bg-background outline-none">
          <div className="min-h-full w-full p-4 md:p-8 lg:p-10">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette />
      <Toaster position="top-right" richColors closeButton className="mt-4 mr-4" />
    </div>
  );
}
