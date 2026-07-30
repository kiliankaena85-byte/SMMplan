export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock Provider Endpoint (SMM API V2 Sandbox)
 * Used to test the SMM flow safely without hitting real external gateways.
 * 🔒 SECURITY:
 *   - In production: only available when isTestMode=true (for staging testers).
 *   - API Key validated via MOCK_PROVIDER_KEY env var (no hardcoded default).
 *   - If MOCK_PROVIDER_KEY not set → 503 (endpoint unconfigured).
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_ROUTES !== 'true') {
    return new Response('Not Found', { status: 404 });
  }
  // Guard: In production, only allow when isTestMode is enabled in AdminPanel
  const isProduction = (process.env.NODE_ENV as string) === 'production';
  if (isProduction) {
    const { SettingsManager } = await import('@/lib/settings');
    const isTestMode = await SettingsManager.isTestMode();
    if (!isTestMode) {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }
  }

  try {
    const textBody = await req.text();
    const params = new URLSearchParams(textBody);
    
    const key = params.get('key');
    const action = params.get('action');

    // Auth: validate against env-configured key — no hardcoded fallback
    const expectedKey = process.env.MOCK_PROVIDER_KEY;
    if (!expectedKey) {
      return NextResponse.json({ error: 'Mock provider not configured (MOCK_PROVIDER_KEY not set)' }, { status: 503 });
    }
    if (key !== expectedKey) {
      return NextResponse.json({ error: 'Incorrect API key' }, { status: 403 });
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 200 });
  }
}
