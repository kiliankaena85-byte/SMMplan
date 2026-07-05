'use server';

import { db } from '@/lib/db';
import { adminUserService } from '@/services/admin/user.service';
import { escrowService } from '@/services/admin/escrow.service';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { auditAdmin, auditAdminAwaitable } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { updateBalanceSchema, userIdSchema } from '@/validators/admin.validators';
import { requireStaffPermission } from '@/lib/server/rbac';
import { getClientIp } from '@/utils/ip';

import { getEncodedKey } from '@/lib/session';

export async function updateBalanceAction(formData: FormData) {
  return requireStaffPermission('finance', 'edit', async (admin) => {
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

    // SD-13 SECURITY FIX: Await audit for balance modification (financial operation)
    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_BALANCE_REQUEST',
      target: userId,
      targetType: 'USER',
      newValue: { amountCents: amount, reason: reason.trim(), status: escrowResult.status },
      ipAddress
    });

    revalidatePath(`/admin/clients/${userId}`);
    revalidatePath('/admin/clients');
    return { success: true as const, status: escrowResult.status };
  });
}

export async function banUserAction(formData: FormData) {
  return requireStaffPermission('finance', 'edit', async (admin) => {
    const parsed = userIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { success: false as const, error: 'Missing userId' };
    
    const { userId } = parsed.data;

    const ipAddress = await getClientIp('unknown');

    await adminUserService.banUser(userId, {
      id: admin.id,
      email: admin.email,
    });

    await auditAdminAwaitable({
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
  return requireStaffPermission('finance', 'edit', async (admin) => {
    const parsed = userIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { success: false as const, error: 'Missing userId' };
    
    const { userId } = parsed.data;

    const ipAddress = await getClientIp('unknown');

    await adminUserService.unbanUser(userId, {
      id: admin.id,
      email: admin.email,
    });

    await auditAdminAwaitable({
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
  return requireStaffPermission('finance', 'edit', async (admin) => {
    const parsed = userIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { success: false as const, error: 'Missing userId' };
    
    const { userId } = parsed.data;

    if (!['OWNER', 'ADMIN'].includes(admin.role)) {
      return { success: false as const, error: 'Только Владелец и Админ могут входить как клиент' };
    }

    const targetUser = await db.user.findUniqueOrThrow({ where: { id: userId } });
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

    // SD-07 SECURITY FIX: Record impersonation origin for audit trail integrity.
    // Without this, impersonated sessions are indistinguishable from real user sessions.
    const impersonationSession = await db.session.create({
      data: {
        userId: targetUser.id,
        expiresAt,
        impersonatedBy: admin.id,
      },
    });

    const sessionToken = await new SignJWT({
      sessionId: impersonationSession.id,
      userId: targetUser.id,
      impersonatedBy: admin.id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(getEncodedKey());

    (await cookies()).set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      sameSite: 'lax',
      path: '/',
    });

    const ipAddress = await getClientIp('unknown');

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'LOGIN_AS_USER',
      target: userId,
      targetType: 'USER',
      newValue: { targetEmail: targetUser.email, sessionExpires: expiresAt.toISOString(), impersonatedBy: admin.id },
      ipAddress
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

    const ipAddress = await getClientIp('unknown');

    await escrowService.resolveQuarantine(entryId, 'APPROVE', {
      id: admin.id,
      email: admin.email
    }, ipAddress);

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

    const ipAddress = await getClientIp('unknown');

    await escrowService.resolveQuarantine(entryId, 'REJECT', {
      id: admin.id,
      email: admin.email
    }, ipAddress);

    revalidatePath('/admin/finance');
    return { success: true as const };
  });
}

export async function adminChangeUserPasswordAction(userId: string, newPass: string) {
  return requireStaffPermission('finance', 'edit', async (admin) => {
    if (!userId || !newPass || newPass.length < 8) {
      return { success: false as const, error: 'Пароль должен содержать минимум 8 символов' };
    }

    const { hashPassword } = await import('@/lib/auth/password');
    const hashed = await hashPassword(newPass);

    const targetUser = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!targetUser) return { success: false as const, error: 'Пользователь не найден' };

    await db.user.update({
      where: { id: userId },
      data: { passwordHash: hashed }
    });

    // Сброс всех сессий пользователя ради безопасности
    await db.session.deleteMany({ where: { userId } });

    const ipAddress = await getClientIp('unknown');
    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ADMIN_CHANGE_USER_PASSWORD',
      target: userId,
      targetType: 'USER',
      newValue: { targetEmail: targetUser.email },
      ipAddress
    });

    revalidatePath(`/admin/clients/${userId}`);
    return { success: true as const };
  });
}

export async function adminDeleteUserAction(formData: FormData) {
  return requireStaffPermission('finance', 'edit', async (admin) => {
    const userId = formData.get('userId') as string;
    if (!userId) return { success: false as const, error: 'Missing userId' };

    if (!['OWNER', 'ADMIN'].includes(admin.role)) {
      return { success: false as const, error: 'Только Владелец и Админ могут удалять профили' };
    }

    if (userId === admin.id) {
      return { success: false as const, error: 'Вы не можете удалить собственный профиль' };
    }

    const targetUser = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!targetUser) return { success: false as const, error: 'Пользователь не найден' };

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@smmplan.local`,
          telegramId: null,
          phoneHash: null,
          apiKeyHash: null,
          referralCode: null,
          companyName: null,
          inn: null,
          kpp: null,
          legalAddress: null,
          passwordHash: null,
          referredById: null,
          isDeleted: true,
          isActive: false,
          role: 'BANNED'
        }
      });
      await tx.session.deleteMany({ where: { userId } });
      await tx.authToken.deleteMany({ where: { userId } });
    });

    const ipAddress = await getClientIp('unknown');
    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ADMIN_DELETE_USER',
      target: userId,
      targetType: 'USER',
      oldValue: { email: targetUser.email },
      newValue: { isDeleted: true },
      ipAddress
    });

    revalidatePath('/admin/clients');
    return { success: true as const };
  });
}
