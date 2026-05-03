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

  // Security: Check if secret matches env variable
  const expectedSecret = process.env.VEXBOOST_WEBHOOK_SECRET || 'dev_secret_123';
  if (secret !== expectedSecret) {
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
  } catch (error: any) {
    console.error('[VexBoost Webhook] Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Support GET for simple health checks or ping tests
export async function GET() {
  return NextResponse.json({ status: 'active', provider: 'VexBoost' });
}
