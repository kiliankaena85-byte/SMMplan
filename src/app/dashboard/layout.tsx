import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import Link from 'next/link';
import { SidebarNav, MobileBottomNav } from './sidebar-nav';

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

  const balanceRub = (Number(user.balance) / 100).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Sidebar (desktop, client — for active highlight) ── */}
      <SidebarNav email={user.email} balanceRub={balanceRub} />

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-xs">
            S
          </div>
          Smmplan
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-foreground tabular-nums">
            {(Number(user.balance) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
          </span>
          <Link
            href="/dashboard/add-funds"
            className="px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200"
          >
            + Пополнить
          </Link>
        </div>
      </div>

      {/* ── Mobile bottom nav (client — for active highlight) ── */}
      <MobileBottomNav />

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 pt-14 pb-20 md:pt-0 md:pb-0 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
