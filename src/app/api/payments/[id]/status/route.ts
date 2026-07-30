import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Get the authenticated session (optional for guest payments)
    const session = await verifySession();

    const { id: paymentId } = await params;

    // 2. Fetch the payment
    const payment = await db.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // 3. IDOR Check: Ensure the payment belongs to the current user (if logged in)
    // For guest checkouts, knowledge of the secure CUID `paymentId` acts as the bearer token
    if (session && session.userId && payment.userId !== session.userId && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Return status and URL if available
    return NextResponse.json({
      status: payment.status, // e.g. PENDING, PAID, ERROR, CANCELED
      checkoutUrl: payment.checkoutUrl || null,
    });
  } catch (error) {
    console.error('[PaymentStatusAPI] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
