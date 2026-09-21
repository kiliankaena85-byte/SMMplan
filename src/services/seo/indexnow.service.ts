/**
 * (c) 2024-2026 SMMplan / OmniSMM. All rights reserved.
 * 
 * IndexNow Service for instant URL indexing submission to Yandex & Bing.
 * Compliant with 2026 Yandex Search Engine standards.
 */

import { logger } from '@/lib/logger';

export interface IndexNowSubmissionParams {
  host: string;
  urls: string[];
  key?: string;
  keyLocation?: string;
}

export interface IndexNowResult {
  success: boolean;
  submittedCount: number;
  yandexStatus?: number;
  indexNowStatus?: number;
  error?: string;
}

export const DEFAULT_INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'smmplan-indexnow-2026-key';

export class IndexNowService {
  private static YANDEX_ENDPOINT = 'https://yandex.com/indexnow';
  private static INDEXNOW_ORG_ENDPOINT = 'https://api.indexnow.org/indexnow';

  /**
   * Returns the active IndexNow API key.
   */
  static getKey(): string {
    return process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY;
  }

  /**
   * Submits URLs to Yandex IndexNow for instantaneous crawling and indexation.
   */
  static async submitUrls(params: IndexNowSubmissionParams): Promise<IndexNowResult> {
    const { host, urls } = params;
    const key = params.key || this.getKey();

    if (!host || typeof host !== 'string') {
      return { success: false, submittedCount: 0, error: 'Invalid or missing host.' };
    }

    if (!Array.isArray(urls) || urls.length === 0) {
      return { success: false, submittedCount: 0, error: 'URL list must not be empty.' };
    }

    const sanitizedUrls = urls
      .filter((u) => typeof u === 'string' && u.startsWith('http'));

    if (sanitizedUrls.length === 0) {
      return { success: false, submittedCount: 0, error: 'No valid HTTP/HTTPS URLs provided.' };
    }

    const keyLocation = params.keyLocation || `https://${host}/api/seo/indexnow/key`;
    const BATCH_SIZE = 10000;
    let totalSubmitted = 0;
    let lastYandexStatus: number | undefined = undefined;
    let lastIndexNowStatus: number | undefined = undefined;
    let anySuccess = false;

    try {
      for (let i = 0; i < sanitizedUrls.length; i += BATCH_SIZE) {
        const batch = sanitizedUrls.slice(i, i + BATCH_SIZE);
        const payload = {
          host,
          key,
          keyLocation,
          urlList: batch,
        };

        // 1. Submit directly to Yandex IndexNow
        const yandexResponse = await fetch(this.YANDEX_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'User-Agent': 'OmniSMM-IndexNow-Agent/2026',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        }).catch((err) => {
          logger.warn('[IndexNow] Yandex endpoint network error', { error: String(err) });
          return null;
        });

        if (yandexResponse) {
          lastYandexStatus = yandexResponse.status;
        }

        // 2. Submit to global IndexNow.org endpoint
        const indexNowResponse = await fetch(this.INDEXNOW_ORG_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'User-Agent': 'OmniSMM-IndexNow-Agent/2026',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        }).catch((err) => {
          logger.warn('[IndexNow] IndexNow.org endpoint network error', { error: String(err) });
          return null;
        });

        if (indexNowResponse) {
          lastIndexNowStatus = indexNowResponse.status;
        }

        const isBatchSuccess =
          (lastYandexStatus && (lastYandexStatus === 200 || lastYandexStatus === 202)) ||
          (lastIndexNowStatus && (lastIndexNowStatus === 200 || lastIndexNowStatus === 202)) ||
          false;

        if (isBatchSuccess) {
          anySuccess = true;
          totalSubmitted += batch.length;
        }
      }

      logger.info('[IndexNow] Submitted URLs for rapid indexing', {
        host,
        count: totalSubmitted,
        yandexStatus: lastYandexStatus,
        indexNowStatus: lastIndexNowStatus,
      });

      return {
        success: anySuccess,
        submittedCount: totalSubmitted,
        yandexStatus: lastYandexStatus,
        indexNowStatus: lastIndexNowStatus,
      };
    } catch (error: any) {
      logger.error('[IndexNow] Failed to submit to IndexNow', { error: error?.message || error });
      return {
        success: false,
        submittedCount: 0,
        error: error?.message || 'Failed to submit URLs to IndexNow',
      };
    }
  }
}
