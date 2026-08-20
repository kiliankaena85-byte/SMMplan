export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { paymentService } from '@/services/financial/payment.service';
import { db } from '@/lib/db';
import { MutexManager } from '@/lib/redis-lock';

const MAX_BODY_SIZE = 1024 * 64; // 64KB

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function rubToKopecks(value: unknown): bigint {
  if (typeof value !== 'string') {
    throw new Error('INVALID_AMOUNT_FORMAT');
  }

  const normalized = value.trim();

  const decimalMatch = /^(\d+)\.(\d{2})$/.exec(normalized);
  if (decimalMatch) {
    return BigInt(decimalMatch[1]) * BigInt(100) + BigInt(decimalMatch[2]);
  }

  const integerMatch = /^(\d+)$/.exec(normalized);
  if (integerMatch) {
    return BigInt(integerMatch[1]) * BigInt(100);
  }

  throw new Error('INVALID_AMOUNT_FORMAT');
}

export async function POST(req: NextRequest) {
  try {
    const { getClientIp } = await import('@/utils/ip');
    const rawIp = await getClientIp();
    const ip = rawIp.replace(/^::ffff:/, '');

    const { SettingsProvider } = await import('@/lib/settings');
    const isTestMode = await SettingsProvider.isTestMode();

    const isDev = process.env.NODE_ENV === 'development';

    // VULN-025 Mitigation: Check webhook secret if explicitly configured
    const secret = req.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.YOOKASSA_WEBHOOK_SECRET;

    if (expectedSecret && secret && !safeCompare(secret, expectedSecret)) {
      console.error(`[YooKassa Webhook] BLOCKED: Invalid secret parameter from IP ${ip}`);
      await db.securityEvent.create({ data: { event: 'INVALID_WEBHOOK_SECRET', severity: 'CRITICAL', ip, details: { gateway: 'yookassa' } } });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // --- SECURITY GUARD: Yookassa Official IP Range Validation ---
    const isLocalhost = ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.0.0.');
    const hostHeader = req.headers.get('host') || '';
    const isTestDomain = hostHeader.includes('test.') || hostHeader.includes('stage.') || hostHeader.includes('localhost');

    const allowedPrefixes = ['185.75.120.', '185.75.121.', '185.75.122.', '185.75.123.', '185.75.124.', '185.75.125.', '185.75.126.', '185.75.127.', '37.110.12.', '37.110.13.', '37.110.14.', '37.110.15.', '37.110.16.', '37.110.17.', '37.110.18.', '37.110.19.'];
    const isAllowedIp = isDev || isTestMode || isTestDomain || isLocalhost || allowedPrefixes.some(prefix => ip.startsWith(prefix));
    
    if (!isAllowedIp) {
      console.error(`[YooKassa Webhook] BLOCKED: IP spoofing attempt from ${ip}`);
      await db.securityEvent.create({ data: { event: 'SPOOFED_IP_WEBHOOK', severity: 'CRITICAL', ip, details: { gateway: 'yookassa' } } });
      return NextResponse.json({ error: 'Unauthorized IP' }, { status: 403 });
    }

    const providedSignature = req.headers.get('x-sha256-signature') || req.headers.get('digest');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rawBody: Record<string, any>;

    if (providedSignature && expectedSecret) {
      const rawText = await req.text();
      if (rawText.length > MAX_BODY_SIZE) {
        console.warn('[Webhook] Oversized payload rejected');
        await db.securityEvent.create({ data: { event: 'OVERSIZED_PAYLOAD', severity: 'WARNING', ip, details: { gateway: 'yookassa', size: rawText.length } } });
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
      }

      const crypto = (await import('crypto')).default;
      const expectedSig = crypto
        .createHmac('sha256', expectedSecret)
        .update(rawText, 'utf8')
        .digest('hex');

      const signatureHex = providedSignature.replace(/^sha256=/i, '');
      const HEX_REGEX = /^[0-9a-f]{64}$/i;
      
      if (!HEX_REGEX.test(signatureHex)) {
        await db.securityEvent.create({ data: { event: 'INVALID_SIGNATURE_FORMAT', severity: 'CRITICAL', ip, details: { gateway: 'yookassa', signature: providedSignature } } });
        return NextResponse.json({ error: 'Invalid signature format' }, { status: 403 });
      }

      if (!safeCompare(expectedSig, signatureHex)) {
        console.error('[YooKassa] HMAC signature mismatch — possible webhook forgery attempt');
        await db.securityEvent.create({ data: { event: 'SIGNATURE_FAILED', severity: 'CRITICAL', ip, details: { gateway: 'yookassa' } } });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }

      rawBody = JSON.parse(rawText);
    } else {
      rawBody = await req.json();
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

    if (rawBody.event === 'payment.succeeded' && rawBody.object) {
      const gatewayId = rawBody.object.id;
      if (typeof gatewayId !== 'string' || gatewayId.trim().length === 0) {
        console.error('[YooKassa Webhook] Missing or invalid gatewayId');
        return NextResponse.json({ error: 'Invalid gatewayId' }, { status: 400 });
      }

      const currency = String(rawBody.object.amount?.currency || '').toUpperCase();
      if (currency !== 'RUB') {
        console.error(`[YooKassa Webhook] Invalid currency: ${currency}`);
        return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
      }

      let amountCents: bigint;
      try {
        amountCents = rubToKopecks(rawBody.object.amount?.value);
      } catch {
        console.error('[YooKassa Webhook] Failed to parse amount via rubToKopecks');
        return NextResponse.json({ error: 'Invalid amount format' }, { status: 400 });
      }
      
      const userId = rawBody.object.metadata?.userId;
      const internalPaymentId = rawBody.object.metadata?.paymentId;
      const metadataType = rawBody.object.metadata?.type;

      const receiptId = rawBody.object.receipt_registration === 'succeeded' 
        ? `yookassa_receipt_${gatewayId}` 
        : undefined;

      if (!userId) {
        return NextResponse.json({ error: 'Missing userId in metadata' }, { status: 400 });
      }

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

          const success = await paymentService.confirmPayment(
            gatewayId, amountCents, userId, isTestMode, 'yookassa', internalPaymentId, metadataType, receiptId
          );

          if (success) {
            const LARGE_PAYMENT_THRESHOLD = BigInt(50_000_00);
            if (amountCents >= LARGE_PAYMENT_THRESHOLD) {
              import('@/lib/notifications').then(async ({ sendAdminAlert }) => {
                const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
                const email = user?.email || userId;
                const formattedRub = (Number(amountCents) / 100).toLocaleString('ru-RU');
                sendAdminAlert(
                  `💰 Large payment: ${formattedRub} ₽ from ${email}`,
                  'INFO'
                );
              }).catch(err => console.error('[YooKassa Webhook] Large payment alert failed', err));
            }
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

