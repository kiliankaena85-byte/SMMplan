export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { SettingsManager } from '@/lib/settings';

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
    let order = await db.order.findUnique({
      where: { id: orderId, userId: session.userId },
      include: {
        payment: true,
        service: { select: { name: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Synchronous status check fallback if webhook is delayed/lost
    if (order.status === 'AWAITING_PAYMENT' && order.payment && order.payment.gateway === 'yookassa' && order.payment.gatewayId) {
      const secrets = await SettingsManager.getPaymentSecrets();
      const shopId = secrets.yookassaShopId;
      const secretKey = secrets.yookassaSecretKey;
      if (shopId && secretKey) {
        const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
        try {
          const response = await fetch(`https://api.yookassa.ru/v3/payments/${order.payment.gatewayId}`, {
            headers: { 'Authorization': authHeader }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'succeeded' || data.status === 'waiting_for_capture') {
              const realAmount = Math.round(parseFloat(data.amount.value) * 100);
              const { paymentService } = await import('@/services/financial/payment.service');
              await paymentService.confirmPayment(
                order.payment.gatewayId,
                realAmount,
                session.userId,
                false,
                'yookassa',
                order.payment.id,
                'order'
              );
              
              // Re-fetch the updated order after sync confirmation
              const updatedOrder = await db.order.findUnique({
                where: { id: orderId, userId: session.userId },
                include: {
                  payment: true,
                  service: { select: { name: true } },
                },
              });
              if (updatedOrder) {
                order = updatedOrder;
              }
            }
          }
        } catch (e: any) {
          console.error('[order-status] YooKassa sync fallback failed:', e.message);
        }
      }
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
