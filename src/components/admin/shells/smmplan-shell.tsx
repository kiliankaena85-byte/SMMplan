'use client';

import { AdminSidebar } from '@/components/admin/sidebar';
import Link from 'next/link';
import { AdminShellProps } from './types';

export function SMMplanShell({
  user,
  roleInfo,
  navigation,
  siteName,
  tenantId,
  isTestMode,
  children
}: AdminShellProps) {
  return (
    <div className="h-screen w-full overflow-hidden bg-muted/10 dark:bg-background flex flex-col md:flex-row relative selection:bg-primary/20 selection:text-foreground">
      {/* Soft Ambient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 pointer-events-none z-0" />

      <AdminSidebar 
        userEmail={user.email || user.name || "Администратор"}
        roleInfo={roleInfo}
        navigation={navigation}
        siteName={siteName}
        tenantId={tenantId}
      />
      
      {/* Mobile static nav fallback */}
      <aside className="md:hidden w-full bg-primary border-b border-slate-800 text-primary-foreground p-4 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-sky-400">
            {siteName}
          </h2>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{roleInfo.label}</span>
        </div>
      </aside>

      {/* Main Content Area (Edge-to-Edge) */}
      <div className="flex-1 max-h-screen overflow-hidden p-0 z-10 relative flex flex-col">
        {/* Global Test Mode Warning Banner */}
        {isTestMode && (
          <div className="mb-0 rounded-none bg-muted border-b border-border text-foreground px-4 py-3 flex items-center justify-between relative overflow-hidden">
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
            <Link href="/admin/settings?tab=system" className="text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 rounded-lg transition-all duration-200 relative z-10 active:scale-[0.98]">
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
    </div>
  );
}
