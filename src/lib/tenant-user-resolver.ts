/**
 * (c) 2026 SMMplan / OmniSMM 1.0. All rights reserved.
 * Multi-Tenant User & Balance Resolution Helper.
 * Enforces Zero-Trust tenant balance isolation (ст. 54.1 НК РФ, multi-tenant-isolation-arch).
 */

import { db } from '@/lib/db';
import { normalizeTenantId } from '@/lib/tenant-resolver-edge';
import { runWithTenantBypass } from '@/lib/tenant-context';

export interface ResolvedTenantBalance {
  userEmail: string | undefined;
  userBalanceCents: number;
  tenantUserId?: string;
  isOwner?: boolean;
}

export interface TenantUserRecord {
  id: string;
  email: string;
  role: string;
  balance: bigint;
  totalSpent: bigint;
  referralCode: string | null;
  createdAt: Date;
  tenantId: string;
  allowedTenants: string[];
}

/**
 * Resolves the user record strictly for the requested tenantId.
 * If the session user belongs to another tenant (e.g. smmplan while viewing flux),
 * it queries the corresponding user account for the target tenant by email.
 */
export async function resolveTenantUser(
  sessionUserId: string | undefined,
  rawTargetTenantId: string,
  autoProvision = false
): Promise<TenantUserRecord | null> {
  if (!sessionUserId) return null;

  return runWithTenantBypass('Multi-Tenant Cross-Tenant User Resolution', async () => {
    const targetTenantId = normalizeTenantId(rawTargetTenantId) || 'smmplan';

    const sessionUser = await db.user.findUnique({
      where: { id: sessionUserId },
      select: {
        id: true,
        email: true,
        role: true,
        balance: true,
        totalSpent: true,
        referralCode: true,
        createdAt: true,
        tenantId: true,
        allowedTenants: true,
      },
    });

    if (!sessionUser) return null;

    // 1. Direct match: user belongs to the requested tenant
    if (sessionUser.tenantId === targetTenantId) {
      return sessionUser;
    }

    // 2. Cross-tenant lookup: query the user account created for targetTenantId
    let tenantUser = await db.user.findUnique({
      where: {
        email_tenantId: {
          email: sessionUser.email.toLowerCase(),
          tenantId: targetTenantId,
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        balance: true,
        totalSpent: true,
        referralCode: true,
        createdAt: true,
        tenantId: true,
        allowedTenants: true,
      },
    });

    // 3. Optional auto-provisioning for authenticated users across sibling tenants
    if (!tenantUser && autoProvision) {
      const isStaff = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'].includes(sessionUser.role);
      const newRole = sessionUser.role === 'OWNER' ? 'OWNER' : 'USER';
      tenantUser = await db.user.create({
        data: {
          email: sessionUser.email.toLowerCase(),
          tenantId: targetTenantId,
          role: newRole,
          allowedTenants: isStaff ? ['smmplan', 'flux'] : [targetTenantId],
          balance: BigInt(0),
          tosAcceptedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          role: true,
          balance: true,
          totalSpent: true,
          referralCode: true,
          createdAt: true,
          tenantId: true,
          allowedTenants: true,
        },
      });
    }

    return tenantUser;
  });
}

/**
 * Resolves the email and balance for UI display on the requested tenant.
 * Guarantees that a balance from one tenant NEVER leaks onto another storefront.
 */
export async function resolveTenantUserBalance(
  sessionUserId: string | undefined,
  rawTargetTenantId: string
): Promise<ResolvedTenantBalance> {
  if (!sessionUserId) {
    return { userEmail: undefined, userBalanceCents: 0 };
  }

  return runWithTenantBypass('Multi-Tenant Cross-Tenant User Balance Resolution', async () => {
    const targetTenantId = normalizeTenantId(rawTargetTenantId) || 'smmplan';

    // Read the authenticated session user to obtain their verified email and role
    const sessionUser = await db.user.findUnique({
      where: { id: sessionUserId },
      select: {
        id: true,
        email: true,
        role: true,
        balance: true,
        tenantId: true,
      },
    });

    if (!sessionUser) {
      return { userEmail: undefined, userBalanceCents: 0 };
    }

    const isOwner = sessionUser.role === 'OWNER';

    // If user is on their own tenant, return their native balance
    if (sessionUser.tenantId === targetTenantId) {
      return {
        userEmail: sessionUser.email,
        userBalanceCents: Number(sessionUser.balance),
        tenantUserId: sessionUser.id,
        isOwner,
      };
    }

    // Strict isolation: Look up account on target tenant
    const targetUser = await db.user.findUnique({
      where: {
        email_tenantId: {
          email: sessionUser.email.toLowerCase(),
          tenantId: targetTenantId,
        },
      },
      select: {
        id: true,
        balance: true,
        role: true,
      },
    });

    return {
      userEmail: sessionUser.email,
      userBalanceCents: targetUser ? Number(targetUser.balance) : 0,
      tenantUserId: targetUser?.id,
      isOwner: isOwner || targetUser?.role === 'OWNER',
    };
  });
}
