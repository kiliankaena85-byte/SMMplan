import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndexNowService } from '@/services/seo/indexnow.service';
import { indexNowQueue } from '@/lib/queue-manager';
import indexNowProcessor from '@/workers/processors/indexnow.processor';

vi.mock('@/lib/queue-manager', () => ({
  indexNowQueue: {
    add: vi.fn(),
  },
}));

describe('IndexNow BullMQ Resilient Queue & Processor (SPEC-2026-09-21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. IndexNowService.enqueueUrls', () => {
    it('enqueues URLs into BullMQ with deterministic jobId and 5 retry attempts', async () => {
      (indexNowQueue.add as any).mockResolvedValue({ id: 'job-mock-123' });

      const params = {
        host: 'smmplan.pro',
        urls: ['https://smmplan.pro/services/telegram/subscribers'],
      };

      const result = await IndexNowService.enqueueUrls(params);

      expect(result.enqueued).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.jobId).toMatch(/^indexnow-smmplan\.pro-/);

      expect(indexNowQueue.add).toHaveBeenCalledWith(
        'submit-urls',
        expect.objectContaining({
          host: 'smmplan.pro',
          urls: params.urls,
        }),
        expect.objectContaining({
          jobId: expect.stringMatching(/^indexnow-smmplan\.pro-/),
          attempts: 5,
          backoff: { type: 'exponential', delay: 10000 },
        })
      );
    });

    it('rejects invalid or empty submissions before queueing', async () => {
      const resultEmptyHost = await IndexNowService.enqueueUrls({ host: '', urls: ['https://smmplan.pro'] });
      expect(resultEmptyHost.enqueued).toBe(false);
      expect(indexNowQueue.add).not.toHaveBeenCalled();

      const resultEmptyUrls = await IndexNowService.enqueueUrls({ host: 'smmplan.pro', urls: [] });
      expect(resultEmptyUrls.enqueued).toBe(false);
      expect(indexNowQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('2. indexNowProcessor', () => {
    it('successfully processes job and returns submission details', async () => {
      const submitUrlsSpy = vi.spyOn(IndexNowService, 'submitUrls').mockResolvedValue({
        success: true,
        submittedCount: 5,
        yandexStatus: 200,
        indexNowStatus: 200,
      });

      const mockJob = {
        id: 'job-test-1',
        data: {
          host: 'smmplan.pro',
          urls: ['https://smmplan.pro/page1'],
        },
      } as any;

      const result = await indexNowProcessor(mockJob);

      expect(submitUrlsSpy).toHaveBeenCalledWith(mockJob.data);
      expect(result).toEqual({
        success: true,
        submittedCount: 5,
        yandexStatus: 200,
        indexNowStatus: 200,
      });
    });

    it('throws error when submitUrls fails to trigger BullMQ exponential retry', async () => {
      vi.spyOn(IndexNowService, 'submitUrls').mockResolvedValue({
        success: false,
        submittedCount: 0,
        error: '504 Gateway Timeout from Yandex IndexNow',
      });

      const mockJob = {
        id: 'job-test-2',
        data: {
          host: 'smmplan.pro',
          urls: ['https://smmplan.pro/page2'],
        },
      } as any;

      await expect(indexNowProcessor(mockJob)).rejects.toThrow(
        /504 Gateway Timeout/
      );
    });
  });
});
