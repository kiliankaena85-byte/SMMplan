export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock Provider Endpoint (SMM API V2 Sandbox & Chaos Engine)
 * Used to test the entire SMM order, refill, sync, and cancellation flow safely.
 *
 * 🔒 SECURITY & ACCESS:
 *   - Allowed in development / test mode (`NODE_ENV !== 'production'`).
 *   - Allowed on staging/production if `ENABLE_DEV_ROUTES === 'true'` OR `isTestMode === true` in SystemSettings.
 *   - Returns 404 if disabled in production.
 *   - Validated via MOCK_PROVIDER_KEY.
 *
 * 🧪 CHAOS TRIGGER MARKS (in `link` param):
 *   - `https://test.me/fail-create`   -> Error: Not enough balance on provider
 *   - `https://test.me/bad-link`      -> Error: Invalid link format or private profile
 *   - `https://test.me/service-down`  -> Error: Service is temporarily inactive
 *   - `https://test.me/http-500`      -> HTTP 500 Internal Server Error
 *   - `https://test.me/timeout`       -> Delay > 15s to trigger timeout abort
 *   - `https://test.me/partial`       -> Progresses to 'Partial' (40% remains)
 *   - `https://test.me/canceled`      -> Progresses to 'Canceled' (0 charge, full remains)
 *   - `https://test.me/deadlock`      -> Stays 'In progress' indefinitely
 *   - Default                         -> Time-based: Pending (0-8s) -> In progress (8-20s) -> Completed (>20s)
 */

interface MockStatusResult {
  status: 'Pending' | 'In progress' | 'Processing' | 'Completed' | 'Partial' | 'Canceled';
  charge: string;
  start_count: string;
  remains: string;
  currency: string;
}

function calculateOrderStatus(orderId: string): MockStatusResult {
  // Format: mock_{type}_{timestamp}_q{quantity}
  // Fallback: mock_{timestamp}
  const parts = orderId.split('_');
  let type = 'std';
  let timestamp = Date.now();
  let quantity = 100;

  if (parts.length >= 4) {
    type = parts[1];
    timestamp = parseInt(parts[2], 10) || Date.now();
    const qPart = parts[3];
    if (qPart.startsWith('q')) {
      quantity = parseInt(qPart.substring(1), 10) || 100;
    }
  } else if (parts.length === 2) {
    timestamp = parseInt(parts[1], 10) || Date.now();
  }

  const now = Date.now();
  const ageSec = Math.max(0, (now - timestamp) / 1000);

  if (type === 'deadlock') {
    return {
      status: 'In progress',
      charge: '0.00',
      start_count: '0',
      remains: quantity.toString(),
      currency: 'RUB',
    };
  }

  if (type === 'canceled') {
    if (ageSec < 6) {
      return {
        status: 'Pending',
        charge: '0.00',
        start_count: '0',
        remains: quantity.toString(),
        currency: 'RUB',
      };
    }
    return {
      status: 'Canceled',
      charge: '0.00',
      start_count: '0',
      remains: quantity.toString(),
      currency: 'RUB',
    };
  }

  if (type === 'partial') {
    if (ageSec < 8) {
      return {
        status: 'In progress',
        charge: '0.00',
        start_count: '100',
        remains: quantity.toString(),
        currency: 'RUB',
      };
    }
    const remains = Math.max(1, Math.floor(quantity * 0.4));
    const completed = quantity - remains;
    return {
      status: 'Partial',
      charge: (completed * 0.01).toFixed(2),
      start_count: '100',
      remains: remains.toString(),
      currency: 'RUB',
    };
  }

  // Standard lifecycle: Pending (<8s) -> In progress (8-20s) -> Completed (>=20s)
  if (ageSec < 8) {
    return {
      status: 'Pending',
      charge: '0.00',
      start_count: '0',
      remains: quantity.toString(),
      currency: 'RUB',
    };
  }

  if (ageSec < 20) {
    const remains = Math.max(1, Math.floor(quantity * 0.5));
    return {
      status: 'In progress',
      charge: '0.00',
      start_count: '100',
      remains: remains.toString(),
      currency: 'RUB',
    };
  }

  return {
    status: 'Completed',
    charge: (quantity * 0.01).toFixed(2),
    start_count: '100',
    remains: '0',
    currency: 'RUB',
  };
}

