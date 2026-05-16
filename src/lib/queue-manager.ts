import { Queue, QueueOptions } from 'bullmq';
import { Redis } from 'ioredis';

// Singleton Redis connection pattern
let redisConnection: Redis | null = null;

export const getRedisConnection = (): Redis => {
  if (redisConnection) return redisConnection;

  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  
  redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Specific required for BullMQ
    lazyConnect: true // Prevent immediate crash if unavailable during build
  });

  redisConnection.on('error', (err) => {
    console.error('[Redis Core Error]', err);
  });

  return redisConnection;
};

// Queue creation wrapper with graceful defaults and build-time safety
export const createQueue = <PayloadType>(name: string, defaultOptions?: Partial<QueueOptions['defaultJobOptions']>) => {
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || !!process.env.CI;
  
  // Dummy object to prevent Redis connection during Vercel/Next build step
  if (isBuild) {
    return new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'add') return async () => ({ id: 'mock-id' });
        if (prop === 'close') return async () => {};
        if (prop === 'disconnect') return async () => {};
        return async () => {};
      }
    }) as unknown as Queue<PayloadType, any, string>;
  }

  return new Queue<PayloadType, any, string>(name, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 3600 * 24, count: 1000 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      ...defaultOptions,
    }
  });
};

// ---
// Define explicit queues from D:\SMMplan porting strategy
// ---

// 1. Order Processing Queue (Mass, Pending)
export const orderProcessingQueue = createQueue<{ orderId: string }>('order-processing', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 }
});

// 2. Status Sync Queue (Polling Provider API)
export const statusSyncQueue = createQueue<{ providerId: string }>('status-sync');



// 4. Failover & Auto-Monitoring
export const failoverQueue = createQueue<{ orderId: string }>('order-failover', {
  attempts: 2,
  backoff: { type: 'exponential', delay: 30000 }
});

// 5. Catalog Mutations (Mass updates, Price syncing)
export type CatalogMutationPayload = 
  | { type: 'SYNC_PRICES'; usdToRub: number }
  | { type: 'BULK_MARKUP'; filter: { categoryId?: string; platform?: string }; markupPercent: number; admin: any };

export const catalogMutationsQueue = createQueue<CatalogMutationPayload>('catalog-mutations', {
  attempts: 2,
  backoff: { type: 'exponential', delay: 10000 }
});

// Graceful closing of all connections
export const closeQueues = async () => {
    await orderProcessingQueue.close();
    await statusSyncQueue.close();

    await failoverQueue.close();
    await catalogMutationsQueue.close();
    if (redisConnection) await redisConnection.quit();
};
