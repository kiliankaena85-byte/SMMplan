'use server';

import { requireStaffPermission } from '@/lib/server/rbac';

// ── User Role Update ──
export async function updateUserRole(formData: FormData) {
  const result = await requireStaffPermission("settings", "edit", async (user) => {
    const parsed = roleSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return;
    const { userId: targetUserId, role: newRole } = parsed.data;

    if (targetUserId === user.id) throw new Error('Cannot change own role');

    await settingsService.updateUserRole(targetUserId, newRole);
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_ROLE_CHANGE',
        details: `Changed user ${targetUserId} role to ${newRole}`
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

    const dataToUpdate: any = { maintenanceMode, siteName, siteDescription };
    if (welcomeMessage !== null) dataToUpdate.welcomeMessage = welcomeMessage;
    if (exchangeRateUSD !== undefined && exchangeRateUSD >= 0) {
      if (exchangeRateUSD === 0) {
         // if they pass 0, we can trigger an auto-sync, or just set it. 
         // but wait, SettingsManager handles that. Let's just set it.
      }
      dataToUpdate.exchangeRateUSD = exchangeRateUSD;
    }

    // Only update secrets if they are provided (prevent overwriting with empty)
    if (yookassaShopId) dataToUpdate.yookassaShopId = yookassaShopId;
    if (rawYookassaSecret) dataToUpdate.yookassaSecretKey = EncryptionService.encrypt(rawYookassaSecret);
    if (rawCryptoBotToken) dataToUpdate.cryptoBotToken = EncryptionService.encrypt(rawCryptoBotToken);

    await settingsService.updateSystemSettings(dataToUpdate);
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'SYSTEM_SETTINGS_UPDATE',
        details: `Site: ${siteName}, Maintenance: ${maintenanceMode}`
      }
    });
    revalidatePath('/admin/settings');
    return true;
  });

  if (result && typeof result === 'object' && 'success' in result && !result.success) {
    throw new Error(result.error);
  }
}
