import { createQueue, type CatalogMutationPayload } from '../lib/queue-manager';
export { type CatalogMutationPayload };

export interface OrderJobPayload {
  orderId: string;
  isDripFeedChild?: boolean; // True if this is specifically dispatched from our Drip-Feed cron
  dripParentOrderId?: string;
}

// DripFeed queue has been removed as it is now passed natively to providers.

export interface SyncJobPayload {
  timestamp: number; // For keeping track
}

// P2.1: Dead Letter Queue — jobs that exhausted all retries
export interface DLQJobPayload {
  originalQueue: string;    // Which queue the job came from
  jobId: string | undefined; // Original job ID
  payload: unknown;          // Original job data
  error: string;             // Error message from last attempt
  failedAt: string;          // ISO timestamp
}

// P2.3: Cleanup cron payload
export interface CleanupJobPayload {
  timestamp: number;
}

export interface TelegramJobPayload {
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

// ETA recalculation cron payload
export interface ETAJobPayload {
  timestamp: number;
}

// Instantiate queues using NextJS-safe singleton
export const ordersQueue = createQueue<OrderJobPayload>('ordersQueue');
const syncQueue = createQueue<SyncJobPayload>('syncQueue');
export const catalogQueue = createQueue<CatalogMutationPayload>('catalogQueue', {
  attempts: 2,
  backoff: { type: 'exponential', delay: 10000 }
});

// P2.1: Dead Letter Queue — removeOnFail: false to preserve failed jobs for inspection
export const dlqQueue = createQueue<DLQJobPayload>('dead-letter-queue', {
  removeOnComplete: { age: 3600 * 24 * 7, count: 1000 }, // Keep max 1000 items or 7 days
  removeOnFail: { age: 3600 * 24 * 30, count: 5000 },    // Keep max 5000 failed items or 30 days
  attempts: 1,             // DLQ jobs should not retry themselves
});

// P2.3: Cleanup queue for TTL maintenance
export const cleanupQueue = createQueue<CleanupJobPayload>('cleanup');

export const telegramQueue = createQueue<TelegramJobPayload>('telegram-notifications');
export const etaQueue = createQueue<ETAJobPayload>('eta-recalc');

/**
 * Configure global cron sync job if not exists
 * (In production, the worker process handles this but we can declare helper here)
 */
export async function ensureSyncCron() {
  await syncQueue.add(
    'status-sync-tick',
    { timestamp: Date.now() },
    {
      repeat: {
        pattern: '*/5 * * * *' // Every 5 minutes
      },
      jobId: 'status-sync-singleton' // Avoids duplicate crons
    }
  );
}

/**
 * P2.3: Schedule daily cleanup cron at 03:00
 */
export async function ensureCleanupCron() {
  await cleanupQueue.add(
    'daily-cleanup',
    { timestamp: Date.now() },
    {
      repeat: {
        pattern: '0 3 * * *' // 3:00 AM daily
      },
      jobId: 'cleanup-singleton'
    }
  );
}

/**
 * ETA: Schedule adaptive percentile window recalculation every 15 minutes
 */
export async function ensureETACron() {
  await etaQueue.add(
    'eta-recalc-tick',
    { timestamp: Date.now() },
    {
      repeat: {
        pattern: '*/15 * * * *' // Every 15 minutes
      },
      jobId: 'eta-recalc-singleton'
    }
  );
}
