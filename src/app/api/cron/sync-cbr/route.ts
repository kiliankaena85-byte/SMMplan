export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { CBRRateService } from '@/services/system/cbr-rate.service';
import { getRedisConnection } from '@/lib/queue-manager';

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
    const redis = getRedisConnection();
    const lockKey = 'cron:sync-cbr:lock';
    
    // Acquire lock for 2 hours (CBR syncs infrequently, no need to overlap)
    const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 7200);
    if (!acquired) {
      console.warn('[SyncCBRCron] Skipped. Another CBR sync process is already running.');
      return NextResponse.json({ success: false, reason: 'overlap_prevented' }, { status: 200 });
    }
    
    let result;
    try {
      result = await CBRRateService.syncCBRExchangeRate();
    } finally {
      await redis.del(lockKey);
    }
    
    return NextResponse.json({
      success: true,
      nominalRate: result.nominalRate,
      systemRateWithSpread: result.systemRate,
      updated: result.updated,
      message: result.updated 
        ? `Exchange rate updated successfully. Built-in 3% spread applied.` 
        : `Exchange rate unchanged (CBR API issue or rate already current).`
    });
  } catch (error: any) {
    console.error('[Cron] CBR Sync API error:', error.message);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
