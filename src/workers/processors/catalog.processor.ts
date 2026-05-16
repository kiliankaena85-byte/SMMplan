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
        console.log(`[CatalogProcessor] Starting background price sync with rate ${usdToRub}...`);
        await adminCatalogService.syncDenormalizedPrices(usdToRub);
        console.log(`[CatalogProcessor] Price sync completed successfully.`);
        break;
      }
      
      case 'BULK_MARKUP': {
        const { markupPercent, filter, admin } = payload;
        console.log(`[CatalogProcessor] Starting background bulk markup...`);
        // We reuse the existing logic, but from a worker context
        const result = await adminCatalogService.bulkUpdateMarkup(
          filter,
          markupPercent,
          admin
        );
        console.log(`[CatalogProcessor] Bulk markup completed. Updated ${result.updatedCount} services.`);
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
