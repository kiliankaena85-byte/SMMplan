const { Redis } = require('ioredis');

// Simple Next.js Cache Handler using ioredis
const client = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

module.exports = class CacheHandler {
  constructor(options) {
    this.options = options;
    this.cacheStore = new Map();
  }

  async get(key) {
    try {
      const data = await client.get(`next-cache:${key}`);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Redis Cache GET Error:', e);
    }
    return this.cacheStore.get(key);
  }

  async set(key, data, ctx) {
    try {
      await client.set(
        `next-cache:${key}`,
        JSON.stringify({
          value: data,
          lastModified: Date.now(),
          tags: ctx.tags,
        }),
        'EX',
        ctx.revalidate || 31536000 // default 1 year
      );
      
      // Store tags index for revalidation
      if (ctx.tags) {
        for (const tag of ctx.tags) {
          await client.sadd(`next-cache-tags:${tag}`, key);
        }
      }
    } catch (e) {
      console.warn('Redis Cache SET Error:', e);
    }
    this.cacheStore.set(key, {
      value: data,
      lastModified: Date.now(),
      tags: ctx.tags,
    });
  }

  async revalidateTag(tag) {
    try {
      const keys = await client.smembers(`next-cache-tags:${tag}`);
      if (keys.length > 0) {
        const pipeline = client.pipeline();
        for (const key of keys) {
          pipeline.del(`next-cache:${key}`);
        }
        pipeline.del(`next-cache-tags:${tag}`);
        await pipeline.exec();
      }
    } catch (e) {
      console.warn('Redis Cache REVALIDATE Error:', e);
    }
  }
};
