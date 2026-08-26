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
import { CompensationService } from '@/services/financial/compensation.service';
import { LoyaltyService } from '@/services/users/loyalty.service';
import { sendAdminAlert } from '@/lib/notifications';
import { sendOrderCanceledMail } from '@/lib/smtp';
import { providerService } from '@/services/providers/provider.service';
import { orderService } from '@/services/core/order.service';
import { ordersQueue } from '@/lib/queue-manager';
import { WalletOps } from '@/services/financial/wallet-ops';
import { calculatePartialRefund } from '@/utils/refund';
import { reconcileStalePayments } from '../payment-reconciliation';
import { checkWebhookHealth } from '@/lib/alerts/webhook-health';
import { detectLoginAnomalies } from '@/lib/security/login-anomaly-detector';

/**
 * MANDATORY INTEGRITY WARNING:
 * DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
 */

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

  // ── 3.5. AuthToken: expired tokens ────────────────────────────────────────
  const authTokenResult = await db.authToken.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  log.info('AuthToken cleanup done', { deleted: authTokenResult.count });

  // ── 3.6. Orders: Auto-resolve stale PENDING_CHECK (older than 6 hours) ──────
  await runPendingCheckResolution();

  // ── 3.7. Payments: Reconcile stale PENDING payments & Webhook health ───────
  try {
    await reconcileStalePayments();
    await checkWebhookHealth();
    await detectLoginAnomalies();
  } catch (err) {
    log.error('Failed to run periodic payment reconciliation / health checks', { error: err });
  }

  // ── 3.8. ProviderProxyLog: older than 30 days (Storage Optimization) ────────
  try {
    const proxyLogThreshold = new Date(now);
    proxyLogThreshold.setDate(proxyLogThreshold.getDate() - 30);

    const proxyLogResult = await db.providerProxyLog.deleteMany({
      where: { createdAt: { lt: proxyLogThreshold } },
    });

    log.info('ProviderProxyLog cleanup done', {
      deleted: proxyLogResult.count,
      olderThan: proxyLogThreshold.toISOString(),
    });
  } catch (err) {
    log.error('Failed to prune old ProviderProxyLog records', { error: err });
  }

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
        promoCodeId: true,
        user: { select: { email: true } },
        service: { select: { name: true } }
      },
      take: 50 // [FIN-010] Batching for performance protection
    });

    if (zombies.length === 0) {
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

          // R1-003 Fix: Roll back promo code uses if it was never paid
          if (zombie.promoCodeId) {
            await tx.promoCode.updateMany({
              where: { id: zombie.promoCodeId, uses: { gt: 0 } },
              data: { uses: { decrement: 1 } }
            });
          }

          canceledCount++;
          if (zombie.paymentId) {
            shouldSendEmail = true;
          }
        }
      });

      if (shouldSendEmail && zombie.user?.email && zombie.service?.name) {
        sendOrderCanceledMail(
          zombie.user.email,
          zombie.numericId.toString(),
          zombie.service.name
        ).catch(err => log.error('Failed to send zombie cancellation email', { orderId: zombie.id, error: (err instanceof Error ? err.message : String(err)) }));
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
  } catch (ttlErr) {
    const errMsg = ttlErr instanceof Error ? ttlErr.message : String(ttlErr);
    log.error('runCleanup: runInProgressTTLSweep failed', { error: errMsg });
  }

  // ── 6. Orders: Stuck PENDING_CHECK TTL Sweep ────────────────────────────
  try {
    await runPendingCheckTTLSweep();
  } catch (pcErr) {
    const errMsg = pcErr instanceof Error ? pcErr.message : String(pcErr);
    log.error('runCleanup: runPendingCheckTTLSweep failed', { error: errMsg });
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
 * WRK-03: Auto-resolve stale PENDING_CHECK (older than 6 hours).
 * Exported so it can run on an hourly schedule instead of waiting for daily cleanup.
 */
export async function runPendingCheckResolution(): Promise<void> {
  const pendingCheckThreshold = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const stalePendingCheck = await db.order.findMany({
    where: {
      status: 'PENDING_CHECK',
      updatedAt: { lt: pendingCheckThreshold },
    },
    include: { service: { include: { provider: true } } },
    take: 50,
  });

  if (stalePendingCheck.length > 0) {
    for (const pOrder of stalePendingCheck) {
      try {
        if (pOrder.service?.provider && pOrder.externalId) {
          const providerInstance = await providerService.getWorkerProviderInstance(pOrder.service.provider);
          const providerStatus = await providerInstance.getOrderStatus(pOrder.externalId);
          if (providerStatus?.status) {
            await orderService.processStatusUpdate(pOrder.externalId, providerStatus.status, Number(providerStatus.remains) || 0);
            log.info(`[Cleanup] Auto-resolved PENDING_CHECK Order #${pOrder.numericId} via provider status ${providerStatus.status}`);
            continue;
          }
        }
        // If provider doesn't know about this order or has no externalId → fail terminal with refund
        await orderService.failOrderTerminalFast(pOrder.id, 'PENDING_CHECK auto-resolved: provider timeout exceeded 6h');
        log.info(`[Cleanup] Auto-failed stale PENDING_CHECK Order #${pOrder.numericId}`);
      } catch (err) {
        log.error(`[Cleanup] Failed to auto-resolve PENDING_CHECK Order #${pOrder.numericId}`, { error: err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err) });
      }
    }
  }
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
      } catch (redisErr: unknown) {
        const msg = `[CRITICAL][ACTION REQUIRED] Redis unavailable during sweep-orphans getJob. Order ${orphan.id} remains PENDING. Error: ${(redisErr instanceof Error ? redisErr.message : String(redisErr))}`;
        log.error(msg);
        criticalAlerts.push(`🚨 Ошибка Redis при проверке заказа #${orphan.numericId}: ${(redisErr instanceof Error ? redisErr.message : String(redisErr))}`);
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
          // Attempt auto-recovery via failOrderTerminal
          try {
            await orderService.failOrderTerminal(
              orphan.id,
              'Автовосстановление: Dead-letter job failed, recovered by orphan sweep',
              false
            );

            // Verify recovery succeeded
            const recovered = await db.order.findUnique({
              where: { id: orphan.id },
              select: { status: true }
            });

            if (recovered?.status === 'ERROR') {
              log.warn(`[ARCH-2] Auto-recovered failed job order ${orphan.id} → ERROR + refund`);
              criticalAlerts.push(
                `⚠️ Авто-восстановление: Заказ #${orphan.numericId} (ID: ${orphan.id}) переведён в ERROR и деньги возвращены. Dead-letter ранее не отработал.`
              );
            } else {
              // failOrderTerminal returned null = order was already terminal
              log.info(`[ARCH-2] Order ${orphan.id} already terminal, no action needed`);
            }
          } catch (recoveryErr: unknown) {
            // Auto-recovery failed — escalate to manual
            const refundRub = (Number(orphan.charge) / 100).toFixed(2);
            const msg = `[CRITICAL][ACTION REQUIRED] ARCH-2 auto-recovery failed. Order ${orphan.id}, User ${orphan.userId}, Amount ${refundRub} RUB. Error: ${(recoveryErr instanceof Error ? recoveryErr.message : String(recoveryErr))}`;
            log.error(msg);
            criticalAlerts.push(
              `🚨 КРИТИЧНО: Авто-восстановление НЕ УДАЛОСЬ. Заказ #${orphan.numericId} (ID: \`${orphan.id}\`), Пользователь: \`${orphan.userId}\`. Сумма: ${refundRub} ₽. Требуется ручной возврат.`
            );
          }
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
      } catch (addErr: unknown) {
        const msg = `[CRITICAL][ACTION REQUIRED] Redis unavailable during sweep-orphans add. Order ${orphan.id} remains PENDING. Error: ${(addErr instanceof Error ? addErr.message : String(addErr))}`;
        log.error(msg);
        criticalAlerts.push(`🚨 Ошибка Redis при переотправке заказа #${orphan.numericId}: ${(addErr instanceof Error ? addErr.message : String(addErr))}`);
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
        serviceId: true,
        externalId: true,
        service: {
          select: {
            provider: true
          }
        }
      },
      take: IN_PROGRESS_TTL_BATCH_SIZE
    });

    if (stuckOrders.length === 0) {
      break;
    }

    for (const order of stuckOrders) {
      let remains = order.remains ?? order.quantity;
      let statusFromProvider: string | null = null;

      if (order.externalId && order.service.provider) {
        try {
          const provider = await providerService.getWorkerProviderInstance(order.service.provider);
          const providerStatus = await provider.getOrderStatus(order.externalId);
          statusFromProvider = providerStatus.status?.toLowerCase() || null;
          
          if (providerStatus.remains !== undefined && providerStatus.remains !== null) {
            const parsedRemains = parseInt(providerStatus.remains, 10);
            if (!isNaN(parsedRemains)) {
              remains = parsedRemains;
            }
          }
        } catch (apiErr: unknown) {
          log.error('Failed to get status from provider during TTL sweep, falling back to local database values', { orderId: order.id, error: (apiErr instanceof Error ? apiErr.message : String(apiErr)) });
          if ((apiErr instanceof Error ? apiErr.message : String(apiErr))?.includes('Incorrect order ID') || (apiErr instanceof Error ? apiErr.message : String(apiErr))?.includes('not found') || (apiErr instanceof Error ? apiErr.message : String(apiErr))?.includes('not exist')) {
            remains = order.quantity;
            statusFromProvider = 'error';
          } else {
            log.warn(`Skipping order ${order.id} TTL sweep due to transient provider API error: ${(apiErr instanceof Error ? apiErr.message : String(apiErr))}`);
            continue;
          }
        }
      }

      const quantity = order.quantity;
      const charge = order.charge;

      let targetStatus: 'COMPLETED' | 'ERROR' | 'PARTIAL';
      let refundCents = 0;
      let delivered = 0;

      let reasonText = '';
      if (statusFromProvider === 'completed') {
        targetStatus = 'COMPLETED';
        refundCents = 0;
        delivered = quantity;
        reasonText = `Заказ завершён (подтверждено провайдером). Выполнено ${delivered} из ${quantity}.`;
      } else if (statusFromProvider === 'canceled' || statusFromProvider === 'error') {
        targetStatus = 'ERROR';
        refundCents = Number(charge);
        delivered = 0;
        reasonText = `Заказ отменён провайдером. Стоимость полностью возвращена на баланс.`;
      } else {
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
            const existingLedger = await tx.ledgerEntry.findFirst({
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

        CompensationService.trackCompensation(order.id).catch(err => log.error('Failed to track compensation on TTL sweep', { orderId: order.id, error: (err instanceof Error ? err.message : String(err)) }));
      } catch (orderErr: unknown) {
        log.error(`runInProgressTTLSweep: failed to sweep order ${order.id}`, { error: (orderErr instanceof Error ? orderErr.message : String(orderErr)) });
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

/**
 * PENDING_CHECK TTL Sweep: Finds orders stuck in PENDING_CHECK for >24 hours.
 * These orders have charged the user's balance but never reached a provider.
 * Refunds the full amount and marks as ERROR.
 */
async function runPendingCheckTTLSweep(): Promise<void> {
  const PENDING_CHECK_TTL_HOURS = 24;
  const threshold = new Date(Date.now() - PENDING_CHECK_TTL_HOURS * 60 * 60 * 1000);

  const stuckOrders = await db.order.findMany({
    where: {
      status: 'PENDING_CHECK',
      createdAt: { lt: threshold }
    },
    select: {
      id: true,
      numericId: true,
      userId: true,
      charge: true,
      externalId: true,
      service: {
        select: {
          provider: true
        }
      }
    },
    take: 100
  });

  if (stuckOrders.length === 0) return;

  let processedCount = 0;

  for (const order of stuckOrders) {
    let statusFromProvider: string | null = null;

    if (order.externalId && order.service.provider) {
      try {
        const provider = await providerService.getWorkerProviderInstance(order.service.provider);
        const providerStatus = await provider.getOrderStatus(order.externalId);
        statusFromProvider = providerStatus.status?.toLowerCase() || null;
      } catch (apiErr: unknown) {
        log.error('Failed to get status from provider during PENDING_CHECK TTL sweep', { orderId: order.id, error: (apiErr instanceof Error ? apiErr.message : String(apiErr)) });
        if ((apiErr instanceof Error ? apiErr.message : String(apiErr))?.includes('Incorrect order ID') || (apiErr instanceof Error ? apiErr.message : String(apiErr))?.includes('not found') || (apiErr instanceof Error ? apiErr.message : String(apiErr))?.includes('not exist')) {
          statusFromProvider = 'error';
        } else {
          log.warn(`Skipping order ${order.id} PENDING_CHECK TTL sweep due to transient provider API error: ${(apiErr instanceof Error ? apiErr.message : String(apiErr))}`);
          continue;
        }
      }
    }

    if (statusFromProvider === 'completed' || statusFromProvider === 'processing' || statusFromProvider === 'in progress') {
      log.warn(`Order ${order.id} is active at provider (status: ${statusFromProvider}). Skipping auto-refund to prevent loss.`);
      continue;
    }

    try {
      await db.$transaction(async (tx) => {
        const updated = await tx.order.updateMany({
          where: { id: order.id, status: 'PENDING_CHECK' },
          data: {
            status: 'ERROR',
            error: `Автоотмена: заказ завис в PENDING_CHECK более ${PENDING_CHECK_TTL_HOURS}ч`,
            updatedAt: new Date()
          }
        });

        if (updated.count === 0) return;

        await LoyaltyService.reverseCommission(tx, order.id);

        if (order.charge > 0) {
          const refundKey = `refund-pending-check-ttl-${order.id}`;
          const existing = await tx.ledgerEntry.findFirst({ where: { idempotencyKey: refundKey } });
          if (!existing) {
            await WalletOps.refund(
              tx,
              order.userId,
              Number(order.charge),
              `Авто-возврат: заказ #${order.numericId} завис в PENDING_CHECK`,
              { idempotencyKey: refundKey }
            );
          }
        }

        processedCount++;
      }, { isolationLevel: 'Serializable' });

      CompensationService.trackCompensation(order.id).catch(err => log.error('Failed to track compensation on pending check TTL sweep', { orderId: order.id, error: (err instanceof Error ? err.message : String(err)) }));
    } catch (err) {
      const errMsg = err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err);
      log.error(`runPendingCheckTTLSweep: failed for order ${order.id}`, { error: errMsg });
    }
  }

  if (processedCount > 0) {
    log.info(`PENDING_CHECK TTL sweep completed`, { processedCount });
    await sendAdminAlert(
      `⏱️ *pending-check-ttl*\nОчищено зависших PENDING_CHECK заказов: ${processedCount}`,
      'WARNING'
    );
  }
}

