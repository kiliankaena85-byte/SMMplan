import { Worker } from 'bullmq';
import { getRedisConnection } from '../lib/queue-manager';
import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { 
  ensureSyncCron, 
  ensureCleanupCron, 
  ensureETACron, 
  ensureCatalogSyncCron, 
  ensureOrphanSweepCron, 
  ensurePaymentSyncCron, 
  ensureDripfeedCron,
  ensureArticlePublishCron,
  dlqQueue, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  cleanupQueue, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  telegramQueue, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  etaQueue,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  paymentSyncQueue,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  refillQueue,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  articlePublishQueue
} from '../lib/queue-manager';
import { sendAdminAlert, sendAdminAlertSync } from '../lib/notifications';
import orderProcessor from './processors/order.processor';
import syncProcessor from './processors/sync.processor';
import { runCleanup, runOrphanSweep } from './processors/cleanup.processor';
import { runETARecalculation } from './processors/eta.processor';
import catalogProcessor from './processors/catalog.processor';
import paymentSyncProcessor from './processors/payment-sync';
import refillProcessor from './processors/refill.processor';
import articlePublishProcessor from './processors/article-publish.processor';
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
const catalogWorker = new Worker('catalogQueue', catalogProcessor, workerConfig);
const cleanupWorker = new Worker('cleanup', async (job) => { 
  if (job.name === 'sweep-orphans') {
    await runOrphanSweep();
  } else {
    await runCleanup(); 
  }
}, workerConfig);
const telegramWorker = new Worker('telegram-notifications', async (job) => {
  await sendAdminAlertSync(job.data.message, job.data.severity);
}, {
  ...workerConfig,
  limiter: {
    max: 20, // max 20 messages
    duration: 1000, // per 1 second
  }
});
const etaWorker = new Worker('eta-recalc', async () => { await runETARecalculation(); }, workerConfig);
const paymentSyncWorker = new Worker('paymentSyncQueue', paymentSyncProcessor, workerConfig);
const refillWorker = new Worker('refillQueue', refillProcessor, workerConfig);
const articlePublishWorker = new Worker('articlePublishQueue', articlePublishProcessor, workerConfig);

// ── P2.1: DLQ — Dead Letter Queue handler ────────────────────────────────────
const MAX_ATTEMPTS = 3; // Must match createQueue defaults

async function handleDeadLetter(
  queueName: string,
  job: { id?: string; name?: string; data: unknown; attemptsMade: number; opts?: { attempts?: number } } | undefined,
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

  // Only DLQ after all retries are exhausted OR if it's a fatal error
  if (job.attemptsMade >= maxAttempts || err.name === 'UnrecoverableError') {
    if (job.attemptsMade >= maxAttempts) {
      console.error(
        `[WORKER][ACTION REQUIRED] Job ${job.id} (${job.name}) exhausted all ${job.attemptsMade} attempts. Last error: ${err.message}`
      );
    }
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload = job.data as any;
        if (payload?.orderId) {
           await orderService.failOrderTerminal(payload.orderId, err.message);
           log.info(`Auto-refunded dead-letter order ${payload.orderId}`);
        }
      }

      if (queueName === 'refillQueue') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload = job.data as any;
        if (payload?.refillId) {
          await db.refill.update({
            where: { id: payload.refillId },
            data: { status: 'ERROR' }
          });
          log.info(`Marked dead-letter refill ${payload.refillId} as ERROR`);
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
catalogWorker.on('failed', (job, err) => { handleDeadLetter('catalogQueue', job, err); });
cleanupWorker.on('failed', (job, err) => { log.error('Cleanup job failed', { error: err.message }); });
telegramWorker.on('failed', (job, err) => { log.error('Telegram notification failed', { error: err.message }); });
paymentSyncWorker.on('failed', (job, err) => { handleDeadLetter('paymentSyncQueue', job, err); });
refillWorker.on('failed', (job, err) => { handleDeadLetter('refillQueue', job, err); });
articlePublishWorker.on('failed', (job, err) => { handleDeadLetter('articlePublishQueue', job, err); });

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
ensureCatalogSyncCron().catch(e => log.error('Failed to setup Catalog Sync Cron', { error: (e as Error).message }));
ensureOrphanSweepCron().catch(e => log.error('Failed to setup Orphan Sweep Cron', { error: (e as Error).message }));
ensurePaymentSyncCron().catch(e => log.error('Failed to setup Payment Sync Cron', { error: (e as Error).message }));
ensureDripfeedCron().catch(e => log.error('Failed to setup Dripfeed Cron', { error: (e as Error).message }));
ensureArticlePublishCron().catch(e => log.error('Failed to setup Article Publish Cron', { error: (e as Error).message }));

log.info('All workers started', { queues: ['ordersQueue', 'refillQueue', 'syncQueue', 'catalogQueue', 'cleanup', 'paymentSyncQueue', 'articlePublishQueue'] });

// ── Graceful Shutdown (12-Factor App) ────────────────────────────────────────
const shutdown = async () => {
  log.info('Gracefully shutting down workers...');
  clearInterval(heartbeatInterval);
  await connection.del(HEARTBEAT_KEY); // Remove heartbeat on clean shutdown
  await Promise.all([
    orderWorker.close(),
    refillWorker.close(),
    syncWorker.close(),
    catalogWorker.close(),
    cleanupWorker.close(),
    telegramWorker.close(),
    etaWorker.close(),
    paymentSyncWorker.close(),
    articlePublishWorker.close(),
  ]);
  await db.$disconnect();
  if (connection) await connection.quit();
  log.info('Workers stopped successfully');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// IPC and stdin shutdown hooks for automated test runners (especially on Windows)
if (process.send) {
  process.on('message', (msg) => {
    if (msg === 'shutdown') {
      shutdown();
    }
  });
}
process.stdin.on('data', (data) => {
  if (data.toString().trim() === 'shutdown') {
    shutdown();
  }
});

