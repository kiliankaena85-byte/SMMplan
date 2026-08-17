import { NextResponse } from 'next/server';
import { orderService } from '@/services/core/order.service';

/**
 * VexBoost / SMM Panel Standard Webhook Handler
 * Endpoint: /api/webhooks/vexboost?secret=YOUR_SECRET
 * 
 * VexBoost often sends POST data with:
 * id (external order ID)
 * status (Pending, In progress, Completed, Partial, Canceled)
 * remains
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // SD-02 SECURITY FIX: Fail-closed — reject all requests if secret is not configured.
  // NEVER fall back to a hardcoded default. This was the #1 most exploitable vulnerability.
  const expectedSecret = process.env.VEXBOOST_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error('[VexBoost Webhook] FATAL: VEXBOOST_WEBHOOK_SECRET is not configured. Rejecting all requests.');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }
  if (secret !== expectedSecret) {
    console.warn('[VexBoost Webhook] Unauthorized access attempt. Secret mismatch.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.formData();
    const externalId = data.get('id')?.toString();
    const status = data.get('status')?.toString();
    const remains = parseInt(data.get('remains')?.toString() || '0', 10);

    if (!externalId || !status) {
      // Fallback to JSON if not FormData
      const jsonData = await request.json().catch(() => ({}));
      const extId = jsonData.id || jsonData.order;
      const st = jsonData.status;
      const rem = parseInt(jsonData.remains || '0', 10);
      
      if (extId && st) {
         await orderService.processStatusUpdate(extId.toString(), st, rem);
         return NextResponse.json({ success: true });
      }

      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Process the update
    const result = await orderService.processStatusUpdate(externalId, status, remains);

    if (result.success) {
      return NextResponse.json({ success: true, orderId: result.orderId });
    } else {
      // Return 200 anyway to prevent provider retries if order is just not found
      return NextResponse.json({ success: false, message: 'Order not found' });
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[VexBoost Webhook] Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** @public Support GET for simple health checks or ping tests */
export async function GET() {
  return NextResponse.json({ status: 'active', provider: 'VexBoost' });
}
