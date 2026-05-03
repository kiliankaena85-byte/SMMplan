import { Job } from 'bullmq';
import { db } from '../../lib/db';
import { SyncJobPayload } from '../queues';
import { providerService } from '../../services/providers/provider.service';
import { WalletService } from '../../services/financial/wallet.service';
import { RefundPolicyService } from '../../services/financial/refund-policy.service';
import { sendOrderCompletedMail } from '../../lib/smtp';

export default async function syncProcessor(job: Job<SyncJobPayload>) {
  console.log('[SyncProcessor] Beginning massive status sync...');

  // 1. Find all IN_PROGRESS orders and group by Provider
  const activeOrders = await db.order.findMany({
    where: { status: 'IN_PROGRESS' },
    include: { service: { include: { provider: true } }, user: { select: { email: true } } }
  });

  if (activeOrders.length === 0) return;

  const grouped = activeOrders.reduce((acc, order) => {
    const pId = order.service.provider?.id;
    if (!pId) return acc;
    if (!acc[pId]) acc[pId] = [];
    acc[pId].push(order);
    return acc;
  }, {} as Record<string, typeof activeOrders>);

  // 2. Process each provider batch
  for (const providerId of Object.keys(grouped)) {
    const ordersBatch = grouped[providerId];
    const providerDef = ordersBatch[0].service.provider;

    if (!providerDef || !providerDef.apiUrl || !providerDef.apiKey) continue;

    try {
      const provider = await providerService.getWorkerProviderInstance(providerDef);
      
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

      // multiStatus API
      const statuses = await provider.getMultiOrderStatus(allExtIds);

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
              sendOrderCompletedMail(order.user.email, order.numericId.toString(), order.service.name).catch(console.error);
          } else if (anyCanceled) {
              // Canceled mini-run -> We mark generic Drip-Feed as Partial
              const updated = await db.order.update({ where: { id: order.id }, data: { status: 'PARTIAL', remains: totalRemainsText } });
              await RefundPolicyService.processRefund({ ...updated, charge: Number(updated.charge) });
          }

        } else {
          // Standard single order
          if (!order.externalId) continue;
          
          const s = statuses[order.externalId];
          if (!s) continue;

          // If the provider returned "Incorrect order ID", it's a string, we treat it as an Error
          if (typeof s === 'string') {
              if (order.waitingUntil && new Date() < order.waitingUntil) {
                  console.warn(`[SyncProcessor] Order ${order.externalId} string error: ${s}. Smart Waiting until ${order.waitingUntil.toISOString()}`);
                  continue; // Skip, waiting
              }
              console.warn(`[SyncProcessor] Order ${order.externalId} returned string error: ${s}`);
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
          } 
          else if (['PARTIAL'].includes(providerStatus)) {
            // Partial -> Mathematical Proportional Refund
            const updated = await db.order.update({ where: { id: order.id }, data: { status: 'PARTIAL', remains: parsedRemains } });
            await RefundPolicyService.processRefund({ ...updated, charge: Number(updated.charge) });
          } 
          else if (['COMPLETED'].includes(providerStatus)) {
            await db.order.update({ where: { id: order.id }, data: { status: 'COMPLETED', remains: 0 } });
            sendOrderCompletedMail(order.user.email, order.numericId.toString(), order.service.name).catch(console.error);
          }
          // PENDING / PROCESSING etc -> just update remains
          else {
            await db.order.update({ where: { id: order.id }, data: { remains: parsedRemains } });
          }

        }
      }
    } catch (e: any) {
      console.error(`[SyncProcessor] Exception while pinging Provider ${providerId}:`, e.message);
    }
  }

  console.log('[SyncProcessor] Finished massive status sync.');
}
