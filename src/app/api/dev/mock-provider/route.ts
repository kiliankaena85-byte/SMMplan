export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock Provider Endpoint (SMM API V2 Sandbox)
 * Used to test the SMM flow safely without hitting real external gateways.
 * 🔒 SECURITY: Blocked in production. Key validated via MOCK_PROVIDER_KEY env var.
 * Admin should configure a Provider with URL: /api/dev/mock-provider
 * and API Key matching process.env.MOCK_PROVIDER_KEY (default: 'mock-dev-key')
 */
export async function POST(req: NextRequest) {
  // Guard: Disable in production entirely
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const textBody = await req.text();
    const params = new URLSearchParams(textBody);
    
    const key = params.get('key');
    const action = params.get('action');

    // Auth: validate against env-configured key (not hardcoded)
    const expectedKey = process.env.MOCK_PROVIDER_KEY ?? 'mock-dev-key';
    if (key !== expectedKey) {
      return NextResponse.json({ error: 'Incorrect API key' }, { status: 200 });
    }

    // 1. Balance Action
    if (action === 'balance') {
      return NextResponse.json({
        balance: '10000.00',
        currency: 'RUB'
      });
    }

    // 2. Services Action
    if (action === 'services') {
      return NextResponse.json([
        {
          service: '100',
          name: 'Mock Telegram Followers',
          type: 'Default',
          category: 'Telegram',
          rate: '10.00',
          min: '10',
          max: '10000',
          dripfeed: true,
          refill: false,
          cancel: true
        }
      ]);
    }

    // 3. Add (Order) Action
    if (action === 'add') {
      const quantity = parseInt(params.get('quantity') || '0', 10);
      const link = params.get('link');
      
      if (!link) {
        return NextResponse.json({ error: 'Link is missing in payload' }, { status: 200 });
      }

      // Simulate success response returning a tracker ID
      return NextResponse.json({
        order: `mock_${Date.now()}`
      });
    }

    // 4. Status Action
    if (action === 'status') {
      // Support both 'order' (single) and 'orders' (multi) parameter names
      const orderArg = params.get('order') || params.get('orders');
      if (!orderArg) {
        return NextResponse.json({ error: 'Order ID missing' }, { status: 200 });
      }

      // If user sends multiple comma-separated IDs
      if (orderArg.includes(',')) {
        const ids = orderArg.split(',');
        const response: any = {};
        for (const id of ids) {
          response[id] = {
            status: 'Completed',
            charge: '0.00',
            start_count: '0',
            remains: '0',
            currency: 'RUB'
          };
        }
        return NextResponse.json(response);
      }

      // Single ID status
      return NextResponse.json({
        status: 'Completed',
        charge: '0.00',
        start_count: '0',
        remains: '0',
        currency: 'RUB'
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 200 });
  }
}
