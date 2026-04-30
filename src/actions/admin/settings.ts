'use server';

import { requireStaffPermission } from '@/lib/server/rbac';
import { roleSchema, globalSettingsSchema } from '@/validators/admin.validators';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { settingsService } from '@/services/admin/settings.service';
import { VaultService } from '@/lib/vault';
import { headers } from 'next/headers';

// ── User Role Update ──
export async function updateUserRole(formData: FormData) {
  const result = await requireStaffPermission("settings", "edit", async (user) => {
    const parsed = roleSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return;
    const { userId: targetUserId, role: newRole } = parsed.data;

    if (targetUserId === user.id) throw new Error('Cannot change own role');

    const oldUser = await db.user.findUnique({ where: { id: targetUserId }, select: { role: true } });
    await settingsService.updateUserRole(targetUserId, newRole);

    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get("x-forwarded-for") || "127.0.0.1";

    await db.adminAuditLog.create({
      data: {
        adminId: user.id,
        adminEmail: user.email,
        action: 'USER_ROLE_CHANGE',
        target: targetUserId,
        targetType: 'USER',
        oldValue: JSON.stringify({ role: oldUser?.role }),
        newValue: JSON.stringify({ role: newRole }),
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
    if (exchangeRateUSD !== undefined && exchangeRateUSD >= 0) {
      dataToUpdate.exchangeRateUSD = exchangeRateUSD;
    }

    // Only update secrets if they are provided (prevent overwriting with empty)
    if (yookassaShopId) dataToUpdate.yookassaShopId = yookassaShopId;
    if (rawYookassaSecret) dataToUpdate.yookassaSecretKey = VaultService.encrypt(rawYookassaSecret);
    if (rawCryptoBotToken) dataToUpdate.cryptoBotToken = VaultService.encrypt(rawCryptoBotToken);

    await settingsService.updateSystemSettings(dataToUpdate);

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
