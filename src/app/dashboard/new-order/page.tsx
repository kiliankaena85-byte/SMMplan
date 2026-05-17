export const dynamic = "force-dynamic";

import ClientPage from "./client-page";
import type { Metadata } from 'next';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Новый заказ',
};

export default async function Page() {
  const session = await verifySession();
  let userEmail = "";
  if (session?.userId) {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { email: true }
    });
    userEmail = user?.email || "";
  }

  return <ClientPage userEmail={userEmail} />;
}
