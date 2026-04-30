'use server';

import { db } from '@/lib/db';
import { auditAdmin } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaffPermission } from '@/lib/server/rbac';

const limitSchema = z.object({
  userId: z.string().min(1),
  limit: z.coerce.number().int(),
});

export async function updateSupportLimit(formData: FormData) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    // Only OWNER and ADMIN can change limits
    if (!['OWNER', 'ADMIN'].includes(admin.role)) {
      return { success: false as const, error: 'Только Владелец или Админ могут менять лимиты доверия' };
    }

    const payload = Object.fromEntries(formData.entries());
    const parsed = limitSchema.safeParse(payload);
    
    if (!parsed.success) {
      return { success: false as const, error: 'Некорректные параметры' };
    }

    const { userId, limit: limitCents } = parsed.data;

    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target) return { success: false as const, error: 'Пользователь не найден' };

    await db.user.update({
      where: { id: userId },
      data: { supportLimitCents: limitCents },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_TRUST_BUDGET',
      target: userId,
      targetType: 'USER',
      oldValue: { limit: target.supportLimitCents },
      newValue: { limit: limitCents },
    });

    revalidatePath('/admin/settings');
    return { success: true as const };
  });
}
