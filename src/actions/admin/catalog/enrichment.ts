"use server";

import { requireStaffPermission } from "@/lib/server/rbac";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getClientIp } from "@/utils/ip";
import { auditAdmin } from "@/lib/admin-audit";

export async function updateServiceDescription(serviceId: string, description: string) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    try {
      await db.service.update({
        where: { id: serviceId },
        data: { description },
      });

      const ipAddress = await getClientIp('unknown');

      // Log the action
      auditAdmin({
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
      return { success: false, error: error.message };
    }
  });
}
