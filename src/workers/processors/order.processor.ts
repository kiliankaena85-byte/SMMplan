import { Job, UnrecoverableError } from 'bullmq';
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

  // Explicit Idempotency Check Before Provider Call
  if (order.externalId) {
    console.warn(`[OrderProcessor] Order ${orderId} already has an externalId (${order.externalId}). Skipping to prevent duplicate dispatch.`);
    return;
  }

  const providerDef = order.service.provider;
  if (!providerDef.apiUrl || !providerDef.apiKey) {
    throw new UnrecoverableError('Provider missing API URL or Encrypted Key');
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
      service: order.providerServiceId || order.service.externalId || '',
      link: order.link,
      quantity: runQty,
      ref: order.id, // Idempotency key for providers that support 'ref'
      custom_id: order.id // Idempotency key for providers that support 'custom_id'
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
    
    // Determine error type
    const isNetworkError = error.message.includes('Provider HTTP Error') || 
                           error.message.includes('Provider Request Timeout') || 
                           error.message.includes('CircuitBreakerOpenException');

    const maxAttempts = job.opts?.attempts || 3;

    // === WAVE 4.1: TRIGGER A (INSTANT API CRASH QUARANTINE) ===
    if (!isNetworkError) {
        // It's a business logic API Error ("Service disabled", "Invalid link", "Not enough funds")
        
        // Anti-Fraud check: "Not enough funds" means our Provider wallet is empty.
        // DO NOT quarantine the service. We must quarantine the provider or alert the admin.
        if (error.message.toLowerCase().includes('not enough funds') || error.message.toLowerCase().includes('balance')) {
            const { sendAdminAlert } = await import('@/lib/notifications');
            await sendAdminAlert(`🚨 КРИТИЧНО! У провайдера для услуги ${order.serviceId} кончился баланс! Заказы отклоняются!`);
        } else {
            // Standard Business Error Quarantine logic
            const { QuarantineService } = await import('@/services/providers/quarantine.service');
            await QuarantineService.evaluateTriggerA(order.serviceId, error.message);
        }

        // BullMQ UnrecoverableError throws immediately and moves to failed queue without consuming more retries
        throw new UnrecoverableError(error.message);
    }
    // ==========================================================

    // Unconditionally throw the error! 
    // BullMQ will handle exponential backoff for network errors.
    throw error;
  }
}
