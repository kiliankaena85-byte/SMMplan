export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';

/**
 * GET /api/order-status?orderId=xxx
 * Returns the current status of an order for the authenticated user.
 * Used by the success page to poll for webhook confirmation.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = req.nextUrl.searchParams.get('orderId');
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    // IDOR Protection: only return data for the authenticated user's orders
    const order = await db.order.findUnique({
      where: { id: orderId, userId: session.userId },
      select: {
        id: true,
        numericId: true,
        status: true,
        charge: true,
        quantity: true,
        service: { select: { name: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      orderId: order.id,
      numericId: order.numericId,
      status: order.status,
      charge: Number(order.charge),
      quantity: order.quantity,
      serviceName: order.service.name,
    });
  } catch (error: any) {
    console.error('[order-status] Error:', error.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
