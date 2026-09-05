import { User } from '@prisma/client';

export type UserWithAllowedTenants = Omit<Partial<User>, 'tenantId'> & {
  role?: string;
  tenantId?: string | null;
  allowedTenants?: string[];
};

/**
 * Resolves the active tenant context for administrative queries.
 * Hardens access boundaries (anti-IDOR & NIST SP 800-162 / ISO 29148 standards):
 * 1. ONLY user.role === 'OWNER' has universal global access ('all' or any specific tenant).
 * 2. ADMIN, SUPPORT, MANAGER, OPERATOR are strictly restricted to their allowedTenants.
 *    (fallback to [user.tenantId || 'smmplan'] if allowedTenants is empty).
 *    Non-owners CANNOT view 'all' — if 'all' is requested, it falls back to allowedTenants[0].
 * 3. If a non-owner attempts to access a tenant outside their allowedTenants,
 *    it strictly falls back to their default allowed tenant (Fail-Closed).
 */
export function resolveAdminTenantContext(
  user: UserWithAllowedTenants | null,
  urlTenantParam?: string | null
): string {
  if (!user) {
    return 'smmplan';
  }

  // Strictly OWNER has universal global access across all tenants
  if (user.role === 'OWNER') {
    if (urlTenantParam && urlTenantParam !== 'all') {
      return urlTenantParam;
    }
    return 'all';
  }

  // Non-owners: get permitted tenants list
  const allowed = (user.allowedTenants && user.allowedTenants.length > 0)
    ? user.allowedTenants
    : [user.tenantId || 'smmplan'];

  // Non-owners can only toggle between their explicitly allowed tenants (cannot choose 'all')
  if (urlTenantParam && urlTenantParam !== 'all') {
    if (allowed.includes(urlTenantParam)) {
      return urlTenantParam;
    }
  }

  // Fail-closed fallback to first allowed tenant or user.tenantId
  return allowed[0] || user.tenantId || 'smmplan';
}

/**
 * Validates whether a specific tenant is authorized for the given staff user.
 */
export function isTenantAllowedForUser(
  user: UserWithAllowedTenants | null,
  tenantId: string
): boolean {
  if (!user) return false;
  if (tenantId === 'all') return false; // 'all' is a meta-scope, not a tenant
  if (user.role === 'OWNER') return true;

  const allowed = (user.allowedTenants && user.allowedTenants.length > 0)
    ? user.allowedTenants
    : [user.tenantId || 'smmplan'];

  return allowed.includes(tenantId);
}
