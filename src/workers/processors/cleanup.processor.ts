/**
 * Cleanup Processor (P2.3 — TTL Maintenance)
 *
 * Runs daily at 03:00 (scheduled via ensureCleanupCron).
 * Removes stale data to prevent unbounded table growth:
 *
 *   - AnalyticsEvent    → older than 90 days
 *   - RateLimit         → expired (expiresAt < now)
 *   - LoginLog          → older than 180 days
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'CleanupProcessor' });

/** Retention policy constants */
const ANALYTICS_RETENTION_DAYS = 90;
const LOGIN_LOG_RETENTION_DAYS = 180;

export async function runCleanup(): Promise<void> {
  const startedAt = Date.now();
  log.info('Daily cleanup started');

  const now = new Date();

  // ── 1. AnalyticsEvent: older than 90 days ─────────────────────────────────
  const analyticsThreshold = new Date(now);
  analyticsThreshold.setDate(analyticsThreshold.getDate() - ANALYTICS_RETENTION_DAYS);

  const analyticsResult = await db.analyticsEvent.deleteMany({
    where: { createdAt: { lt: analyticsThreshold } },
  });

  log.info('AnalyticsEvent cleanup done', {
    deleted: analyticsResult.count,
    olderThan: analyticsThreshold.toISOString(),
  });

  // ── 2. RateLimit: expired records ─────────────────────────────────────────
  const rateLimitResult = await db.rateLimit.deleteMany({
    where: { expiresAt: { lte: now } },
  });

  log.info('RateLimit cleanup done', { deleted: rateLimitResult.count });

  // ── 3. LoginLog: older than 180 days ──────────────────────────────────────
  const loginLogThreshold = new Date(now);
  loginLogThreshold.setDate(loginLogThreshold.getDate() - LOGIN_LOG_RETENTION_DAYS);

  const loginLogResult = await db.loginLog.deleteMany({
    where: { createdAt: { lt: loginLogThreshold } },
  });

  log.info('LoginLog cleanup done', {
    deleted: loginLogResult.count,
    olderThan: loginLogThreshold.toISOString(),
  });

  // ── 4. Orders: Zombie AWAITING_PAYMENT ────────────────────────────────────
  // W2-1 FIX: Don't blindly cancel — check if a payment was recently confirmed.
  // YooKassa webhooks can arrive up to 5 minutes late. Cancelling a paid order
  // before the webhook arrives causes financial loss for the client.
  const zombieThreshold = new Date(now);
  zombieThreshold.setHours(zombieThreshold.getHours() - 24);

  // Only cancel if no associated payment is in SUCCEEDED or PENDING (recent) state
  const safeZombieThreshold = new Date(now);
  safeZombieThreshold.setHours(safeZombieThreshold.getHours() - 25); // Extra 1-hour buffer

  let canceledCount = 0;
  let hasMore = true;
  const MAX_ITERATIONS = 20; // 20 × 50 = 1000 zombies max
  let iterations = 0;

  const { LoyaltyService } = await import('@/services/users/loyalty.service');
  const { sendAdminAlert } = await import('@/lib/notifications');

  while (hasMore && iterations < MAX_ITERATIONS) {
    iterations++;

    const zombies = await db.order.findMany({
      where: { 
        status: 'AWAITING_PAYMENT',
        createdAt: { lt: safeZombieThreshold },
        payment: { status: { notIn: ['SUCCEEDED', 'PENDING'] } }
      },
      select: { 
        id: true,
        numericId: true,
        paymentId: true,
        user: { select: { email: true } },
        service: { select: { name: true } }
      },
      take: 50 // [FIN-010] Batching for performance protection
    });

    if (zombies.length === 0) {
      hasMore = false;
      break;
    }

    for (const zombie of zombies) {
      let shouldSendEmail = false;
      await db.$transaction(async (tx) => {
        // [FIN-010] Optimistic lock to prevent Race Condition with incoming Webhooks
        const updated = await tx.order.updateMany({
          where: { id: zombie.id, status: 'AWAITING_PAYMENT' },
          data: { 
            status: 'CANCELED', 
            error: 'Ожидание оплаты истекло (авто-отмена системы)' 
          }
        });
        
        if (updated.count > 0) {
          await LoyaltyService.reverseCommission(tx, zombie.id);
          canceledCount++;
          if (zombie.paymentId) {
            shouldSendEmail = true;
          }
        }
      });

      if (shouldSendEmail && zombie.user?.email && zombie.service?.name) {
        const { sendOrderCanceledMail } = await import('@/lib/smtp');
        sendOrderCanceledMail(
          zombie.user.email,
          zombie.numericId.toString(),
          zombie.service.name
        ).catch(err => log.error('Failed to send zombie cancellation email', { orderId: zombie.id, error: err.message }));
      }
    }

    if (zombies.length < 50) {
      hasMore = false; // Last page
    }
  }

  if (iterations >= MAX_ITERATIONS) {
    log.warn('runCleanup: reached MAX_ITERATIONS limit', {
      canceledCount,
      iterations
    });
    await sendAdminAlert(
      '⚠️ cleanup MAX_ITERATIONS reached. Возможно накопилось >1000 зомби.',
      'WARNING'
    );
  }

  log.info('Zombie AWAITING_PAYMENT cleanup done', { 
    canceled: canceledCount,
    olderThan: zombieThreshold.toISOString()
  });

  // ── 5. Orders: Stuck IN_PROGRESS TTL Sweep ────────────────────────────────
  try {
    await runInProgressTTLSweep();
  } catch (ttlErr: any) {
    log.error('runCleanup: runInProgressTTLSweep failed', { error: ttlErr.message });
  }

  const durationMs = Date.now() - startedAt;
  log.info('Daily cleanup completed', {
    durationMs,
    analytics: analyticsResult.count,
    rateLimit: rateLimitResult.count,
    loginLog: loginLogResult.count,
  });
}

