import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { ordersQueue } from '@/workers/queues';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const WORKER_HEARTBEAT_KEY = 'worker:heartbeat';
const WORKER_STALE_THRESHOLD_MS = 130_000; // 130s: 60s interval + 70s tolerance

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const secret = authHeader?.replace('Bearer ', '');
  const isAuthorized = secret === process.env.CRON_SECRET;

  const startTime = Date.now();

  // ── 1. Database ──────────────────────────────────────────────────────────
  let dbStatus: 'connected' | 'error' = 'error';
  let dbLatencyMs = 0;
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = 'connected';
  } catch {
    // dbStatus remains 'error'
  }

  // ── 2. Redis ─────────────────────────────────────────────────────────────
  let redisStatus: 'connected' | 'error' = 'error';
  let redisLatencyMs = 0;
  try {
    const redisStart = Date.now();
    await redis.ping();
    redisLatencyMs = Date.now() - redisStart;
    redisStatus = 'connected';
  } catch {
    // redisStatus remains 'error'
  }

  // ── 3. Worker Heartbeat ───────────────────────────────────────────────────
  let workerStatus: 'alive' | 'stale' | 'missing' = 'missing';
  let workerLastSeenMs: number | null = null;
  if (redisStatus === 'connected') {
    try {
      const heartbeat = await redis.get(WORKER_HEARTBEAT_KEY);
      if (heartbeat) {
        workerLastSeenMs = Date.now() - parseInt(heartbeat, 10);
        workerStatus = workerLastSeenMs < WORKER_STALE_THRESHOLD_MS ? 'alive' : 'stale';
      }
    } catch {
      // workerStatus remains 'missing'
    }
  }

  // ── 4. Queue Depth ────────────────────────────────────────────────────────
  let queueDepth: number | null = null;
  if (redisStatus === 'connected') {
    try {
      queueDepth = await ordersQueue.getWaitingCount();
    } catch {
      // non-critical, leave as null
    }
  }

  // ── Health determination ──────────────────────────────────────────────────
  const isCritical = dbStatus === 'error' || redisStatus === 'error';
  const isDegraded = workerStatus === 'stale' || workerStatus === 'missing' || (queueDepth !== null && queueDepth > 100);
  const overallStatus = isCritical ? 'unhealthy' : isDegraded ? 'degraded' : 'healthy';
  const httpStatus = isCritical ? 503 : 200;

  if (!isAuthorized) {
    return NextResponse.json(
      { status: overallStatus, timestamp: new Date().toISOString() },
      { status: httpStatus }
    );
  }

  return NextResponse.json(
    {
      status: overallStatus,
      services: {
        database: { status: dbStatus, latency_ms: dbLatencyMs },
        redis: { status: redisStatus, latency_ms: redisLatencyMs },
        worker: {
          status: workerStatus,
          last_seen_ms: workerLastSeenMs,
        },
        queue: {
          orders_waiting: queueDepth,
          status: queueDepth !== null && queueDepth > 100 ? 'backlogged' : 'normal',
        },
      },
      timestamp: new Date().toISOString(),
      total_latency_ms: Date.now() - startTime,
      uptime_s: Math.round(process.uptime()),
    },
    { status: httpStatus }
  );
}
