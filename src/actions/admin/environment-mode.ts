'use server';

import { requireStaffPermission } from '@/lib/server/rbac';
import { SettingsManager, type EnvironmentMode } from '@/lib/settings';
import { auditAdminAwaitable } from '@/lib/admin-audit';

export async function getEnvironmentModeAction() {
  return requireStaffPermission('settings', 'view', async (staffUser) => {
    try {
      const mode = await SettingsManager.getEnvironmentMode();
      const isMockPayment = await SettingsManager.isMockPaymentEnabled();
      const isMockProvider = await SettingsManager.isMockProviderEnabled();
      return {
        success: true,
        mode,
        isMockPayment,
        isMockProvider
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Не удалось получить режим окружения'
      };
    }
  });
}

export async function setEnvironmentModeAction(input: {
  mode: EnvironmentMode;
}) {
  return requireStaffPermission('settings', 'edit', async (staffUser) => {
    try {
      const validModes: EnvironmentMode[] = ['SANDBOX', 'HYBRID', 'ACQUIRING_TEST', 'PRODUCTION'];
      if (!validModes.includes(input.mode)) {
        return { success: false, error: 'Некорректный режим окружения' };
      }

      const oldMode = await SettingsManager.getEnvironmentMode();
      await SettingsManager.setEnvironmentMode(input.mode);

      await auditAdminAwaitable({
        adminId: staffUser.id,
        adminEmail: staffUser.email,
        action: 'ENVIRONMENT_MODE_CHANGED',
        target: 'SYSTEM_SETTINGS',
        targetType: 'SETTINGS',
        oldValue: { mode: oldMode },
        newValue: { mode: input.mode }
      });

      return {
        success: true,
        mode: input.mode,
        message: `Режим окружения успешно переключен на ${input.mode}`
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Ошибка смены режима окружения'
      };
    }
  });
}
