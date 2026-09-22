/**
 * (c) 2026 SMMplan / OmniSMM 1.0. All rights reserved.
 * Unit tests for Multi-Tenant Balance Isolation & Cross-Tenant Leak Prevention.
 * Follows SPEC-2026-09-21-multi-tenant-balance-isolation.md.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveTenantUserBalance, resolveTenantUser } from '@/lib/tenant-user-resolver';
import { db } from '@/lib/db';
import { refreshBalanceAction } from '@/actions/auth/refresh-balance';
import { verifySession } from '@/lib/session';
import { headers } from 'next/headers';

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/session', () => ({
  verifySession: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(),
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

describe('refreshBalanceAction Server Action Tenant Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Returns Unauthorized if session is missing', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce(null);

    const res = await refreshBalanceAction('flux');

    expect(res.success).toBe(false);
    expect(res.error).toBe('Unauthorized');
  });

  it('2. Returns isolated balance for explicitly requested tenantId (flux)', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      userId: 'user-smmplan-1',
      role: 'USER',
    } as any);

    vi.mocked(headers).mockResolvedValueOnce(new Headers() as any);

    // Initial user on smmplan
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({
        id: 'user-smmplan-1',
        email: 'alex@example.com',
        role: 'USER',
        balance: BigInt(1000), // 10.00 RUB on smmplan
        tenantId: 'smmplan',
        allowedTenants: ['smmplan', 'flux'],
      } as any)
      // Matching user on flux
      .mockResolvedValueOnce({
        id: 'user-flux-1',
        email: 'alex@example.com',
        role: 'USER',
        balance: BigInt(7550), // 75.50 RUB on flux
        tenantId: 'flux',
        allowedTenants: ['smmplan', 'flux'],
      } as any);

    const res = await refreshBalanceAction('flux');

    expect(res.success).toBe(true);
    expect(res.tenantId).toBe('flux');
    expect(res.balanceRub).toBe('75.50 ₽');
    expect(res.balanceCents).toBe(7550);
  });

  it('3. Returns isolated balance based on request header x-tenant-id when parameter is omitted', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      userId: 'user-smmplan-1',
      role: 'USER',
    } as any);

    const mockHeaders = new Headers();
    mockHeaders.set('x-tenant-id', 'flux');
    vi.mocked(headers).mockResolvedValueOnce(mockHeaders as any);

    // Initial user on smmplan
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({
        id: 'user-smmplan-1',
        email: 'alex@example.com',
        role: 'USER',
        balance: BigInt(1000),
        tenantId: 'smmplan',
        allowedTenants: ['smmplan', 'flux'],
      } as any)
      // Matching user on flux
      .mockResolvedValueOnce({
        id: 'user-flux-1',
        email: 'alex@example.com',
        role: 'USER',
        balance: BigInt(25000), // 250.00 RUB on flux
        tenantId: 'flux',
        allowedTenants: ['smmplan', 'flux'],
      } as any);

    const res = await refreshBalanceAction();

    expect(res.success).toBe(true);
    expect(res.tenantId).toBe('flux');
    expect(res.balanceRub).toBe('250.00 ₽');
    expect(res.balanceCents).toBe(25000);
  });
});

