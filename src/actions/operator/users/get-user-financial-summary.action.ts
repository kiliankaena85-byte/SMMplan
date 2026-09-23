'use server';

import { requireOperatorPermission } from '@/lib/operator/rbac';
import { getClientFinancialSummary } from '@/services/operator/users/client-financial-summary.query';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isTenantAllowedForUser } from '@/utils/admin-tenant';

const inputSchema = z.object({
  userId: z.string().min(1)
});

/**
 * Guarded server action retrieving a user's ledger-based financial summary.
 * Guarded by 'orders' section 'view' permission.
 */
export async function getUserFinancialSummaryAction(userId: string) {
  const parsed = inputSchema.safeParse({ userId });
  if (!parsed.success) {
    throw new Error('Некорректный ID пользователя');
  }

  return requireOperatorPermission('orders', 'view', async (admin) => {
    const user = await db.user.findUnique({
      where: { id: parsed.data.userId },
      select: { tenantId: true }
    });
    if (!user || !isTenantAllowedForUser(admin, user.tenantId || 'smmplan')) {
      throw new Error('Пользователь не найден или доступ ограничен');
    }
    return getClientFinancialSummary(parsed.data.userId, user.tenantId || 'smmplan');
  });
}
