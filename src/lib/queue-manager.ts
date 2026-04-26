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
      removeOnComplete: true,
      removeOnFail: 1000,
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

// 3. Drip-Feed Automation
export const dripFeedQueue = createQueue<{ orderId: string, run: number }>('drip-feed', {
  attempts: 5,
  backoff: { type: 'exponential', delay: 10000 }
});

// 4. Failover & Auto-Monitoring
export const failoverQueue = createQueue<{ orderId: string }>('order-failover', {
  attempts: 2,
  backoff: { type: 'exponential', delay: 30000 }
});

// Graceful closing of all connections
export const closeQueues = async () => {
    await orderProcessingQueue.close();
    await statusSyncQueue.close();
    await dripFeedQueue.close();
    await failoverQueue.close();
    if (redisConnection) await redisConnection.quit();
};
