export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { SettingsProvider } from '@/lib/settings';
import { adminCatalogService } from '@/services/admin/catalog.service';
import { getRedisConnection, catalogQueue } from '@/lib/queue-manager';
import crypto from 'crypto';

/**
 * P-D: Cron endpoint to reconcile and synchronize denormalized prices across all services.
 * Triggered by external cron or internal worker scheduler.
 */
export async function GET(req: NextRequest) {
  // Timing-safe Bearer authorization
  const authHeader = req.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET || '';
  const expectedAuth = `Bearer ${cronSecret}`;

  let isAuthorized = false;
  if (cronSecret && authHeader.length === expectedAuth.length) {
    isAuthorized = crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedAuth));
  }

  if (!isAuthorized && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const redis = getRedisConnection();
  const lockKey = 'cron:reconcile-prices:lock';

  // Acquire distributed lock for 10 minutes
  const acquired = await redis.set(lockKey, '1', 'EX', 600, 'NX');
  if (!acquired) {
    return NextResponse.json({ success: false, reason: 'overlap_prevented' }, { status: 200 });
  }

  try {
    const usdRate = await SettingsProvider.getExchangeRateUSD();
    const result = await adminCatalogService.syncDenormalizedPrices(usdRate);

    // Also queue cache revalidation
    await catalogQueue.add('sync-prices-bg', {
      type: 'SYNC_PRICES',
      usdToRub: usdRate,
    });

    return NextResponse.json({
      success: true,
      usdRate,
      updatedCount: result.updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  } finally {
    await redis.del(lockKey);
  }
}
