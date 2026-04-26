import { NextResponse } from 'next/server';
import syncProcessor from '@/workers/processors/sync.processor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    console.warn('[SyncOrdersCron] Unauthorized access attempt blocked');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[SyncOrdersCron] Starting inline synchronous order sync...');
    
    // We execute the processor inline, mimicking the BullMQ job injection.
    // This allows synchronization to run on Vercel/Cloudflare serverless edge
    // even if the long-running worker process crashes.
    const dummyJob = {
      id: `cron-${Date.now()}`,
      data: { timestamp: Date.now() }
    } as any;

    await syncProcessor(dummyJob);

    console.log('[SyncOrdersCron] Synchronization completed successfully.');
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('[SyncOrdersCron] Error during execution:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
