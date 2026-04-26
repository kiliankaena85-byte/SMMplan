import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  let dbLatency = 0;
  
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
    dbStatus = 'connected';
  } catch (err: any) {
    console.error('[Healthcheck] DB Error:', err.message);
    dbStatus = 'error';
  }

  const duration = Date.now() - startTime;
  const isHealthy = dbStatus === 'connected';

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      services: {
         database: {
            status: dbStatus,
            latency_ms: dbLatency
         }
      },
      timestamp: new Date().toISOString(),
      total_latency_ms: duration,
      version: process.env.npm_package_version || '1.0.0',
      uptime_s: Math.round(process.uptime()),
      environment: process.env.NODE_ENV
    },
    { status: isHealthy ? 200 : 503 }
  );
}
