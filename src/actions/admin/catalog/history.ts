'use server';

import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/server/rbac';

export async function getServiceAuditLogsAction(serviceId: string) {
  return requireStaffPermission('finance', 'view', async () => {
    const logs = await db.adminAuditLog.findMany({
      where: {
        target: serviceId,
        targetType: 'SERVICE',
        action: {
          in: ['SERVICE_MARKUP_UPDATE', 'BATCH_MARKUP_SET', 'BULK_MARKUP_UPDATE']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    
    return { success: true, logs };
  });
}
