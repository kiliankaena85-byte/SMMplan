import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { normalizeTenantId } from '@/lib/tenant-resolver-edge';

const log = logger.child({ component: 'WorkerTenantGuard' });

export interface TenantValidationOptions {
  jobId?: string;
  expectedUserId?: string;
  allowAll?: boolean;
}

export async function validateJobTenantId(
  tenantId: string | undefined | null,
  options: TenantValidationOptions = {}
): Promise<{ valid: boolean; reason?: string }> {
  const { jobId = 'unknown', expectedUserId, allowAll = false } = options;

  if (!tenantId || typeof tenantId !== 'string') {
    log.warn(`[${jobId}] Discarding job: missing tenantId in payload`);
    return { valid: false, reason: 'MISSING_TENANT_ID' };
  }

  if (tenantId === 'all') {
    if (allowAll) {
      return { valid: true };
    }
    log.warn(`[${jobId}] Discarding job: 'all' tenantId is not permitted for this job type`);
    return { valid: false, reason: 'TENANT_ALL_NOT_ALLOWED' };
  }

  // 1. Verify tenant exists in Database or default known tenants
  const clean = tenantId.trim().toLowerCase();
  const canonical = clean === 'smmflux' ? 'flux' : clean;
  const knownTenants = new Set(['smmplan', 'flux']);
  let tenantExists = knownTenants.has(canonical);

  if (!tenantExists) {
    try {
      const dbTenant = await db.tenant.findFirst({
        where: {
          OR: [
            { id: tenantId },
            { slug: tenantId },
          ],
        },
        select: { id: true },
      });
      if (dbTenant) {
        tenantExists = true;
      }
    } catch {
      // Fallback check
    }
  }

  if (!tenantExists) {
    log.error(`[${jobId}] Security Alert: Tenant ID spoofing detected! Tenant '${tenantId}' does not exist in DB.`);
    return { valid: false, reason: 'TENANT_DOES_NOT_EXIST' };
  }

  // 2. If expectedUserId is supplied, verify user's tenantId matches job tenantId
  if (expectedUserId) {
    try {
      const user = await db.user.findUnique({
        where: { id: expectedUserId },
        select: { id: true, tenantId: true, allowedTenants: true },
      });

      if (!user) {
        log.error(`[${jobId}] Security Alert: Job user '${expectedUserId}' does not exist.`);
        return { valid: false, reason: 'USER_NOT_FOUND' };
      }

      const userTenant = user.tenantId || 'smmplan';
      const userAllowed = user.allowedTenants && user.allowedTenants.length > 0
        ? user.allowedTenants
        : [userTenant];

      if (!userAllowed.includes(tenantId)) {
        log.error(`[${jobId}] Security Alert: Tenant ID spoofing! User '${expectedUserId}' (tenant: ${userTenant}) attempted job for unpermitted tenant '${tenantId}'.`);
        return { valid: false, reason: 'TENANT_USER_MISMATCH' };
      }
    } catch (err) {
      log.error(`[${jobId}] Error validating user tenant ownership: ${(err as Error).message}`);
      return { valid: false, reason: 'VALIDATION_ERROR' };
    }
  }

  return { valid: true };
}
