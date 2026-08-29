import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SettingsManager } from '@/lib/settings';
import { PaymentService } from '@/services/financial/payment.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('paymentId');
  const orderId = searchParams.get('orderId');

  if (!paymentId) {
    return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 });
  }

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { orders: true, user: true }
  });

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  const isTestMode = await SettingsManager.isTestMode();
  const isMockAllowed = isTestMode || (await SettingsManager.isMockPaymentEnabled()) || process.env.NODE_ENV !== 'production';

  if (!isMockAllowed) {
    // In live production without mock enabled, route to payment redirect status tracker
    const host = request.headers.get('host') || 'test.smmplan.pro';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    return NextResponse.redirect(`${proto}://${host}/payment-redirect?id=${paymentId}`);
  }

  try {
    const paymentService = new PaymentService();
    const effectiveOrderId = orderId || payment.orderId || (payment.orders[0]?.id);

    await paymentService.confirmPayment(
      payment.gatewayId || `mock_${Date.now()}`,
      Number(payment.amount),
      payment.userId,
      true, // isDevSandbox
      'yookassa',
      payment.id,
      'checkout'
    );

    const host = request.headers.get('host') || 'test.smmplan.pro';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const targetUrl = effectiveOrderId 
      ? `${proto}://${host}/success?orderId=${effectiveOrderId}`
      : `${proto}://${host}/success?paymentId=${payment.id}`;

    return NextResponse.redirect(targetUrl);
  } catch (err: unknown) {
    console.error('[MockPayment] Error confirming payment:', err);
    return NextResponse.json({ 
      error: (err instanceof Error ? err.message : String(err)) || 'Failed to confirm mock payment' 
    }, { status: 500 });
  }
}
