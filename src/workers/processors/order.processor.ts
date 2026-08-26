class DatabaseOrderError extends Error {
  isDatabaseError = true;
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseOrderError';
  }
}
import { Job, UnrecoverableError } from 'bullmq';
import { db } from '../../lib/db';
import { OrderJobPayload } from '@/lib/queue-manager';
import { providerService } from '../../services/providers/provider.service';
import { SettingsManager } from '../../lib/settings';
import { getRedisConnection } from '../../lib/queue-manager';
import { logger } from '../../lib/logger';
import { SmartRoutingService, MarginGuard, PrioritizedRoute } from '../../services/providers/smart-routing.service';

const log = logger.child({ component: 'OrderProcessor' });

export default async function orderProcessor(job: Job<OrderJobPayload>) {
  let orderId: string;
  try {
    const { OrderJobSchema } = await import('../../schemas/jobs.schema');
    const parsed = OrderJobSchema.parse(job.data);
    orderId = parsed.orderId;
  } catch (zodErr) {
    log.error(`[OrderProcessor] Invalid job payload for job ${job.id}`, { cause: zodErr });
    throw new UnrecoverableError('Invalid job payload');
  }

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

  // Double execution guard
  if (order.status !== 'PENDING') {
    log.warn(`[OrderProcessor] Order ${orderId} is not PENDING. Skip.`);
    return;
  }

  // TEST ORDER GUARD — prevents dispatching test orders to real providers
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
        error: 'Попытка повторной отправки заблокирована: заказ уже был отправлен провайдеру.'
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

  // 1. Fetch prioritized candidate routes via SmartRoutingService
  let candidateRoutes: PrioritizedRoute[] = [];
  try {
    candidateRoutes = await SmartRoutingService.getPrioritizedRoutes(order.serviceId);
  } catch (routeErr) {
    log.warn(`[OrderProcessor] Failed to query prioritized routes, falling back to service provider`, { routeErr });
  }

  if (candidateRoutes.length === 0 && order.service?.provider) {
    candidateRoutes = [
      {
        id: 'fallback_primary',
        serviceId: order.serviceId,
        providerId: order.service.provider.id,
        providerServiceId: order.providerServiceId || order.service.externalId || '',
        isPrimary: true,
        isActive: true,
        priority: 0,
        failoverMode: 'manual',
        provider: order.service.provider,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];
  }

  if (candidateRoutes.length === 0) {
    const noRoutesMsg = 'Нет доступных активных маршрутов или провайдеров для выполнения заказа.';
    log.warn(`[OrderProcessor] Order ${orderId}: ${noRoutesMsg}`);
    try {
      const { QuarantineService } = await import('../../services/providers/quarantine.service');
      await QuarantineService.evaluateTriggerA(order.serviceId, noRoutesMsg);
    } catch { /* ignore */ }
    const { orderService } = await import('../../services/core/order.service');
    await orderService.failOrderTerminalFast(order.id, noRoutesMsg);
    throw new UnrecoverableError(`Fail-Fast: ${noRoutesMsg}`);
  }

  const primaryProviderId = candidateRoutes.find(r => r.isPrimary)?.providerId || candidateRoutes[0]?.providerId;
  let dispatched = false;
  let lastError = '';

  for (let i = 0; i < candidateRoutes.length; i++) {
    const route = candidateRoutes[i];
    const nextRoute = candidateRoutes[i + 1];

    if (!route.provider?.apiUrl || !route.provider?.apiKey) {
      lastError = `Провайдер ${route.provider?.name || route.providerId} не имеет валидного API URL или ключа`;
      log.warn(`[OrderProcessor] Route ${route.id} skipped: ${lastError}`);
      continue;
    }

    // ShadowService check for candidate route limits & capabilities
    let shadowSvc = null;
    try {
      if (db.shadowService) {
        shadowSvc = await db.shadowService.findUnique({
          where: {
            providerId_externalId: {
              providerId: route.providerId,
              externalId: String(route.providerServiceId)
            }
          }
        });
      }
    } catch {
      shadowSvc = null;
    }

    // Capability verification: Drip-Feed
    if (order.isDripFeed) {
      const supportsDrip = shadowSvc ? shadowSvc.dripfeed : (route.providerId === order.service?.providerId ? order.service.isDripFeedEnabled : true);
      if (!supportsDrip) {
        lastError = `Маршрут ${route.provider.name} не поддерживает Drip-Feed`;
        log.info(`[OrderProcessor] Route ${route.id} skipped: ${lastError}`);
        continue;
      }
    }

    // Capability verification: CustomData
    if (order.customData) {
      const customType = shadowSvc ? shadowSvc.customDataType : (route.providerId === order.service?.providerId ? order.service.customDataType : 'NONE');
      if (customType === 'NONE' && shadowSvc) {
        lastError = `Маршрут ${route.provider.name} не поддерживает customData`;
        log.info(`[OrderProcessor] Route ${route.id} skipped: ${lastError}`);
        continue;
      }
    }

    // MarginGuard check with 5% currency volatility buffer
    const providerRate = shadowSvc?.rate ?? (route.providerId === order.service?.providerId ? order.service.rate : 0);
    const providerCurrency = route.provider.balanceCurrency || (route.providerId === order.service?.providerId ? order.service.providerCurrency : 'USD');

    if (providerRate > 0 && order.charge && order.charge > BigInt(0)) {
      const marginCheck = await MarginGuard.checkMargin(
        order.charge,
        order.quantity,
        providerRate,
        providerCurrency,
        0.05
      );

      if (!marginCheck.isProfitable) {
        lastError = marginCheck.reason || 'Маржа маршрута отрицательна с учетом буфера 5%';
        log.warn(`[OrderProcessor] Margin rejected for route ${route.provider.name}: ${lastError}`);
        await SmartRoutingService.recordFailoverEvent({
          serviceId: order.serviceId,
          action: 'MARGIN_REJECTED',
          fromProviderId: primaryProviderId,
          toProviderId: route.providerId,
          reason: lastError
        });
        continue;
      }
    }

    try {
      const provider = await providerService.getWorkerProviderInstance(route.provider as unknown as import('@prisma/client').Provider);

      const runQty = (order.isDripFeed && order.runs && order.runs > 0)
        ? Math.max(1, Math.floor(order.quantity / order.runs))
        : order.quantity;

      const serviceName = order.service?.name?.toLowerCase() || '';
      const payload: Record<string, unknown> = {
        service: route.providerServiceId,
        link: order.link,
        quantity: runQty,
        ref: order.id,
        custom_id: order.id
      };

      if (order.isDripFeed && order.runs && order.interval) {
        payload.runs = order.runs;
        payload.interval = order.interval;
      }

      if (order.customData) {
        const cType = shadowSvc?.customDataType || order.service?.customDataType;
        if (cType === 'NUMBER' || (serviceName.includes('опрос') && !serviceName.includes('просмотр')) || serviceName.includes('голосование') || serviceName.includes('poll')) {
          payload.answers_number = order.customData;
        } else {
          payload.comments = order.customData;
        }
      }

      await connection.set(redisKey, '1', 'EX', 3600);

      // Adaptive Rate Limiting to prevent HTTP 429 from provider
      const { AdaptiveRateLimiterService } = await import('../../services/providers/adaptive-rate-limiter.service');
      await AdaptiveRateLimiterService.acquireToken(route.providerId);

      const response = await provider.createOrder(payload as Parameters<typeof provider.createOrder>[0]);

      if (response.error && !response.order) {
        throw new Error(response.error);
      }

      const extId = response.order ? response.order.toString() : '';
      const waitingUntil = new Date(Date.now() + 60 * 60 * 1000);

      try {
        await db.order.update({
          where: { id: order.id },
          data: {
            externalId: extId,
            providerId: route.providerId,
            providerServiceId: route.providerServiceId,
            status: 'IN_PROGRESS',
            waitingUntil
          }
        });
      } catch (dbError) {
        throw new DatabaseOrderError(dbError instanceof Error ? dbError.message : String(dbError));
      }

      if (route.providerId !== primaryProviderId) {
        await SmartRoutingService.recordFailoverEvent({
          serviceId: order.serviceId,
          action: 'FAILOVER_SWAP',
          fromProviderId: primaryProviderId,
          toProviderId: route.providerId,
          reason: `Failover to ${route.provider.name} succeeded. Previous error: ${lastError}`
        });
      }

      log.info(`[OrderProcessor] Dispatched Order ${order.id} | Provider: ${route.provider.name} | External ID: ${extId}`);
      dispatched = true;
      break;

    } catch (error: unknown) {
      if (error instanceof DatabaseOrderError || (typeof error === 'object' && error !== null && 'isDatabaseError' in error)) {
        throw error;
      }

      const errMsg = (error instanceof Error ? error.message : String(error)).toLowerCase();
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
            error: `Сетевой таймаут при отправке: ${error instanceof Error ? error.message : String(error)}`
          }
        });

        try {
          const { sendAdminAlert } = await import('@/lib/notifications');
          sendAdminAlert(
            `⚠️ [AMBIGUOUS TIMEOUT] Заказ #${order.numericId} (Услуга: ${order.service?.name || ''})\n` +
            `Провайдер ${route.provider.name} не ответил (таймаут). Заказ переведен в PENDING_CHECK.\n` +
            `Требуется ручная проверка на стороне провайдера во избежание двойной поставки!`,
            'CRITICAL'
          );
        } catch { /* ignore */ }

        throw new UnrecoverableError(`Ambiguous Timeout: ${error instanceof Error ? error.message : String(error)}`);
      }

      const originalError = error instanceof Error ? error.message : String(error);
      lastError = originalError;
      log.error(`[OrderProcessor] Provider error on route ${route.provider.name} for order ${order.id}: ${originalError}`);

      if (nextRoute) {
        await SmartRoutingService.recordFailoverEvent({
          serviceId: order.serviceId,
          action: 'FAILOVER_SWAP',
          fromProviderId: route.providerId,
          toProviderId: nextRoute.providerId,
          reason: `Provider ${route.provider.name} failed: ${originalError}. Cascading to ${nextRoute.provider.name}`
        });
      }
    }
  }

  if (!dispatched) {
    log.error(`[OrderProcessor] FAIL-FAST for Order ${order.id}: ${lastError}`);

    try {
      const { QuarantineService } = await import('../../services/providers/quarantine.service');
      await QuarantineService.evaluateTriggerA(order.serviceId, lastError);
    } catch (quarantineErr: unknown) {
      log.error(`[OrderProcessor] Quarantine evaluation failed: ${quarantineErr instanceof Error ? quarantineErr.message : String(quarantineErr)}`);
    }

    const { orderService } = await import('../../services/core/order.service');
    await orderService.failOrderTerminalFast(order.id, lastError);

    throw new UnrecoverableError(`Fail-Fast: ${lastError}`);
  }
}
