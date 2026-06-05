import { Job, UnrecoverableError } from 'bullmq';
import { db } from '../../lib/db';
import { RefillJobPayload } from '../queues';
import { providerService } from '../../services/providers/provider.service';

export default async function refillProcessor(job: Job<RefillJobPayload>) {
  const { refillId } = job.data;

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
    console.error(`[RefillProcessor] Refill ${refillId} not found.`);
    return;
  }

  if (refill.status !== 'PENDING') {
    console.warn(`[RefillProcessor] Refill ${refillId} is not PENDING (current status: ${refill.status}). Skipping.`);
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

  try {
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

    console.info(`[RefillProcessor] Successfully dispatched refill ${refill.id} for order ${order.id} | External ID: ${extId}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(`[RefillProcessor] Failed to process refill ${refill.id}:`, error.message);
    
    // Throw error so BullMQ will retry this job
    throw error;
  }
}
