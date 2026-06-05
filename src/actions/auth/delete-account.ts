'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { verifyPassword } from '@/lib/auth/password';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'DeleteAccount' });

const deleteSchema = z.object({
  confirmText: z.string(),
  password: z.string().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deleteAccountAction(prevState: any, formData: FormData) {
  const session = await verifySession();
  if (!session?.userId) {
    return { success: false, error: 'Вы не авторизованы' };
  }

  const rawConfirmText = formData.get('confirmText');
  const rawPassword = formData.get('password');

  const parsed = deleteSchema.safeParse({
    confirmText: rawConfirmText,
    password: rawPassword || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: 'Неверный формат входных данных' };
  }

  const { confirmText, password } = parsed.data;

  if (confirmText !== 'УДАЛИТЬ') {
    return { success: false, error: 'Для подтверждения необходимо ввести слово "УДАЛИТЬ"' };
  }

  try {
    const userId = session.userId;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, email: true }
    });

    if (!user) {
      return { success: false, error: 'Пользователь не найден' };
    }

    // Если у пользователя задан пароль — требуем его проверку
    if (user.passwordHash) {
      if (!password) {
        return { success: false, error: 'Для удаления аккаунта требуется ввести пароль' };
      }
      const isMatch = await verifyPassword(password, user.passwordHash);
      if (!isMatch) {
        return { success: false, error: 'Неверный пароль' };
      }
    }

    // Wrap database updates in a Prisma $transaction
    await db.$transaction(async (tx) => {
      // Write a USER_ACCOUNT_SOFT_DELETION audit log within the transaction
      await tx.auditLog.create({
        data: {
          userId,
          action: 'USER_ACCOUNT_SOFT_DELETION',
          details: `User with email ${user.email} initiated self-service account soft-deletion.`,
        }
      });

      // Anonymize user details, clear integration details, billing details, password hash, break referrals, and set deleted/inactive flags
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
        }
      });

      // Delete active DB sessions
      await tx.session.deleteMany({
        where: { userId },
      });

      // Delete auth tokens
      await tx.authToken.deleteMany({
        where: { userId },
      });
    });

    // Outside the transaction, clear the session_token cookie and set explicit_logout cookie
    const cookieStore = await cookies();
    cookieStore.delete('session_token');
    cookieStore.set('explicit_logout', 'true', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 год
    });

    log.info('Account successfully soft-deleted', { userId, email: user.email });
    return { success: true, error: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    log.error('Account deletion failed', { error: error.message });
    return { success: false, error: 'Ошибка сервера при удалении аккаунта. Попробуйте позже.' };
  }
}
