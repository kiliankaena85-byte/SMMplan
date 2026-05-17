"use server";

import { requireStaffPermission } from "@/lib/server/rbac";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateServiceDescription(serviceId: string, description: string) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    try {
      await db.service.update({
        where: { id: serviceId },
        data: { description },
      });

      // Log the action
      await db.adminAuditLog.create({
        data: {
          adminId: admin.id,
          adminEmail: admin.email,
          action: "UPDATE_SERVICE_DESCRIPTION",
          target: serviceId,
          targetType: "SERVICE",
          newValue: JSON.stringify({ description }),
        },
      });

      revalidatePath("/admin/catalog/enrichment");
      return { success: true };
    } catch (error: any) {
      console.error("Failed to update service description:", error);
      return { success: false, error: error.message };
    }
  });
}
