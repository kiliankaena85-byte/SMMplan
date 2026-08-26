import { Prisma, Order } from '@prisma/client';
import { Job } from 'bullmq';
import { db } from '../../lib/db';
import { SyncJobPayload } from '@/lib/queue-manager';
import { providerService } from '../../services/providers/provider.service';
import { RefundPolicyService } from '../../services/financial/refund-policy.service';
import { sendOrderCompletedMail } from '../../lib/smtp';
import { logger } from '../../lib/logger';

const log = logger.child({ component: 'SyncProcessor' });

async function safeUpdateOrderStatus(
  tx: Prisma.TransactionClient, 
  orderId: string, 
  data: Prisma.OrderUpdateInput
): Promise<Order | null> {
  const fresh = await tx.order.findUnique({ where: { id: orderId } });
  if (!fresh || !['PENDING', 'IN_PROGRESS', 'PENDING_CHECK'].includes(fresh.status)) {
    return null; // already terminal or not found
  }
  return await tx.order.update({
    where: { id: orderId },
    data
  });
}

export default async function syncProcessor(job: Job<SyncJobPayload>) {
  if (job.name === 'dripfeed-tick') {
    log.info('Starting Smart Dripfeed Tick processing...');
    const { runSmartDripfeedTick } = await import('./dripfeed.processor');
    await runSmartDripfeedTick();
    log.info('Finished Smart Dripfeed Tick processing.');
    return;
  }

  log.info('Beginning massive status sync...');

  // 1. Get all active providers
  const activeProviders = await db.provider.findMany({
    where: { isActive: true }
  });

  if (activeProviders.length === 0) return;

  const BATCH_SIZE = 500;

  // 2. Process each provider concurrently
  await Promise.allSettled(activeProviders.map(async (providerDef) => {
    if (!providerDef.apiUrl || !providerDef.apiKey) return;

    try {
      const MAX_SYNC_PER_PROVIDER = 1000;
      const activeOrderIds = await db.order.findMany({
        where: { status: 'IN_PROGRESS', providerId: providerDef.id },
        select: { id: true },
        take: MAX_SYNC_PER_PROVIDER,
        orderBy: { updatedAt: 'asc' }
      });

      if (activeOrderIds.length >= MAX_SYNC_PER_PROVIDER) {
        log.warn(`[SyncProcessor] Provider ${providerDef.name}: sync truncated to ${MAX_SYNC_PER_PROVIDER} orders (oldest first) — remaining orders will sync next tick`);
      }

      if (activeOrderIds.length === 0) return;

      const provider = await providerService.getWorkerProviderInstance(providerDef);

      for (let i = 0; i < activeOrderIds.length; i += BATCH_SIZE) {
        const chunkIds = activeOrderIds.slice(i, i + BATCH_SIZE).map(o => o.id);
        
        const ordersBatch = await db.order.findMany({
          where: { id: { in: chunkIds } },
          include: { user: true, service: true }
        });

        const allExtIds: string[] = [];
        ordersBatch.forEach(o => {
          if (o.isDripFeed) {
            allExtIds.push(...o.dripExternalIds);
          } else if (o.externalId) {
            allExtIds.push(o.externalId);
          }
        });

        if (allExtIds.length === 0) continue;

        // multiStatus API with Timeout
        const syncStartTime = Date.now();
        const statuses = await Promise.race([
          provider.getMultiOrderStatus(allExtIds),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('PROVIDER_TIMEOUT')), 15000))
        ]);
        const elapsedMs = Date.now() - syncStartTime;

        // Update SLA Monitoring (Success)
        await db.provider.update({
          where: { id: providerDef.id },
          data: {
            lastSuccessAt: new Date(),
            errorCount5m: 0, // Reset errors on successful ping
            avgResponseMs: Math.round(((providerDef.avgResponseMs || 0) * 9 + elapsedMs) / 10),
          }
        });

        // 3. Update orders based on responses
        for (const order of ordersBatch) {
        if (order.isDripFeed) {
          // Complex logic for Drip-Feed (average out the remains and statuses)
          let totalRemainsText = 0;
          let anyCanceled = false;
          let allCompleted = true;

          for (const extId of order.dripExternalIds) {
             const s = statuses[extId];
             if (!s || typeof s === 'string') continue; 
             if (s.remains) totalRemainsText += parseInt(s.remains, 10) || 0;
             if (['Canceled', 'Cancel'].includes(s.status)) anyCanceled = true;
             if (!['Completed', 'Complete'].includes(s.status)) allCompleted = false;
          }

          if (allCompleted) {
             await db.$transaction(async (tx) => {
               await safeUpdateOrderStatus(tx, order.id, {
                 status: 'COMPLETED',
                 remains: 0
               });
             });
          } else if (anyCanceled) {
             await db.$transaction(async (tx) => {
               await safeUpdateOrderStatus(tx, order.id, {
                 status: 'PARTIAL',
                 remains: totalRemainsText
               });
             });
          }
          continue;
        }

        if (!order.externalId) continue;
        const statusObj = statuses[order.externalId];
        if (!statusObj) continue;

        // Check if provider returned an explicit error status payload
        if (typeof statusObj === 'string' || !statusObj.status) {
          log.warn(`Invalid multi-status response for Order ${order.id}`, { statusObj });
          continue;
        }

        const normalizedStatus = statusObj.status.toLowerCase();
        let targetStatus: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'PARTIAL' | null = null;

        if (['completed', 'complete', 'success'].includes(normalizedStatus)) {
          targetStatus = 'COMPLETED';
        } else if (['canceled', 'cancelled', 'cancel'].includes(normalizedStatus)) {
          targetStatus = 'CANCELED';
        } else if (['partial', 'partially completed'].includes(normalizedStatus)) {
          targetStatus = 'PARTIAL';
        } else if (['processing', 'in progress', 'in_progress', 'pending'].includes(normalizedStatus)) {
          targetStatus = 'IN_PROGRESS';
        }

        const remainsNum = statusObj.remains !== undefined ? parseInt(String(statusObj.remains), 10) : undefined;
        const startCountNum = statusObj.start_count !== undefined ? parseInt(String(statusObj.start_count), 10) : undefined;

        if (targetStatus === 'COMPLETED') {
          await db.$transaction(async (tx) => {
            const updated = await safeUpdateOrderStatus(tx, order.id, {
              status: 'COMPLETED',
              remains: 0,
              startCount: startCountNum !== undefined && !isNaN(startCountNum) ? startCountNum : undefined
            });

            if (updated && order.email) {
              await sendOrderCompletedMail(order.email, String(order.numericId || order.id), order.service.name).catch(err => log.error('Failed to send order completed email', { error: err }));
            }
          });
        } else if (targetStatus === 'CANCELED') {
          await db.$transaction(async (tx) => {
            const updated = await safeUpdateOrderStatus(tx, order.id, {
              status: 'CANCELED',
              remains: order.quantity,
              error: statusObj.error || 'Провайдер отменил заказ'
            });

            if (updated) {
              await RefundPolicyService.processRefund({ id: order.id, userId: order.userId, charge: Number(order.charge), quantity: order.quantity, remains: order.quantity, status: 'CANCELED' }, 'Авто-возврат: провайдер отменил заказ', tx);
            }
          });
        } else if (targetStatus === 'PARTIAL') {
          const validRemains = (remainsNum !== undefined && !isNaN(remainsNum) && remainsNum > 0) ? remainsNum : 0;
          await db.$transaction(async (tx) => {
            const updated = await safeUpdateOrderStatus(tx, order.id, {
              status: 'PARTIAL',
              remains: validRemains,
              startCount: startCountNum !== undefined && !isNaN(startCountNum) ? startCountNum : undefined
            });

            if (updated) {
              await RefundPolicyService.processRefund({ id: order.id, userId: order.userId, charge: Number(order.charge), quantity: order.quantity, remains: validRemains, status: 'PARTIAL' }, 'Авто-возврат за недовыполненную часть заказа', tx);
            }
          });
        } else if (targetStatus === 'IN_PROGRESS') {
          await db.order.update({
            where: { id: order.id },
            data: {
              remains: remainsNum !== undefined && !isNaN(remainsNum) ? remainsNum : undefined,
              startCount: startCountNum !== undefined && !isNaN(startCountNum) ? startCountNum : undefined
            }
          });
        }
      }
      }
    } catch (e: unknown) {
      log.error(`Exception while pinging Provider ${providerDef.id}`, { cause: e });

      // Update SLA Monitoring (Error)
      try {
        await db.provider.update({
          where: { id: providerDef.id },
          data: {
            lastErrorAt: new Date(),
            errorCount5m: { increment: 1 }
          }
        });
      } catch (slaErr: unknown) {
        log.error(`Failed to update SLA error metrics for ${providerDef.id}`, { cause: slaErr });
      }
    }
  }));

  // Restore Quarantined Services & Evaluate Stuck Orders
  try {
    const { QuarantineService } = await import('@/services/providers/quarantine.service');
    await QuarantineService.restoreExpiredQuarantines();
    await QuarantineService.evaluateTriggerC();
  } catch (e: unknown) {
    log.error('Failed to execute Quarantine Service tasks', { cause: e });
  }

  // Sweep Orphaned PENDING Orders
  try {
    const orphanThreshold = new Date(Date.now() - 15 * 60 * 1000);
    const orphanOrders = await db.order.findMany({
      where: {
        status: 'PENDING',
        updatedAt: { lt: orphanThreshold },
        externalId: null
      },
      select: { id: true, numericId: true }
    });

    if (orphanOrders.length > 0) {
      log.warn(`Found ${orphanOrders.length} orphaned PENDING orders. Sweeping...`);
      const { orderService } = await import('../../services/core/order.service');
      for (const orphan of orphanOrders) {
        await orderService.failOrderTerminal(orphan.id, 'Авто-отмена: заказ завис в очереди на отправку (Timeout > 15m)');
      }
    }
  } catch (e: unknown) {
    log.error('Failed to execute Orphan Sweeper', { cause: e });
  }

  // Smart Drip 2.5: Auto-compensation tick
  try {
    const { SmartFeedbackLoopProcessor } = await import('./smart-feedback-loop.processor');
    await SmartFeedbackLoopProcessor.runSmartFeedbackLoopTick();
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error('[SyncProcessor] SmartFeedbackLoop tick failed', { error: errMsg });
  }

  // WRK-02: Zero-start detector — provider hasn't started the order within the
  // waiting window (remains == full quantity). Escalate to PENDING_CHECK so the
  // existing 6h auto-resolution asks the provider directly.
  try {
    const candidates = await db.order.findMany({
      where: {
        status: 'IN_PROGRESS',
        waitingUntil: { lt: new Date() },
        externalId: { not: null },
        isDripFeed: false,
      },
      select: { id: true, numericId: true, serviceId: true, quantity: true, remains: true },
      take: 50
    });

    const zeroStartOrders = candidates.filter(o => o.remains === o.quantity);

    for (const order of zeroStartOrders) {
      await db.order.update({
        where: { id: order.id },
        data: {
          status: 'PENDING_CHECK',
          error: 'Авто-эскалация: провайдер не начал выполнение в течение часа (zero-start detector)'
        }
      });
      log.warn(`[SyncProcessor] Zero-start escalation for Order #${order.numericId} → PENDING_CHECK`);

      const { sendAdminAlert } = await import('@/lib/notifications');
      sendAdminAlert(
        `⏱ [ZERO-START] Заказ #${order.numericId}: провайдер не начал выполнение за час. Переведён в PENDING_CHECK для сверки со статусом провайдера.`,
        'WARNING'
      );
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error('[SyncProcessor] Zero-start detector failed', { error: errMsg });
  }
}
