import { describe, it, expect } from 'vitest';
import { resolveAdminTenantContext, resolveAdminTenantAsync, UserWithAllowedTenants } from '@/utils/admin-tenant';

describe('Admin Orders Tenant Resolution & Cross-Tenant Synchronization Suite', () => {
  const ownerUser: UserWithAllowedTenants = {
    role: 'OWNER',
    tenantId: 'smmplan',
    allowedTenants: ['smmplan', 'flux'],
  };

  const supportFluxUser: UserWithAllowedTenants = {
    role: 'SUPPORT',
    tenantId: 'flux',
    allowedTenants: ['flux'],
  };

  const multiAdminUser: UserWithAllowedTenants = {
    role: 'ADMIN',
    tenantId: 'smmplan',
    allowedTenants: ['smmplan', 'flux'],
  };

  it('1. should resolve tenant from cookieTenant when urlTenantParam is absent for OWNER', () => {
    // When owner visits /admin/orders without ?tenant=..., cookieTenant 'flux' must take precedence over user.tenantId
    const resolved = resolveAdminTenantContext(ownerUser, undefined, 'flux');
    expect(resolved).toBe('flux');
  });

  it('2. should prioritize explicit urlTenantParam over cookieTenant for OWNER', () => {
    // When owner explicitly filters by ?tenant=smmplan while having cookie 'flux'
    const resolved = resolveAdminTenantContext(ownerUser, 'smmplan', 'flux');
    expect(resolved).toBe('smmplan');
  });

  it('3. should prioritize explicit ?tenant=all over cookieTenant for OWNER', () => {
    const resolved = resolveAdminTenantContext(ownerUser, 'all', 'flux');
    expect(resolved).toBe('all');
  });

  it('4. should resolve cookieTenant for multi-brand staff when permitted in allowedTenants', () => {
    const resolved = resolveAdminTenantContext(multiAdminUser, undefined, 'flux');
    expect(resolved).toBe('flux');
  });

  it('5. should reject unauthorized cookieTenant for single-brand staff and fail closed', () => {
    const resolved = resolveAdminTenantContext(supportFluxUser, undefined, 'smmplan');
    expect(resolved).toBe('flux');
  });

  it('6. resolveAdminTenantAsync should cleanly handle explicit arguments', async () => {
    const resolved = await resolveAdminTenantAsync(ownerUser, undefined, 'flux');
    expect(resolved).toBe('flux');
  });
});
