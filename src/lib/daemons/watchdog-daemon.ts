import { redis } from '@/lib/redis';
import { db } from '@/lib/db';
import { ordersQueue } from '@/lib/queue-manager';
import { DirectEmergencyAlertService } from '@/lib/notifications/direct-emergency-alert.service';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'WatchdogDaemon' });

let isStarted = false;
let watchdogInterval: NodeJS.Timeout | null = null;

const HEARTBEAT_STALE_THRESHOLD_MS = 120_000; // 120 seconds
const STUCK_ORDER_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Runs a single health check sweep of the queue pipeline
 */
export async function runWatchdogCheck(): Promise<{
  redisOk: boolean;
  workerOk: boolean;
  stuckOrdersCount: number;
  lastHeartbeatAgeSeconds: number | null;
}> {
  let redisOk = false;
  let workerOk = false;
  let lastHeartbeatAgeSeconds: number | null = null;
  let stuckOrdersCount = 0;

  // 1. Check Redis connectivity
  try {
    const pingStart = Date.now();
    await redis.ping();
    redisOk = true;
  } catch (redisErr) {
    const errMsg = redisErr instanceof Error ? redisErr.message : String(redisErr);
    log.error('[Watchdog] Redis connectivity check failed:', { error: errMsg });
    await DirectEmergencyAlertService.sendRedisFailureAlert(errMsg).catch(() => {});
    return { redisOk: false, workerOk: false, stuckOrdersCount: 0, lastHeartbeatAgeSeconds: null };
  }

  // 2. Check Worker Heartbeat (if Redis is healthy)
  let waitingOrders = 0;
  try {
    waitingOrders = await ordersQueue.getWaitingCount();
    const heartbeatStr = await redis.get('worker:heartbeat');
    if (heartbeatStr) {
      const heartbeatTime = parseInt(heartbeatStr, 10);
      const ageMs = Date.now() - heartbeatTime;
      lastHeartbeatAgeSeconds = Math.round(ageMs / 1000);

      if (ageMs <= HEARTBEAT_STALE_THRESHOLD_MS) {
        workerOk = true;
      } else {
        log.warn(`[Watchdog] Worker heartbeat stale (${lastHeartbeatAgeSeconds}s ago)`);
        await DirectEmergencyAlertService.sendWorkerDownAlert(lastHeartbeatAgeSeconds, waitingOrders);
      }
    } else {
      log.warn('[Watchdog] Worker heartbeat missing completely from Redis!');
      await DirectEmergencyAlertService.sendWorkerDownAlert(null, waitingOrders);
    }
  } catch (queueErr) {
    log.error('[Watchdog] Failed to inspect queue / heartbeat:', { error: (queueErr as Error).message });
  }

  // 3. Check for Stuck Orders in PENDING state (> 10 minutes)
  try {
    const thresholdDate = new Date(Date.now() - STUCK_ORDER_THRESHOLD_MS);
    const stuckOrders = await db.order.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: thresholdDate }
      },
      select: {
        id: true,
        numericId: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' },
      take: 10
    });

    stuckOrdersCount = stuckOrders.length;
    if (stuckOrdersCount > 0) {
      const oldestMinutes = Math.round((Date.now() - stuckOrders[0].createdAt.getTime()) / 60000);
      const sampleIds = stuckOrders.map(o => o.numericId);
      log.warn(`[Watchdog] Found ${stuckOrdersCount} stuck orders waiting > 10m! Oldest: ${oldestMinutes}m`);
      await DirectEmergencyAlertService.sendStuckOrdersAlert(stuckOrdersCount, oldestMinutes, sampleIds);
    }
  } catch (dbErr) {
    log.error('[Watchdog] Failed to inspect stuck orders in DB:', { error: (dbErr as Error).message });
  }

  return {
    redisOk,
    workerOk,
    stuckOrdersCount,
    lastHeartbeatAgeSeconds
  };
}

/**
 * Starts the autonomous background watchdog daemon
 */
export function startWatchdogDaemon(): void {
  if (isStarted) return;
  isStarted = true;

  log.info('🛡️ [WatchdogDaemon] Initialized. Monitoring worker heartbeat & stuck orders every 60s.');

  // Initial delayed check after server bootstrap (30s delay)
  setTimeout(() => {
    runWatchdogCheck().catch(err => log.error('[Watchdog] Initial check error:', err));
  }, 30_000);

  // Periodic check every 60 seconds
  watchdogInterval = setInterval(() => {
    runWatchdogCheck().catch(err => log.error('[Watchdog] Periodic check error:', err));
  }, 60_000);

  // Clean shutdown
  if (typeof process !== 'undefined') {
    process.on('SIGTERM', stopWatchdogDaemon);
    process.on('SIGINT', stopWatchdogDaemon);
  }
}

export function stopWatchdogDaemon(): void {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
  }
  isStarted = false;
  log.info('[WatchdogDaemon] Stopped.');
}
