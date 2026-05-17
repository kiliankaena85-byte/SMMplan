import { NextResponse } from 'next/server';
import syncProcessor from '@/workers/processors/sync.processor';
import { getRedisConnection } from '@/lib/queue-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const secret = authHeader?.replace('Bearer ', '');

  if (secret !== process.env.CRON_SECRET) {
    console.warn('[SyncOrdersCron] Unauthorized access attempt blocked');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.info('[SyncOrdersCron] Starting inline synchronous order sync...');
    const redis = getRedisConnection();
    const lockKey = 'cron:sync-orders:lock';
    
    // Acquire lock for 2 minutes (prevent overlap starvation)
    const acquired = await redis.set(lockKey, '1', 'EX', 120, 'NX');
    if (!acquired) {
      console.warn('[SyncOrdersCron] Skipped. Another sync process is already running.');
      return NextResponse.json({ success: false, reason: 'overlap_prevented' }, { status: 200 });
    }
    
    try {
      const dummyJob = {
        id: `cron-${Date.now()}`,
        data: { timestamp: Date.now() }
      } as any;
  
      await syncProcessor(dummyJob);
    } finally {
      // Release lock
      await redis.del(lockKey);
    }

    console.info('[SyncOrdersCron] Synchronization completed successfully.');
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('[SyncOrdersCron] Error during execution:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

