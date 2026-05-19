export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/services/financial/payment.service';
import { db } from '@/lib/db';

const MAX_BODY_SIZE = 1024 * 64; // 64KB

export async function POST(req: NextRequest) {
  try {
    const { getClientIp } = await import('@/utils/ip');
    const ip = await getClientIp();

    const webhookSecret = process.env.YOOKASSA_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[CRITICAL][ACTION REQUIRED] YOOKASSA_WEBHOOK_SECRET is not set. Webhook disabled.');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const providedSignature = req.headers.get('x-sha256-signature') || req.headers.get('digest');
    if (!providedSignature) {
      await db.securityEvent.create({ data: { event: 'MISSING_SIGNATURE', severity: 'CRITICAL', ip, details: { gateway: 'yookassa' } } });
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const rawText = await req.text();
    if (rawText.length > MAX_BODY_SIZE) {
      console.warn('[Webhook] Oversized payload rejected');
      await db.securityEvent.create({ data: { event: 'OVERSIZED_PAYLOAD', severity: 'WARNING', ip, details: { gateway: 'yookassa', size: rawText.length } } });
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const crypto = (await import('crypto')).default;
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawText, 'utf8')
      .digest('hex');

    const signatureHex = providedSignature.replace(/^sha256=/i, '');
    const HEX_REGEX = /^[0-9a-f]{64}$/i;
    
    if (!HEX_REGEX.test(signatureHex)) {
      await db.securityEvent.create({ data: { event: 'INVALID_SIGNATURE_FORMAT', severity: 'CRITICAL', ip, details: { gateway: 'yookassa', signature: providedSignature } } });
      return NextResponse.json({ error: 'Invalid signature format' }, { status: 403 });
    }

    const expectedBuf = Buffer.from(expectedSig, 'hex');
    const providedBuf = Buffer.from(signatureHex, 'hex');

    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      console.error('[YooKassa] HMAC signature mismatch — possible webhook forgery attempt');
      await db.securityEvent.create({ data: { event: 'SIGNATURE_FAILED', severity: 'CRITICAL', ip, details: { gateway: 'yookassa' } } });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const rawBody = JSON.parse(rawText);
    
    const webhookCreatedAt = rawBody.object?.created_at || rawBody.created_at;
    if (webhookCreatedAt) {
      const webhookTime = new Date(webhookCreatedAt).getTime();
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      if (webhookTime < thirtyMinutesAgo) {
         await db.securityEvent.create({ data: { event: 'REPLAY_ATTEMPT', severity: 'CRITICAL', ip, details: { gateway: 'yookassa', webhookTime, gatewayId: rawBody.object?.id } } });
         return NextResponse.json({ error: 'Stale webhook rejected' }, { status: 400 });
      }
    }

    // YooKassa Webhook Payload Example:
    // { type: 'notification', event: 'payment.succeeded', object: { id: '2abc', amount: { value: '100.00' }, metadata: { userId: '123' } } }
    
    if (rawBody.event === 'payment.succeeded' && rawBody.object) {
      const gatewayId = rawBody.object.id;
      
      // Strict Integer parsing complying with IEEE 754 financial rules
      const rawAmountStr = String(rawBody.object.amount?.value || '0.00');
      const [intPart, decPart] = rawAmountStr.split('.');
      const amount = parseInt(intPart || '0', 10) * 100 + parseInt((decPart || '00').padEnd(2, '0').slice(0, 2), 10);
      
      const userId = rawBody.object.metadata?.userId;
      const internalPaymentId = rawBody.object.metadata?.paymentId;
      const metadataType = rawBody.object.metadata?.type;

      // Extract FZ-54 receipt registration info if available
      const receiptId = rawBody.object.receipt_registration === 'succeeded' 
        ? `yookassa_receipt_${gatewayId}` 
        : undefined;

      if (!userId || !gatewayId) {
        return NextResponse.json({ error: 'Missing userId or gatewayId in metadata' }, { status: 400 });
      }

      // Safe confirmation using Double-Check Logic
      const success = await paymentService.confirmPayment(
        gatewayId, amount, userId, false, 'yookassa', internalPaymentId, metadataType, receiptId
      );

      if (success) {
        return NextResponse.json({ success: true, status: 'Payment processed strictly' }, { status: 200 });
      } else {
        return NextResponse.json({ error: 'Payment double-check validation failed' }, { status: 400 });
      }
    }

    return NextResponse.json({ status: 'Ignored unsupported event' }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

