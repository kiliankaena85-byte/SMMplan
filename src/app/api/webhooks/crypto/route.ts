export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { paymentService } from '@/services/financial/payment.service';
import { SettingsManager } from '@/lib/settings';

const MAX_BODY_SIZE = 1024 * 64; // 64KB

export async function POST(request: NextRequest) {
  try {
    const { getClientIp } = await import('@/utils/ip');
    const ip = await getClientIp();

    const signature = request.headers.get('crypto-pay-api-signature');
    if (!signature) {
      await db.securityEvent.create({ data: { event: 'MISSING_SIGNATURE', severity: 'CRITICAL', ip, details: { gateway: 'cryptobot' } } });
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const payload = await request.text();
    if (payload.length > MAX_BODY_SIZE) {
      console.warn('[Webhook] Oversized payload rejected');
      await db.securityEvent.create({ data: { event: 'OVERSIZED_PAYLOAD', severity: 'WARNING', ip, details: { gateway: 'cryptobot', size: payload.length } } });
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const secrets = await SettingsManager.getPaymentSecrets();
    const CRYPTO_BOT_TOKEN = secrets.cryptoBotToken;
    if (!CRYPTO_BOT_TOKEN) {
      console.error('[Webhook] FATAL: CryptoBot token is not configured in SystemSettings. Rejecting.');
      return NextResponse.json({ error: 'CryptoBot webhook not configured' }, { status: 503 });
    }

    const secret = crypto.createHash('sha256').update(CRYPTO_BOT_TOKEN).digest();
    const checkString = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const HEX_REGEX = /^[0-9a-f]{64}$/i;
    if (!HEX_REGEX.test(signature)) {
      await db.securityEvent.create({ data: { event: 'INVALID_SIGNATURE_FORMAT', severity: 'CRITICAL', ip, details: { gateway: 'cryptobot', signature } } });
      return NextResponse.json({ error: 'Invalid signature format' }, { status: 403 });
    }

    const expectedBuf = Buffer.from(checkString, 'hex');
    const providedBuf = Buffer.from(signature, 'hex');

    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
       console.error('[Webhook] Invalid CryptoBot signature');
       await db.securityEvent.create({ data: { event: 'SIGNATURE_FAILED', severity: 'CRITICAL', ip, details: { gateway: 'cryptobot' } } });
       return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const data = JSON.parse(payload);
    
    // Replay protection (30 minutes window)
    const webhookCreatedAt = data.payload?.paid_at || data.payload?.created_at;
    if (webhookCreatedAt) {
      const webhookTime = new Date(webhookCreatedAt).getTime();
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      if (webhookTime < thirtyMinutesAgo) {
         await db.securityEvent.create({ data: { event: 'REPLAY_ATTEMPT', severity: 'CRITICAL', ip, details: { gateway: 'cryptobot', webhookTime, gatewayId: data.payload?.invoice_id } } });
         return NextResponse.json({ error: 'Stale webhook rejected' }, { status: 400 });
      }
    }

    // We only care about successfully paid invoices
    if (data.update_type === 'invoice_paid') {
      const invoice = data.payload;
      // BUG-008 FIX: Parse JSON payload (new format) or fall back to plain paymentId (legacy)
      let paymentId: string;
      let metadataType: string | undefined;
      try {
        const parsed = JSON.parse(invoice.payload);
        paymentId = parsed.paymentId;
        metadataType = parsed.type;
      } catch (err) {
        console.warn('[Crypto Webhook] JSON parse failed, falling back to raw payload:', err);
        // Legacy format: payload is just the paymentId string
        paymentId = invoice.payload;
      }

      const payment = await db.payment.findUnique({ where: { id: paymentId } });
      
      if (!payment) {
         console.error(`[Webhook] Payment record not found for payload ${paymentId}`);
         return NextResponse.json({ error: 'Payment context missing' }, { status: 400 });
      }

      const gatewayId = invoice.invoice_id.toString();
      
      // Strict Integer parsing complying with IEEE 754 financial rules
      // W4-2 SECURITY FIX: Use actual fiat paid amount instead of crypto amount
      const resolvedAmount = invoice.paid_fiat_amount ?? (invoice.amount * (invoice.paid_fiat_rate || 1));
      const rawAmountStr = String(resolvedAmount || '0.00');
      const [intPart, decPart] = rawAmountStr.split('.');
      const amount = parseInt(intPart || '0', 10) * 100 + parseInt((decPart || '00').padEnd(2, '0').slice(0, 2), 10);

      const success = await paymentService.confirmPayment(
        gatewayId, 
        amount, 
        payment.userId,
        false,
        'cryptobot',
        payment.id,
        metadataType // Теперь 'deposit' будет корректно передан
      );

      if (!success) {
         return NextResponse.json({ error: 'Payment double-check validation failed' }, { status: 400 });
      }

      console.info(`[Webhook] Successfully processed payment ${gatewayId}`);
    }

    return NextResponse.json({ ok: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[Webhook] Processing error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


