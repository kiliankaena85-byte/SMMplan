import { verifySession } from '@/lib/session';
import { getBaseUrlAsync } from '@/utils/get-base-url';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { ReferralUi } from './referral-ui';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Реферальная программа | SMMplan',
};

export default async function ReferralsPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  let user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      referralCode: true,
      referralBalance: true,
      _count: { select: { referrals: true } },
    },
  });

  if (!user) redirect('/login');

  // Auto-generate referral code if missing
  if (!user.referralCode) {
    const newCode = Array.from(
      Array(8),
      () => Math.floor(Math.random() * 36).toString(36)
    ).join('').toUpperCase();

    user = await db.user.update({
      where: { id: user.id },
      data: { referralCode: newCode },
      select: {
        id: true,
        referralCode: true,
        referralBalance: true,
        _count: { select: { referrals: true } },
      },
    });
  }

  // Build referral link server-side using request headers (no hydration mismatch)
  const origin = await getBaseUrlAsync();
  const referralLink = `${origin}/?ref=${user.referralCode}`;

  const earnedRub = (user.referralBalance ?? 0) / 100;
  const referralsCount = user._count?.referrals ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Реферальная программа</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Приглашайте друзей и получайте до 15% с каждого их заказа
        </p>
      </div>

      <ReferralUi
        referralLink={referralLink}
        referralsCount={referralsCount}
        earnedRub={earnedRub}
      />
    </div>
  );
}
