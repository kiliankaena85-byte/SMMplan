"use server";

import { db } from "@/lib/db";
import { requireStaffPermission } from "@/lib/server/rbac";
import { SettingsManager } from "@/lib/settings";
import { getClientIp } from "@/utils/ip";
import { auditAdminAwaitable } from "@/lib/admin-audit";

/**
 * Toggles the global mock test mode.
 */
export async function adminToggleTestMode(enable: boolean) {
  return requireStaffPermission('SETTINGS', 'edit', async (admin) => {
    const ipAddress = await getClientIp('unknown');
    const oldSettings = await db.systemSettings.findUnique({ where: { id: 'global' }, select: { isTestMode: true } });
    
    await SettingsManager.setTestMode(enable);

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SYSTEM_TEST_MODE_TOGGLE',
      target: 'global',
      targetType: 'SETTINGS',
      oldValue: oldSettings,
      newValue: { isTestMode: enable },
      ipAddress
    });

    return { success: true, message: `Test mode is now ${enable ? 'ON' : 'OFF'}` };
  });
}

/**
 * Irreversibly deletes all data marked with the isTest flag.
 * This is the Nucleus Clear for the Mock Environment.
 */
export async function adminClearTestData() {
  return requireStaffPermission('SETTINGS', 'edit', async (admin) => {
    const ipAddress = await getClientIp('unknown');
    try {
      // Deleting Orders cascading relationships
      const resultOrders = await db.order.deleteMany({
        where: { isTest: true }
      });
      
      await auditAdminAwaitable({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'SYSTEM_TEST_DATA_CLEAR',
        target: 'global',
        targetType: 'SETTINGS',
        newValue: { deletedOrdersCount: resultOrders.count },
        ipAddress
      });

      return { 
        success: true, 
        message: `Cleared ${resultOrders.count} test orders and associated data.` 
      };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error("Failed to clear test data:", e);
      return { success: false, error: "Failed to perform Nucleus Clear." };
    }
  });
}
