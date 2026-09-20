export const dynamic = 'force-dynamic';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import PasswordCard from '@/components/dashboard/settings/PasswordCard';
import LogoutCard from '@/components/dashboard/settings/LogoutCard';
import DeleteAccountCard from '@/components/dashboard/settings/DeleteAccountCard';

export const metadata = {
  title: 'Безопасность | Настройки | SMMplan',
};

export default async function SecuritySettingsPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      passwordHash: true,
    },
  });

  if (!user) redirect('/login');

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <PasswordCard
        hasPassword={!!user.passwordHash}
        canResetPassword={session.canResetPassword === true}
      />
      <LogoutCard tenantId={session.tenantId} />
      <DeleteAccountCard hasPassword={!!user.passwordHash} />
    </div>
  );
}
