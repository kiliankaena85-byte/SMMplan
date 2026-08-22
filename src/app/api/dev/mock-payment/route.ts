import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WalletOps } from "@/services/financial/wallet-ops";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_ROUTES !== 'true') {
    return new Response('Not Found', { status: 404 });
  }
  try {
    // BUG-004 FIX: Жёстко блокируем в production — isTestMode НЕ должен открывать этот endpoint
    

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
            const { ordersQueue } = await import('@/workers/queues');
            await ordersQueue.add('order-dispatch', { orderId: order.id }, { jobId: `dispatch-${order.id}`, delay: 5000 });
          }
        }

        // W5-4: Mass Orders support (for basket/cart)
        await tx.order.updateMany({ 
          where: { paymentId: payment.id, status: 'AWAITING_PAYMENT' }, 
          data: { status: 'PENDING' } 
        });

        if (!payment.orderId) {
          // Direct top-up (Deposit) - Increment User Balance securely!
          await WalletOps.credit(tx, payment.userId, Number(payment.amount),
            `Пополнение баланса через YooKassa (Тестовый платеж)`,
            { idempotencyKey: `mock-payment-${paymentId}` }
          );
        } else {
          // Ledger entry INSIDE transaction with idempotency key
          await tx.ledgerEntry.create({
            data: {
              userId: payment.userId,
              amount: payment.amount,
              reason: `Оплата заказа ${payment.orderId} (Тестовый платеж)`,
              status: 'APPROVED',
              idempotencyKey: `mock-payment-${paymentId}`
            }
          });
        }
      }
    });

    if (payment.orderId) {
      return NextResponse.redirect(new URL(`/success?orderId=${payment.orderId}`, req.url));
    } else {
      return NextResponse.redirect(new URL(`/dashboard/add-funds?success=1`, req.url));
    }
  } catch (error: unknown) {
    console.error("[MockPayment] Error:", error);
    return new NextResponse(`Mock Payment Error: ${(error instanceof Error ? error.message : String(error))}`, { status: 500 });
  }
}
