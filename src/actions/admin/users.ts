'use server';

import { db } from '@/lib/db';
import { adminUserService } from '@/services/admin/user.service';
import { escrowService } from '@/services/admin/escrow.service';
import { auditAdmin } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { updateBalanceSchema, userIdSchema } from '@/validators/admin.validators';
import { requireStaffPermission } from '@/lib/server/rbac';
import { getClientIp } from '@/utils/ip';

const secretKey = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-v2';
const encodedKey = new TextEncoder().encode(secretKey);

export async function updateBalanceAction(formData: FormData) {
  return requireStaffPermission('clients', 'edit', async (admin) => {
    const payload = Object.fromEntries(formData.entries());
    const parsed = updateBalanceSchema.safeParse(payload);
    
    if (!parsed.success) {
      return { success: false as const, error: 'userId, amount (копейки) и reason обязательны' };
    }

    const { userId, amount, reason } = parsed.data;

    // Additional safeguard: only OWNER and ADMIN for large balance updates if needed, 
    // but here we follow RBAC 'edit' permission for 'clients' section.
    // If SUPPORT has 'edit' permission for 'clients', they can update balance. 
    // Usually, SUPPORT should only have 'view' for 'clients'.

    const ipAddress = await getClientIp('unknown');

    const escrowResult = await escrowService.evaluateBalanceAdjustment(
      userId,
      amount,
      reason.trim(),
      admin
    );

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_BALANCE_REQUEST',
      target: userId,
      targetType: 'USER',
      newValue: { amountCents: amount, reason: reason.trim(), status: escrowResult.status },
      ipAddress
    });

    revalidatePath('/admin/clients');
    return { success: true as const, status: escrowResult.status };
  });
}

export async function banUserAction(formData: FormData) {
  return requireStaffPermission('clients', 'edit', async (admin) => {
    const parsed = userIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { success: false as const, error: 'Missing userId' };
    
    const { userId } = parsed.data;

    const ipAddress = await getClientIp('unknown');

    await adminUserService.banUser(userId, {
      id: admin.id,
      email: admin.email,
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'BAN_USER',
      target: userId,
      targetType: 'USER',
      ipAddress
    });

    revalidatePath('/admin/clients');
    return { success: true as const };
  });
}

export async function unbanUserAction(formData: FormData) {
  return requireStaffPermission('clients', 'edit', async (admin) => {
    const parsed = userIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { success: false as const, error: 'Missing userId' };
    
    const { userId } = parsed.data;

    const ipAddress = await getClientIp('unknown');

    await adminUserService.unbanUser(userId, {
      id: admin.id,
      email: admin.email,
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UNBAN_USER',
      target: userId,
      targetType: 'USER',
      ipAddress
    });

    revalidatePath('/admin/clients');
    return { success: true as const };
  });
}

/**
 * Login-As: creates a temporary session for the target user.
 * Critical security action — restricted to OWNER/ADMIN only.
 */
export async function loginAsAction(formData: FormData) {
  // Use 'clients' section but check roles manually as well for extreme safety
  return requireStaffPermission('clients', 'edit', async (admin) => {
    const parsed = userIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { success: false as const, error: 'Missing userId' };
    
    const { userId } = parsed.data;

    if (!['OWNER', 'ADMIN'].includes(admin.role)) {
      return { success: false as const, error: 'Только Владелец и Админ могут входить как клиент' };
    }

    const targetUser = await db.user.findUniqueOrThrow({ where: { id: userId } });
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

    const impersonationSession = await db.session.create({
      data: { userId: targetUser.id, expiresAt },
    });

    const sessionToken = await new SignJWT({
      sessionId: impersonationSession.id,
      userId: targetUser.id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(encodedKey);

    (await cookies()).set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      sameSite: 'lax',
      path: '/',
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'LOGIN_AS_USER',
      target: userId,
      targetType: 'USER',
      newValue: { targetEmail: targetUser.email, sessionExpires: expiresAt.toISOString() },
    });

    revalidatePath('/dashboard/new-order');
    return { success: true as const };
  });
}

export async function approveQuarantineAction(formData: FormData) {
  return requireStaffPermission('finance', 'edit', async (admin) => {
    const entryId = formData.get('entryId') as string;
    if (!entryId) return { success: false as const, error: 'Missing entryId' };

    if (!['OWNER', 'ADMIN'].includes(admin.role)) {
      return { success: false as const, error: 'Только Владелец и Админ могут одобрять карантин' };
    }

    await escrowService.resolveQuarantine(entryId, 'APPROVE', {
      id: admin.id,
      email: admin.email
    });

    revalidatePath('/admin/finance');
    return { success: true as const };
  });
}

export async function rejectQuarantineAction(formData: FormData) {
  return requireStaffPermission('finance', 'edit', async (admin) => {
    const entryId = formData.get('entryId') as string;
    if (!entryId) return { success: false as const, error: 'Missing entryId' };

    if (!['OWNER', 'ADMIN'].includes(admin.role)) {
      return { success: false as const, error: 'Только Владелец и Админ могут отклонять карантин' };
    }

    await escrowService.resolveQuarantine(entryId, 'REJECT', {
      id: admin.id,
      email: admin.email
    });

    revalidatePath('/admin/finance');
    return { success: true as const };
  });
}
