export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
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

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const redis = getRedisConnection();
  const lockKey = 'cron:price-reconciler:lock';
  const lockToken = crypto.randomUUID();

  // Acquire distributed lock for 5 minutes (300s) with owner token
  const acquired = await redis.set(lockKey, lockToken, 'EX', 300, 'NX');
  if (!acquired) {
    return NextResponse.json({ success: false, reason: 'overlap_prevented' }, { status: 200 });
  }

  try {
    const job = await catalogQueue.add('reconcile-prices-job', {
      type: 'RECONCILE_PRICES',
    });

    return NextResponse.json({
      success: true,
      queued: true,
      jobId: job.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  } finally {
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end`;
      await (redis as any).eval(script, 1, lockKey, lockToken);
    } catch (err) {
      console.error('[Cron Reconcile] Lock release error:', err);
    }
  }
}
