export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/server/rbac';

/**
 * Dev Sandbox: Simulate a YooKassa balance top-up for testing.
 * 🔒 SECURITY: Blocked in production. Requires admin session in dev/test.
 */
export async function POST(req: NextRequest) {
  // Guard 1: Disable in production entirely
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  // Guard 2: Require admin session even in dev/test
  const authResult = await requireAdmin(async () => ({ authorized: true }));
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {
    const { userId, amount } = await req.json();

    if (!userId || !amount) {
      return NextResponse.json({ error: 'Missing userId or amount' }, { status: 400 });
    }

    const fakeGatewayId = `dev_yookassa_${Date.now()}`;
    const amountCents = Math.round(amount * 100);

    // Create payment record and credit balance directly
    await db.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          userId,
          amount: amountCents,
          currency: 'RUB',
          status: 'SUCCEEDED',
          gatewayId: fakeGatewayId,
          gateway: 'test'
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amountCents } }
      });
    });

    return NextResponse.json({ success: true, message: 'Dev Sandbox Payment Succeeded' }, { status: 200 });
  } catch (error: any) {
    console.error('[DevSandbox] YooKassa simulation error:', error.message);
    return NextResponse.json({ error: 'Sandbox Error' }, { status: 500 });
  }
}
