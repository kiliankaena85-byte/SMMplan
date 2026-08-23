interface YooKassaWebhookPayload {
  type?: string;
  event?: string;
  created_at?: string;
  object?: {
    id?: string;
    status?: string;
    paid?: boolean;
    amount?: {
      value?: string;
      currency?: string;
    };
    created_at?: string;
    metadata?: {
      paymentId?: string;
      userId?: string;
      orderId?: string;
      source?: string;
      [key: string]: unknown;
    };
    receipt_registration?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { paymentService } from '@/services/financial/payment.service';
import { db } from '@/lib/db';
import { MutexManager } from '@/lib/redis-lock';
import { SecurityAlertService } from '@/services/security/security-alert.service';

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

    // --- SECURITY GUARD: Yookassa Official IP Range Validation (185.75.120.0/22 and 37.110.12.0/21) ---
    const allowedPrefixes = [
      '185.75.120.', '185.75.121.', '185.75.122.', '185.75.123.',
      '37.110.12.', '37.110.13.', '37.110.14.', '37.110.15.', '37.110.16.', '37.110.17.', '37.110.18.', '37.110.19.'
    ];
    const isLocal = ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.0.0.');
    const isAllowedIp = isDev ? true : (allowedPrefixes.some(prefix => ip.startsWith(prefix)) || isLocal);
    
    if (!isAllowedIp) {
      console.error(`[YooKassa Webhook] BLOCKED: IP spoofing attempt from ${ip}`);
      await SecurityAlertService.record({
        event: 'SPOOFED_IP_WEBHOOK',
        severity: 'CRITICAL',
        ip,
        details: { gateway: 'yookassa' },
      });
      return NextResponse.json({ error: 'Unauthorized IP' }, { status: 403 });
    }

    const expectedSecret = process.env.YOOKASSA_WEBHOOK_SECRET;
    if (!expectedSecret) {
      console.error('[YooKassa] Webhook secret (YOOKASSA_WEBHOOK_SECRET) is not configured on the server.');
      return NextResponse.json({ error: 'Gateway webhook secret not configured' }, { status: 503 });
    }

    const providedSignature = req.headers.get('x-sha256-signature') || req.headers.get('digest');
    if (!providedSignature) {
      console.error('[YooKassa] Webhook missing required signature header');
      await SecurityAlertService.record({
        event: 'MISSING_SIGNATURE',
        severity: 'CRITICAL',
        ip,
        details: { gateway: 'yookassa' },
      });
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 403 });
    }

    const rawText = await req.text();
    if (rawText.length > MAX_BODY_SIZE) {
      console.warn('[Webhook] Oversized payload rejected');
      await SecurityAlertService.record({
        event: 'OVERSIZED_PAYLOAD',
        severity: 'WARNING',
        ip,
        details: { gateway: 'yookassa', size: rawText.length },
      });
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
      await SecurityAlertService.record({
        event: 'INVALID_SIGNATURE_FORMAT',
        severity: 'CRITICAL',
        ip,
        details: { gateway: 'yookassa', signature: providedSignature },
      });
      return NextResponse.json({ error: 'Invalid signature format' }, { status: 403 });
    }

    if (!safeCompare(expectedSig, signatureHex)) {
      console.error('[YooKassa] HMAC signature mismatch — possible webhook forgery attempt');
      await SecurityAlertService.record({
        event: 'SIGNATURE_FAILED',
        severity: 'CRITICAL',
        ip,
        details: { gateway: 'yookassa' },
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const rawBody: YooKassaWebhookPayload = JSON.parse(rawText);
    
    const webhookCreatedAt = rawBody.object?.created_at || rawBody.created_at;
    if (webhookCreatedAt) {
      const webhookTime = new Date(webhookCreatedAt).getTime();
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      if (webhookTime < thirtyMinutesAgo) {
        await SecurityAlertService.record({
          event: 'REPLAY_ATTEMPT',
          severity: 'CRITICAL',
          ip,
          details: { gateway: 'yookassa', webhookTime, gatewayId: rawBody.object?.id },
        });
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
      const metadataType = typeof rawBody.object.metadata?.type === "string" ? rawBody.object.metadata.type : undefined;

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
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[YooKassa Webhook] Webhook error:', errorMsg);
    try {
      const { getClientIp } = await import('@/utils/ip');
      const ip = await getClientIp(req);
      await SecurityAlertService.record({
        event: 'WEBHOOK_PROCESSING_ERROR',
        severity: 'HIGH',
        ip,
        details: { gateway: 'yookassa', error: errorMsg },
      });
    } catch {
      // Ignore secondary error
    }
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
