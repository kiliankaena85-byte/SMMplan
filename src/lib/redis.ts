import { Redis } from 'ioredis';

const globalForRedis = global as unknown as { redis: Redis };

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisPassword = process.env.REDIS_PASSWORD || undefined;

// Security check: Warn in production if connecting without password to remote host
if (process.env.NODE_ENV === 'production' && !redisPassword && !redisUrl.includes('@') && !redisUrl.includes('localhost') && !redisUrl.includes('127.0.0.1')) {
  console.warn('⚠️ [SECURITY WARNING] Redis is running in production without explicit authentication!');
}

export const redis =
  globalForRedis.redis ||
  new Redis(redisUrl, {
    password: redisPassword,
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    lazyConnect: true,
    retryStrategy: (times) => {
      // Return null to explicitly stop retrying if Redis is totally unavailable.
      // We don't want to crash or freeze the app if Redis is down, we want to fallback gracefully.
      if (times > 3) return null;
      return Math.min(times * 50, 2000);
    },
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

// Fire and forget error handler to prevent unhandled rejection crashes
redis.on('error', (err) => {
  const { redactSensitiveTokens } = require('@/lib/logger/sensitive-data-filter');
  console.error('[REDIS] Connection error:', redactSensitiveTokens(err.message));
});
