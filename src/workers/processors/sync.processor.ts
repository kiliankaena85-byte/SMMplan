import { Job } from 'bullmq';
import { db } from '../../lib/db';
import { SyncJobPayload } from '../queues';
import { providerService } from '../../services/providers/provider.service';
import { WalletService } from '../../services/financial/wallet.service';
import { RefundPolicyService } from '../../services/financial/refund-policy.service';
import { sendOrderCompletedMail } from '../../lib/smtp';
import { logger } from '../../lib/logger';

const log = logger.child({ component: 'SyncProcessor' });
export default async function syncProcessor(job: Job<SyncJobPayload>) {
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
              await db.order.update({ where: { id: order.id }, data: { status: 'COMPLETED', remains: 0 } });
              sendOrderCompletedMail(order.user.email, order.numericId.toString(), order.service.name).catch(err => log.error('Failed to send completion email', { cause: err }));
          } else if (anyCanceled) {
              // Canceled mini-run -> We mark generic Drip-Feed as Partial
              const updated = await db.order.update({ where: { id: order.id }, data: { status: 'PARTIAL', remains: totalRemainsText } });
              await RefundPolicyService.processRefund({ ...updated, charge: Number(updated.charge) });
          }

        } else {
          // Standard single order
          if (!order.externalId) continue;
          
          const s = statuses[order.externalId];
          if (!s) {
              const orderAgeHours = (Date.now() - order.updatedAt.getTime()) / (1000 * 60 * 60);
              if (orderAgeHours > 72) {
                  log.warn(`Order ${order.externalId} missing from provider for >72h. Marking ERROR.`);
                  const updated = await db.order.update({ where: { id: order.id }, data: { status: 'ERROR', error: 'Орфан-заказ: провайдер удалил заказ' } });
                  await RefundPolicyService.processRefund({ ...updated, charge: Number(updated.charge) }, '(Орфан-заказ: провайдер удалил заказ)');
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
              const updated = await db.order.update({ where: { id: order.id }, data: { status: 'ERROR', error: s } });
              await RefundPolicyService.processRefund({ ...updated, charge: Number(updated.charge) }, '(Ошибка синхронизации или истек таймер)');
              continue;
          }

          const providerStatus = s.status.toUpperCase();
          const parsedRemains = parseInt(s.remains || "0", 10);

          if (['CANCELED'].includes(providerStatus)) {
            // Full Canceled -> Full Refund
            const updated = await db.order.update({ where: { id: order.id }, data: { status: 'CANCELED', remains: parsedRemains } });
            await RefundPolicyService.processRefund({ ...updated, charge: Number(updated.charge) }, '(Отмена на стороне провайдера)');
            
            // WAVE 4.1: TRIGGER B (SILENT FAILURE QUARANTINE)
            const { QuarantineService } = await import('@/services/providers/quarantine.service');
            QuarantineService.evaluateTriggerB(order.serviceId).catch(err => log.error('Quarantine trigger B failed', { cause: err })); // Fire and forget
          } 
          else if (['PARTIAL'].includes(providerStatus)) {
            // Partial -> Mathematical Proportional Refund
            const updated = await db.order.update({ where: { id: order.id }, data: { status: 'PARTIAL', remains: parsedRemains } });
            await RefundPolicyService.processRefund({ ...updated, charge: Number(updated.charge) });
          } 
          else if (['COMPLETED'].includes(providerStatus)) {
            await db.order.update({ where: { id: order.id }, data: { status: 'COMPLETED', remains: 0 } });
            sendOrderCompletedMail(order.user.email, order.numericId.toString(), order.service.name).catch(err => log.error('Failed to send completion email', { cause: err }));
          }
          // PENDING / PROCESSING etc -> just update remains
          else {
            await db.order.update({ where: { id: order.id }, data: { remains: parsedRemains } });
          }

        }
        }
      }
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
  } catch (e: any) {
    log.error('Failed to execute Orphan Sweeper', { cause: e });
  }

  log.info('Finished massive status sync.');
}
