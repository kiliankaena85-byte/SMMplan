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

  // Explicit Idempotency Check Before Provider Call
  if (order.externalId) {
    console.warn(`[OrderProcessor] Order ${orderId} already has an externalId (${order.externalId}). Skipping to prevent duplicate dispatch.`);
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
    // Run quarantine only on the final attempt before throwing to DLQ
    if (job.attemptsMade >= maxAttempts && !isNetworkError) {
        // It's a business logic API Error ("Service disabled", "Invalid link", "Not enough funds")
        
        // Anti-Fraud check: "Not enough funds" means our Provider wallet is empty.
        // DO NOT quarantine the service. We must quarantine the provider or alert the admin.
        if (error.message.toLowerCase().includes('not enough funds') || error.message.toLowerCase().includes('balance')) {
            const { sendAdminAlert } = await import('@/lib/notifications');
            await sendAdminAlert(`🚨 КРИТИЧНО! У провайдера для услуги ${order.serviceId} кончился баланс! Заказы отклоняются!`);
        } else {
            // Standard Business Error Quarantine logic
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            
            // Find recent ERROR orders for this exact service
            const recentErrors = await db.order.findMany({
                where: {
                    serviceId: order.serviceId,
                    status: 'ERROR',
                    createdAt: { gte: oneHourAgo }
                },
                select: { userId: true }
            });

            // We need >= 3 errors from >= 2 UNIQUE users to prevent Mass Order abuse
            if (recentErrors.length >= 3) {
                const uniqueUsers = new Set(recentErrors.map(e => e.userId));
                if (uniqueUsers.size >= 2) {
                    // TRIGGER QUARANTINE!
                    // Exponential Backoff for Cooldown: 30 mins -> 2 hours -> 12 hours
                    const service = await db.service.findUnique({ where: { id: order.serviceId } });
                    if (service && (!service.cooldownUntil || service.cooldownUntil < new Date())) {
                        let cooldownHours = 0.5; // default 30 mins
                        if (service.cooldownReason === 'API_ERROR_STRIKE_1') cooldownHours = 2;
                        else if (service.cooldownReason === 'API_ERROR_STRIKE_2') cooldownHours = 12;

                        const newReason = cooldownHours === 0.5 ? 'API_ERROR_STRIKE_1' : (cooldownHours === 2 ? 'API_ERROR_STRIKE_2' : 'API_ERROR_STRIKE_3');
                        const newCooldown = new Date(Date.now() + cooldownHours * 60 * 60 * 1000);

                        await db.service.update({
                            where: { id: service.id },
                            data: {
                                cooldownUntil: newCooldown,
                                cooldownReason: newReason
                            }
                        });

                        console.warn(`[ElasticQuarantine] Trigger A fired for Service ${service.id}. Cooldown until ${newCooldown.toISOString()}`);
                    }
                }
            }
        }
    }
    // ==========================================================

    // Unconditionally throw the error! 
    // BullMQ will handle exponential backoff.
    // On the final attempt, this triggers the 'failed' event which goes to the DLQ.
    // DLQ then calls orderService.failOrderTerminal() which uses the safe, atomic WalletOps.
    throw error;
  }
}
