export const dynamic = 'force-dynamic';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import TelegramCard from '@/components/dashboard/settings/TelegramCard';
import Consent152FzCard from '@/components/dashboard/settings/Consent152FzCard';

export const metadata = {
  title: 'Уведомления | Настройки | SMMplan',
};

export default async function NotificationsSettingsPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      telegramId: true,
      telegramNotifyOrders: true,
      telegramNotifyBalance: true,
      telegramNotifyTickets: true,
      tosAcceptedAt: true,
      tosAcceptedIp: true,
    },
  });

  if (!user) redirect('/login');

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <TelegramCard
        telegramId={user.telegramId}
        notifyOrders={user.telegramNotifyOrders}
        notifyBalance={user.telegramNotifyBalance}
        notifyTickets={user.telegramNotifyTickets}
      />
      <Consent152FzCard
        tosAcceptedAt={user.tosAcceptedAt}
        tosAcceptedIp={user.tosAcceptedIp}
      />
    </div>
  );
}
