import { Job } from 'bullmq';
import { db } from '../../lib/db';
import { OrderJobPayload } from '../queues';
import { providerService } from '../../services/providers/provider.service';
import { WalletService } from '../../services/financial/wallet.service';

export default async function orderProcessor(job: Job<OrderJobPayload>) {
  const { orderId, isDripFeedChild } = job.data;
  
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { service: { include: { provider: true } } }
  });

  if (!order || !order.service.provider) {
    console.warn(`[OrderProcessor] Order ${orderId} not found or missing provider.`);
    return;
  }

  // Double execution guard
  if (order.status !== 'PENDING' && !isDripFeedChild) {
    console.warn(`[OrderProcessor] Order ${orderId} is not PENDING. Skip.`);
    return;
  }

  const providerDef = order.service.provider;
  if (!providerDef.apiUrl || !providerDef.apiKey) {
    throw new Error('Provider missing API URL or Encrypted Key');
  }

  try {
    const provider = await providerService.getWorkerProviderInstance(providerDef);
    
    // For Drip-Feed options running natively in provider (Option A) if we ever allowed it.
    // However, Option B forces us to send standard orders per chunk.
    const runQty = isDripFeedChild && order.runs ? Math.max(1, Math.floor(order.quantity / order.runs)) : order.quantity;
    
    // API Parameter Mapping for V2 APIs
    const serviceName = order.service.name.toLowerCase();
    const payload: any = {
      service: order.service.externalId || '',
      link: order.link,
      quantity: runQty,
    };

    if (order.customData) {
      if (serviceName.includes('опрос') || serviceName.includes('голосование') || serviceName.includes('poll')) {
        payload.answers_number = order.customData;
      } else {
        payload.comments = order.customData;
      }
    }

    const response = await provider.createOrder(payload);

    if (response.error && !response.order) {
      throw new Error(response.error);
    }

    // Success
    const extId = response.order ? response.order.toString() : '';
    // Set 60 minutes Wait limit
    const waitingUntil = new Date(Date.now() + 60 * 60 * 1000);
    
    if (isDripFeedChild) {
      // Append to list of runs
      await db.order.update({
        where: { id: order.id },
        data: {
          dripExternalIds: { push: extId },
          status: 'IN_PROGRESS',
          waitingUntil
        }
      });
    } else {
      await db.order.update({
        where: { id: order.id },
        data: {
          externalId: extId,
          status: 'IN_PROGRESS',
          waitingUntil
        }
      });
    }

    console.log(`[OrderProcessor] Dispatched Order ${order.id} | External ID: ${extId}. Waiting until ${waitingUntil.toISOString()}`);

  } catch (error: any) {
    console.error(`[OrderProcessor] Failed Order ${order.id} on attempt ${job.attemptsMade}:`, error.message);
    
    const maxAttempts = job.opts.attempts || 3;
    if (job.attemptsMade < maxAttempts) {
       // Re-throw to trigger Exponential Backoff
       throw error;
    }

    // Exhausted retries
    const finalStatus = isDripFeedChild ? 'PARTIAL' : 'ERROR';
    
    const updatedOrder = await db.order.update({
      where: { id: order.id },
      data: {
        status: finalStatus,
        error: error.message
      }
    });

    // We use the new RefundPolicyService to process the refund cleanly.
    // However, RefundPolicyService requires specific payload:
    const { RefundPolicyService } = await import('@/services/financial/refund-policy.service');
    await RefundPolicyService.processRefund({
        id: updatedOrder.id,
        userId: updatedOrder.userId,
        charge: isDripFeedChild && order.runs 
          ? Math.floor(order.charge / order.runs) 
          : order.charge, // Custom charge logic for drip-feed chunks
        quantity: 1, // Full chunk refund
        remains: 1,
        status: finalStatus
    }, '(Исчерпаны попытки отправки провайдеру)');
  }
}