export async function POST(req: NextRequest) {
  // ── 1. Security & Staging Guard ──────────────────────────────────────────
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_ROUTES !== 'true') {
    return new Response('Not Found', { status: 404 });
  }

  try {
    const textBody = await req.text();
    const params = new URLSearchParams(textBody);

    const key = params.get('key');
    const action = params.get('action');

    // ── 2. Auth: API key validation ───────────────────────────────────────────
    const expectedKey = process.env.MOCK_PROVIDER_KEY;
    if (!expectedKey) {
      return NextResponse.json(
        { error: 'Mock provider not configured (MOCK_PROVIDER_KEY not set)' },
        { status: 503 }
      );
    }
    if (key !== expectedKey) {
      return NextResponse.json({ error: 'Incorrect API key' }, { status: 403 });
    }

    // ── 3. Action: Balance ───────────────────────────────────────────────────
    if (action === 'balance') {
      return NextResponse.json({
        balance: '150000.00',
        currency: 'RUB',
      });
    }

    // ── 4. Action: Services ──────────────────────────────────────────────────
    if (action === 'services') {
      return NextResponse.json([
        {
          service: '100',
          name: 'Mock Telegram Subscribers (High Speed)',
          type: 'Default',
          category: 'Telegram',
          rate: '10.00',
          min: '10',
          max: '50000',
          dripfeed: true,
          refill: true,
          cancel: true,
        },
        {
          service: '101',
          name: 'Mock Telegram Post Views',
          type: 'Default',
          category: 'Telegram',
          rate: '1.50',
          min: '50',
          max: '100000',
          dripfeed: true,
          refill: false,
          cancel: true,
        },
        {
          service: '200',
          name: 'Mock VKontakte Followers (Real)',
          type: 'Default',
          category: 'ВКонтакте',
          rate: '15.00',
          min: '20',
          max: '20000',
          dripfeed: true,
          refill: true,
          cancel: true,
        },
        {
          service: '300',
          name: 'Mock Instagram Followers (HQ)',
          type: 'Default',
          category: 'Instagram',
          rate: '25.00',
          min: '10',
          max: '50000',
          dripfeed: true,
          refill: true,
          cancel: true,
        },
        {
          service: '400',
          name: 'Mock YouTube Views (Monetizable)',
          type: 'Default',
          category: 'YouTube',
          rate: '50.00',
          min: '100',
          max: '500000',
          dripfeed: true,
          refill: true,
          cancel: false,
        },
      ]);
    }

    // ── 5. Action: Add (Order Creation with Chaos Triggers) ──────────────────
    if (action === 'add') {
      const quantity = parseInt(params.get('quantity') || '100', 10);
      const link = (params.get('link') || '').toLowerCase().trim();

      if (!link) {
        return NextResponse.json({ error: 'Link is missing in payload' }, { status: 200 });
      }

      // Chaos trigger: HTTP 500
      if (link.includes('http-500')) {
        return NextResponse.json({ error: 'Internal Gateway Error (Chaos 500)' }, { status: 500 });
      }

      // Chaos trigger: Timeout (>15s)
      if (link.includes('timeout')) {
        await new Promise((resolve) => setTimeout(resolve, 16000));
      }

      // Chaos trigger: Balance exhaustion
      if (link.includes('fail-create') || link.includes('not-enough-balance')) {
        return NextResponse.json({ error: 'Not enough balance on provider' }, { status: 200 });
      }

      // Chaos trigger: Bad link format
      if (link.includes('bad-link') || link.includes('invalid-link')) {
        return NextResponse.json({ error: 'Invalid link format or private profile' }, { status: 200 });
      }

      // Chaos trigger: Service down
      if (link.includes('service-down')) {
        return NextResponse.json({ error: 'Service is temporarily inactive' }, { status: 200 });
      }

      // Determine order simulation type
      let type = 'std';
      if (link.includes('partial')) type = 'partial';
      else if (link.includes('canceled') || link.includes('cancelled')) type = 'canceled';
      else if (link.includes('deadlock') || link.includes('stuck')) type = 'deadlock';

      const orderId = `mock_${type}_${Date.now()}_q${quantity}`;
      return NextResponse.json({ order: orderId });
    }

    // ── 6. Action: Status (Single & Batch) ───────────────────────────────────
    if (action === 'status') {
      const orderArg = params.get('order') || params.get('orders');
      if (!orderArg) {
        return NextResponse.json({ error: 'Order ID missing' }, { status: 200 });
      }

      if (orderArg.includes(',')) {
        const ids = orderArg.split(',').map((s) => s.trim()).filter(Boolean);
        const response: Record<string, MockStatusResult> = {};
        for (const id of ids) {
          response[id] = calculateOrderStatus(id);
        }
        return NextResponse.json(response);
      }

      // Single ID status
      const statusObj = calculateOrderStatus(orderArg.trim());
      return NextResponse.json(statusObj);
    }

    // ── 7. Action: Refill (Guarantee Refill Request) ─────────────────────────
    if (action === 'refill') {
      const orderId = params.get('order');
      if (!orderId) {
        return NextResponse.json({ error: 'Order ID missing for refill' }, { status: 200 });
      }

      if (orderId.includes('no-refill') || orderId.includes('fail-refill')) {
        return NextResponse.json(
          { error: 'Order is not eligible for refill or guarantee period expired' },
          { status: 200 }
        );
      }

      const refillId = `mock_refill_${Date.now()}_${orderId}`;
      return NextResponse.json({ refill: refillId });
    }

    // ── 8. Action: Refill Status ─────────────────────────────────────────────
    if (action === 'refill_status') {
      const refillId = params.get('refill');
      if (!refillId) {
        return NextResponse.json({ error: 'Refill ID missing' }, { status: 200 });
      }

      if (refillId.includes('rejected')) {
        return NextResponse.json({ status: 'Rejected' });
      }

      // Calculate refill lifecycle: Pending (<8s) -> In progress (8-20s) -> Completed (>=20s)
      const parts = refillId.split('_');
      const timestamp = parts.length >= 3 ? parseInt(parts[2], 10) || Date.now() : Date.now();
      const ageSec = Math.max(0, (Date.now() - timestamp) / 1000);

      if (ageSec < 8) {
        return NextResponse.json({ status: 'Pending' });
      }
      if (ageSec < 20) {
        return NextResponse.json({ status: 'In progress' });
      }
      return NextResponse.json({ status: 'Completed' });
    }

    // ── 9. Action: Cancel ────────────────────────────────────────────────────
    if (action === 'cancel') {
      const orderArg = params.get('order') || params.get('orders');
      if (!orderArg) {
        return NextResponse.json({ error: 'Order ID missing for cancel' }, { status: 200 });
      }

      if (orderArg.includes(',')) {
        const ids = orderArg.split(',').map((s) => s.trim()).filter(Boolean);
        const result = ids.map((id) => ({
          order: id,
          cancel: { status: 'Success' },
        }));
        return NextResponse.json(result);
      }

      return NextResponse.json([
        {
          order: orderArg.trim(),
          cancel: { status: 'Success' },
        },
      ]);
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 200 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 200 });
  }
}
