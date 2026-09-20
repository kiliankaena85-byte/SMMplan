export const dynamic = 'force-dynamic';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import CompanyRequisitesCard from '@/components/dashboard/settings/CompanyRequisitesCard';

export const metadata = {
  title: 'Реквизиты компании | Настройки | SMMplan',
};

export default async function RequisitesSettingsPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      companyName: true,
      inn: true,
      kpp: true,
      ogrn: true,
      legalAddress: true,
    },
  });

  if (!user) redirect('/login');

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <CompanyRequisitesCard
        initialData={{
          companyName: user.companyName,
          inn: user.inn,
          kpp: user.kpp,
          ogrn: user.ogrn,
          legalAddress: user.legalAddress,
        }}
      />
    </div>
  );
}
