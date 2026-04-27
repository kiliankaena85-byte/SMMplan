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

// Navigation tabs with role-based visibility
const ADMIN_TABS = [
  { href: '/admin/dashboard', icon: 'Home',          label: 'Дашборд',   section: 'dashboard' },
  { href: '/admin/clients',   icon: 'Users',         label: 'Клиенты',    section: 'clients' },
  { href: '/admin/orders',    icon: 'Package',       label: 'Заказы',     section: 'orders' },
  { href: '/admin/refills',   icon: 'RefreshCw',     label: 'Докрутки',   section: 'refills' },
  { href: '/admin/catalog',           icon: 'ShoppingCart',  label: 'Каталог',       section: 'catalog' },
  { href: '/admin/catalog/quarantine',icon: 'AlertTriangle', label: 'Карантин',      section: 'quarantine' },
  { href: '/admin/tickets',   icon: 'MessageSquare', label: 'Тикеты',     section: 'tickets' },
  { href: '/admin/finance',   icon: 'CreditCard',    label: 'Финансы',    section: 'finance' },
  { href: '/admin/providers', icon: 'Link',          label: 'Провайдеры', section: 'providers' },
  { href: '/admin/marketing', icon: 'Gift',          label: 'Маркетинг',  section: 'marketing' },
  { href: '/admin/pages',     icon: 'FileText',      label: 'Страницы',   section: 'pages' },
  { href: '/admin/settings',        icon: 'Settings',   label: 'Настройки',     section: 'settings' },
  { href: '/admin/system/features', icon: 'ToggleLeft', label: 'Фича-флаги',    section: 'features' },
  { href: '/admin/system/queues',   icon: 'Activity',   label: 'Очереди',       section: 'queues' },
];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER:   { label: 'Владелец',  color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  ADMIN:   { label: 'Админ',     color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  MANAGER: { label: 'Менеджер',  color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  SUPPORT: { label: 'Саппорт',   color: 'bg-slate-500/40 text-slate-300 border-slate-500/30' },
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

  let visibleTabs = [];
  if (user.role === 'OWNER') {
    visibleTabs = ADMIN_TABS;
  } else if (user.staffRole) {
    visibleTabs = ADMIN_TABS.filter(tab => 
      user.staffRole!.permissions.some((p: any) => p.section === tab.section && p.canView)
    );
  } else {
    // Graceful fallback for non-migrated users
    visibleTabs = [];
  }

  const roleInfo = ROLE_LABELS[user.role] || { label: user.role, color: 'bg-slate-100 text-slate-800' };
  const isTestMode = await SettingsManager.isTestMode();

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 flex flex-col md:flex-row relative selection:bg-sky-100 selection:text-sky-900">
      {/* Soft Ambient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-50/40 via-slate-50/80 to-blue-50/30 pointer-events-none z-0" />

      <AdminSidebar 
        userEmail={user.email}
        roleInfo={roleInfo}
        visibleTabs={visibleTabs}
      />
      
      {/* Mobile static nav fallback */}
      <aside className="md:hidden w-full bg-slate-900 border-b border-slate-800 text-white p-4 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-sky-400">
            Smmplan
          </h2>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">{roleInfo.label}</span>
        </div>
      </aside>

      {/* Floating Main Content Area */}
      <div className="flex-1 max-h-screen overflow-hidden p-2 md:p-4 z-10 relative flex flex-col">
        {/* Global Test Mode Warning Banner */}
        {isTestMode && (
          <div className="mb-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white px-4 py-2.5 flex items-center justify-between shadow-lg shadow-amber-200/50 animate-pulse-slow">
            <div className="flex items-center gap-3">
              <span className="text-xl">🧪</span>
              <div>
                <span className="font-bold text-sm">ТЕСТОВЫЙ РЕЖИМ АКТИВЕН</span>
                <span className="text-amber-100 text-xs ml-2">Заказы не отправляются провайдерам. Ghost Proxy перехватывает трафик.</span>
              </div>
            </div>
            <a href="/admin/settings?tab=system" className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors">
              Выключить →
            </a>
          </div>
        )}
        <main className="flex-1 rounded-2xl bg-white/95 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/50 overflow-x-hidden overflow-y-auto scrollbar-hide relative transition-all duration-300">
          <div className="min-h-full p-4 md:p-8 lg:p-10">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette />
      <Toaster position="top-right" richColors closeButton className="mt-4 mr-4" />
    </div>
  );
}