/**
 * Sweep orphans: Finds PENDING orders that are older than 15 minutes and pushes them back to dispatch.
 */
export async function runOrphanSweep(): Promise<void> {
  const startedAt = Date.now();
  const threshold = new Date(Date.now() - 15 * 60 * 1000); // 15 mins
  
  const orphans = await db.order.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: threshold }
    },
    select: { id: true, numericId: true, userId: true, charge: true, createdAt: true, status: true }
  });

  if (orphans.length > 0) {
    const { sendAdminAlert } = await import('@/lib/notifications');
    const { ordersQueue } = await import('../../lib/queue-manager');
    
    let sweptCount = 0;
    const sweptDetails: string[] = [];
    const criticalAlerts: string[] = [];

    for (const orphan of orphans) {
      const jobId = `dispatch-${orphan.id}`;
      let jobState: string | null = null;
      let jobExists = false;

      try {
        const job = await ordersQueue.getJob(jobId);
        if (job) {
          jobExists = true;
          jobState = await job.getState();
        }
      } catch (redisErr: any) {
        const msg = `[CRITICAL][ACTION REQUIRED] Redis unavailable during sweep-orphans getJob. Order ${orphan.id} remains PENDING. Error: ${redisErr.message}`;
        log.error(msg);
        criticalAlerts.push(`🚨 Ошибка Redis при проверке заказа #${orphan.numericId}: ${redisErr.message}`);
        continue;
      }

      if (jobExists && jobState) {
        if (['waiting', 'active', 'delayed', 'prioritized', 'waiting-children'].includes(jobState)) {
          // Live job, false positive. Skip.
          continue;
        }

        if (jobState === 'completed') {
          const msg = `[CRITICAL][ACTION REQUIRED] Order PENDING but Job Completed. Data inconsistency! Order ${orphan.id}, Job ${jobId}`;
          log.error(msg);
          criticalAlerts.push(`🚨 Data Inconsistency: Заказ #${orphan.numericId} (ID: ${orphan.id}) висит PENDING, но очередь сообщает COMPLETED! Требуется ручной разбор.`);
          continue;
        }

        if (jobState === 'failed') {
          const refundRub = (Number(orphan.charge) / 100).toFixed(2);
          const msg = `[CRITICAL][ACTION REQUIRED] dead-letter не отработал. Ручной возврат требуется! Order ${orphan.id}, User ${orphan.userId}, Amount ${refundRub} RUB`;
          log.error(msg);
          criticalAlerts.push(`🚨 Dead-letter Failure: Заказ #${orphan.numericId} (ID: ${orphan.id}), Пользователь: ${orphan.userId}. Сумма: ${refundRub} ₽. Воркер полностью упал, но статус не изменен! Требуется ручной возврат.`);
          continue;
        }
        
        // Any other state (should not happen in BullMQ, but just in case)
        continue;
      }

      // If job does not exist -> Re-enqueue
      try {
        await ordersQueue.add('order-dispatch', { orderId: orphan.id }, { jobId });
        sweptCount++;
        const minutesPending = Math.round((Date.now() - orphan.createdAt.getTime()) / 60000);
        log.warn(`[WARNING] recovered orphan orderId=${orphan.id} jobId=${jobId}`);
        sweptDetails.push(`• Восстановлен: ID \`${orphan.id}\` (#${orphan.numericId}), висел ${minutesPending} мин`);
      } catch (addErr: any) {
        const msg = `[CRITICAL][ACTION REQUIRED] Redis unavailable during sweep-orphans add. Order ${orphan.id} remains PENDING. Error: ${addErr.message}`;
        log.error(msg);
        criticalAlerts.push(`🚨 Ошибка Redis при переотправке заказа #${orphan.numericId}: ${addErr.message}`);
      }
    }
    
    if (sweptCount > 0) {
      log.info(`Swept ${sweptCount} orphan PENDING orders`, { durationMs: Date.now() - startedAt });
      await sendAdminAlert(
        `♻️ *sweep-orphans recovery*\nПоднято потерянных заказов: ${sweptCount}\n\n${sweptDetails.join('\n')}`,
        'WARNING'
      );
    }

    if (criticalAlerts.length > 0) {
      await sendAdminAlert(
        `🔴 *sweep-orphans CRITICAL ERRORS*\nОбнаружены критические проблемы, требующие вмешательства:\n\n${criticalAlerts.join('\n\n')}`,
        'CRITICAL'
      );
    }
  }
}

