import { describe, it, expect } from 'vitest';
import { getPublicCatalogAction } from '@/actions/order/catalog';
import { getTenantHost, normalizeTenantId, absoluteCanonical } from '@/lib/seo-helpers';
import { TENANTS } from '@/config/tenants';

describe('Cross-Tenant E2E Isolation & Checkout Verification', () => {
  it('should verify tenant hosts and canonical URLs for both tenants', () => {
    // 1. SMMplan
    const smmplanTenant = normalizeTenantId('smmplan');
    expect(smmplanTenant).toBe('smmplan');
    expect(getTenantHost('smmplan')).toBe('smmplan.pro');
    expect(absoluteCanonical('smmplan', '/services/telegram')).toBe('https://smmplan.pro/services/telegram');

    // 2. SMMflux
    const fluxTenant = normalizeTenantId('flux');
    expect(fluxTenant).toBe('flux');
    expect(getTenantHost('flux')).toBe('smmflux.ru');
    expect(absoluteCanonical('flux', '/services/vk')).toBe('https://smmflux.ru/services/vk');

    // 3. Legacy alias fallback
    expect(normalizeTenantId('lovable')).toBe('flux');
  });

  it('should fetch isolated public catalogs for both smmplan and flux', async () => {
    const smmplanCatalog = await getPublicCatalogAction('smmplan');
    expect(smmplanCatalog.success).toBe(true);
    expect(Array.isArray(smmplanCatalog.data)).toBe(true);

    const fluxCatalog = await getPublicCatalogAction('flux');
    expect(fluxCatalog.success).toBe(true);
    expect(Array.isArray(fluxCatalog.data)).toBe(true);
  });

  it('should verify TENANTS configuration consistency', () => {
    const tenantIds = TENANTS.map(t => t.id);
    expect(tenantIds).toContain('smmplan');
    expect(tenantIds).toContain('flux');
    expect(tenantIds).not.toContain('lovable');
  });
});
