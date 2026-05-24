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
    // === AMBIGUOUS TIMEOUT PROTECTION (P0) ===
    // If the error is a network timeout (not an explicit API rejection), the provider 
    // MIGHT have accepted the order but failed to respond. A fail-fast refund here
    // would result in a free delivery at our expense.
    const errMsg = error.message.toLowerCase();
    const isNetworkTimeout = errMsg.includes('timeout') || 
                             errMsg.includes('etimedout') ||
                             errMsg.includes('econnreset') ||
                             errMsg.includes('socket hang up') ||
                             errMsg.includes('eai_again');

    if (isNetworkTimeout) {
      console.warn(`[OrderProcessor] AMBIGUOUS TIMEOUT for Order ${order.id}. Moving to PENDING_CHECK.`);
      
      await db.order.update({
        where: { id: order.id },
        data: { 
          status: 'PENDING_CHECK', 
          error: `Сетевой таймаут при отправке: ${error.message}` 
        }
      });

      // Send critical alert to Admin for manual verification
      try {
        const { sendAdminAlert } = await import('@/lib/notifications');
        sendAdminAlert(
          `⚠️ [AMBIGUOUS TIMEOUT] Заказ #${order.numericId} (Услуга: ${order.service.name})\n` +
          `Провайдер не ответил (таймаут). Заказ переведен в PENDING_CHECK.\n` +
          `Требуется ручная проверка на стороне провайдера во избежание двойной поставки!`,
          'CRITICAL'
        );
      } catch { /* ignore */ }

      throw new UnrecoverableError(`Ambiguous Timeout: ${error.message}`);
    }

    // === FAIL-FAST ARCHITECTURE ===
    // Any explicit provider error (API rejection, bad credentials, insufficient funds)
    // instantly cancels the order and refunds the client. Zero retries.
    console.error(`[OrderProcessor] FAIL-FAST for Order ${order.id}:`, error.message);

    try {
      const { QuarantineService } = await import('../../services/providers/quarantine.service');
      await QuarantineService.evaluateTriggerA(order.serviceId, error.message);
    } catch (quarantineErr: any) {
      console.error(`[OrderProcessor] Quarantine evaluation failed:`, quarantineErr.message);
    }

    const { orderService } = await import('../../services/core/order.service');
    await orderService.failOrderTerminalFast(order.id, error.message);

    // UnrecoverableError tells BullMQ to NOT retry this job
    throw new UnrecoverableError(`Fail-Fast: ${error.message}`);
  }
}

