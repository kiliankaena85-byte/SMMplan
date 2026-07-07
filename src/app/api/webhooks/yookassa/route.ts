export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/services/financial/payment.service';
import { db } from '@/lib/db';
import { MutexManager } from '@/lib/redis-lock';

const MAX_BODY_SIZE = 1024 * 64; // 64KB

export async function POST(req: NextRequest) {
  try {
    const { getClientIp } = await import('@/utils/ip');
    const rawIp = await getClientIp();
    const ip = rawIp.replace(/^::ffff:/, '');

    const { SettingsProvider } = await import('@/lib/settings');
    const isTestMode = await SettingsProvider.isTestMode();

    // VULN-025 Mitigation: Enforce webhook secret via query parameter to prevent IP spoofing/SSRF
    const secret = req.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.YOOKASSA_WEBHOOK_SECRET;

    if (process.env.NODE_ENV === 'production') {
      if (!secret || secret !== expectedSecret) {
        console.error(`[YooKassa Webhook] BLOCKED: Missing or invalid secret parameter from IP ${ip}`);
        await db.securityEvent.create({ data: { event: 'INVALID_WEBHOOK_SECRET', severity: 'CRITICAL', ip, details: { gateway: 'yookassa' } } });
        // Return generic error to obscure the actual check failure
        return NextResponse.json({ error: 'Unauthorized IP' }, { status: 403 });
      }
    }

    // --- SECURITY GUARD: Yookassa Official IP Range Validation ---
    // P1: Сверка IP-адреса с официальными подсетями YooKassa
    if (ip) {
      const isLocalhost = ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.0.0.');

      console.info(`[YooKassa Webhook Debug] ip: ${ip}, rawIp: ${rawIp}, isLocalhost: ${isLocalhost}, isTestMode: ${isTestMode}, NODE_ENV: ${process.env.NODE_ENV}, APP_ENV: ${process.env.APP_ENV}`);

      const allowedPrefixes = ['185.75.120.', '185.75.121.', '185.75.122.', '185.75.123.', '185.75.124.', '185.75.125.', '185.75.126.', '185.75.127.', '37.110.12.', '37.110.13.', '37.110.14.', '37.110.15.', '37.110.16.', '37.110.17.', '37.110.18.', '37.110.19.'];
      const isAllowedIp = allowedPrefixes.some(prefix => ip.startsWith(prefix)) || 
                          process.env.NODE_ENV !== 'production' || 
                          (isLocalhost && isTestMode);
      
      if (!isAllowedIp) {
        console.error(`[YooKassa Webhook] BLOCKED: IP spoofing attempt from ${ip}`);
        await db.securityEvent.create({ data: { event: 'SPOOFED_IP_WEBHOOK', severity: 'CRITICAL', ip, details: { gateway: 'yookassa' } } });
        return NextResponse.json({ error: 'Unauthorized IP' }, { status: 403 });
      }
    }

    const providedSignature = req.headers.get('x-sha256-signature') || req.headers.get('digest');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rawBody: Record<string, any>;

    if (!providedSignature && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Signature required' }, { status: 401 });
    }

    if (providedSignature) {
      const webhookSecret = process.env.YOOKASSA_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('[CRITICAL] YOOKASSA_WEBHOOK_SECRET is not set.');
        return NextResponse.json({ error: 'Webhook signature validation not configured' }, { status: 500 });
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

      rawBody = JSON.parse(rawText);
    } else {
      // Signature bypass is secure because confirmPayment performs a real-time GET request to YooKassa's official API
      const allowedPrefixes = ['185.75.120.', '185.75.121.', '185.75.122.', '185.75.123.', '185.75.124.', '185.75.125.', '185.75.126.', '185.75.127.', '37.110.12.', '37.110.13.', '37.110.14.', '37.110.15.', '37.110.16.', '37.110.17.', '37.110.18.', '37.110.19.'];
      const isAllowedIpBypass = ip && (allowedPrefixes.some(prefix => ip.startsWith(prefix)) || process.env.NODE_ENV !== 'production');

      if (isAllowedIpBypass) {
        console.info(`[YooKassa Webhook] Signature bypass granted for IP ${ip}. Verifying via double-check API.`);
        rawBody = await req.json();
      } else {
        await db.securityEvent.create({ data: { event: 'MISSING_SIGNATURE', severity: 'CRITICAL', ip, details: { gateway: 'yookassa' } } });
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }
    }
    
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

      // Wrap the critical idempotency check and confirmation in a distributed Redis lock
      // TTL: 15s (15000ms), Wait Time: 10s (10000ms)
      try {
        const result = await MutexManager.withLock(`webhook_payment_${gatewayId}`, 15000, 10000, async () => {
          let existingPayment = null;
          if (internalPaymentId) {
            existingPayment = await db.payment.findUnique({ where: { id: internalPaymentId } });
          }
          if (!existingPayment && gatewayId) {
            existingPayment = await db.payment.findUnique({ where: { gatewayId } });
          }
          if (existingPayment && existingPayment.status === 'SUCCEEDED') {
            console.info(`[YooKassa Webhook] Payment ${existingPayment.id} already processed (idempotency hit)`);
            return NextResponse.json({ success: true, status: 'Payment processed strictly (idempotent)' }, { status: 200 });
          }

          // Safe confirmation using Double-Check Logic
          const success = await paymentService.confirmPayment(
            gatewayId, amount, userId, isTestMode, 'yookassa', internalPaymentId, metadataType, receiptId
          );

          if (success) {
            return NextResponse.json({ success: true, status: 'Payment processed strictly' }, { status: 200 });
          } else {
            return NextResponse.json({ error: 'Payment double-check validation failed' }, { status: 400 });
          }
        });
        
        return result;
      } catch (lockError) {
        console.error(`[YooKassa Webhook] Failed to acquire lock for payment ${gatewayId}:`, lockError);
        return NextResponse.json({ error: 'Concurrent processing lock timeout' }, { status: 429 });
      }
    }

    return NextResponse.json({ status: 'Ignored unsupported event' }, { status: 200 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

