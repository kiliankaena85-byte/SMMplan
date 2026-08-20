import { describe, it, expect } from 'vitest';
import { TENANTS, isValidTenant } from '@/config/tenants';
import { resolveTenantFromHostEdge, normalizeTenantId, BOOST_DOMAINS } from '@/lib/tenant-resolver-edge';
import { getTenantHost, getTenantSiteName, absoluteCanonical } from '@/lib/seo-helpers';

describe('SMMboost Tenant Integration', () => {
  it('registers boost in TENANTS config', () => {
    expect(isValidTenant('boost')).toBe(true);
    const boost = TENANTS.find(t => t.id === 'boost');
    expect(boost).toBeDefined();
    expect(boost?.name).toBe('SMMboost');
    expect(boost?.domain).toBe('smmboost.ru');
  });

  it('correctly normalizes and resolves host for boost domains', () => {
    expect(BOOST_DOMAINS.has('smmboost.ru')).toBe(true);
    expect(BOOST_DOMAINS.has('boost.local')).toBe(true);

    expect(resolveTenantFromHostEdge('smmboost.ru')).toBe('boost');
    expect(resolveTenantFromHostEdge('boost.local:3000')).toBe('boost');
    expect(normalizeTenantId('boost')).toBe('boost');
  });

  it('generates correct SEO helpers for boost', () => {
    expect(getTenantHost('boost')).toBe('smmboost.ru');
    expect(getTenantSiteName('boost')).toBe('SMMboost');
    expect(absoluteCanonical('boost', '/telegram')).toBe('https://smmboost.ru/telegram');
  });
});
