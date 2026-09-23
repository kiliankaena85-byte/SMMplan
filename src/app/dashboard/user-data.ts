import { cache } from 'react';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';

export const getDashboardUser = cache(async () => {
  const session = await verifySession();
  if (!session) redirect('/login');

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      balance: true,
      totalSpent: true,
      referralCode: true,
      createdAt: true,
      tenantId: true,
      role: true,
    },
  });

  if (!user) redirect('/login');
  
  return { session, user };
});
