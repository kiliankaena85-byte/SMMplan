import Link from 'next/link';
import { SidebarNav, MobileBottomNav } from '@/app/dashboard/sidebar-nav';
import { formatBalance } from '@/lib/utils';
import { BalanceDisplay } from '@/components/dashboard/balance/BalanceDisplay';

export function ClassicDashboardShell({
  user,
  children,
}: {
  user: { email: string; balance: bigint };
  children: React.ReactNode;
}) {
  const balanceRub = formatBalance(user.balance);

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Sidebar (desktop, client — for active highlight) ── */}
      <SidebarNav email={user.email} balanceRub={balanceRub} />

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between flex-wrap gap-y-2 gap-x-4 min-h-[56px]">
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground min-h-[40px]">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-xs shrink-0">
            S
          </div>
          <span className="truncate">SMMplan</span>
        </Link>
        <div className="flex items-center gap-3 ml-auto">
          <BalanceDisplay initialBalance={formatBalance(user.balance)} variant="mobile-header" />
          <Link
            href="/dashboard/add-funds"
            className="px-3.5 py-2 min-h-[40px] flex items-center text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 shrink-0"
          >
            + Пополнить
          </Link>
        </div>
      </div>

      {/* ── Mobile bottom nav (client — for active highlight) ── */}
      <MobileBottomNav />

      {/* ── Main content ── */}
      <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 pt-16 pb-24 md:pt-0 md:pb-0 overflow-y-auto outline-none">
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
