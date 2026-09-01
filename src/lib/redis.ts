import { Redis } from 'ioredis';
import { redactSensitiveTokens } from '@/lib/logger/sensitive-data-filter';

const globalForRedis = global as unknown as { redis: Redis };

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisPassword = process.env.REDIS_PASSWORD || undefined;

// Security check: Warn in production if connecting without TLS or password to remote host (P3-23)
if (process.env.NODE_ENV === 'production') {
  const isLocal = redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1') || redisUrl.includes('smmplan_redis');
  if (!isLocal && !redisUrl.startsWith('rediss://')) {
    console.warn('🚨 [SECURITY WARNING] Redis in production is not using TLS (rediss://). Transit encryption recommended!');
  }
  if (!redisPassword && !redisUrl.includes('@') && !isLocal) {
    console.warn('⚠️ [SECURITY WARNING] Redis is running in production without explicit authentication!');
  }
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
  console.error('[REDIS] Connection error:', redactSensitiveTokens(err.message));
});
