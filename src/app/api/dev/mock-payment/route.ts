import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SettingsManager } from "@/lib/settings";

export async function GET(req: NextRequest) {
  try {
    const isTestMode = await SettingsManager.isTestMode();
    if (!isTestMode && process.env.NODE_ENV !== "development") {
      return new NextResponse("Mock payment is disabled in production", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return new NextResponse("Missing paymentId", { status: 400 });
    }

    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return new NextResponse("Payment not found", { status: 404 });
    }

    // Simulate successful payment processing
    await db.$transaction(async (tx) => {
      if (payment.status !== 'SUCCEEDED') {
        await tx.payment.update({
          where: { id: paymentId },
          data: { status: 'SUCCEEDED', gatewayId: `mock_${Date.now()}` },
        });

        if (payment.orderId) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: 'PENDING' },
          });

          // Simulate queue dispatch
          const order = await tx.order.findUnique({ where: { id: payment.orderId } });
          if (order) {
            const { ordersQueue, dripfeedQueue } = require('@/workers/queues');
            if (order.isDripFeed) {
              await dripfeedQueue.add('dripfeed-start', { orderId: order.id }, { delay: 5000 });
            } else {
              await ordersQueue.add('order-dispatch', { orderId: order.id }, { delay: 5000 });
            }
          }
        }
      }
    });

    // Also simulate creating a ledger entry for the payment
    const user = await db.user.findUnique({ where: { id: payment.userId } });
    if (user) {
      await db.ledgerEntry.create({
        data: {
          userId: user.id,
          amount: payment.amount,
          reason: `Оплата заказа ${payment.orderId} (Тестовый платеж)`,
          status: 'APPROVED',
        }
      });
    }

    return NextResponse.redirect(new URL("/success", req.url));
  } catch (error: any) {
    console.error("[MockPayment] Error:", error);
    return new NextResponse(`Mock Payment Error: ${error.message}`, { status: 500 });
  }
}
