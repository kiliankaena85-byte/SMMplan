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

  const zombies = await db.order.findMany({
    where: { 
      status: 'AWAITING_PAYMENT',
      createdAt: { lt: safeZombieThreshold },
      payment: { status: { notIn: ['SUCCEEDED', 'PENDING'] } }
    },
    select: { id: true }
  });

  let canceledCount = 0;
  if (zombies.length > 0) {
    const { LoyaltyService } = await import('@/services/users/loyalty.service');
    for (const zombie of zombies) {
      await db.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: zombie.id },
          data: { 
            status: 'CANCELED', 
            error: 'Ожидание оплаты истекло (авто-отмена системы)' 
          }
        });
        await LoyaltyService.reverseCommission(tx, zombie.id);
      });
      canceledCount++;
    }
  }

  log.info('Zombie AWAITING_PAYMENT cleanup done', { 
    canceled: canceledCount,
    olderThan: zombieThreshold.toISOString()
  });

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
      status: { in: ['PENDING', 'CANCELING'] },
      updatedAt: { lt: threshold }
    },
    select: { id: true, numericId: true, userId: true, charge: true, createdAt: true, status: true }
  });

  if (orphans.length > 0) {
    const { orderService } = await import('../../services/core/order.service');
    const { sendAdminAlert } = await import('@/lib/notifications');
    let sweptCount = 0;
    const sweptDetails: string[] = [];

    for (const orphan of orphans) {
      if (orphan.status === 'PENDING') {
        // Optimistic lock: ensure it's still PENDING before we take over
        const updated = await db.order.updateMany({
          where: {
            id: orphan.id,
            status: 'PENDING'
          },
          data: { status: 'CANCELING' } // Temporary state to prevent worker pickup
        });

        if (updated.count === 0) {
          // Worker picked it up just now, skip
          continue;
        }
      }

      // Safe to cancel and refund
      const reason = `Автоотмена: заказ #${orphan.numericId} не удалось передать в обработку. Средства возвращены на баланс.`;
      await orderService.failOrderTerminal(orphan.id, reason, true); // true = raw reason
      
      sweptCount++;
      const minutesPending = Math.round((Date.now() - orphan.createdAt.getTime()) / 60000);
      const refundRub = (Number(orphan.charge) / 100).toFixed(2);
      
      sweptDetails.push(`• ID: \`${orphan.id}\` (#${orphan.numericId}), Юзер: \`${orphan.userId}\`, Висел: ${minutesPending} мин, Возврат: ${refundRub} ₽`);
    }
    
    if (sweptCount > 0) {
      log.info(`Swept ${sweptCount} orphan PENDING orders`, { durationMs: Date.now() - startedAt });
      await sendAdminAlert(
        `🧹 *sweep-orphans автоотмена*\nОбработано зависших заказов: ${sweptCount}\n\n${sweptDetails.join('\n')}`,
        'WARN'
      );
    }
  }
}

