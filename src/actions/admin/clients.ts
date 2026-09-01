'use server';

/**
 * Client management Server Actions (Sprint 1.4)
 *
 * updateClientDiscountAction — set personalDiscount + optional expiry
 * updateClientNoteAction — set/clear internal operator note
 *
 * Security:
 * - requireAdmin on all actions
 * - adminNote is NEVER exposed to client-facing APIs
 * - discount capped at 50% (business rule)
 */

import { requireStaffPermission } from '@/lib/server/rbac';
import { db } from '@/lib/db';
import { auditAdmin } from '@/lib/admin-audit';
import { serializeForClient } from '@/lib/bigint-serializer';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const MAX_DISCOUNT = 50; // Business rule: max personal discount

const discountSchema = z.object({
  userId: z.string().min(1),
  discount: z.number().min(0).max(MAX_DISCOUNT),
  endsAt: z.string().datetime().optional(), // ISO 8601
}).refine((data) => {
  if (data.endsAt) {
    return new Date(data.endsAt).getTime() > Date.now();
  }
  return true;
}, {
  message: "Срок окончания скидки должен быть в будущем",
  path: ["endsAt"]
});

const noteSchema = z.object({
  userId: z.string().min(1),
  note: z.string().max(2000).optional(),
});

/** Set personal discount for a client (0 = remove discount) */
export async function updateClientDiscountAction(
  userId: string,
  discount: number,
  endsAt?: string
) {
  return requireStaffPermission('finance', 'edit', async (admin) => {
    const parsed = discountSchema.safeParse({ userId, discount, endsAt });
    if (!parsed.success) {
      return { success: false as const, error: `Максимальная скидка ${MAX_DISCOUNT}%` };
    }

    const user = await db.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, email: true, personalDiscount: true },
    });
    if (!user) return { success: false as const, error: 'Пользователь не найден' };

    await db.user.update({
      where: { id: user.id },
      data: {
        personalDiscount: parsed.data.discount,
        discountEndsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CLIENT_DISCOUNT_SET',
      target: user.id,
      targetType: 'USER',
      oldValue: { discount: user.personalDiscount },
      newValue: { discount: parsed.data.discount, endsAt: parsed.data.endsAt },
    });

    revalidatePath(`/admin/clients/${user.id}`);
    revalidatePath('/admin/clients');
    return { success: true as const };
  });
}

/** Update internal admin note for a client */
export async function updateClientNoteAction(userId: string, note: string) {
  return requireStaffPermission('clients', 'edit', async (admin) => {
    const parsed = noteSchema.safeParse({ userId, note });
    if (!parsed.success) {
      return { success: false as const, error: 'Заметка слишком длинная (макс 2000 символов)' };
    }

    await db.user.update({
      where: { id: parsed.data.userId },
      data: {
        adminNote: parsed.data.note?.trim() || null,
        adminNoteUpdatedAt: new Date(),
        adminNoteUpdatedBy: admin.email,
      },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CLIENT_NOTE_UPDATE',
      target: parsed.data.userId,
      targetType: 'USER',
    });

    revalidatePath(`/admin/clients/${parsed.data.userId}`);
    return { success: true as const };
  });
}

/** Send password reset link to client email */
export async function sendPasswordResetEmailAction(userId: string) {
  return requireStaffPermission('clients', 'edit', async (admin) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, tenantId: true },
    });

    if (!user) {
      return { success: false as const, error: 'Клиент не найден' };
    }

    const rawToken = (await import('crypto')).randomBytes(32).toString('hex');
    const hashedToken = (await import('crypto')).createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.authToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
        ipIssued: '127.0.0.1',
        // Encode purpose in userAgentIssued since AuthToken has no 'type' field
        userAgentIssued: `password-reset:staff:${admin.email}`,
      },
    });

    const resetUrl = `/login?tab=reset&token=${rawToken}`;

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CLIENT_PASSWORD_RESET_SENT',
      target: user.id,
      targetType: 'USER',
    });

    return { 
      success: true as const, 
      message: `Ссылка для сброса пароля сгенерирована: ${resetUrl}`,
      resetUrl 
    };
  });
}

/** Staff Goodwill / Compensation Balance Credit */
export async function supportGoodwillCreditAction(formData: FormData) {
  return requireStaffPermission('clients', 'edit', async (admin, _role, tenantId) => {
    const userId = formData.get('userId') as string;
    const amountStr = formData.get('amount') as string;
    const reason = (formData.get('reason') as string) || 'Компенсация техподдержки (Goodwill)';
    const comment = (formData.get('comment') as string) || '';

    if (!userId || !amountStr) {
      return { success: false as const, error: 'Не указан клиент или сумма' };
    }

    const amountRub = parseFloat(amountStr);
    if (isNaN(amountRub) || amountRub <= 0) {
      return { success: false as const, error: 'Сумма должна быть положительным числом' };
    }

    const MAX_GOODWILL_RUB = 10000;
    if (amountRub > MAX_GOODWILL_RUB && admin.role === 'SUPPORT') {
      return { success: false as const, error: `Максимальная компенсация для саппорта — ${MAX_GOODWILL_RUB} ₽` };
    }

    const amountKopecks = BigInt(Math.round(amountRub * 100));

    const { WalletOps } = await import('@/services/financial/wallet-ops');
    const { auditAdminAwaitable } = await import('@/lib/admin-audit');

    const result = await db.$transaction(async (tx) => {
      return await WalletOps.credit(
        tx,
        userId,
        amountKopecks,
        `Goodwill: ${reason}${comment ? ` (${comment})` : ''}`,
        {
          adminId: admin.id,
          tenantId: tenantId || 'smmplan',
          transactionType: 'ADJUSTMENT'
        }
      );
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SUPPORT_GOODWILL_CREDIT',
      target: userId,
      targetType: 'USER',
      newValue: { amountRub, reason, comment },
    });

    revalidatePath(`/admin/clients/${userId}`);
    revalidatePath('/admin/clients');
    return { success: true as const, newBalanceRub: Number(result.balance) / 100 };
  });
}

/** Fetch full client profile for the detail page */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getClientProfileAction(userId: string) {
  return requireStaffPermission('clients', 'view', async () => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        balance: true,
        quarantineBalance: true,
        totalSpent: true,
        personalDiscount: true,
        discountEndsAt: true,
        adminNote: true,
        adminNoteUpdatedAt: true,
        adminNoteUpdatedBy: true,
        telegramId: true,
        apiKeyHash: true,
        referralCode: true,
        referralBalance: true,
        createdAt: true,
        _count: { select: { orders: true, payments: true, tickets: true } },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            numericId: true,
            status: true,
            quantity: true,
            charge: true,
            createdAt: true,
            service: { select: { name: true } },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) return { success: false as const, error: 'Пользователь не найден' };

    return { success: true as const, user: serializeForClient(user) };
  });
}
