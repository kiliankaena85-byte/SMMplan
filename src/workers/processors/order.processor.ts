import { Job, UnrecoverableError } from 'bullmq';
import { db } from '../../lib/db';
import { OrderJobPayload } from '../queues';
import { providerService } from '../../services/providers/provider.service';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { WalletService } from '../../services/financial/wallet.service';
import { SettingsManager } from '../../lib/settings';
import { getRedisConnection } from '../../lib/queue-manager';
import { logger } from '../../lib/logger';

const log = logger.child({ component: 'OrderProcessor' });

export default async function orderProcessor(job: Job<OrderJobPayload>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { orderId, isDripFeedChild } = job.data;
  
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      service: { include: { provider: true } },
      smartCampaign: true
    }
  });

  if (!order) {
    log.warn(`[OrderProcessor] Order ${orderId} not found.`);
    return;
  }

  // Intercept and activate SmartCampaign if this is a parent order
  if (order.smartCampaign) {
    log.info(`[OrderProcessor] Intercepted SmartDrip parent order ${orderId}. Activating SmartCampaign.`);
    await db.$transaction([
      db.order.update({
        where: { id: order.id },
        data: { status: 'IN_PROGRESS' }
      }),
      db.smartCampaign.update({
        where: { id: order.smartCampaign.id },
        data: { status: 'RUNNING' }
      })
    ]);
    return;
  }

  if (!order.service.provider) {
    log.warn(`[OrderProcessor] Order ${orderId} missing provider.`);
    return;
  }

  // Double execution guard
  if (order.status !== 'PENDING') {
    log.warn(`[OrderProcessor] Order ${orderId} is not PENDING. Skip.`);
    return;
  }

  // TEST ORDER GUARD — предотвращает отправку тестового заказа реальному провайдеру
  const isTestMode = await SettingsManager.isTestMode();
  if (order.isTest && !isTestMode) {
    log.error(`[OrderProcessor] CRITICAL: Test order ${orderId} picked up in production mode. Failing safely.`);
    const { orderService } = await import('../../services/core/order.service');
    await orderService.failOrderTerminal(
      orderId,
      'SYSTEM_GUARD: Попытка отправки тестового заказа реальному провайдеру прервана.'
    );
    return;
  }

  // Explicit Idempotency Check Before Provider Call
  if (order.externalId) {
    log.warn(`[OrderProcessor] Order ${orderId} already has an externalId (${order.externalId}). Skipping to prevent duplicate dispatch.`);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      const cType = order.service.customDataType;
      if (cType === 'NUMBER' || (serviceName.includes('опрос') && !serviceName.includes('просмотр')) || serviceName.includes('голосование') || serviceName.includes('poll')) {
        payload.answers_number = order.customData;
      } else {
        payload.comments = order.customData;
      }
    }

    // R2-003: Redis-level Mutex to prevent duplicate dispatch during DB write crashes or BullMQ job retries
    const connection = getRedisConnection();
    const redisKey = `order:dispatched:${order.id}`;
    const alreadyDispatched = await connection.get(redisKey);

    if (alreadyDispatched) {
      log.warn(`[OrderProcessor] Duplicate Dispatch Guard: Order ${order.id} was already dispatched to provider but DB write failed previously. Shifting to PENDING_CHECK.`);
      
      await db.order.update({
        where: { id: order.id },
        data: { 
          status: 'PENDING_CHECK', 
          error: `Попытка повторной отправки заблокирована: заказ уже был отправлен провайдеру.` 
        }
      });

      try {
        const { sendAdminAlert } = await import('@/lib/notifications');
        await sendAdminAlert(
          `🚨 [DUPLICATE DISPATCH PREVENTED] Заказ #${order.numericId} (Услуга: ${order.service.name})\n` +
          `Обнаружен повторный запуск джобы BullMQ после отправки провайдеру.\n` +
          `Заказ переведен в PENDING_CHECK. Проверьте статус у провайдера вручную во избежание двойного списания!`,
          'CRITICAL'
        );
      } catch { /* ignore */ }

      throw new UnrecoverableError(`Duplicate dispatch prevented: already sent to provider.`);
    }

    // Set the dispatch lock in Redis
    await connection.set(redisKey, '1', 'EX', 3600);

    const response = await provider.createOrder(payload);

    if (response.error && !response.order) {
      throw new Error(response.error);
    }

    // Success
    const extId = response.order ? response.order.toString() : '';
    // Set 60 minutes Wait limit
    const waitingUntil = new Date(Date.now() + 60 * 60 * 1000);
    
    // Update order with External ID from provider
    try {
      await db.order.update({
        where: { id: order.id },
        data: {
          externalId: extId,
          status: 'IN_PROGRESS',
          waitingUntil
        }
      });
    } catch (dbError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dbError as any).isDatabaseError = true;
      throw dbError;
    }

    log.info(`[OrderProcessor] Dispatched Order ${order.id} | External ID: ${extId}. Waiting until ${waitingUntil.toISOString()}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.isDatabaseError) {
      throw error;
    }
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
      log.warn(`[OrderProcessor] AMBIGUOUS TIMEOUT for Order ${order.id}. Moving to PENDING_CHECK.`);
      
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
    log.error(`[OrderProcessor] FAIL-FAST for Order ${order.id}: ${error.message}`);

    try {
      const { QuarantineService } = await import('../../services/providers/quarantine.service');
      await QuarantineService.evaluateTriggerA(order.serviceId, error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (quarantineErr: any) {
      log.error(`[OrderProcessor] Quarantine evaluation failed: ${quarantineErr.message}`);
    }

    const { orderService } = await import('../../services/core/order.service');
    await orderService.failOrderTerminalFast(order.id, error.message);

    // UnrecoverableError tells BullMQ to NOT retry this job
    throw new UnrecoverableError(`Fail-Fast: ${error.message}`);
  }
}

