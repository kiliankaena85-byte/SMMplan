'use server';

import { requireStaffPermission } from '@/lib/server/rbac';
import { CBRRateService } from '@/services/system/cbr-rate.service';
import { auditAdminAwaitable } from '@/lib/admin-audit';
import { getClientIp } from '@/utils/ip';
import { revalidatePath } from 'next/cache';

export async function syncCBRExchangeRateAction() {
  return await requireStaffPermission('settings', 'edit', async (admin) => {
    try {
      const result = await CBRRateService.syncCBRExchangeRate();
      const ipAddress = await getClientIp();

      await auditAdminAwaitable({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'SYSTEM_SETTINGS_UPDATE',
        target: 'exchangeRateUSD',
        targetType: 'SYSTEM_SETTINGS',
        newValue: { rate: result.systemRate, source: 'CBR_API' },
        ipAddress
      });

      revalidatePath('/admin/settings');
      return { success: true as const, rate: result.systemRate };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false as const, error: errorMsg || 'Ошибка синхронизации с ЦБ РФ' };
    }
  });
}
