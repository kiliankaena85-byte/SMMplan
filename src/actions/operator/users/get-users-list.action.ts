'use server';

import { requireOperatorPermission } from '@/lib/operator/rbac';
import { adminUserService } from '@/services/admin/user.service';
import { z } from 'zod';

const inputSchema = z.object({
  search: z.string().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().optional(),
});

export async function getUsersListAction(params: {
  search?: string;
  cursor?: string;
  pageSize?: number;
} = {}) {
  const parsed = inputSchema.safeParse(params);
  if (!parsed.success) {
    throw new Error('Некорректные параметры запроса');
  }

  const result = await requireOperatorPermission('orders', 'view', async () => {
    return adminUserService.listUsers({
      search: parsed.data.search,
      cursor: parsed.data.cursor,
      pageSize: parsed.data.pageSize || 50,
    });
  });

  if (result && typeof result === 'object' && 'success' in result && !result.success) {
    throw new Error(result.error);
  }

  return result;
}
