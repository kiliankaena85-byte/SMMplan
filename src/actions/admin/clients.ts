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

import { requireAdmin } from '@/lib/server/rbac';
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
  return requireAdmin(async (admin) => {
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
  return requireAdmin(async (admin) => {
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

/** Fetch full client profile for the detail page */
export async function getClientProfileAction(userId: string) {
  return requireAdmin(async () => {
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
        apiKey: true,
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
