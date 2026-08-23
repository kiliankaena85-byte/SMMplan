import { Job, UnrecoverableError } from 'bullmq';
import { db } from '../../lib/db';
import { RefillJobPayload } from '@/lib/queue-manager';
import { providerService } from '../../services/providers/provider.service';
import { logger } from '../../lib/logger';

const log = logger.child({ component: 'RefillProcessor' });

export default async function refillProcessor(job: Job<RefillJobPayload>) {
  let refillId: string;
  try {
    const { RefillJobSchema } = await import('../../schemas/jobs.schema');
    const parsed = RefillJobSchema.parse(job.data);
    refillId = parsed.refillId;
  } catch (zodErr) {
    log.error(`[RefillProcessor] Invalid job payload for job ${job.id}`, { cause: zodErr });
    throw new UnrecoverableError('Invalid job payload');
  }

  const refill = await db.refill.findUnique({
    where: { id: refillId },
    include: {
      order: {
        include: {
          service: {
            include: {
              provider: true
            }
          }
        }
      }
    }
  });

  if (!refill) {
    log.error(`[RefillProcessor] Refill ${refillId} not found.`);
    return;
  }

  if (refill.status !== 'PENDING') {
    log.warn(`[RefillProcessor] Refill ${refillId} is not PENDING (current status: ${refill.status}). Skipping.`);
    return;
  }

  const order = refill.order;
  if (!order) {
    throw new UnrecoverableError(`Refill ${refillId} has no associated order.`);
  }

  if (order.status === 'CANCELED' || order.status === 'ERROR') {
    await db.refill.update({
      where: { id: refillId },
      data: { status: 'ERROR' }
    });
    throw new UnrecoverableError(`Order status is ${order.status}. Refill aborted.`);
  }

  if (!order.externalId) {
    await db.refill.update({
      where: { id: refillId },
      data: { status: 'ERROR' }
    });
    throw new UnrecoverableError(`Order ${order.id} has no external ID.`);
  }

  const providerDef = order.service.provider;
  if (!providerDef || !providerDef.apiUrl || !providerDef.apiKey) {
    await db.refill.update({
      where: { id: refillId },
      data: { status: 'ERROR' }
    });
    throw new UnrecoverableError('Provider is missing or misconfigured.');
  }

  const { getRedisConnection } = await import('../../lib/queue-manager');
  const redis = getRedisConnection();
  const mutexKey = `refill:dispatched:${refill.id}`;

  try {
    const acquired = await redis.set(mutexKey, '1', 'EX', 300, 'NX');
    if (!acquired) {
      log.warn(`[RefillProcessor] Duplicate Dispatch Guard: Refill ${refill.id} was already dispatched by previous attempt. Skipping.`);
      return;
    }

    const provider = await providerService.getWorkerProviderInstance(providerDef);
    const response = await provider.refill(order.externalId);

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.refill) {
      throw new Error('No refill ID returned by provider');
    }

    const extId = response.refill.toString();

    await db.refill.update({
      where: { id: refill.id },
      data: {
        status: 'IN_PROGRESS',
        externalId: extId
      }
    });

    log.info(`[RefillProcessor] Successfully dispatched refill ${refill.id} for order ${order.id} | External ID: ${extId}`);
  } catch (error: unknown) {
    log.error(`[RefillProcessor] Failed to process refill ${refill.id}: ${(error instanceof Error ? error.message : String(error))}`);
    await redis.del(mutexKey).catch(() => {});
    throw error;
  }
}
