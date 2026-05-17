'use server';

import { accountingService } from '@/services/financial/accounting.service';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaffPermission } from '@/lib/server/rbac';

const financeSettingsSchema = z.object({
  taxRate: z.coerce.number().optional().default(0),
  opexMonthly: z.coerce.number().optional().default(0)
});

export async function updateSystemSettings(formData: FormData) {
  const result = await requireStaffPermission('finance', 'edit', async (admin) => {
    const parsed = financeSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) throw new Error('Validation error');
    const { taxRate, opexMonthly: opexRubles } = parsed.data;
    const opexMonthly = Math.round(opexRubles * 100);

    await accountingService.updateSettings(taxRate, opexMonthly);
  
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: 'UPDATE_FINANCE_SETTINGS',
        details: `Updated taxRate to ${taxRate}%, opexMonthly to ${opexRubles} RUB`
      }
    });

    revalidatePath('/admin/finance');
  });
}
