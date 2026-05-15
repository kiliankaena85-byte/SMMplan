import { Worker } from 'bullmq';
import { getRedisConnection } from '../lib/queue-manager';
import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { ensureSyncCron, ensureCleanupCron, ensureETACron, dlqQueue, cleanupQueue, telegramQueue, etaQueue } from './queues';
import { sendAdminAlert, sendAdminAlertSync } from '../lib/notifications';
import orderProcessor from './processors/order.processor';
import syncProcessor from './processors/sync.processor';
import { runCleanup } from './processors/cleanup.processor';
import { runETARecalculation } from './processors/eta.processor';
import { orderService } from '../services/core/order.service';

const log = logger.child({ component: 'WorkerManager' });
log.info('🚀 Starting BullMQ workers...');

const connection = getRedisConnection();

// ── Worker instances ──────────────────────────────────────────────────────────
const workerConfig = { 
  connection,
  lockDuration: 60000,     // 60s lock to prevent false stalls during slow provider APIs (our breaker is 15s)
  stalledInterval: 30000,  // Check for stalled jobs every 30s
  maxStalledCount: 1       // Only retry a stalled job once before failing
};

const orderWorker = new Worker('ordersQueue', orderProcessor, workerConfig);
const syncWorker = new Worker('syncQueue', syncProcessor, workerConfig);
const cleanupWorker = new Worker('cleanup', async () => { await runCleanup(); }, { connection });
const telegramWorker = new Worker('telegram-notifications', async (job) => {
  await sendAdminAlertSync(job.data.message, job.data.severity);
}, {
  connection,
  limiter: {
    max: 20, // max 20 messages
    duration: 1000, // per 1 second
  }
});
const etaWorker = new Worker('eta-recalc', async () => { await runETARecalculation(); }, { connection });

// ── P2.1: DLQ — Dead Letter Queue handler ────────────────────────────────────
const MAX_ATTEMPTS = 3; // Must match createQueue defaults

async function handleDeadLetter(
  queueName: string,
  job: { id?: string; data: unknown; attemptsMade: number; opts?: { attempts?: number } } | undefined,
  err: Error
): Promise<void> {
  if (!job) return;

  const maxAttempts = job.opts?.attempts ?? MAX_ATTEMPTS;

  log.error(`Job failed`, {
    queue: queueName,
    jobId: job.id,
    attemptsMade: job.attemptsMade,
    error: err.message,
  });

  // Only DLQ after all retries are exhausted
  if (job.attemptsMade >= maxAttempts) {
    try {
      await dlqQueue.add('dead-letter', {
        originalQueue: queueName,
        jobId: job.id,
        payload: job.data,
        error: err.message,
        failedAt: new Date().toISOString(),
      });

      // 🔥 Option B: Automatic Refund & State transition
      if (queueName === 'ordersQueue') {
        const payload = job.data as any;
        if (payload?.orderId) {
           await orderService.failOrderTerminal(payload.orderId, err.message);
           log.info(`Auto-refunded dead-letter order ${payload.orderId}`);
        }
      }

      await sendAdminAlert(
        `🪦 *Dead Letter Job*\n\nQueue: \`${queueName}\`\nJob ID: \`${job.id}\`\nAttempts: ${job.attemptsMade}/${maxAttempts}\n\nError: ${err.message}`,
        'CRITICAL'
      );

      log.error('Job dead-lettered', { queue: queueName, jobId: job.id });
    } catch (dlqErr) {
      log.error('Failed to write to DLQ', { error: (dlqErr as Error).message });
    }
  }
}

orderWorker.on('failed', (job, err) => { handleDeadLetter('ordersQueue', job, err); });
syncWorker.on('failed', (job, err) => { handleDeadLetter('syncQueue', job, err); });
cleanupWorker.on('failed', (job, err) => { log.error('Cleanup job failed', { error: err.message }); });
telegramWorker.on('failed', (job, err) => { log.error('Telegram notification failed', { error: err.message }); });

// ── P0.3: Worker heartbeat (Redis key, renewed every 60s) ─────────────────────
// health endpoint checks for this key; if missing → worker is down
const HEARTBEAT_KEY = 'worker:heartbeat';
const HEARTBEAT_TTL = 120; // seconds — double the interval for tolerance

async function updateHeartbeat(): Promise<void> {
  try {
    await connection.set(HEARTBEAT_KEY, Date.now().toString(), 'EX', HEARTBEAT_TTL);
  } catch {
    log.warn('Heartbeat update failed (Redis connection issue)');
  }
}

updateHeartbeat();
const heartbeatInterval = setInterval(updateHeartbeat, 60_000);

// ── Setup cron jobs ───────────────────────────────────────────────────────────
ensureSyncCron().catch(e => log.error('Failed to setup Sync Cron', { error: (e as Error).message }));
ensureCleanupCron().catch(e => log.error('Failed to setup Cleanup Cron', { error: (e as Error).message }));
ensureETACron().catch(e => log.error('Failed to setup ETA Cron', { error: (e as Error).message }));

log.info('All workers started', { queues: ['ordersQueue', 'syncQueue', 'cleanup'] });

// ── Graceful Shutdown (12-Factor App) ────────────────────────────────────────
const shutdown = async () => {
  log.info('Gracefully shutting down workers...');
  clearInterval(heartbeatInterval);
  await connection.del(HEARTBEAT_KEY); // Remove heartbeat on clean shutdown
  await Promise.all([
    orderWorker.close(),
    syncWorker.close(),
    cleanupWorker.close(),
    telegramWorker.close(),
    etaWorker.close(),
  ]);
  await db.$disconnect();
  if (connection) await connection.quit();
  log.info('Workers stopped successfully');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
