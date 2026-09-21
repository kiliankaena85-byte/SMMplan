import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { Prisma } from '@prisma/client';

export interface BufferedAnalyticsEvent {
  event: string;
  metadata?: Prisma.InputJsonValue | null;
  sessionId?: string | null;
  createdAt?: string | Date;
}

export const ANALYTICS_BUFFER_KEY = 'buffer:analytics_events';

export class AnalyticsBufferService {
  /**
   * Pushes an event to the Redis buffer with a 1.5s timeout.
   * If Redis fails or times out, falls back directly to db.analyticsEvent.create (fail-open).
   */
  static async pushEvent(payload: BufferedAnalyticsEvent): Promise<void> {
    const serialized = JSON.stringify({
      event: payload.event,
      metadata: payload.metadata ?? null,
      sessionId: payload.sessionId ?? null,
      createdAt: typeof payload.createdAt === 'string'
        ? payload.createdAt
        : payload.createdAt?.toISOString() ?? new Date().toISOString(),
    });

    try {
      const pushPromise = redis.rpush(ANALYTICS_BUFFER_KEY, serialized);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis push timeout')), 1500)
      );
      await Promise.race([pushPromise, timeoutPromise]);
    } catch (redisErr) {
      console.warn('[AnalyticsBuffer] Redis buffer push failed, falling back to direct db.create:', redisErr);
      await db.analyticsEvent.create({
        data: {
          event: payload.event,
          metadata: (payload.metadata || undefined) as Prisma.InputJsonValue,
          sessionId: payload.sessionId || undefined,
        },
      });
    }
  }

  /**
   * Flushes buffered events from Redis to PostgreSQL in chunks of up to 500 items.
   * Restores unpersisted items to Redis on failure to ensure zero data loss.
   */
  static async flush(maxTotal: number = 5000): Promise<number> {
    let totalFlushed = 0;
    const CHUNK_SIZE = 500;

    while (totalFlushed < maxTotal) {
      const rawBatch: string[] = [];
      for (let i = 0; i < CHUNK_SIZE; i++) {
        const item = await redis.lpop(ANALYTICS_BUFFER_KEY);
        if (!item) break;
        rawBatch.push(item);
      }

      if (rawBatch.length === 0) break;

      const batch: Array<{ event: string; metadata: any; sessionId?: string; createdAt: Date }> = [];
      for (const raw of rawBatch) {
        try {
          const parsed = JSON.parse(raw);
          batch.push({
            event: parsed.event,
            metadata: parsed.metadata ?? undefined,
            sessionId: parsed.sessionId ?? undefined,
            createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
          });
        } catch {
          // Skip malformed item
        }
      }

      if (batch.length > 0) {
        try {
          await db.analyticsEvent.createMany({ data: batch });
          totalFlushed += batch.length;
        } catch (dbErr) {
          console.error('[AnalyticsBuffer] Failed to persist analytics batch to DB, restoring items to Redis:', dbErr);
          try {
            // Restore popped items back to the head of the buffer in original order
            await redis.lpush(ANALYTICS_BUFFER_KEY, ...rawBatch.reverse());
          } catch (restoreErr) {
            console.error('[AnalyticsBuffer] Failed to restore batch to Redis:', restoreErr);
          }
          throw dbErr;
        }
      }

      if (rawBatch.length < CHUNK_SIZE) break;
    }

    return totalFlushed;
  }
}