/**
 * In-progress TTL Sweep: Finds orders in IN_PROGRESS state for more than 72 hours,
 * and terminates them with PARTIAL, ERROR, or COMPLETED state and appropriate refunds.
 */
export async function runInProgressTTLSweep(): Promise<void> {
  const startedAt = Date.now();
  const IN_PROGRESS_TTL_HOURS = 72;
  const threshold = new Date(Date.now() - IN_PROGRESS_TTL_HOURS * 60 * 60 * 1000);

  const IN_PROGRESS_TTL_BATCH_SIZE = 50;
  const MAX_ITERATIONS = 20; // 1000 orders max
  let hasMore = true;
  let iterations = 0;
  let processedCount = 0;
  const processedDetails: string[] = [];

  const { LoyaltyService } = await import('@/services/users/loyalty.service');
  const { WalletOps } = await import('@/services/financial/wallet-ops');
  const { calculatePartialRefund } = await import('@/utils/refund');
  const { sendAdminAlert } = await import('@/lib/notifications');

  log.info('InProgress TTL sweep started', { threshold: threshold.toISOString() });

  while (hasMore && iterations < MAX_ITERATIONS) {
    iterations++;

    const stuckOrders = await db.order.findMany({
      where: {
        status: 'IN_PROGRESS',
        createdAt: { lt: threshold }
      },
      select: {
        id: true,
        numericId: true,
        userId: true,
        charge: true,
        quantity: true,
        remains: true,
        serviceId: true
      },
      take: IN_PROGRESS_TTL_BATCH_SIZE
    });

    if (stuckOrders.length === 0) {
      hasMore = false;
      break;
    }

    for (const order of stuckOrders) {
      const remains = order.remains ?? order.quantity;
      const quantity = order.quantity;
      const charge = order.charge;

      let targetStatus: 'COMPLETED' | 'ERROR' | 'PARTIAL';
      let refundCents = 0;
      let delivered = 0;

      let reasonText = '';
      if (remains <= 0) {
        targetStatus = 'COMPLETED';
        refundCents = 0;
        delivered = quantity;
        reasonText = `Заказ завершён по таймауту (72ч IN_PROGRESS). Выполнено ${delivered} из ${quantity}.`;
      } else if (remains >= quantity) {
        targetStatus = 'ERROR';
        refundCents = Number(charge);
        delivered = 0;
        reasonText = `Заказ завершён по таймауту (72ч IN_PROGRESS). Выполнено 0 из ${quantity}. Стоимость возвращена на баланс.`;
      } else {
        targetStatus = 'PARTIAL';
        refundCents = calculatePartialRefund({ remains, quantity, charge });
        delivered = Math.max(0, quantity - remains);
        reasonText = `Заказ завершён по таймауту (72ч IN_PROGRESS). Выполнено ${delivered} из ${quantity}. Невыполненный остаток возвращён на баланс.`;
      }

      try {
        await db.$transaction(async (tx) => {
          // Optimistic Lock: ensure status is still IN_PROGRESS
          const updated = await tx.order.updateMany({
            where: { id: order.id, status: 'IN_PROGRESS' },
            data: { 
              status: targetStatus, 
              remains: Math.max(0, remains),
              error: reasonText,
              updatedAt: new Date()
            }
          });

          if (updated.count === 0) {
            // Webhook or another worker updated the status first, skip
            return;
          }

          // Handle Referral Commissions
          if (targetStatus === 'COMPLETED') {
            await LoyaltyService.confirmCommission(tx, order.id);
          } else {
            // ERROR or PARTIAL -> reverse commission
            await LoyaltyService.reverseCommission(tx, order.id);
          }

          // Handle refund
          if (refundCents > 0) {
            const refundKey = `refund-ttl-${order.id}`;
            const existingLedger = await tx.ledgerEntry.findUnique({
              where: { idempotencyKey: refundKey }
            });

            if (!existingLedger) {
              await WalletOps.refund(
                tx,
                order.userId,
                refundCents,
                reasonText,
                { idempotencyKey: refundKey }
              );
            }
          }

          processedCount++;
          const refundRub = (refundCents / 100).toFixed(2);
          processedDetails.push(
            `• ID: \`${order.id}\` (#${order.numericId}), Юзер: \`${order.userId}\`, Выполнено: ${delivered}/${quantity}, Статус: \`${targetStatus}\`, Возврат: ${refundRub} ₽`
          );
        }, { isolationLevel: 'Serializable' });
      } catch (orderErr: any) {
        log.error(`runInProgressTTLSweep: failed to sweep order ${order.id}`, { error: orderErr.message });
      }
    }

    if (stuckOrders.length < IN_PROGRESS_TTL_BATCH_SIZE) {
      hasMore = false;
    }
  }

  if (processedCount > 0) {
    log.info(`InProgress TTL sweep completed`, { processedCount, durationMs: Date.now() - startedAt });
    await sendAdminAlert(
      `⏱️ *in-progress-ttl автоотмена*\nОбработано зависших заказов: ${processedCount}\n\n${processedDetails.join('\n')}`,
      'WARNING'
    );
  } else {
    log.info('InProgress TTL sweep completed: no stuck orders found');
  }
}

