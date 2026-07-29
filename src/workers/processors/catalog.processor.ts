import { Job } from 'bullmq';
import { CatalogMutationPayload } from '../queues';
import { adminCatalogService } from '../../services/admin/catalog.service';
import { logger } from '../../lib/logger';
import { triggerCacheRevalidation } from '../../lib/revalidate-cache';

const log = logger.child({ component: 'CatalogProcessor' });

/**
 * Catalog Processor
 * Executes massive, memory-heavy database operations asynchronously
 * to prevent Vercel serverless timeouts and partial failures.
 */
export default async function catalogProcessor(job: Job<CatalogMutationPayload>) {
  let payload: CatalogMutationPayload;
  try {
    const { CatalogJobSchema } = await import('../../schemas/jobs.schema');
    payload = CatalogJobSchema.parse(job.data) as CatalogMutationPayload;
  } catch (zodErr) {
    const { UnrecoverableError } = await import('bullmq');
    log.error(`[CatalogProcessor] Invalid job payload for job ${job.id}`, { cause: zodErr });
    throw new UnrecoverableError('Invalid job payload');
  }
  
  try {
    switch (payload.type) {
      case 'SYNC_PRICES': {
        const { usdToRub } = payload;
        log.info(`[CatalogProcessor] Starting background price sync with rate ${usdToRub}...`);
        await adminCatalogService.syncDenormalizedPrices(usdToRub);
        log.info(`[CatalogProcessor] Price sync completed successfully.`);
        await triggerCacheRevalidation(['catalog', 'services']);
        break;
      }
      
      case 'SYNC_ALL_CATALOGS': {
        const { admin } = payload;
        log.info(`[CatalogProcessor] Starting background sync for ALL catalogs...`);
        const { db } = await import('../../lib/db');
        const { catalogQueue } = await import('../queues');
        const providers = await db.provider.findMany({ where: { isActive: true } });
        
        for (const provider of providers) {
            await catalogQueue.add('sync-provider-catalog', {
                type: 'SYNC_PROVIDER_CATALOG',
                providerId: provider.id,
                admin
            });
            log.info(`[CatalogProcessor] Queued SYNC_PROVIDER_CATALOG for ${provider.id} (${provider.name})`);
        }
        break;
      }

      case 'SYNC_PROVIDER_CATALOG': {
        const { providerId, admin } = payload;
        log.info(`[CatalogProcessor] Starting background catalog sync for provider ${providerId}...`);
        const stats = await adminCatalogService.syncProviderCatalog(providerId, admin);
        log.info(`[CatalogProcessor] Catalog sync completed. Disabled Zombies: ${stats.zombiesDisabled}, Resurrected: ${stats.resurrected}, Anomalies: ${stats.priceAnomalies}`);
        
        // Apply blacklists, reclassification, and maxQty caps
        try {
          const { applyPostSyncRules } = await import('@/services/providers/post-sync-rules');
          await applyPostSyncRules();
        } catch (postSyncErr) {
          const errMsg = postSyncErr instanceof Error ? postSyncErr.message : String(postSyncErr);
          log.error(`[CatalogProcessor] applyPostSyncRules failed: ${errMsg}`);
        }
        await triggerCacheRevalidation(['catalog', 'services']);
        break;
      }
      
      case 'BULK_MARKUP': {
        const { markupPercent, filter, admin } = payload;
        log.info(`[CatalogProcessor] Starting background bulk markup...`);
        // We reuse the existing logic, but from a worker context
        const result = await adminCatalogService.bulkUpdateMarkup(
          filter,
          markupPercent,
          admin
        );
        log.info(`[CatalogProcessor] Bulk markup completed. Updated ${result.updatedCount} services.`);
        await triggerCacheRevalidation(['catalog', 'services']);
        break;
      }
        
      default:
        throw new Error(`Unknown catalog mutation type`);
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    log.error(`[CatalogProcessor] Failed processing job ${job.id}: ${error.message}`);
    throw error; // Let BullMQ retry and eventually DLQ
  }
}

