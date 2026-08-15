"use server";

import { requireStaffPermission } from "@/lib/server/rbac";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getClientIp } from "@/utils/ip";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { auditAdmin, auditAdminAwaitable } from "@/lib/admin-audit";
import { handleServerError } from "@/utils/error-handler";

export async function updateServiceDescription(serviceId: string, description: string) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    try {
      await db.service.update({
        where: { id: serviceId },
        data: { description },
      });

      const ipAddress = await getClientIp('unknown');

      // Log the action
      await auditAdminAwaitable({
        adminId: admin.id,
        adminEmail: admin.email,
        action: "UPDATE_SERVICE_DESCRIPTION",
        target: serviceId,
        targetType: "SERVICE",
        newValue: { description },
        ipAddress
      });

      revalidatePath("/admin/catalog/enrichment");
      return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Failed to update service description:", error);
      return { success: false, error: handleServerError(error).message };
    }
  });
}
