import { db } from './db';
import { User } from '@prisma/client';
import crypto from 'crypto';
import { normalizeTenantId, resolveContourFromHost, type ContourId } from './tenant-resolver-edge';

export async function verifyB2BKey(
  key?: string | null, 
  requiredTenantId?: string | null,
  requiredContour?: ContourId | null
): Promise<User | null> {
  if (!key || key.length < 10) return null;

  try {
    const hashedKey = crypto.createHash('sha256').update(key).digest('hex');
    const user = await db.user.findFirst({
      where: { 
        apiKeyHash: hashedKey,
        isActive: true,
        isDeleted: false,
        role: { not: 'BANNED' }
      }
    });

    if (!user) return null;

    if (requiredTenantId) {
      const normRequired = normalizeTenantId(requiredTenantId);
      const normUserTenant = normalizeTenantId(user.tenantId);
      if (normRequired && normUserTenant && normRequired !== normUserTenant) {
        console.warn(`[verifyB2BKey] Cross-tenant B2B key rejected: user tenant "${normUserTenant}" vs required "${normRequired}"`);
        return null;
      }
    }

    if (requiredContour === 'prod') {
      // Production contour strictly rejects test/pentest accounts (F-7.3)
      if (user.email.includes('pentest') || user.email.includes('test_')) {
        console.warn(`[verifyB2BKey] Test account "${user.email}" rejected on production contour`);
        return null;
      }
    }

    return user;
  } catch (error) {
    console.error('B2B Auth Error:', error);
    return null;
  }
}
