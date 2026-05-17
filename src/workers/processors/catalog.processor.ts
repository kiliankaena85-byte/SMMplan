import { Job } from 'bullmq';
import { CatalogMutationPayload } from '../queues';
import { adminCatalogService } from '../../services/admin/catalog.service';

/**
 * Catalog Processor
 * Executes massive, memory-heavy database operations asynchronously
 * to prevent Vercel serverless timeouts and partial failures.
 */
export default async function catalogProcessor(job: Job<CatalogMutationPayload>) {
  const payload = job.data;
  
  try {
    switch (payload.type) {
      case 'SYNC_PRICES': {
        const { usdToRub } = payload;
        console.info(`[CatalogProcessor] Starting background price sync with rate ${usdToRub}...`);
        await adminCatalogService.syncDenormalizedPrices(usdToRub);
        console.info(`[CatalogProcessor] Price sync completed successfully.`);
        break;
      }
      
      case 'SYNC_ALL_CATALOGS': {
        const { admin } = payload;
        console.info(`[CatalogProcessor] Starting background sync for ALL catalogs...`);
        const { db } = await import('../../lib/db');
        const { catalogQueue } = await import('../queues');
        const providers = await db.provider.findMany({ where: { isActive: true } });
        
        for (const provider of providers) {
            await catalogQueue.add('sync-provider-catalog', {
                type: 'SYNC_PROVIDER_CATALOG',
                providerId: provider.id,
                admin
            });
            console.info(`[CatalogProcessor] Queued SYNC_PROVIDER_CATALOG for ${provider.id} (${provider.name})`);
        }
        break;
      }

      case 'SYNC_PROVIDER_CATALOG': {
        const { providerId, admin } = payload;
        console.info(`[CatalogProcessor] Starting background catalog sync for provider ${providerId}...`);
        const stats = await adminCatalogService.syncProviderCatalog(providerId, admin);
        console.info(`[CatalogProcessor] Catalog sync completed. Disabled Zombies: ${stats.zombiesDisabled}, Resurrected: ${stats.resurrected}, Anomalies: ${stats.priceAnomalies}`);
        break;
      }
      
      case 'BULK_MARKUP': {
        const { markupPercent, filter, admin } = payload;
        console.info(`[CatalogProcessor] Starting background bulk markup...`);
        // We reuse the existing logic, but from a worker context
        const result = await adminCatalogService.bulkUpdateMarkup(
          filter,
          markupPercent,
          admin
        );
        console.info(`[CatalogProcessor] Bulk markup completed. Updated ${result.updatedCount} services.`);
        break;
      }
        
      default:
        throw new Error(`Unknown catalog mutation type`);
    }
  } catch (error: any) {
    console.error(`[CatalogProcessor] Failed processing job ${job.id}:`, error.message);
    throw error; // Let BullMQ retry and eventually DLQ
  }
}

