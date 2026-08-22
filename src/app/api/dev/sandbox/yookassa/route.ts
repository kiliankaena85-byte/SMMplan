export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/server/rbac';
import { WalletOps } from '@/services/financial/wallet-ops';

/**
 * Dev Sandbox: Simulate a YooKassa balance top-up for testing.
 * 🔒 SECURITY: Blocked in production. Requires admin session in dev/test.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_ROUTES !== 'true') {
    return new Response('Not Found', { status: 404 });
  }
  // Guard 1: Disable in production entirely
  if ((process.env.NODE_ENV as string) === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  // Guard 2: Require admin session even in dev/test
  const authResult = await requireStaffPermission('SETTINGS', 'edit', async () => ({ authorized: true }));
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

    // Create payment record and credit balance via WalletOps to respect Trust Boundary
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

      await WalletOps.credit(
        tx,
        userId,
        amountCents,
        'Пополнение баланса (Dev Sandbox ЮKassa)',
        { idempotencyKey: `sandbox-${fakeGatewayId}` }
      );
    });

    return NextResponse.json({ success: true, message: 'Dev Sandbox Payment Succeeded' }, { status: 200 });
  } catch (error: unknown) {
    console.error('[DevSandbox] YooKassa simulation error:', (error instanceof Error ? error.message : String(error)));
    return NextResponse.json({ error: 'Sandbox Error' }, { status: 500 });
  }
}
