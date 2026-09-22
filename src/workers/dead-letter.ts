/**
 * (c) 2024-2026 SMMplan. All rights reserved.
 * DLQ (Dead-Letter Queue) & Resilience SLA Handler.
 *
 * Provides safe state triage and dead-letter routing for exhausted BullMQ jobs:
 * - PENDING_CHECK / IN_PROGRESS orders are safely parked for operator triage
 * - Terminal orders are refunded idempotently via orderService.failOrderTerminal
 * - Refills are marked as ERROR without data loss
 * - Financial dead-letter alerts are routed to Telegram with P0 urgency
 */

import { dlqQueue } from '@/lib/queue-manager';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { orderService } from '@/services/core/order.service';
import { sendAdminAlert } from '@/lib/notifications';

const log = logger.child({ component: 'DeadLetterHandler' });
export const MAX_ATTEMPTS = 3;

export interface DeadLetterJobLike {
  id?: string;
  name?: string;
  data: unknown;
  attemptsMade: number;
  opts?: { attempts?: number };
}

export async function handleDeadLetter(
  queueName: string,
  job: DeadLetterJobLike | undefined,
  err: Error
): Promise<{ parkedForTriage?: boolean; refunded?: boolean; dlqStored?: boolean }> {
  if (!job) return {};

  const maxAttempts = job.opts?.attempts ?? MAX_ATTEMPTS;

  log.error(`Job failed`, {
    queue: queueName,
    jobId: job.id,
    attemptsMade: job.attemptsMade,
    error: err.message,
  });

  // Only DLQ after all retries are exhausted OR if it's a fatal error
  if (job.attemptsMade >= maxAttempts || err.name === 'UnrecoverableError') {
    if (job.attemptsMade >= maxAttempts) {
      console.error(
        `[WORKER][ACTION REQUIRED] Job ${job.id} (${job.name}) exhausted all ${job.attemptsMade} attempts. Last error: ${err.message}`
      );
    }

    let isParkedForTriage = false;
    let isRefunded = false;

    try {
      await dlqQueue.add('dead-letter', {
        originalQueue: queueName,
        jobId: job.id || 'unknown',
        payload: job.data,
        error: err.message,
        failedAt: new Date().toISOString(),
      });

      // 🔥 Safe State Handling: PENDING_CHECK orders are parked for triage/autoflush and MUST NOT be auto-failed
      if (queueName === 'ordersQueue') {
        const payload = job.data as { orderId?: string; refillId?: string };
        if (payload?.orderId) {
          const currentOrder = await db.order.findUnique({
            where: { id: payload.orderId },
            select: { status: true, numericId: true }
          }).catch(() => null);

          if (currentOrder && (currentOrder.status === 'PENDING_CHECK' || currentOrder.status === 'IN_PROGRESS')) {
            log.info(`[WORKER] Order #${currentOrder.numericId} (${payload.orderId}) is in '${currentOrder.status}'. Skipping auto-fail to allow operator triage / balance autoflush.`);
            isParkedForTriage = true;
          } else {
            await orderService.failOrderTerminal(payload.orderId, err.message).catch((e) => {
              log.error('Failed to terminal-fail order', { error: (e as Error).message });
            });
            log.info(`Auto-refunded dead-letter order ${payload.orderId}`);
            isRefunded = true;
          }
        }
      }

      if (queueName === 'refillQueue') {
        const payload = job.data as { orderId?: string; refillId?: string };
        if (payload?.refillId) {
          await db.refill.update({
            where: { id: payload.refillId },
            data: { status: 'ERROR' }
          }).catch(() => null);
          log.info(`Marked dead-letter refill ${payload.refillId} as ERROR`);
        }
      }

      // ── Smart Alert Triage (P0 Critical vs P1 Maintenance with Deduplication) ─────
      const isFinancialQueue = ['ordersQueue', 'paymentSyncQueue', 'paymentGatewayQueue'].includes(queueName);

      if (isFinancialQueue && !isParkedForTriage) {
        // P0: Always alert immediately for customer money and orders
        try {
          sendAdminAlert(
            `🪦 *Dead Letter Job (P0 Финансовый)*\n\nОчередь: \`${queueName}\`\nJob ID: \`${job.id}\`\nПопыток: ${job.attemptsMade}/${maxAttempts}\n\nОшибка: ${err.message}`,
            'CRITICAL'
          );
        } catch {
          // Fire-and-forget alert failure
        }
      } else if (!isParkedForTriage) {
        // P1: Deduplicate maintenance queues (catalog, articles, etc.) to prevent Telegram alert floods
        try {
          const { P0AlertDebouncer } = await import('@/lib/alerts/p0-alert-debouncer');
          const errKey = `dlq:${queueName}:${err.name || 'Error'}`;
          const { shouldSend, occurrences } = await P0AlertDebouncer.checkDeduplicatedAlert(errKey, 7200);

          if (shouldSend) {
            const occInfo = occurrences > 1 ? ` (Повторов за 2ч: ${occurrences})` : '';
            sendAdminAlert(
              `⚠️ *Фоновая задача в DLQ (P1 Обслуживание)*${occInfo}\n\nОчередь: \`${queueName}\`\nJob ID: \`${job.id}\`\nОшибка: ${err.message}`,
              'WARNING'
            );
          } else {
            log.info(`Suppressed duplicate DLQ alert for ${queueName} (${occurrences} occurrences in window)`);
          }
        } catch {
          // Ignore debouncer import or execution error in restricted environments
        }
      }

      log.error('Job dead-lettered', { queue: queueName, jobId: job.id });
      return { dlqStored: true, parkedForTriage: isParkedForTriage, refunded: isRefunded };
    } catch (dlqErr) {
      log.error('Failed to write to DLQ', { error: (dlqErr as Error).message });
      return { dlqStored: false, parkedForTriage: isParkedForTriage, refunded: isRefunded };
    }
  }

  return {};
}
