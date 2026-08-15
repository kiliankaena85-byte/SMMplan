import Link from 'next/link';
import { SidebarNav, MobileBottomNav } from '@/app/dashboard/sidebar-nav';
import { formatBalance } from '@/lib/utils';
import { BalanceDisplay } from '@/components/dashboard/balance/BalanceDisplay';

export function ClassicDashboardShell({
  user,
  children,
}: {
  user: { email: string; balanceCents: number };
  children: React.ReactNode;
}) {
  const balanceRub = formatBalance(user.balanceCents);

  return (
    <div className="min-h-screen bg-background text-foreground flex relative selection:bg-primary/20 selection:text-primary">
      {/* Background Decorative Glow (Matches Landing Page) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px]" />
      </div>

      {/* ── Sidebar (desktop, client — for active highlight) ── */}
      <div className="relative z-20">
        <SidebarNav email={user.email} balanceRub={balanceRub} />
      </div>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-2xl border-b border-border/80 px-4 py-3 flex items-center justify-between min-h-[56px] shadow-sm">
        <Link href="/" className="flex items-center gap-2 font-black text-foreground">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-primary via-indigo-600 to-pink-500 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm shadow-primary/20">
            S
          </div>
          <span className="truncate tracking-tight">SMMplan</span>
        </Link>
        <div className="flex items-center gap-2.5 ml-auto">
          <BalanceDisplay initialBalance={formatBalance(user.balanceCents)} variant="mobile-header" />
          <Link
            href="/dashboard/add-funds"
            className="px-3.5 py-1.5 min-h-[36px] flex items-center text-xs font-bold bg-primary text-primary-foreground rounded-xl shadow-sm shadow-primary/20 hover:scale-105 active:scale-95 transition-all shrink-0"
          >
            + Пополнить
          </Link>
        </div>
      </div>

      {/* ── Mobile bottom nav (client — for active highlight) ── */}
      <MobileBottomNav />

      {/* ── Main content ── */}
      <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 pt-16 pb-24 md:pt-0 md:pb-0 overflow-y-auto outline-none relative z-10">
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
