export const dynamic = 'force-dynamic';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { TransactionsClient } from '@/components/dashboard/transactions/TransactionsClient';

export const metadata = {
  title: 'История транзакций | Smmplan',
  description: 'Прозрачный балансовый отчет, пополнения, возвраты и детализированный аудит трат.',
};

export default async function TransactionsPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true },
  });

  if (!user) redirect('/login');

  // Fetch all ledger transactions of the user
  const entries = await db.ledgerEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      reason: true,
      status: true,
      idempotencyKey: true,
      transactionType: true,
      createdAt: true,
    },
  });

  // Serialize BigInt and Date values safely for Client Component boundaries
  const serializedEntries = entries.map(entry => ({
    id: entry.id,
    amountCents: typeof entry.amount === 'bigint' ? Number(entry.amount) : entry.amount,
    amountRub: (Number(entry.amount) / 100),
    reason: entry.reason,
    status: entry.status,
    idempotencyKey: entry.idempotencyKey || null,
    transactionType: entry.transactionType,
    createdAt: entry.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Финансовая история</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Контроль платежей, возвратов средств и сводные отчеты для бухгалтерии.
        </p>
      </div>

      <TransactionsClient initialEntries={serializedEntries} userEmail={user.email} />
    </div>
  );
}
