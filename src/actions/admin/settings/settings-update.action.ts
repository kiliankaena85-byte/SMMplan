'use server';

import { requireStaffPermission } from '@/lib/server/rbac';
import { globalSettingsSchema } from '@/validators/admin.validators';
import { db } from '@/lib/db';
import { settingsService } from '@/services/admin/settings.service';
import { SettingsProvider } from '@/lib/settings';
import { catalogQueue } from '@/lib/queue-manager';
import { getClientIp } from '@/utils/ip';
import { normalizeTenantId } from '@/lib/tenant-resolver-edge';
import {
  validateSettingsSecurity,
  mapSettingsFormData,
  dispatchSettingsAlerts,
  logSettingsAudit,
} from './helpers';

// ── System Settings Update ──
export async function updateGlobalSettings(
  formDataOrPrevState: FormData | unknown,
  maybeFormData?: FormData | unknown
) {
  const formData = (maybeFormData && typeof (maybeFormData as { entries?: unknown }).entries === 'function')
    ? (maybeFormData as FormData)
    : (formDataOrPrevState && typeof (formDataOrPrevState as { entries?: unknown }).entries === 'function')
      ? (formDataOrPrevState as FormData)
      : null;

  if (!formData || typeof formData.entries !== 'function') {
    return { success: false, errors: { _form: ['Некорректные данные формы'] } };
  }

  const result = await requireStaffPermission('settings', 'edit', async (user) => {
    const parsed = globalSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return {
        success: false as const,
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    // ── CRITICAL: Resolve active tenantId from formData or x-tenant-id header ──
    const formTenant = formData.get('tenantId') as string | null;
    const headerTenant = await SettingsProvider.getTenantId();
    const activeTenantId = normalizeTenantId(formTenant || headerTenant || 'smmplan') || 'smmplan';

    // Anti-spoofing: Non-OWNER staff can only modify settings for their allowedTenants
    if (user.role !== 'OWNER') {
      const allowed = (user.allowedTenants && user.allowedTenants.length > 0)
        ? user.allowedTenants
        : [user.tenantId || 'smmplan'];
      if (!allowed.includes(activeTenantId)) {
        return {
          success: false as const,
          errors: { _form: ['Запрещено изменять настройки витрины вне ваших полномочий'] },
        };
      }
    }

    // 1. Security & RBAC Guard
    const securityCheck = await validateSettingsSecurity(parsed.data, formData, user.role);
    if (!securityCheck.success) {
      return {
        success: false as const,
        errors: securityCheck.errors,
      };
    }

    const oldSettings = await db.systemSettings.findUnique({ where: { id: activeTenantId } });

    // 2. Form Mapping to Prisma Input
    const { dataToUpdate, isRateChanged, finalExchangeRate } = await mapSettingsFormData(
      formData,
      parsed.data,
      oldSettings,
      activeTenantId
    );

    // 3. Database Persistence
    await settingsService.updateSystemSettings(
      dataToUpdate,
      activeTenantId
    );

    // 4. Background Price Sync (if exchange rate changed)
    if (isRateChanged && finalExchangeRate) {
      try {
        await catalogQueue.add('sync-prices-bg', { type: 'SYNC_PRICES', usdToRub: finalExchangeRate });
      } catch (err) {
        console.error('[SettingsAction] Failed to enqueue background price sync:', err);
      }
    }

    // 5. Audit Logging (with sensitive key masking)
    const ipAddress = await getClientIp();
    await logSettingsAudit({
      adminId: user.id,
      adminEmail: user.email,
      activeTenantId,
      dataToUpdate,
      oldSettings,
      ipAddress,
    });

    // 6. Dispatch Realtime Admin Alerts & Bot Invalidation
    await dispatchSettingsAlerts({
      activeTenantId,
      userEmail: user.email,
      ipAddress,
      dataToUpdate,
      oldSettings,
      isRateChanged,
      finalExchangeRate,
    });

    // 7. Cache Revalidation
    try {
      const { revalidateTag, revalidatePath } = (await import('next/cache')) as unknown as {
        revalidateTag: (tag: string) => unknown;
        revalidatePath: (path: string, type?: 'layout' | 'page') => unknown;
      };
      revalidateTag('settings');
      revalidateTag(`settings-${activeTenantId}`);
      revalidatePath('/admin/settings');
      revalidatePath('/', 'layout');
    } catch (revalErr) {
      console.warn('[settings] Cache revalidation warning in action:', revalErr);
    }

    return {
      success: true as const,
      message: 'Настройки успешно сохранены',
    };
  });

  return result;
}
