"use server";

import { requireStaffPermission } from "@/lib/server/rbac";
import { aiCatalogService } from "@/services/admin/ai-catalog.service";
import { adminCatalogService } from "@/services/admin/catalog.service";

export async function generateAiPreviewAction(name: string, description: string) {
  return requireStaffPermission('PROVIDERS', 'view', async () => {
    try {
      const optimized = await aiCatalogService.generateOptimizedService(name, description);
      return { success: true, optimized };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
}

export async function saveAiImportedServiceAction(
  providerService: any, 
  categoryId: string, 
  markup: number, 
  optimizedData: { newName: string; newDescription: string; requirements: string[] },
  providerId: string
) {
  return requireStaffPermission('PROVIDERS', 'edit', async (admin) => {
    try {
      // 1. Regular import (this does the pricing ladder math, DB save, etc.)
      // Note: we just pass this single ID to the standard import logic
      const res = await adminCatalogService.importServices(
        [String(providerService.service)], 
        categoryId, 
        markup, 
        admin,
        providerId
      );
      
      if (res.importedCount === 0) {
         throw new Error("Failed to import or already exists.");
      }

      // 2. Fetch the created service by externalId
      const { db } = await import("@/lib/db");
      const serviceRecord = await db.service.findFirst({
        where: { externalId: String(providerService.service) }
      });

      if (!serviceRecord) throw new Error("Service saved but not found in DB.");

      // 3. Update the newly created service with AI text and requirements
      // We merge into existing features if any
      const existingFeatures = serviceRecord.features && typeof serviceRecord.features === 'object' 
        ? serviceRecord.features as Record<string, any> 
        : {};

      await db.service.update({
        where: { id: serviceRecord.id },
        data: {
          name: optimizedData.newName,
          description: optimizedData.newDescription,
          features: {
            ...existingFeatures,
            requirements: optimizedData.requirements
          }
        }
      });

      return { success: true, serviceId: serviceRecord.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
}
