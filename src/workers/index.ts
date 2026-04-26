import { Worker } from 'bullmq';
import { getRedisConnection } from '../lib/queue-manager';
import { db } from '../lib/db';
import { ensureSyncCron } from './queues';
import orderProcessor from './processors/order.processor';
import dripfeedProcessor from './processors/dripfeed.processor';
import syncProcessor from './processors/sync.processor';

console.info('🚀 [Queue Worker] Starting BullMQ workers...');

const connection = getRedisConnection();

// Initializing workers to drain the unified Queues
const orderWorker = new Worker('ordersQueue', orderProcessor, { connection });
const dripfeedWorker = new Worker('dripfeedQueue', dripfeedProcessor, { connection });
const syncWorker = new Worker('syncQueue', syncProcessor, { connection });

orderWorker.on('failed', (job, err) => {
    console.error(`[Order Processing] Job ${job?.id} failed:`, err);
});
dripfeedWorker.on('failed', (job, err) => {
    console.error(`[DripFeed Processing] Job ${job?.id} failed:`, err);
});
syncWorker.on('failed', (job, err) => {
    console.error(`[Status Sync] Job ${job?.id} failed:`, err);
});

// Setup the globally firing repeating CRON job
ensureSyncCron().catch(e => console.error("Failed to setup Sync Cron:", e));

// Graceful Shutdown implementation (12-Factor App)
const shutdown = async () => {
    console.info('Gracefully shutting down workers...');
    await Promise.all([
        orderWorker.close(),
        dripfeedWorker.close(),
        syncWorker.close()
    ]);
    await db.$disconnect();
    if(connection) await connection.quit();
    console.info('Workers stopped successfully');
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
