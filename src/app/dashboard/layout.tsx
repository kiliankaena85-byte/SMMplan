import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import Link from 'next/link';
import { SidebarNav, MobileBottomNav } from './sidebar-nav';
import { formatBalance } from '@/lib/utils';
import { BalanceDisplay } from '@/components/dashboard/balance/BalanceDisplay';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session) redirect('/login');

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { email: true, balance: true },
  });

  if (!user) redirect('/login');

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
          <span className="truncate">Smmplan</span>
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
