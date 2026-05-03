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

  const durationMs = Date.now() - startedAt;
  log.info('Daily cleanup completed', {
    durationMs,
    analytics: analyticsResult.count,
    rateLimit: rateLimitResult.count,
    loginLog: loginLogResult.count,
  });
}
