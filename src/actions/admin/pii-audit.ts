'use server';

import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/server/rbac';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'PiiAuditAction' });

export interface PiiAccessLogFilter {
  limit?: number;
  offset?: number;
  cursor?: string;
  staffEmail?: string;
  targetType?: string;
  targetId?: string;
}

export async function getPiiAccessLogsAction(filter: PiiAccessLogFilter = {}) {
  return requireStaffPermission('settings', 'view', async () => {
    try {
      const limit = Math.min(100, Math.max(1, filter.limit || 50));
      const offset = Math.max(0, filter.offset || 0);
      const cursor = filter.cursor;

      const where: Record<string, unknown> = {};
      if (filter.staffEmail) {
        where.staffEmail = { contains: filter.staffEmail, mode: 'insensitive' };
      }
      if (filter.targetType) {
        where.targetType = filter.targetType;
      }
      if (filter.targetId) {
        where.targetId = filter.targetId;
      }

      const orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] = [
        { createdAt: 'desc' },
        { id: 'desc' },
      ];

      const queryOptions: any = {
        where,
        orderBy,
        take: limit + 1,
      };

      if (cursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1;
      } else if (offset > 0) {
        queryOptions.skip = offset;
      }

      const [rawLogs, total] = await Promise.all([
        db.piiAccessLog.findMany(queryOptions),
        db.piiAccessLog.count({ where }),
      ]);

      const hasMore = rawLogs.length > limit;
      const logs = hasMore ? rawLogs.slice(0, limit) : rawLogs;
      const nextCursor = hasMore && logs.length > 0 ? logs[logs.length - 1].id : undefined;

      return { success: true, logs, total, nextCursor, hasMore };
    } catch (err) {
      log.error('Failed to get PII access logs', { error: err });
      return { success: false, logs: [], total: 0, error: 'Ошибка запроса логов' };
    }
  });
}

