import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { providerService } from '@/services/providers/provider.service';
import { RefundPolicyService } from '@/services/financial/refund-policy.service';
import { runSerializableTransaction } from '@/lib/transactions';
import { RateLimitService } from '@/services/core/rate-limit.service';
import { SecurityAlertService } from '@/services/security/security-alert.service';
import { getClientIp } from '@/utils/ip';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const ip = await getClientIp(request);

  try {
    const isAllowed = await RateLimitService.check('vexboostWebhook', 60, 60);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const secret = request.headers.get('x-webhook-secret') || request.headers.get('x-vexboost-secret');
    const timestamp = request.headers.get('x-timestamp');

    // 1. Replay defense check
    if (timestamp) {
      const reqTime = parseInt(timestamp, 10);
      if (isNaN(reqTime) || Math.abs(Date.now() - reqTime) > 5 * 60 * 1000) {
        await SecurityAlertService.record({
          event: 'REPLAY_ATTEMPT',
          severity: 'HIGH',
          ip,
          details: { gateway: 'vexboost', timestamp },
        });
        return NextResponse.json({ error: 'Webhook timestamp expired or invalid' }, { status: 403 });
      }
    }

    // 2. Secret validation
    const expectedSecret = process.env.VEXBOOST_WEBHOOK_SECRET;
    if (!expectedSecret) {
      console.error('[VexBoost Webhook] FATAL: VEXBOOST_WEBHOOK_SECRET is not configured. Rejecting all requests.');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }

    if (!secret) {
      console.warn('[VexBoost Webhook] Missing webhook secret.');
      await SecurityAlertService.record({
        event: 'MISSING_SECRET',
        severity: 'WARNING',
        ip,
        details: { gateway: 'vexboost' },
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secretBuffer = Buffer.from(secret);
    const expectedBuffer = Buffer.from(expectedSecret);

    if (
      secretBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(secretBuffer, expectedBuffer)
    ) {
      console.warn('[VexBoost Webhook] Unauthorized access attempt. Secret mismatch.');
      await SecurityAlertService.record({
        event: 'UNAUTHORIZED_WEBHOOK_ACCESS',
        severity: 'CRITICAL',
        ip,
        details: { gateway: 'vexboost' },
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let externalId: string | undefined;
    try {
      const data = await request.formData();
      externalId = data.get('id')?.toString() || data.get('order')?.toString();
    } catch {
      const jsonData = await request.json().catch(() => ({}));
      externalId = jsonData.id?.toString() || jsonData.order?.toString();
    }

    if (!externalId) {
      return NextResponse.json({ error: 'Missing order ID in payload' }, { status: 400 });
    }

    // 3. Zero-Trust Verification: Find order and fetch genuine status from Provider API
    const order = await db.order.findFirst({
      where: {
        status: { in: ['IN_PROGRESS', 'AWAITING_PAYMENT', 'PENDING', 'PENDING_CHECK'] },
        OR: [
          { externalId },
          { dripExternalIds: { has: externalId } }
        ]
      },
      include: { service: true, user: { select: { email: true } } }
    });

    if (!order) {
      return NextResponse.json({ message: 'Order not found or not active' }, { status: 200 });
    }

    if (!order.providerId) {
      return NextResponse.json({ error: 'Order has no assigned provider' }, { status: 400 });
    }

    const providerDef = await db.provider.findUnique({ where: { id: order.providerId } });
    if (!providerDef) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 400 });
    }

    const providerInstance = await providerService.getWorkerProviderInstance(providerDef);
    const statuses = await providerInstance.getMultiOrderStatus([externalId]);
    const s = statuses[externalId];

    if (!s || typeof s === 'string') {
      return NextResponse.json({ error: 'Provider API returned invalid status during verification' }, { status: 400 });
    }

    const verifiedStatus = s.status.toUpperCase();
    const parsedRemains = parseInt(s.remains || '0', 10);

    if (['CANCELED', 'CANCELLED'].includes(verifiedStatus)) {
      await runSerializableTransaction(async (tx) => {
        const updated = await tx.order.updateMany({
          where: { id: order.id, status: { in: ['PENDING', 'IN_PROGRESS', 'PENDING_CHECK'] } },
          data: { status: 'CANCELED', remains: parsedRemains }
        });
        if (updated.count > 0) {
          const freshOrder = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
          await RefundPolicyService.processRefund({ ...freshOrder, charge: Number(freshOrder.charge) }, '(Отмена на стороне провайдера VexBoost)', tx);
        }
      });
    } else if (['PARTIAL'].includes(verifiedStatus)) {
      await runSerializableTransaction(async (tx) => {
        const updated = await tx.order.updateMany({
          where: { id: order.id, status: { in: ['PENDING', 'IN_PROGRESS', 'PENDING_CHECK'] } },
          data: { status: 'PARTIAL', remains: parsedRemains }
        });
        if (updated.count > 0) {
          const freshOrder = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
          await RefundPolicyService.processRefund({ ...freshOrder, charge: Number(freshOrder.charge) }, '', tx);
        }
      });
    } else if (['COMPLETED'].includes(verifiedStatus)) {
      await runSerializableTransaction(async (tx) => {
        await tx.order.updateMany({
          where: { id: order.id, status: { in: ['PENDING', 'IN_PROGRESS', 'PENDING_CHECK'] } },
          data: { status: 'COMPLETED', remains: 0 }
        });
      });
    } else {
      await db.order.updateMany({
        where: { id: order.id, status: { in: ['PENDING', 'IN_PROGRESS', 'PENDING_CHECK'] } },
        data: { remains: parsedRemains }
      });
    }

    return NextResponse.json({ success: true, verifiedStatus, orderId: order.id });
  } catch (error: unknown) {
    console.error('[VexBoost Webhook] Error:', (error instanceof Error ? error.message : String(error)));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** @public Support GET for simple health checks or ping tests */
export async function GET() {
  return NextResponse.json({ status: 'active', provider: 'VexBoost' });
}
