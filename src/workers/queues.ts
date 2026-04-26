import { createQueue } from '../lib/queue-manager';

export interface OrderJobPayload {
  orderId: string;
  isDripFeedChild?: boolean; // True if this is specifically dispatched from our Drip-Feed cron
  dripParentOrderId?: string;
}

export interface DripFeedJobPayload {
  orderId: string; // The parent Order DB item
}

export interface SyncJobPayload {
  timestamp: number; // For keeping track
}

// Instantiate queues using NextJS-safe singleton
export const ordersQueue = createQueue<OrderJobPayload>('ordersQueue');
export const dripfeedQueue = createQueue<DripFeedJobPayload>('dripfeedQueue');
export const syncQueue = createQueue<SyncJobPayload>('syncQueue');

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
