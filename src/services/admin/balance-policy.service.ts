import { db } from "@/lib/db";
import { BalanceAdjustmentPolicy } from "@prisma/client";
import { BALANCE_ADJUSTMENT_REASONS } from "@/constants/balance-adjustments";

export async function getEffectiveBalancePolicy(staffUserId: string): Promise<BalanceAdjustmentPolicy | null> {
  const staffUser = await db.user.findUnique({
    where: { id: staffUserId },
    select: { id: true, staffRoleId: true, role: true }
  });

  if (!staffUser) return null;

  // 1. Personal override policy
  const userPolicy = await db.balanceAdjustmentPolicy.findFirst({
    where: {
      scopeType: 'USER',
      userId: staffUserId,
      isActive: true
    }
  });

  if (userPolicy) return userPolicy;

  // 2. Role-based policy
  if (staffUser.staffRoleId) {
    const rolePolicy = await db.balanceAdjustmentPolicy.findFirst({
      where: {
        scopeType: 'ROLE',
        staffRoleId: staffUser.staffRoleId,
        isActive: true
      }
    });

    if (rolePolicy) return rolePolicy;
  }

  // 3. Global fallback policy
  const globalPolicy = await db.balanceAdjustmentPolicy.findFirst({
    where: {
      scopeType: 'GLOBAL',
      isActive: true
    }
  });

  if (globalPolicy) return globalPolicy;

  // Fallback: If staff is OWNER or ADMIN, return virtual unlimited policy if no DB policy found
  if (staffUser.role === 'OWNER' || staffUser.role === 'ADMIN') {
    return {
      id: 'virtual-owner-policy',
      scopeType: 'GLOBAL',
      staffRoleId: null,
      userId: null,
      isActive: true,
      enabled: true,
      canRequestCredit: true,
      canRequestDebit: true,
      canApprove: true,
      canReject: true,
      canViewAll: true,
      canViewStats: true,
      maxCreditPerRequest: BigInt(100000000), // 1M RUB
      maxDebitPerRequest: BigInt(100000000),
      maxCreditPerDay: BigInt(500000000),
      maxDebitPerDay: BigInt(500000000),
      maxTotalPerDay: BigInt(1000000000),
      maxApprovalPerRequest: BigInt(0), // 0 = unlimited for owner
      allowedCreditReasonCodes: JSON.stringify([...BALANCE_ADJUSTMENT_REASONS.CREDIT]),
      allowedDebitReasonCodes: JSON.stringify([...BALANCE_ADJUSTMENT_REASONS.DEBIT]),
      allowedTargetRoles: JSON.stringify(['USER', 'MANAGER', 'SUPPORT', 'ADMIN']),
      requireTicket: false,
      requireOrderForDebit: false,
      blockBannedTargets: false,
      blockDeletedTargets: true,
      autoExecuteBelow: BigInt(0),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  return null;
}

export function parsePolicyReasonCodes(policy: BalanceAdjustmentPolicy): {
  allowedCreditReasonCodes: string[];
  allowedDebitReasonCodes: string[];
  allowedTargetRoles: string[];
} {
  let allowedCreditReasonCodes: string[] = [];
  let allowedDebitReasonCodes: string[] = [];
  let allowedTargetRoles: string[] = [];

  try {
    const rawCredit = policy.allowedCreditReasonCodes;
    allowedCreditReasonCodes = typeof rawCredit === 'string'
      ? JSON.parse(rawCredit)
      : Array.isArray(rawCredit) ? rawCredit : [];
  } catch {
    allowedCreditReasonCodes = [...BALANCE_ADJUSTMENT_REASONS.CREDIT];
  }

  try {
    const rawDebit = policy.allowedDebitReasonCodes;
    allowedDebitReasonCodes = typeof rawDebit === 'string'
      ? JSON.parse(rawDebit)
      : Array.isArray(rawDebit) ? rawDebit : [];
  } catch {
    allowedDebitReasonCodes = [...BALANCE_ADJUSTMENT_REASONS.DEBIT];
  }

  try {
    const rawRoles = policy.allowedTargetRoles;
    allowedTargetRoles = typeof rawRoles === 'string'
      ? JSON.parse(rawRoles)
      : Array.isArray(rawRoles) ? rawRoles : [];
  } catch {
    allowedTargetRoles = ['USER', 'SUPPORT'];
  }

  return {
    allowedCreditReasonCodes,
    allowedDebitReasonCodes,
    allowedTargetRoles
  };
}
