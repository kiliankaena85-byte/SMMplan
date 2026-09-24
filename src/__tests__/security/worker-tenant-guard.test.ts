import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateJobTenantId } from '@/lib/security/worker-tenant-guard';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Item 4: Worker Tenant Guard & Spoofing Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('4.1 allows valid default tenants (smmplan, flux)', async () => {
    const res = await validateJobTenantId('smmplan');
    expect(res.valid).toBe(true);
  });

  it('4.2 rejects missing or invalid non-existent tenantId', async () => {
    (db.tenant.findFirst as any).mockResolvedValue(null);

    const res = await validateJobTenantId('fake_hacked_tenant');
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('TENANT_DOES_NOT_EXIST');
  });

  it('4.3 rejects job when payload tenantId does not match user tenant ownership', async () => {
    (db.user.findUnique as any).mockResolvedValue({
      id: 'user_123',
      tenantId: 'smmplan',
      allowedTenants: ['smmplan'],
    });

    const res = await validateJobTenantId('flux', { expectedUserId: 'user_123' });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('TENANT_USER_MISMATCH');
  });

  it('4.4 allows job when payload tenantId matches user allowedTenants', async () => {
    (db.user.findUnique as any).mockResolvedValue({
      id: 'user_123',
      tenantId: 'smmplan',
      allowedTenants: ['smmplan', 'flux'],
    });

    const res = await validateJobTenantId('flux', { expectedUserId: 'user_123' });
    expect(res.valid).toBe(true);
  });
});
