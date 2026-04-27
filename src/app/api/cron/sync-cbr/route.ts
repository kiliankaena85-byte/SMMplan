export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { CBRRateService } from '@/services/system/cbr-rate.service';

/**
 * T-007: Cron endpoint to sync CBR Exchange Rate.
 * Triggered by external cron job (e.g., Vercel Cron, GitHub Actions, or local crontab).
 */
export async function GET(req: NextRequest) {
  // Basic security: require CRON_SECRET token
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await CBRRateService.syncCBRExchangeRate();
    return NextResponse.json({
      success: true,
      rate: result.rate,
      updated: result.updated,
      message: result.updated 
        ? 'Exchange rate updated successfully' 
        : 'Exchange rate unchanged (CBR API issue or rate already current)'
    });
  } catch (error: any) {
    console.error('[Cron] CBR Sync API error:', error.message);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
