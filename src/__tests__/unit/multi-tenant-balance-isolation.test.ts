/**
 * (c) 2026 SMMplan / OmniSMM 1.0. All rights reserved.
 * Unit tests for Multi-Tenant Balance Isolation & Cross-Tenant Leak Prevention.
 * Follows SPEC-2026-09-21-multi-tenant-balance-isolation.md.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveTenantUserBalance, resolveTenantUser } from '@/lib/tenant-user-resolver';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

describe('Multi-Tenant Balance Isolation (SPEC-2026-09-21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Returns full balance when user accesses their own native tenant (smmplan)', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user-smmplan-1',
      email: 'art@artmspektr.ru',
      role: 'USER',
      balance: BigInt(1920), // 19.20 RUB
      tenantId: 'smmplan',
      allowedTenants: ['smmplan'],
    } as any);

    const res = await resolveTenantUserBalance('user-smmplan-1', 'smmplan');

    expect(res.userEmail).toBe('art@artmspektr.ru');
    expect(res.userBalanceCents).toBe(1920);
    expect(res.tenantUserId).toBe('user-smmplan-1');
  });

  it('2. Prevents balance leak: returns 0 balance on SMMflux if user only exists on SMMplan', async () => {
    // Session user is on smmplan with 19.20 RUB balance
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({
        id: 'user-smmplan-1',
        email: 'art@artmspektr.ru',
        role: 'USER',
        balance: BigInt(1920),
        tenantId: 'smmplan',
        allowedTenants: ['smmplan'],
      } as any)
      // Query for user on flux returns null (user not registered on flux yet)
      .mockResolvedValueOnce(null);

    const res = await resolveTenantUserBalance('user-smmplan-1', 'flux');

    expect(res.userEmail).toBe('art@artmspektr.ru');
    expect(res.userBalanceCents).toBe(0); // STRICTLY 0, not 1920!
    expect(res.tenantUserId).toBeUndefined();
  });

  it('3. Returns independent SMMflux balance when user has accounts on both tenants', async () => {
    // Session user is on smmplan with 19.20 RUB balance
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({
        id: 'user-smmplan-1',
        email: 'art@artmspektr.ru',
        role: 'OWNER',
        balance: BigInt(1920),
        tenantId: 'smmplan',
        allowedTenants: ['smmplan', 'flux'],
      } as any)
      // Query for user on flux returns the separate flux account with 50.00 RUB balance
      .mockResolvedValueOnce({
        id: 'user-flux-1',
        email: 'art@artmspektr.ru',
        role: 'OWNER',
        balance: BigInt(5000),
        tenantId: 'flux',
        allowedTenants: ['smmplan', 'flux'],
      } as any);

    const res = await resolveTenantUserBalance('user-smmplan-1', 'flux');

    expect(res.userEmail).toBe('art@artmspektr.ru');
    expect(res.userBalanceCents).toBe(5000); // Flux balance, not smmplan balance!
    expect(res.tenantUserId).toBe('user-flux-1');
    expect(res.isOwner).toBe(true);
  });

  it('4. Handles unauthenticated session gracefully (0 balance, undefined email)', async () => {
    const res = await resolveTenantUserBalance(undefined, 'flux');

    expect(res.userEmail).toBeUndefined();
    expect(res.userBalanceCents).toBe(0);
    expect(res.tenantUserId).toBeUndefined();
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });
});
