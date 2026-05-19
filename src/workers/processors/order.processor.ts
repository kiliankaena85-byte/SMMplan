import { Job, UnrecoverableError } from 'bullmq';
import { db } from '../../lib/db';
import { OrderJobPayload } from '../queues';
import { providerService } from '../../services/providers/provider.service';
import { WalletService } from '../../services/financial/wallet.service';
import { SettingsManager } from '../../lib/settings';

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

  // TEST ORDER GUARD — предотвращает отправку тестового заказа реальному провайдеру
  const isTestMode = await SettingsManager.isTestMode();
  if (order.isTest && !isTestMode) {
    console.error(`[OrderProcessor] CRITICAL: Test order ${orderId} picked up in production mode. Failing safely.`);
    const { orderService } = await import('../../services/core/order.service');
    await orderService.failOrderTerminal(
      orderId,
      'SYSTEM_GUARD: Попытка отправки тестового заказа реальному провайдеру прервана.'
    );
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

    console.info(`[OrderProcessor] Dispatched Order ${order.id} | External ID: ${extId}. Waiting until ${waitingUntil.toISOString()}`);

  } catch (error: any) {
    // === FAIL-FAST ARCHITECTURE ===
    // Any provider error (network timeout, API rejection, bad credentials,
    // insufficient provider funds) instantly cancels the order and refunds
    // the client. Zero retries. Zero quarantine. Zero complexity.
    //
    // Operator-facing diagnostics are delivered via admin alert.
    // Manual reroute is available in Admin UI if needed.
    console.error(`[OrderProcessor] FAIL-FAST for Order ${order.id}:`, error.message);

    const { orderService } = await import('../../services/core/order.service');
    await orderService.failOrderTerminalFast(order.id, error.message);

    // UnrecoverableError tells BullMQ to NOT retry this job
    throw new UnrecoverableError(`Fail-Fast: ${error.message}`);
  }
}

