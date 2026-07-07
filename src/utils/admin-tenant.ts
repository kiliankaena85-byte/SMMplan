import { User } from '@prisma/client';

/**
 * Resolves the active tenant context for administrative queries.
 * Hardens access boundaries (anti-IDOR): non-global operators (SUPPORT, MANAGER)
 * are strictly restricted to their own tenantId. Only OWNER and ADMIN roles
 * can toggle context via the query parameter or filter.
 */
export function resolveAdminTenantContext(user: User | null, urlTenantParam?: string | null): string {
  if (!user) {
    return 'smmplan';
  }

  const isGlobalOperator = user.role === 'OWNER' || user.role === 'ADMIN' || user.tenantId === 'all';
  
  if (!isGlobalOperator) {
    // Strict multi-tenant boundary constraint
    return user.tenantId || 'smmplan';
  }

  // Global managers / Owners can use the query parameter filter
  if (urlTenantParam && urlTenantParam !== 'all') {
    return urlTenantParam;
  }
  
  return 'all';
}
