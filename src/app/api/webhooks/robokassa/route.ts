export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/services/financial/payment.service';
import { db } from '@/lib/db';
import { timingSafeEqual } from 'crypto';

const MAX_BODY_SIZE = 1024 * 64; // 64KB

export async function POST(req: NextRequest) {
  try {
    const { getClientIp } = await import('@/utils/ip');
    const ip = await getClientIp();

    const { SettingsProvider } = await import('@/lib/settings');
    const isTestMode = await SettingsProvider.isTestMode();

    // 1. Extract query params or form parameters
    const urlObj = new URL(req.url);
    let outSum = urlObj.searchParams.get('OutSum');
    let invId = urlObj.searchParams.get('InvId');
    let signatureValue = urlObj.searchParams.get('SignatureValue');
    let shp_paymentId = urlObj.searchParams.get('shp_paymentId');

    // Parse body if empty query params
    if (!outSum || !signatureValue || !shp_paymentId) {
      try {
        const text = await req.text();
        if (text.length > MAX_BODY_SIZE) {
          console.warn('[Webhook] Oversized Robokassa payload rejected');
          return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
        }
        const body = new URLSearchParams(text);
        outSum = body.get('OutSum') || outSum;
        invId = body.get('InvId') || invId;
        signatureValue = body.get('SignatureValue') || signatureValue;
        shp_paymentId = body.get('shp_paymentId') || shp_paymentId;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // Ignore parsing exceptions
      }
    }

    if (!outSum || !signatureValue || !shp_paymentId) {
      console.error('[Robokassa Webhook] Missing required parameters');
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const currency = urlObj.searchParams.get('OutSumCurrency') || 'RUB';
    if (currency !== 'RUB') {
      console.error(`[Robokassa Webhook] Rejected invalid currency: ${currency}`);
      return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 });
    }

    // 2. Fetch system secrets
    const secrets = await SettingsProvider.getPaymentSecrets();
    const password = secrets.robokassaWebhookPassword;

    if (!password) {
      console.error('[CRITICAL] RobokassaWebhookPassword (Password#2) is not configured in settings.');
      return NextResponse.json({ error: 'Gateway unconfigured' }, { status: 500 });
    }

    // 3. Re-calculate SHA-256 signature for verification
    // Robokassa signature formula for webhook (ResultURL): OutSum:InvId:MerchantPassword2:shp_paymentId=paymentId
    const sigStr = `${outSum}:${invId || '0'}:${password}:shp_paymentId=${shp_paymentId}`;
    const crypto = (await import('crypto')).default;
    const expectedSig = crypto
      .createHash('sha256')
      .update(sigStr)
      .digest('hex')
      .toLowerCase();

    const signatureHex = signatureValue.toLowerCase();

    const a = Buffer.from(signatureHex);
    const b = Buffer.from(expectedSig);
    const isMatch = a.length === b.length && timingSafeEqual(a, b);

    if (!isMatch) {
      console.error(`[Robokassa Webhook] Cryptographic signature mismatch. Expected: ${expectedSig}, Got: ${signatureHex}`);
      if (ip) {
        await db.securityEvent.create({
          data: {
            event: 'SIGNATURE_FAILED',
            severity: 'CRITICAL',
            ip,
            details: { gateway: 'robokassa', paymentId: shp_paymentId }
          }
        });
      }
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // 4. Fetch the payment record in our DB
    const payment = await db.payment.findUnique({
      where: { id: shp_paymentId }
    });

    if (!payment) {
      console.error(`[Robokassa Webhook] Payment not found for shp_paymentId: ${shp_paymentId}`);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status === 'SUCCEEDED') {
      console.info(`[Robokassa Webhook] Payment ${shp_paymentId} already processed (idempotency hit)`);
      return new NextResponse(`OK${invId || '0'}`, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    // Convert outSum to cents
    const amountCents = Math.round(parseFloat(outSum) * 100);

    if (payment.amount > amountCents) {
      console.error(`[Robokassa Webhook] Amount underpayment exploit attempt: expected ${payment.amount}, got ${amountCents}`);
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    // 5. Confirm the payment atomically
    const success = await paymentService.confirmPayment(
      payment.gatewayId || `robo_${shp_paymentId}`,
      amountCents,
      payment.userId,
      isTestMode,
      'robokassa',
      shp_paymentId,
      payment.orderId ? 'order' : 'deposit'
    );

    if (success) {
      console.info(`[Robokassa Webhook] Payment ${shp_paymentId} confirmed successfully.`);
      // Robokassa ResultURL expects text "OK" followed by InvId to confirm receipt
      return new NextResponse(`OK${invId || '0'}`, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    } else {
      return NextResponse.json({ error: 'Confirm failed' }, { status: 400 });
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[Robokassa Webhook] Error:', error.message);
    return NextResponse.json({ error: 'Webhook execution failed' }, { status: 500 });
  }
}
