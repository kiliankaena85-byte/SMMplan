import { Job } from 'bullmq';
import { db } from '../../lib/db';
import { SyncJobPayload } from '../queues';
import { providerService } from '../../services/providers/provider.service';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { WalletService } from '../../services/financial/wallet.service';
import { RefundPolicyService } from '../../services/financial/refund-policy.service';
import { sendOrderCompletedMail } from '../../lib/smtp';
import { logger } from '../../lib/logger';
import { CompensationService } from '../../services/financial/compensation.service';

const log = logger.child({ component: 'SyncProcessor' });

async function safeUpdateOrderStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any, 
  orderId: string, 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
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

      if (activeOrderIds.length === 0) return;

      const provider = await providerService.getWorkerProviderInstance(providerDef);

      for (let i = 0; i < activeOrderIds.length; i += BATCH_SIZE) {
        const chunkIds = activeOrderIds.slice(i, i + BATCH_SIZE).map(o => o.id);
        
        const ordersBatch = await db.order.findMany({
          where: { id: { in: chunkIds } },
          include: { service: true, user: { select: { email: true } } }
        });

        // Extract all external IDs to fetch (including all IDs from DripFeed arrays)
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('PROVIDER_TIMEOUT')), 15000))
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

            // Simplified version for DripFeed synchronization:
            // Since DripFeed spans multiple IDs, we check if all are completed.
          for (const extId of order.dripExternalIds) {
             const s = statuses[extId];
             if (!s || typeof s === 'string') continue; 
             
             if (s.status.toLowerCase() !== 'completed') {
                 allCompleted = false;
             }
             if (s.status.toLowerCase() === 'canceled' || s.status.toLowerCase() === 'partial') {
                 anyCanceled = true;
             }
             totalRemainsText += parseInt(s.remains || "0", 10);
          }

             if (allCompleted && order.currentRun >= (order.runs || 1)) {
              await db.$transaction(async (tx) => {
                const updated = await safeUpdateOrderStatus(tx, order.id, { status: 'COMPLETED', remains: 0 });
                if (updated) {
                  const { LoyaltyService } = await import('../../services/users/loyalty.service');
                  await LoyaltyService.confirmCommission(tx, order.id);
                  
                  sendOrderCompletedMail(order.user.email, order.numericId.toString(), order.service.name).catch(err => log.error('Failed to send completion email', { cause: err }));
                  CompensationService.trackCompensation(order.id).catch(err => log.error('Failed to track compensation on completed dripfeed', { cause: err }));
                }
              }, { isolationLevel: 'Serializable' });
          } else if (anyCanceled) {
              // Canceled mini-run -> We mark generic Drip-Feed as Partial
              await db.$transaction(async (tx) => {
                const updated = await safeUpdateOrderStatus(tx, order.id, { status: 'PARTIAL', remains: totalRemainsText });
                if (updated) {
                  await RefundPolicyService.processRefund({ ...updated, charge: Number(updated.charge) }, undefined, tx);
                  CompensationService.trackCompensation(order.id).catch(err => log.error('Failed to track compensation on partial dripfeed', { cause: err }));
                }
              }, { isolationLevel: 'Serializable' });
          }

        } else {
          // Standard single order
          if (!order.externalId) continue;
          
          const s = statuses[order.externalId];
          if (!s) {
              const orderAgeHours = (Date.now() - order.updatedAt.getTime()) / (1000 * 60 * 60);
              if (orderAgeHours > 72) {
                  log.warn(`Order ${order.externalId} missing from provider for >72h. Marking ERROR.`);
                  await db.$transaction(async (tx) => {
                    const updated = await safeUpdateOrderStatus(tx, order.id, { status: 'ERROR', error: 'Орфан-заказ: провайдер удалил заказ' });
                    if (updated) {
                      await RefundPolicyService.processRefund({ ...updated, charge: Number(updated.charge) }, '(Орфан-заказ: провайдер удалил заказ)', tx);
                      CompensationService.trackCompensation(order.id).catch(err => log.error('Failed to track compensation on orphan ERROR order', { cause: err }));
                    }
                  }, { isolationLevel: 'Serializable' });
              }
              continue;
          }

          // If the provider returned "Incorrect order ID", it's a string, we treat it as an Error
          if (typeof s === 'string') {
              if (order.waitingUntil && new Date() < order.waitingUntil) {
                  log.warn(`Order ${order.externalId} string error: ${s}. Smart Waiting until ${order.waitingUntil.toISOString()}`);
                  continue; // Skip, waiting
              }
              log.warn(`Order ${order.externalId} returned string error: ${s}`);
              await db.$transaction(async (tx) => {
                const updated = await safeUpdateOrderStatus(tx, order.id, { status: 'ERROR', error: s });
                if (updated) {
                  await RefundPolicyService.processRefund({ ...updated, charge: Number(updated.charge) }, '(Ошибка синхронизации или истек таймер)', tx);
                  CompensationService.trackCompensation(order.id).catch(err => log.error('Failed to track compensation on string ERROR order', { cause: err }));
                }
              }, { isolationLevel: 'Serializable' });
              continue;
          }

          const providerStatus = s.status.toUpperCase();
          const parsedRemains = parseInt(s.remains || "0", 10);

          if (['CANCELED'].includes(providerStatus)) {
            // Full Canceled -> Full Refund
            await db.$transaction(async (tx) => {
              const updated = await safeUpdateOrderStatus(tx, order.id, { status: 'CANCELED', remains: parsedRemains });
              if (updated) {
                await RefundPolicyService.processRefund({ ...updated, charge: Number(updated.charge) }, '(Отмена на стороне провайдера)', tx);
                
                CompensationService.trackCompensation(order.id, s.charge).catch(err => log.error('Failed to track compensation on CANCELED order', { cause: err }));
                
                // WAVE 4.1: TRIGGER B (SILENT FAILURE QUARANTINE)
                const { QuarantineService } = await import('@/services/providers/quarantine.service');
                QuarantineService.evaluateTriggerB(order.serviceId).catch(err => log.error('Quarantine trigger B failed', { cause: err })); // Fire and forget
              }
            }, { isolationLevel: 'Serializable' });
          } 
          else if (['PARTIAL'].includes(providerStatus)) {
            // Partial -> Mathematical Proportional Refund
            await db.$transaction(async (tx) => {
              const updated = await safeUpdateOrderStatus(tx, order.id, { status: 'PARTIAL', remains: parsedRemains });
              if (updated) {
                await RefundPolicyService.processRefund({ ...updated, charge: Number(updated.charge) }, undefined, tx);
                
                CompensationService.trackCompensation(order.id, s.charge).catch(err => log.error('Failed to track compensation on PARTIAL order', { cause: err }));
              }
            }, { isolationLevel: 'Serializable' });
          } 
          else if (['COMPLETED'].includes(providerStatus)) {
            await db.$transaction(async (tx) => {
              const updated = await safeUpdateOrderStatus(tx, order.id, { status: 'COMPLETED', remains: 0 });
              if (updated) {
                const { LoyaltyService } = await import('../../services/users/loyalty.service');
                await LoyaltyService.confirmCommission(tx, order.id);
                
                sendOrderCompletedMail(order.user.email, order.numericId.toString(), order.service.name).catch(err => log.error('Failed to send completion email', { cause: err }));
                CompensationService.trackCompensation(order.id, s.charge).catch(err => log.error('Failed to track compensation on COMPLETED order', { cause: err }));
              }
            }, { isolationLevel: 'Serializable' });
          }
          // PENDING / PROCESSING etc -> just update remains
          else {
            await db.order.update({
              where: { id: order.id },
              data: { remains: parsedRemains }
            });
          }

        }
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (slaErr: any) {
        log.error(`Failed to update SLA error metrics for ${providerDef.id}`, { cause: slaErr });
      }
    }
  }));

  // WAVE 4.1: Restore Quarantined Services & Evaluate Stuck Orders
  try {
    const { QuarantineService } = await import('@/services/providers/quarantine.service');
    await QuarantineService.restoreExpiredQuarantines();
    await QuarantineService.evaluateTriggerC(); // Check for stuck orders globally
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    log.error('Failed to execute Quarantine Service tasks', { cause: e });
  }

  // ── Sweep Orphaned PENDING Orders ─────────────────────────────────────────
  try {
    // Orders stuck in PENDING for > 15 minutes (failed to enqueue or crashed before IN_PROGRESS)
    const orphanThreshold = new Date(Date.now() - 15 * 60 * 1000);
    const orphanOrders = await db.order.findMany({
      where: {
        status: 'PENDING',
        updatedAt: { lt: orphanThreshold },
        externalId: null // Ensure it hasn't been sent to provider
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    log.error('Failed to execute Orphan Sweeper', { cause: e });
  }

  // Smart Drip 2.5: Auto-compensation tick
  try {
    const { SmartFeedbackLoopProcessor } = await import('./smart-feedback-loop.processor');
    await SmartFeedbackLoopProcessor.runSmartFeedbackLoopTick();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error('[SyncProcessor] SmartFeedbackLoop tick failed', { error: errMsg });
  }

  // Refill Status Sync: Poll provider for refill completion
  try {
    const pendingRefills = await db.refill.findMany({
      where: { status: 'IN_PROGRESS' },
      include: {
        order: {
          include: { service: { include: { provider: true } } }
        }
      },
      take: 50
    });

    for (const refill of pendingRefills) {
      try {
        const provider = refill.order?.service?.provider;
        if (!provider || !refill.externalId) continue;

        const client = await providerService.getWorkerProviderInstance(provider);
        const res = await client.getRefillStatus(refill.externalId);

        if (res && res.status && res.status !== 'In progress' && res.status !== 'Pending') {
          await db.refill.update({
            where: { id: refill.id },
            data: { status: res.status === 'Completed' ? 'COMPLETED' : 'ERROR' }
          });
        }
      } catch (refillErr) {
        const errMsg = refillErr instanceof Error ? refillErr.message : String(refillErr);
        log.error(`[SyncProcessor] Refill sync failed for ${refill.id}`, { error: errMsg });
      }
    }
  } catch (refillGlobalErr) {
    const errMsg = refillGlobalErr instanceof Error ? refillGlobalErr.message : String(refillGlobalErr);
    log.error('[SyncProcessor] Refill sync section failed', { error: errMsg });
  }

  log.info('Finished massive status sync.');
}
