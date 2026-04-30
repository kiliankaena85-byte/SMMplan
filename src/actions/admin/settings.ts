'use server';

import { requireStaffPermission } from '@/lib/server/rbac';
import { roleSchema, globalSettingsSchema } from '@/validators/admin.validators';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { settingsService } from '@/services/admin/settings.service';
import { adminCatalogService } from '@/services/admin/catalog.service';
import { VaultService } from '@/lib/vault';
import { headers } from 'next/headers';

// ── User Role Update ──
export async function updateUserRole(formData: FormData) {
  const result = await requireStaffPermission("settings", "edit", async (admin) => {
    const parsed = roleSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { success: false as const, error: 'Некорректные данные' };
    const { userId: targetUserId, role: newRole } = parsed.data;

    if (targetUserId === admin.id) throw new Error('Cannot change own role');

    // SECURITY: Only OWNER can assign high-level administrative roles
    if (['ADMIN', 'OWNER'].includes(newRole) && admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец может назначать роли Админ или Владелец' };
    }

    const targetUser = await db.user.findUnique({ where: { id: targetUserId }, select: { role: true, email: true } });
    if (!targetUser) return { success: false as const, error: 'Пользователь не найден' };

    // SECURITY: Only OWNER can change roles of existing ADMINs or OWNERs
    if (['ADMIN', 'OWNER'].includes(targetUser.role) && admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец может изменять права администраторов' };
    }

    await settingsService.updateUserRole(targetUserId, newRole);

    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get("x-forwarded-for") || "127.0.0.1";

    await db.adminAuditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'USER_ROLE_CHANGE',
        target: targetUserId,
        targetType: 'USER',
        oldValue: JSON.stringify({ email: targetUser.email, role: targetUser.role }),
        newValue: JSON.stringify({ role: newRole }),
        ipAddress
      }
    });

    revalidatePath('/admin/settings');
    return { success: true as const };
  });

  if (result && typeof result === 'object' && 'success' in result && !result.success) {
    throw new Error(result.error);
  }
}


// ── System Settings Update ──
export async function updateGlobalSettings(formData: FormData) {
  const result = await requireStaffPermission("settings", "edit", async (user) => {
    const parsed = globalSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) throw new Error('Validation failed');
    
    const {
      maintenanceMode,
      siteName,
      siteDescription,
      welcomeMessage,
      yookassaShopId,
      yookassaSecretKey: rawYookassaSecret,
      cryptoBotToken: rawCryptoBotToken,
      exchangeRateUSD,
    } = parsed.data;

    const oldSettings = await db.systemSettings.findUnique({ where: { id: 'global' } });

    const dataToUpdate: any = { maintenanceMode, siteName, siteDescription };
    if (welcomeMessage !== null) dataToUpdate.welcomeMessage = welcomeMessage;
    
    let isRateChanged = false;
    if (exchangeRateUSD !== undefined && exchangeRateUSD >= 0) {
      if (oldSettings?.exchangeRateUSD !== exchangeRateUSD) {
        dataToUpdate.exchangeRateUSD = exchangeRateUSD;
        isRateChanged = true;
      }
    }

    // Only update secrets if they are provided (prevent overwriting with empty)
    if (yookassaShopId) dataToUpdate.yookassaShopId = yookassaShopId;
    if (rawYookassaSecret) dataToUpdate.yookassaSecretKey = VaultService.encrypt(rawYookassaSecret);
    if (rawCryptoBotToken) dataToUpdate.cryptoBotToken = VaultService.encrypt(rawCryptoBotToken);

    await settingsService.updateSystemSettings(dataToUpdate);

    // Atomic Re-pricing: trigger background sync if rate changed
    if (isRateChanged && exchangeRateUSD) {
       try {
         await adminCatalogService.syncDenormalizedPrices(exchangeRateUSD);
       } catch (err) {
         console.error('[SettingsAction] Background price sync failed:', err);
         // Optionally, we could return a partial success warning, but logging is minimum.
       }
    }

    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get("x-forwarded-for") || "127.0.0.1";

    await db.adminAuditLog.create({
      data: {
        adminId: user.id,
        adminEmail: user.email,
        action: 'SYSTEM_SETTINGS_UPDATE',
        target: 'global',
        targetType: 'SETTINGS',
        oldValue: JSON.stringify({ siteName: oldSettings?.siteName, maintenanceMode: oldSettings?.maintenanceMode }),
        newValue: JSON.stringify({ siteName, maintenanceMode }),
        ipAddress
      }
    });

    revalidatePath('/admin/settings');
    return true;
  });

  if (result && typeof result === 'object' && 'success' in result && !result.success) {
    throw new Error(result.error);
  }
}
