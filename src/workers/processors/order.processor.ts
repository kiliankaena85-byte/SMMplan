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
  if (order.status !== 'PENDING') {
    console.warn(`[OrderProcessor] Order ${orderId} is not PENDING. Skip.`);
    return;
  }

  const providerDef = order.service.provider;
  if (!providerDef.apiUrl || !providerDef.apiKey) {
    throw new Error('Provider missing API URL or Encrypted Key');
  }

  try {
    const provider = await providerService.getWorkerProviderInstance(providerDef);
    
    // If the order is Drip-Feed, we delegate it fully to the upstream provider.
    // In V2 API, 'quantity' is per run, not total.
    const runQty = (order.isDripFeed && order.runs && order.runs > 0) 
        ? Math.max(1, Math.floor(order.quantity / order.runs)) 
        : order.quantity;
    
    // API Parameter Mapping for V2 APIs
    const serviceName = order.service.name.toLowerCase();
    const payload: any = {
      service: order.service.externalId || '',
      link: order.link,
      quantity: runQty,
    };

    if (order.isDripFeed && order.runs && order.interval) {
        payload.runs = order.runs;
        payload.interval = order.interval;
    }

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
    
    // Update order with External ID from provider
    await db.order.update({
      where: { id: order.id },
      data: {
        externalId: extId,
        status: 'IN_PROGRESS',
        waitingUntil
      }
    });

    console.log(`[OrderProcessor] Dispatched Order ${order.id} | External ID: ${extId}. Waiting until ${waitingUntil.toISOString()}`);

  } catch (error: any) {
    console.error(`[OrderProcessor] Failed Order ${order.id} on attempt ${job.attemptsMade}:`, error.message);
    
    const maxAttempts = job.opts.attempts || 3;
    if (job.attemptsMade < maxAttempts) {
       // Re-throw to trigger Exponential Backoff
       throw error;
    }

    // Exhausted retries
    const finalStatus = 'ERROR';
    
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
        charge: Number(order.charge),
        quantity: order.quantity,
        remains: order.quantity,
        status: finalStatus
    }, '(Исчерпаны попытки отправки провайдеру)');
  }
}
