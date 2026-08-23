'use server';

import { verifySession, canResetPassword as checkResetCapability } from '@/lib/session';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { passwordPolicySchema } from '@/validators/password-policy';

const setPasswordSchema = z.object({
  password: passwordPolicySchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"]
});

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: passwordPolicySchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"]
});

export async function setPasswordAction(formData: FormData) {
  if (!formData || typeof formData.entries !== 'function') {
    return { success: false, error: "Некорректные данные формы" };
  }
  const session = await verifySession();
  if (!session) {
    return { success: false, error: 'Пожалуйста, войдите в аккаунт' };
  }

  const rawData = Object.fromEntries(formData.entries());
  const parsed = setPasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { password } = parsed.data;

  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true }
    });

    if (!user) {
      return { success: false, error: 'Пользователь не найден' };
    }

    if (user.passwordHash) {
      return { success: false, error: 'У вас уже установлен пароль. Используйте форму смены пароля.' };
    }

    const hashed = await hashPassword(password);

    await db.user.update({
      where: { id: session.userId },
      data: { passwordHash: hashed }
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Failed to set password:', error);
    return { success: false, error: 'Не удалось установить пароль. Попробуйте позже.' };
  }
}

export async function changePasswordAction(formData: FormData) {
  if (!formData || typeof formData.entries !== 'function') {
    return { success: false, error: "Некорректные данные формы" };
  }
  const session = await verifySession();
  if (!session) {
    return { success: false, error: 'Пожалуйста, войдите в аккаунт' };
  }

  const rawData = Object.fromEntries(formData.entries());
  const parsed = changePasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { currentPassword, newPassword } = parsed.data;

  // H2: Проверяем, авторизовался ли пользователь через Magic Link недавно (<15 мин TTL)
  const canReset = session.sessionId ? await checkResetCapability(session.sessionId) : false;

  if (!canReset && !currentPassword) {
    return { success: false, error: 'Введите текущий пароль' };
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true }
    });

    if (!user) {
      return { success: false, error: 'Пользователь не найден' };
    }

    if (!user.passwordHash) {
      return { success: false, error: 'У вас не установлен пароль. Пожалуйста, сначала установите пароль.' };
    }

    if (!canReset) {
      const isValid = await verifyPassword(currentPassword!, user.passwordHash);
      if (!isValid) {
        return { success: false, error: 'Неверный текущий пароль' };
      }
    }

    const hashed = await hashPassword(newPassword);

    await db.user.update({
      where: { id: session.userId },
      data: { passwordHash: hashed }
    });

    // Clear reset capability after successful change
    if (session.sessionId) {
      await db.session.update({
        where: { id: session.sessionId },
        data: { canResetPasswordUntil: null },
      }).catch(() => {});
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Failed to change password:', error);
    return { success: false, error: 'Не удалось сменить пароль. Попробуйте позже.' };
  }
}
