import { Job } from 'bullmq';
import { logger } from '../../lib/logger';
import { IndexNowService } from '../../services/seo/indexnow.service';
import { IndexNowJobPayload } from '../../lib/queue-manager';

const log = logger.child({ component: 'IndexNowWorker' });

export default async function indexNowProcessor(job: Job<IndexNowJobPayload>) {
  const { host, urls, key, keyLocation } = job.data;
  log.info(`[${job.id}] Processing IndexNow submission for ${host} (${urls?.length || 0} URLs)...`);

  try {
    const result = await IndexNowService.submitUrls({
      host,
      urls,
      key,
      keyLocation,
    });

    if (!result.success) {
      const errorMsg = result.error || `IndexNow submission returned failure (yandex: ${result.yandexStatus}, indexNow: ${result.indexNowStatus})`;
      log.warn(`[${job.id}] IndexNow submission failed, triggering BullMQ retry: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    log.info(`[${job.id}] Successfully submitted ${result.submittedCount} URLs to IndexNow (host: ${host})`);
    return {
      success: true,
      submittedCount: result.submittedCount,
      yandexStatus: result.yandexStatus,
      indexNowStatus: result.indexNowStatus,
    };
  } catch (error: any) {
    log.error(`[${job.id}] Error in IndexNow processing: ${error?.message || error}`);
    throw error;
  }
}
