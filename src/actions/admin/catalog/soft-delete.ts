'use server';

/**
 * Soft Delete Service Action — Sprint 1.8
 *
 * Archives a service (isActive=false, [ARCHIVED] prefix).
 * Does not hard-delete — preserves full order history integrity.
 */

import { requireStaffPermission } from '@/lib/server/rbac';
import { adminCatalogService } from '@/services/admin/catalog.service';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

const serviceIdSchema = z.string().min(1);

export async function softDeleteServiceAction(serviceId: string) {
  return requireStaffPermission('CATALOG', 'edit', async (admin) => {
    const id = serviceIdSchema.safeParse(serviceId);
    if (!id.success) {
      return { success: false as const, error: 'Неверный ID услуги' };
    }

    await adminCatalogService.softDeleteService(id.data, {
      id: admin.id,
      email: admin.email,
    });

    revalidatePath('/admin/catalog');
    (revalidateTag as any)('catalog');
    (revalidateTag as any)('services');
    return { success: true as const };
  });
}
