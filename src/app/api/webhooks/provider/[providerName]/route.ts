/**
 * (c) 2024-2026 SMMplan. All rights reserved.
 * Provider Webhook Receiver with HMAC Signature & Replay Defense.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerName: string }> }
) {
  const { providerName } = await params;

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-signature') || request.headers.get('x-hub-signature-256');
    const timestamp = request.headers.get('x-timestamp');

    // 1. Mandatory Timestamp Freshness (prevent replay attack within 5 minutes)
    if (!timestamp) {
      return NextResponse.json({ error: 'Missing x-timestamp header' }, { status: 403 });
    }
    const reqTime = parseInt(timestamp, 10);
    if (isNaN(reqTime) || Math.abs(Date.now() - reqTime) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Webhook timestamp expired or invalid' }, { status: 403 });
    }

    // 2. Fetch Provider
    const provider = await db.provider.findUnique({
      where: { name: providerName },
    });

    if (!provider || !provider.isActive) {
      return NextResponse.json({ error: 'Provider inactive or not found' }, { status: 404 });
    }

    // 3. Mandatory HMAC Signature Verification
    const secret = process.env.PROVIDER_WEBHOOK_SECRET || provider.apiKey;
    if (!secret) {
      return NextResponse.json({ error: 'Provider webhook secret not configured' }, { status: 503 });
    }
    if (!signature) {
      return NextResponse.json({ error: 'Missing x-signature header' }, { status: 403 });
    }

    const expectedSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const cleanSig = signature.startsWith('sha256=') ? signature.slice(7) : signature;

    if (
      cleanSig.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(cleanSig), Buffer.from(expectedSig))
    ) {
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 403 });
    }

    const payload = JSON.parse(rawBody);
    const { orderId, providerOrderId, status } = payload;

    if (!orderId && !providerOrderId) {
      return NextResponse.json({ error: 'Missing order identifiers' }, { status: 400 });
    }

    // 4. Update Order Status
    const targetStatus = status === 'COMPLETED' ? 'COMPLETED' : status === 'CANCELED' ? 'CANCELED' : 'IN_PROGRESS';

    const updated = await db.order.updateMany({
      where: {
        OR: [
          orderId ? { id: String(orderId) } : {},
          providerOrderId ? { externalId: String(providerOrderId) } : {},
        ],
      },
      data: {
        status: targetStatus,
      },
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ProviderWebhook:${providerName}] Error processing webhook:`, errorMsg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
